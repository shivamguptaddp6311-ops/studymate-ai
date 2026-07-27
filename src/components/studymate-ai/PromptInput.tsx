import React, { RefObject } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Send, Camera, Image as ImageIcon, CloudUpload, FileText } from "lucide-react";
import { AttachedPdf } from "./PDFUploader";

interface PromptInputProps {
  inputText: string;
  setInputText: (val: string) => void;
  isLoading: boolean;
  selectedImage: string | null;
  attachedPdf: AttachedPdf | null;
  showPlusMenu: boolean;
  setShowPlusMenu: (val: boolean) => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  pdfFileInputRef: RefObject<HTMLInputElement | null>;
  onStartCamera: () => void;
  onOpenDriveModal: () => void;
  onSend: (e?: React.FormEvent) => void;
}

export function PromptInput({
  inputText,
  setInputText,
  isLoading,
  selectedImage,
  attachedPdf,
  showPlusMenu,
  setShowPlusMenu,
  fileInputRef,
  pdfFileInputRef,
  onStartCamera,
  onOpenDriveModal,
  onSend
}: PromptInputProps) {
  return (
    <div className="p-2 sm:p-3 bg-white/40 dark:bg-slate-950/40 backdrop-blur-md border-t border-white/20 dark:border-slate-800/60 flex-shrink-0 z-20 relative w-full pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <form 
        onSubmit={onSend}
        className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-white/50 dark:border-slate-800/90 shadow-[0_15px_40px_rgba(0,0,0,0.12)] rounded-full p-1.5 sm:p-2 mx-auto w-full max-w-4xl flex items-center space-x-2"
      >
        {/* SINGLE PLUS ICON BUTTON WITH POPUP ATTACHMENT MENU */}
        <div className="relative pl-1">
          {/* Backdrop to close plus menu when clicking outside */}
          {showPlusMenu && (
            <div 
              className="fixed inset-0 z-40 bg-transparent" 
              onClick={() => setShowPlusMenu(false)} 
            />
          )}

          <button
            type="button"
            onClick={() => setShowPlusMenu(!showPlusMenu)}
            className={`p-2.5 rounded-full border transition-all duration-200 cursor-pointer shadow-xs relative z-50 ${
              showPlusMenu 
                ? "bg-indigo-600 text-white border-indigo-600 rotate-45 shadow-md shadow-indigo-500/30" 
                : "bg-slate-100/80 dark:bg-slate-800/50 border-slate-200/50 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
            }`}
            title="Add Camera, Gallery Photo, or Drive PDF"
          >
            <Plus className="w-4 h-4 transition-transform duration-200" />
          </button>

          {/* Floating Plus Action Menu */}
          <AnimatePresence>
            {showPlusMenu && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-12 left-0 w-64 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-white/40 dark:border-slate-800 rounded-3xl p-2 shadow-2xl z-50 space-y-1"
              >
                <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Attachments</span>
                  <span className="text-[9px] font-bold text-indigo-500">StudyMate</span>
                </div>

                {/* Camera Homework Scanner Option */}
                <button
                  type="button"
                  onClick={() => {
                    setShowPlusMenu(false);
                    onStartCamera();
                  }}
                  className="w-full p-2.5 hover:bg-indigo-50/80 dark:hover:bg-indigo-950/40 rounded-2xl flex items-center space-x-3 transition text-left cursor-pointer group"
                >
                  <div className="p-2 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-600 text-white rounded-xl shadow-xs group-hover:scale-105 transition">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex items-center gap-1.5">
                      Scan Homework
                      <span className="text-[8px] bg-purple-500/20 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded-md font-black">AI VISION</span>
                    </span>
                    <span className="text-[9px] text-slate-400 font-medium block">
                      Solve, Explain, Summarize, Flashcards & Quiz
                    </span>
                  </div>
                </button>

                {/* Gallery Option */}
                <button
                  type="button"
                  onClick={() => {
                    setShowPlusMenu(false);
                    fileInputRef.current?.click();
                  }}
                  className="w-full p-2.5 hover:bg-indigo-50/80 dark:hover:bg-indigo-950/40 rounded-2xl flex items-center space-x-3 transition text-left cursor-pointer group"
                >
                  <div className="p-2 bg-gradient-to-tr from-purple-500 to-pink-600 text-white rounded-xl shadow-xs group-hover:scale-105 transition">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                      Gallery Photo
                    </span>
                    <span className="text-[9px] text-slate-400 font-medium block">
                      Upload image from device gallery
                    </span>
                  </div>
                </button>

                {/* Upload PDF from Drive Option */}
                <button
                  type="button"
                  onClick={() => {
                    setShowPlusMenu(false);
                    onOpenDriveModal();
                  }}
                  className="w-full p-2.5 hover:bg-indigo-50/80 dark:hover:bg-indigo-950/40 rounded-2xl flex items-center space-x-3 transition text-left cursor-pointer group"
                >
                  <div className="p-2 bg-gradient-to-tr from-emerald-500 to-teal-600 text-white rounded-xl shadow-xs group-hover:scale-105 transition">
                    <CloudUpload className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex items-center gap-1">
                      Upload PDF from Drive
                      <span className="text-[8px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-md font-black">NEW</span>
                    </span>
                    <span className="text-[9px] text-slate-400 font-medium block">
                      Import Google Drive PDF document
                    </span>
                  </div>
                </button>

                {/* Local Document Option */}
                <button
                  type="button"
                  onClick={() => {
                    setShowPlusMenu(false);
                    pdfFileInputRef.current?.click();
                  }}
                  className="w-full p-2.5 hover:bg-indigo-50/80 dark:hover:bg-indigo-950/40 rounded-2xl flex items-center space-x-3 transition text-left cursor-pointer group"
                >
                  <div className="p-2 bg-gradient-to-tr from-cyan-500 to-blue-600 text-white rounded-xl shadow-xs group-hover:scale-105 transition">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                      Local PDF Document
                    </span>
                    <span className="text-[9px] text-slate-400 font-medium block">
                      Attach document from computer
                    </span>
                  </div>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

        {/* Prompt Input Field */}
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            selectedImage 
              ? "Describe what to solve in the image..." 
              : attachedPdf
                ? `Ask a question about ${attachedPdf.name}...`
                : "Ask StudyMate AI anything..."
          }
          className="flex-1 bg-transparent border-none rounded-full px-3 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none font-medium"
          disabled={isLoading}
        />

        {/* Send Button */}
        <button
          type="submit"
          disabled={isLoading || (!inputText.trim() && !selectedImage && !attachedPdf)}
          className={`p-3 rounded-full text-white font-bold flex items-center justify-center transition-all duration-300 shrink-0 shadow-md ${
            (inputText.trim() || selectedImage || attachedPdf) && !isLoading
              ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 hover:scale-105 cursor-pointer shadow-indigo-500/20"
              : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed"
          }`}
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

export default PromptInput;
