import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, X } from 'lucide-react';
import { fileToBase64 } from '../utils/file';

interface ImageUploadProps {
  onImageSelect: (imageData: string, mimeType: string) => void;
  selectedImage: string | null;
  onClear: () => void;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ onImageSelect, selectedImage, onClear }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.');
      return;
    }
    try {
      const base64 = await fileToBase64(file);
      onImageSelect(base64, file.type);
    } catch (error) {
      console.error('Error reading file:', error);
    }
  };

  return (
    <div className="w-full">
      {!selectedImage ? (
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
            isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInput}
            className="hidden"
            accept="image/*"
          />
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-indigo-100 rounded-full text-indigo-600">
              <Upload size={32} />
            </div>
            <div>
              <p className="text-lg font-medium text-slate-700">Click or drag image to upload</p>
              <p className="text-sm text-slate-500 mt-1">Supports JPG, PNG, WEBP</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative group rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white">
          <img src={selectedImage} alt="Selected" className="w-full h-64 object-contain bg-slate-100" />
          <div className="absolute top-2 right-2">
            <button
              onClick={onClear}
              className="p-2 bg-white/90 hover:bg-red-50 text-slate-600 hover:text-red-600 rounded-full shadow-md transition-colors backdrop-blur-sm"
              title="Remove image"
            >
              <X size={20} />
            </button>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-black/50 backdrop-blur-md text-white text-xs text-center opacity-0 group-hover:opacity-100 transition-opacity">
            Original Image
          </div>
        </div>
      )}
    </div>
  );
};