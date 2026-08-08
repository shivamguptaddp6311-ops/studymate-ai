import React, { RefObject, useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Send, Camera, Image as ImageIcon, CloudUpload, FileText, Mic, ChevronDown, Check } from "lucide-react";
import { AttachedPdf } from "./PDFUploader";

const MODEL_OPTIONS = [
  { id: "auto", label: "⚡ Auto", fullName: "Auto (Smart Selector)" },
  { id: "openai", label: "🧠 OpenAI", fullName: "OpenAI GPT-4o Mini" },
  { id: "gemini", label: "♊ Gemini", fullName: "Google Gemini 2.5 Flash" },
  { id: "claude", label: "🦉 Claude", fullName: "Anthropic Claude 3.5 Sonnet" },
  { id: "groq", label: "⚡ Groq", fullName: "Groq (Llama 3.3 Fast)" },
  { id: "grok", label: "🚀 Grok", fullName: "xAI Grok 3" },
  { id: "deepseek", label: "🐋 DeepSeek", fullName: "DeepSeek V3 / R1" },
  { id: "openrouter", label: "🌐 OpenRouter", fullName: "OpenRouter Multi-Model" },
];

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
  onSend: (textToSend?: string, e?: React.FormEvent) => void;
  isListening?: boolean;
  onToggleVoice?: () => void;
  selectedModel?: string;
  setSelectedModel?: (val: string) => void;
}

export const PromptInput = React.memo(function PromptInput({
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
  selectedModel = "auto",
  setSelectedModel
}: PromptInputProps) {
  const [localInputText, setLocalInputText] = useState(inputText);

  // Sync local input state when parent updates inputText externally (e.g. prefill, suggestions, voice)
  useEffect(() => {
    setLocalInputText(inputText);
  }, [inputText]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!localInputText.trim() && !selectedImage && !attachedPdf) || isLoading) return;
    const textToSend = localInputText;
    setLocalInputText("");
    onSend(textToSend, e);
  };

  return (
    <div className="footer-safe p-2 sm:p-3 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl border-t border-slate-200/70 dark:border-slate-800/80 shrink-0 z-20 w-full">
      <form 
        onSubmit={handleSubmit}
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
            value={localInputText}
            onChange={(e) => setLocalInputText(e.target.value)}
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
        {(() => {
          const [showModelPopover, setShowModelPopover] = useState(false);
          const currentModelObj = MODEL_OPTIONS.find((m) => m.id === selectedModel) || MODEL_OPTIONS[0];

          return (
            <div className="shrink-0 hidden sm:flex items-center relative">
              {showModelPopover && (
                <div
                  className="fixed inset-0 z-40 bg-transparent"
                  onClick={() => setShowModelPopover(false)}
                />
              )}

              <button
                type="button"
                onClick={() => setShowModelPopover(!showModelPopover)}
                className="bg-slate-100/90 dark:bg-slate-800/80 hover:bg-slate-200/90 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 font-bold text-[11px] px-2.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 transition cursor-pointer flex items-center space-x-1.5 relative z-50 shadow-2xs"
                title="Select AI Model"
              >
                <span>{currentModelObj.label}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${showModelPopover ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {showModelPopover && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.12 }}
                    className="absolute bottom-11 right-0 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 shadow-2xl z-50 space-y-0.5"
                  >
                    <div className="px-2.5 py-1 border-b border-slate-100 dark:border-slate-800 mb-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Select AI Model</span>
                    </div>
                    {MODEL_OPTIONS.map((m) => {
                      const isSelected = selectedModel === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setSelectedModel?.(m.id);
                            setShowModelPopover(false);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-xl transition flex items-center justify-between text-xs cursor-pointer ${
                            isSelected
                              ? "bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 font-bold border border-purple-200/60 dark:border-purple-800/60"
                              : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 font-semibold"
                          }`}
                        >
                          <div className="flex items-center space-x-1.5">
                            <span>{m.fullName}</span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0 ml-1" />}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })()}

        {/* PURPLE SEND BUTTON */}
        <button
          type="submit"
          disabled={isLoading || (!localInputText.trim() && !selectedImage && !attachedPdf)}
          className={`p-2.5 md:p-3 rounded-xl text-white font-bold flex items-center justify-center transition-all duration-200 shrink-0 shadow-md ${
            (localInputText.trim() || selectedImage || attachedPdf) && !isLoading
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
});

export default PromptInput;
