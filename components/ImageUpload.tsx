import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, Camera, FolderUp, AlertCircle } from 'lucide-react';
import { fileToBase64 } from '../utils/file';

interface ImageUploadProps {
  onImageSelect: (imageData: string, mimeType: string) => void;
  selectedImage: string | null;
  onClear: () => void;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ onImageSelect, selectedImage, onClear }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Attach stream to video element when camera is open and stream exists
  useEffect(() => {
    if (isCameraOpen && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.onloadedmetadata = () => {
        videoRef.current?.play().catch(e => console.error("Error playing video:", e));
      };
    }
  }, [isCameraOpen, stream]);

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

  const startCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Camera API is not supported in this browser. Please use HTTPS.");
      return;
    }

    try {
      let mediaStream: MediaStream | null = null;
      
      // Attempt 1: Try requesting the user-facing camera directly
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user' } 
        });
      } catch (err) {
        console.warn("Failed to access user-facing camera:", err);
      }

      // Attempt 2: If the first attempt failed (e.g., no 'user' camera), try any video device
      if (!mediaStream) {
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({ 
            video: true 
          });
        } catch (err) {
          console.warn("Failed to access any camera:", err);
          throw err; // Re-throw to be caught by the outer catch
        }
      }

      if (mediaStream) {
        setStream(mediaStream);
        setIsCameraOpen(true);
      }
      
    } catch (err: any) {
      console.error("Camera access error:", err);
      
      const errorName = err.name;
      const errorMessage = err.message || '';

      if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
        alert("Permission denied. Please allow camera access in your browser settings.");
      } else if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError' || errorMessage.includes('not found')) {
        alert("No camera device found. Please ensure your camera is connected and enabled.");
      } else if (errorName === 'NotReadableError' || errorName === 'TrackStartError') {
        alert("Camera is currently in use by another application.");
      } else {
        alert("Unable to access camera. Please try uploading a file instead.");
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // We capture exactly what the video feed provides. 
        // Note: The preview is mirrored via CSS, but the capture is raw.
        ctx.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        onImageSelect(dataUrl, 'image/png');
        stopCamera();
      }
    }
  };

  if (selectedImage) {
    return (
      <div className="w-full">
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
      </div>
    );
  }

  if (isCameraOpen) {
    return (
      <div className="w-full h-80 bg-black rounded-xl overflow-hidden relative flex flex-col items-center justify-center">
        <video 
          ref={videoRef} 
          className="w-full h-full object-cover transform scale-x-[-1]" 
          autoPlay 
          playsInline 
          muted 
        />
        
        <div className="absolute top-4 right-4 z-10">
          <button 
            onClick={stopCamera}
            className="p-2 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="absolute bottom-6 left-0 right-0 flex justify-center z-10">
          <button
            onClick={capturePhoto}
            className="p-1 rounded-full border-4 border-white/50 hover:border-white transition-colors"
            title="Take Photo"
          >
            <div className="w-14 h-14 bg-white rounded-full shadow-lg active:scale-95 transition-transform" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-slate-50/50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInput}
          className="hidden"
          accept="image/*"
        />
        
        <div className="flex flex-col items-center gap-6">
          <div className="space-y-2">
            <div className="flex justify-center text-indigo-200">
               <Upload size={48} className="text-slate-300" />
            </div>
            <p className="text-lg font-semibold text-slate-700">Upload your photo</p>
            <p className="text-sm text-slate-500">Drag & drop here</p>
          </div>

          <div className="flex flex-wrap gap-3 justify-center w-full max-w-sm">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 px-4 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-700 rounded-lg shadow-sm transition-all font-medium group"
            >
              <FolderUp size={20} className="text-indigo-500 group-hover:scale-110 transition-transform" />
              <span>Device / Drive</span>
            </button>

            <button
              onClick={startCamera}
              className="flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 px-4 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-700 rounded-lg shadow-sm transition-all font-medium group"
            >
              <Camera size={20} className="text-indigo-500 group-hover:scale-110 transition-transform" />
              <span>Camera</span>
            </button>
          </div>
          
          <p className="text-xs text-slate-400">Supports JPG, PNG, WEBP</p>
        </div>
      </div>
    </div>
  );
};