import React, { RefObject } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Send, Camera, Image as ImageIcon, CloudUpload, FileText, Mic } from "lucide-react";
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
  isListening?: boolean;
  onToggleVoice?: () => void;
  selectedModel?: string;
  setSelectedModel?: (val: string) => void;
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
  onSend,
  isListening,
  onToggleVoice,
  selectedModel = "gemini-2.5-flash",
  setSelectedModel
}: PromptInputProps) {
  return (
    <div className="p-2 sm:p-3 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl border-t border-slate-200/70 dark:border-slate-800/80 shrink-0 z-20 w-full">
      <form 
        onSubmit={onSend}
        className="bg-white/95 dark:bg-[#0c1326]/95 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-lg rounded-2xl p-1.5 md:p-2 mx-auto w-full max-w-4xl flex items-center space-x-2 relative"
      >
        {/* ATTACHMENT BUTTON WITH POPUP MENU */}
        <div className="relative shrink-0">
          {showPlusMenu && (
            <div 
              className="fixed inset-0 z-40 bg-transparent" 
              onClick={() => setShowPlusMenu(false)} 
            />
          )}

          <button
            type="button"
            onClick={() => setShowPlusMenu(!showPlusMenu)}
            className={`p-2 md:p-2.5 rounded-xl border transition-all duration-150 cursor-pointer relative z-50 ${
              showPlusMenu 
                ? "bg-purple-600 text-white border-purple-600 rotate-45 shadow-sm" 
                : "bg-slate-100/90 dark:bg-slate-800/70 border-slate-200/70 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-slate-200 dark:hover:bg-slate-800"
            }`}
            title="Attachments"
          >
            <Plus className="w-4 h-4 transition-transform duration-150" />
          </button>

          {/* Attachment Popup Menu */}
          <AnimatePresence>
            {showPlusMenu && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.12 }}
                className="absolute bottom-12 left-0 w-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 shadow-2xl z-50 space-y-1"
              >
                <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Attachments</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowPlusMenu(false);
                    onStartCamera();
                  }}
                  className="w-full p-2 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-xl flex items-center space-x-2.5 transition text-left cursor-pointer group"
                >
                  <div className="p-1.5 bg-gradient-to-tr from-purple-500 to-indigo-600 text-white rounded-lg">
                    <Camera className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-purple-600 dark:group-hover:text-purple-400">
                    Scan Homework
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowPlusMenu(false);
                    fileInputRef.current?.click();
                  }}
                  className="w-full p-2 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-xl flex items-center space-x-2.5 transition text-left cursor-pointer group"
                >
                  <div className="p-1.5 bg-gradient-to-tr from-indigo-500 to-blue-600 text-white rounded-lg">
                    <ImageIcon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-purple-600 dark:group-hover:text-purple-400">
                    Gallery Image
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowPlusMenu(false);
                    onOpenDriveModal();
                  }}
                  className="w-full p-2 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-xl flex items-center space-x-2.5 transition text-left cursor-pointer group"
                >
                  <div className="p-1.5 bg-gradient-to-tr from-emerald-500 to-teal-600 text-white rounded-lg">
                    <CloudUpload className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-purple-600 dark:group-hover:text-purple-400">
                    Drive PDF
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowPlusMenu(false);
                    pdfFileInputRef.current?.click();
                  }}
                  className="w-full p-2 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-xl flex items-center space-x-2.5 transition text-left cursor-pointer group"
                >
                  <div className="p-1.5 bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white rounded-lg">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-purple-600 dark:group-hover:text-purple-400">
                    Local Document
                  </span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* TEXT FIELD CONTAINER WITH MICROPHONE INSIDE */}
        <div className="relative flex-1 flex items-center min-w-0">
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
            className="w-full bg-transparent border-none pl-3 pr-9 py-2 text-xs md:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none font-medium"
            disabled={isLoading}
          />

          {/* Microphone Inside Text Field */}
          <button
            type="button"
            onClick={onToggleVoice}
            className={`absolute right-1.5 p-1.5 rounded-full transition cursor-pointer ${
              isListening
                ? "bg-rose-500 text-white animate-pulse shadow-xs"
                : "text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
            title="Voice Input"
          >
            <Mic className="w-4 h-4" />
          </button>
        </div>

        {/* AI MODEL SELECTOR INSIDE COMPOSER */}
        <div className="shrink-0 hidden sm:flex items-center">
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel?.(e.target.value)}
            className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 font-bold text-[11px] px-2.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 focus:outline-none cursor-pointer"
            title="Select AI Model"
          >
            <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
            <option value="gemini-2.5-pro">Gemini Pro</option>
            <option value="auto">Auto AI</option>
            <option value="gpt-4o">GPT-4o</option>
          </select>
        </div>

        {/* PURPLE SEND BUTTON */}
        <button
          type="submit"
          disabled={isLoading || (!inputText.trim() && !selectedImage && !attachedPdf)}
          className={`p-2.5 md:p-3 rounded-xl text-white font-bold flex items-center justify-center transition-all duration-200 shrink-0 shadow-md ${
            (inputText.trim() || selectedImage || attachedPdf) && !isLoading
              ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 cursor-pointer shadow-purple-500/20 active:scale-95"
              : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed"
          }`}
          title="Send Message"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

export default PromptInput;
