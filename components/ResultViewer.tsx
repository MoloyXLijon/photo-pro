import React from 'react';
import { Download, RefreshCw, AlertCircle } from 'lucide-react';
import { downloadImage } from '../utils/file';

interface ResultViewerProps {
  isLoading: boolean;
  resultImage: string | null;
  error: string | null;
  onRetry: () => void;
}

export const ResultViewer: React.FC<ResultViewerProps> = ({ isLoading, resultImage, error, onRetry }) => {
  if (isLoading) {
    return (
      <div className="w-full h-64 md:h-full min-h-[300px] flex flex-col items-center justify-center bg-slate-50 rounded-xl border border-slate-200 animate-pulse">
        <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p className="text-indigo-600 font-medium">Processing your ID photo...</p>
        <p className="text-slate-400 text-sm mt-2">Adding the coat and fixing background</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full min-h-[300px] flex flex-col items-center justify-center bg-red-50 rounded-xl border border-red-200 p-6 text-center">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-red-700 mb-2">Generation Failed</h3>
        <p className="text-red-600 mb-6 max-w-xs">{error}</p>
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors shadow-sm"
        >
          <RefreshCw size={18} />
          Try Again
        </button>
      </div>
    );
  }

  if (!resultImage) {
    return (
      <div className="w-full h-full min-h-[300px] flex flex-col items-center justify-center bg-slate-50 rounded-xl border border-slate-200 text-slate-400">
        <ImageIconPlaceholder />
        <p className="mt-4">Your processed ID photo will appear here</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="relative flex-1 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-inner flex items-center justify-center p-4">
        <img
          src={resultImage}
          alt="Generated ID Photo"
          className="max-h-[500px] w-auto rounded-lg shadow-lg object-contain"
        />
      </div>
      
      <div className="mt-4 flex gap-3">
        <button
          onClick={() => downloadImage(resultImage, `id-photo-${Date.now()}.png`)}
          className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-6 rounded-lg font-medium transition-colors shadow-md"
        >
          <Download size={20} />
          Download Photo
        </button>
      </div>
    </div>
  );
};

const ImageIconPlaceholder = () => (
  <svg
    className="w-16 h-16 opacity-20"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
);