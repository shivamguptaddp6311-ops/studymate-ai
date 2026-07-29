import React, { RefObject, useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Globe, ArrowDown, Image as ImageIcon } from "lucide-react";
import { ChatMessage } from "./types";
import { MessageBubble } from "./MessageBubble";
import { PremiumErrorCard } from "../PremiumErrorCard";

interface MessageListProps {
  scrollRef: RefObject<HTMLDivElement | null>;
  messages: ChatMessage[];
  isLoading: boolean;
  isWebSearching: boolean;
  isGeneratingImage?: boolean;
  errorMessage: string | null;
  onClearError: () => void;
  onRetryRequest?: () => void;
  onCancelRequest: () => void;
  onCopyText: (text: string) => void;
  onSpeakText: (text: string) => void;
  speakingMsgId: string | null;
  suggestions: Array<{ label: string; text: string }>;
  onSelectSuggestion: (text: string) => void;
  onJumpToCitation?: (docName: string, pageNumber: number, snippet?: string) => void;
}

export function MessageList({
  scrollRef,
  messages,
  isLoading,
  isWebSearching,
  isGeneratingImage,
  errorMessage,
  onClearError,
  onRetryRequest,
  onCancelRequest,
  onCopyText,
  onSpeakText,
  speakingMsgId,
  suggestions,
  onSelectSuggestion,
  onJumpToCitation
}: MessageListProps) {
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const isAtBottomRef = useRef(true);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const isBottom = distanceFromBottom < 100;
    isAtBottomRef.current = isBottom;
    setShowScrollToBottom(!isBottom && messages.length > 2);
  }, [messages.length, scrollRef]);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [scrollRef]);

  useEffect(() => {
    if (isAtBottomRef.current || isLoading) {
      scrollToBottom();
    }
  }, [messages.length, isLoading, scrollToBottom]);

  useEffect(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  return (
    <div 
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar relative overscroll-contain select-text"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      {/* Messages rendering */}
      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          msg={msg}
          onCopyText={onCopyText}
          onSpeakText={onSpeakText}
          isSpeaking={speakingMsgId === "speaking"}
          onJumpToCitation={onJumpToCitation}
        />
      ))}

      {/* AI Thinking/Processing Stream Indicator */}
      {isLoading && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start space-x-3 my-2"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-0.5 animate-spin shrink-0">
            <div className="w-full h-full bg-white dark:bg-slate-900 rounded-full flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-indigo-500" />
            </div>
          </div>
          
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-slate-800 rounded-2xl rounded-tl-sm p-4 shadow-lg flex items-center space-x-3">
            <div className="flex space-x-1.5">
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" />
            </div>

            <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              {isGeneratingImage ? (
                <>
                  <ImageIcon className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                  Generating AI visual asset with multi-provider engine...
                </>
              ) : isWebSearching ? (
                <>
                  <Globe className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                  Searching real-time web sources...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                  Formulating step-by-step academic explanation...
                </>
              )}
            </span>

            <button
              type="button"
              onClick={onCancelRequest}
              className="ml-2 text-[10px] font-black text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-2 py-1 rounded-lg border border-rose-200 dark:border-rose-900/40 transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      {/* Error Card */}
      {errorMessage && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="my-2"
        >
          <PremiumErrorCard
            title="Communication Issue"
            description={errorMessage}
            onRetry={() => {
              onClearError();
              onRetryRequest?.();
            }}
          />
        </motion.div>
      )}

      {/* Dynamic Smart Suggestion Chips */}
      {!isLoading && suggestions.length > 0 && (
        <div className="pt-2 pb-1">
          <div className="flex items-center space-x-1.5 mb-2 px-1">
            <Sparkles className="w-3 h-3 text-indigo-500" />
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Suggested Next Prompts
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((sug, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectSuggestion(sug.text)}
                className="bg-white/60 hover:bg-indigo-50/90 dark:bg-slate-900/60 dark:hover:bg-indigo-950/40 border border-white/40 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-bold px-3 py-1.5 rounded-xl transition-all duration-200 shadow-2xs hover:shadow-md cursor-pointer flex items-center space-x-1"
              >
                <span>{sug.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Jump to bottom Floating Button */}
      <AnimatePresence>
        {showScrollToBottom && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="sticky bottom-2 left-1/2 -translate-x-1/2 z-30 flex justify-center pointer-events-none"
          >
            <button
              type="button"
              onClick={scrollToBottom}
              className="pointer-events-auto bg-slate-900/90 dark:bg-slate-100/90 text-white dark:text-slate-900 px-3.5 py-1.5 rounded-full shadow-2xl text-xs font-black flex items-center gap-1.5 hover:scale-105 active:scale-95 transition cursor-pointer backdrop-blur-md border border-white/20 dark:border-slate-800"
            >
              <ArrowDown className="w-3.5 h-3.5" />
              <span>Latest Messages</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default MessageList;
