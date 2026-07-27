import React, { RefObject } from "react";
import { Image as ImageIcon, Camera, X } from "lucide-react";

interface ImageUploaderProps {
  selectedImage: string | null;
  onRemoveImage: () => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onStartCamera?: () => void;
}

export function ImageUploader({
  selectedImage,
  onRemoveImage,
  fileInputRef,
  onImageChange,
  onStartCamera
}: ImageUploaderProps) {
  return (
    <>
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={onImageChange}
        accept="image/*"
        className="hidden"
      />

      {/* Selected Image Attachment Preview Banner */}
      {selectedImage && (
        <div className="px-4 py-2 border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/60 dark:bg-indigo-950/30 backdrop-blur-xl rounded-2xl mx-auto w-[94%] max-w-4xl mb-2 flex items-center justify-between flex-shrink-0 shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-indigo-300 dark:border-indigo-800 bg-white shadow-md">
              <img src={selectedImage} alt="Selection Preview" className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 block">Visual Resource Attached</span>
              <span className="text-[10px] text-slate-400 font-semibold block">Ready for StudyMate AI analysis</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onRemoveImage}
            className="p-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-500 rounded-full hover:bg-rose-100 transition cursor-pointer"
            title="Remove Attachment"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
}

export default ImageUploader;
