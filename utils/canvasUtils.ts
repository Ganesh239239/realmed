import { Adjustments, Overlay } from "../types";

export const getCssFilterString = (adj: Adjustments): string => {
  return `
    brightness(${adj.brightness}%) 
    contrast(${adj.contrast}%) 
    saturate(${adj.saturation}%) 
    blur(${adj.blur}px) 
    grayscale(${adj.grayscale}%) 
    sepia(${adj.sepia}%) 
    hue-rotate(${adj.hue}deg)
  `.trim().replace(/\s+/g, ' ');
};

export const drawImageToCanvas = (
  canvas: HTMLCanvasElement,
  imageSrc: string,
  adjustments: Adjustments,
  overlays: Overlay[] = []
): Promise<void> => {
  return new Promise((resolve) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return resolve();

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      // Set canvas size to match image natural size
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      // Clear canvas (important for transparency)
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Draw Base Image with Filters
      ctx.filter = getCssFilterString(adjustments);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      ctx.filter = 'none'; // Reset filter for overlays

      // 2. Draw Overlays
      const drawOverlays = async () => {
        for (const ov of overlays) {
            ctx.save();
            const x = ov.x * (canvas.width / 100);
            const y = ov.y * (canvas.height / 100);
            
            ctx.translate(x, y);
            ctx.rotate((ov.rotation * Math.PI) / 180);
            ctx.scale(ov.scale, ov.scale);

            if (ov.type === 'text') {
                // Dynamic font size based on image width if not set
                // Default roughly 5% of image width for readability
                const fontSize = Math.max(20, canvas.width * 0.05); 
                ctx.font = `bold ${fontSize}px "Google Sans", sans-serif`;
                ctx.fillStyle = ov.color || '#ffffff';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.shadowColor = 'rgba(0,0,0,0.5)';
                ctx.shadowBlur = 4;
                ctx.fillText(ov.content, 0, 0);
            } else {
                await new Promise<void>((r) => {
                    const ovImg = new Image();
                    ovImg.crossOrigin = "anonymous";
                    ovImg.onload = () => {
                        // Maintain aspect ratio of overlay if width/height not fully specified?
                        // For now using fixed base size scaled by ov.scale
                        // A better approach: Scale relative to image
                        const baseSize = Math.max(50, canvas.width * 0.15); // 15% of image width
                        const w = ov.width || baseSize;
                        const h = ov.height || baseSize;
                        ctx.drawImage(ovImg, -w/2, -h/2, w, h);
                        r();
                    };
                    ovImg.src = ov.content;
                });
            }
            ctx.restore();
        }
        resolve();
      };

      drawOverlays();
    };
    img.src = imageSrc;
  });
};

export const exportCanvasToBase64 = async (
  imageSrc: string,
  adjustments: Adjustments,
  overlays: Overlay[] = []
): Promise<string> => {
  const canvas = document.createElement('canvas');
  await drawImageToCanvas(canvas, imageSrc, adjustments, overlays);
  // Use PNG to preserve transparency (crucial for background removal)
  return canvas.toDataURL('image/png');
};

// --- New Utilities for Crop & Rotate ---

// Crop by Aspect Ratio (Center)
export const cropImage = (imageSrc: string, aspectRatio: number): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            let w = img.naturalWidth;
            let h = img.naturalHeight;
            let sx = 0, sy = 0, sw = w, sh = h;

            const currentRatio = w / h;
            
            if (currentRatio > aspectRatio) {
                sw = h * aspectRatio;
                sx = (w - sw) / 2;
            } else {
                sh = w / aspectRatio;
                sy = (h - sh) / 2;
            }

            canvas.width = sw;
            canvas.height = sh;

            ctx?.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
            resolve(canvas.toDataURL('image/png'));
        };
        img.src = imageSrc;
    });
};

// Crop by Coordinates (Manual Hand Crop)
export const cropImagePixels = (imageSrc: string, crop: {x: number, y: number, width: number, height: number}): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Validate bounds
            const x = Math.max(0, crop.x);
            const y = Math.max(0, crop.y);
            const w = Math.min(crop.width, img.naturalWidth - x);
            const h = Math.min(crop.height, img.naturalHeight - y);

            canvas.width = w;
            canvas.height = h;

            ctx?.drawImage(img, x, y, w, h, 0, 0, w, h);
            resolve(canvas.toDataURL('image/png'));
        };
        img.src = imageSrc;
    });
};

export const rotateImage = (imageSrc: string, degrees: number): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (degrees % 180 !== 0) {
                canvas.width = img.naturalHeight;
                canvas.height = img.naturalWidth;
            } else {
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
            }

            ctx?.translate(canvas.width / 2, canvas.height / 2);
            ctx?.rotate((degrees * Math.PI) / 180);
            ctx?.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
            
            resolve(canvas.toDataURL('image/png'));
        };
        img.src = imageSrc;
    });
};