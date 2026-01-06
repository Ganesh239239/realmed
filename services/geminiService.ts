import { GoogleGenAI } from "@google/genai";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Edits an image using Gemini's generative capabilities.
 * @param imageBase64 - The base64 string of the image.
 * @param prompt - The user's instruction for editing.
 */
export const editImageWithGemini = async (imageBase64: string, prompt: string): Promise<string> => {
  const ai = getAiClient();
  
  // Extract clean base64 data if it contains the prefix
  const base64Data = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');

  try {
    // If the user wants to remove background, we augment the prompt to ensure the model understands
    // that we want the object isolated.
    let enhancedPrompt = prompt;
    if (prompt.toLowerCase().includes("remove background") || prompt.toLowerCase().includes("remove bg")) {
        enhancedPrompt = "Isolate the main subject and remove the background. Make the background white or transparent. Return only the image.";
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: enhancedPrompt,
          },
          {
            inlineData: {
              data: base64Data,
              mimeType: 'image/png', 
            },
          },
        ],
      },
    });

    if (response.candidates && response.candidates.length > 0) {
        const content = response.candidates[0].content;
        if (content.parts) {
            for (const part of content.parts) {
                if (part.inlineData && part.inlineData.data) {
                    return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
                }
            }
        }
    }
    
    throw new Error("No image data returned from AI");

  } catch (error) {
    console.error("Gemini Image Edit Error:", error);
    throw error;
  }
};