import React from 'react';

interface ToolCardProps {
  originalName: string;
  originalSize: number;
  processedSize: number;
  processedUrl: string;
  format: string;
  onDownload: () => void;
}

function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export default function ToolCard({
  originalName,
  originalSize,
  processedSize,
  processedUrl,
  format,
  onDownload,
}: ToolCardProps) {
  const savings = originalSize - processedSize;
  const savingsPercent = ((savings / originalSize) * 100).toFixed(1);
  const hasSavings = savings > 0;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{originalName}</h3>
          <p className="text-sm text-gray-500">Converted to {format.toUpperCase()}</p>
        </div>
        <div className={`text-right ${hasSavings ? 'text-green-600' : 'text-red-600'}`}>
          <p className="text-2xl font-bold">
            {hasSavings ? '-' : '+'}{Math.abs(parseFloat(savingsPercent))}%
          </p>
          <p className="text-xs text-gray-500">
            {hasSavings ? 'Smaller' : 'Larger'} file size
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">Original Size</p>
          <p className="font-semibold text-gray-900">{formatBytes(originalSize)}</p>
        </div>
        <div className={`bg-gray-50 rounded-lg p-3 ${hasSavings ? 'bg-green-50' : 'bg-red-50'}`}>
          <p className="text-xs text-gray-500 mb-1">New Size</p>
          <p className={`font-semibold ${hasSavings ? 'text-green-700' : 'text-red-700'}`}>
            {formatBytes(processedSize)}
          </p>
        </div>
      </div>

      <button
        onClick={onDownload}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
      before
        >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Download {format.toUpperCase()}
      </button>
    </div>
  );
}
