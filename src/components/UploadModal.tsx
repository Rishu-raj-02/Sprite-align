import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, Sparkles, X, AlertCircle } from 'lucide-react';
import { readFileAsDataURL, loadImage } from '../utils/imageLoader';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImageLoaded: (dataUrl: string, width: number, height: number, filename: string) => void;
  onLoadDemo: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onImageLoaded,
  onLoadDemo,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const processFile = async (file: File) => {
    setError(null);
    setLoading(true);
    try {
      const dataUrl = await readFileAsDataURL(file);
      const img = await loadImage(dataUrl);
      onImageLoaded(dataUrl, img.width, img.height, file.name);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to load image file.');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded bg-indigo-950 text-indigo-400 border border-indigo-800">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-neutral-100">
                Upload Sprite Sheet
              </h2>
              <p className="text-xs text-neutral-400">
                Supports transparent PNG, WebP, and JPG formats
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-200 p-1 rounded-md hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dropzone */}
        <div className="p-6 space-y-4">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition ${
              isDragging
                ? 'border-indigo-500 bg-indigo-950/30'
                : 'border-neutral-700 hover:border-neutral-600 bg-neutral-950/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-300 mb-3 group-hover:scale-105 transition">
              <ImageIcon className="w-6 h-6 text-indigo-400" />
            </div>

            <div className="text-sm font-medium text-neutral-200 mb-1">
              Drag & drop your sprite sheet here
            </div>
            <div className="text-xs text-neutral-400 mb-4">
              or click to browse your computer
            </div>

            <span className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition">
              Select Image File
            </span>

            <div className="mt-4 text-[11px] text-neutral-500">
              Preserves 100% true alpha transparency. Never modifies original file.
            </div>
          </div>

          {loading && (
            <div className="text-center py-2 text-xs text-indigo-400 font-medium animate-pulse">
              Reading and analyzing image dimensions...
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-800 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2 border-t border-neutral-800 flex items-center justify-between">
            <span className="text-xs text-neutral-400">Want to test right away?</span>
            <button
              onClick={() => {
                onLoadDemo();
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-indigo-300 border border-neutral-700 transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Load 4×2 Sample Sheet</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
