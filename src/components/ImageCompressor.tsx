// src/components/ImageCompressor.tsx
import React, { useState, useRef } from 'react';

export default function ImageCompressor() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [quality, setQuality] = useState(80);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  };

  const handleCompress = () => {
    if (!file || !canvasRef.current) return;
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          // Example: trigger download
          const a = document.createElement('a');
          a.href = url;
          a.download = `compressed-${file.name}`;
          a.click();
        },
        'image/jpeg',
        quality / 100
      );
    };
    img.src = URL.createObjectURL(file);
  };

  return (
    <div className="p-4 max-w-xl mx-auto space-y-4">
      <h2 className="text-2xl font-semibold">Image Compressor</h2>
      <input type="file" accept="image/*" onChange={handleFileChange} />
      {previewUrl && (
        <img src={previewUrl} alt="Preview" className="max-w-full h-auto rounded border" />
      )}
      <div>
        <label className="block text-sm text-gray-500">
          Quality: {quality}%
        </label>
        <input
          type="range"
          min={1}
          max={100}
          value={quality}
          onChange={(e) => setQuality(Number(e.target.value))}
          className="w-full"
        />
      </div>
      <button
        onClick={handleCompress}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Compress & Download
      </button>
      {/* Hidden canvas for processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
