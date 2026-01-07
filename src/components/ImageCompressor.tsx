import React, { useState, useRef } from 'react';
import DropZone from './DropZone';
import ToolCard from './ToolCard';

export default function ImageCompressor() {
  const [file, setFile] = useState<File | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [processedSize, setProcessedSize] = useState<number>(0);
  const [quality, setQuality] = useState<number>(80);
  const [format, setFormat] = useState<string>('image/jpeg');
  const [isProcessing, setIsProcessing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    processImage(selectedFile);
  };

  const processImage = (fileToProcess: File) => {
    setIsProcessing(true);
    const img = new Image();
    
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            setIsProcessing(false);
            return;
          }
          
          const url = URL.createObjectURL(blob);
          setProcessedUrl(url);
          setProcessedSize(blob.size);
          setIsProcessing(false);
        },
        format as 'image/jpeg' | 'image/png' | 'image/webp',
        quality / 100
      );
    };

    img.src = URL.createObjectURL(fileToProcess);
  };

  const handleDownload = () => {
    if (!processedUrl || !file) return;

    const link = document.createElement('a');
    link.href = processedUrl;
    
    // Create filename with new extension
    const nameParts = file.name.split('.');
    const extension = format.split('/')[1];
    const newName = `${nameParts.slice(0, -1).join('.')}.${extension}`;
    
    link.download = newName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleQualityChange = (value: number) => {
    setQuality(value);
    if (file) {
      processImage(file);
    }
  };

  const handleFormatChange = (newFormat: string) => {
    setFormat(newFormat);
    if (file) {
      processImage(file);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Compress Image</h2>
        
        {!file && (
          <DropZone onFileSelect={handleFileSelect} />
        )}

        {file && (
          <div className="space-y-6">
            {/* Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Output Format
                </label>
                <select
                  value={format}
                  onChange={(e) => handleFormatChange(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="image/jpeg">JPEG (Good compression)</option>
                  <option value="image/png">PNG (Lossless)</option>
                  <option value="image/webp">WebP (Modern & efficient)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quality: {quality}%
                </label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={quality}
                  onChange={(e) => handleQualityChange(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Lower quality</span>
                  <span>Higher quality</span>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-center mb-4">
                {processedUrl && (
                  <img
                    src={processedUrl}
                    alt="Preview"
                    className="max-w-full max-h-96 rounded-lg shadow-sm"
                  />
                )}
              </div>
              <p className="text-center text-sm text-gray-500">
                Preview of compressed image
              </p>
            </div>

            {/* Results */}
            {processedUrl && !isProcessing && (
              <ToolCard
                originalName={file.name}
                originalSize={file.size}
                processedSize={processedSize}
                processedUrl={processedUrl}
                format={format.split('/')[1]}
                onDownload={handleDownload}
              />
            )}

            {isProcessing && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            )}

            {/* Reset Button */}
            <button
              onClick={() => {
                setFile(null);
                setProcessedUrl(null);
                setProcessedSize(0);
              }}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Process another image
            </button>
          </div>
        )}
      </div>

      {/* Hidden canvas for processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
