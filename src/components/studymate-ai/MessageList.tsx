import React, { RefObject, useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Globe, ArrowDown, Image as ImageIcon } from "lucide-react";
import { ChatMessage, VideoSettings } from "./types";
import { MessageBubble } from "./MessageBubble";
import { PremiumErrorCard } from "../PremiumErrorCard";

interface MessageListProps {
  scrollRef: RefObject<HTMLDivElement | null>;
  messages: ChatMessage[];
  isLoading: boolean;
  isWebSearching: boolean;
  isGeneratingImage?: boolean;
  errorMessage: string | null;
  errorCode?: string | null;
  onClearError: () => void;
  onRetryRequest?: () => void;
  onCancelRequest: () => void;
  onCopyText: (text: string) => void;
  onSpeakText: (text: string, msgId: string) => void;
  speakingMsgId: string | null;
  suggestions: Array<{ label: string; text: string }>;
  onSelectSuggestion: (text: string) => void;
  onJumpToCitation?: (docName: string, pageNumber: number, snippet?: string) => void;
  onRequestVideoLesson?: (messageId: string, topicText: string) => void;
  onSubmitVideoSettings?: (forMessageId: string, settings: VideoSettings) => void;
  onCancelVideoLecture?: (jobId: string, messageId: string) => void;
  onQuickAction?: (actionPrompt: string) => void;
  onSaveQuizToWorkspace?: (quiz: any) => void;
  onSaveFlashcardsToWorkspace?: (deck: any) => void;
  onOpenSettings?: () => void;
  onSignIn?: () => void;
}

export const MessageList = React.memo(function MessageList({
  scrollRef,
  messages,
  isLoading,
  isWebSearching,
  isGeneratingImage,
  errorMessage,
  errorCode,
  onClearError,
  onRetryRequest,
  onCancelRequest,
  onCopyText,
  onSpeakText,
  speakingMsgId,
  suggestions,
  onSelectSuggestion,
  onJumpToCitation,
  onRequestVideoLesson,
  onSubmitVideoSettings,
  onCancelVideoLecture,
  onQuickAction,
  onSaveQuizToWorkspace,
  onSaveFlashcardsToWorkspace,
  onOpenSettings,
  onSignIn
}: MessageListProps) {
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const isAtBottomRef = useRef(true);
  const prevMessagesLengthRef = useRef(messages.length);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const isFarFromBottom = distanceFromBottom > 300;
    
    if (!isFarFromBottom) {
      setUnreadCount(0);
    }
    
    isAtBottomRef.current = distanceFromBottom < 100;
    setShowScrollToBottom(isFarFromBottom && messages.length > 2);
  }, [messages.length, scrollRef]);

  // Track unread messages arriving while scrolled up
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current) {
      const newCount = messages.length - prevMessagesLengthRef.current;
      if (!isAtBottomRef.current) {
        setUnreadCount((prev) => prev + newCount);
      }
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length]);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth"
      });
      setUnreadCount(0);
      setShowScrollToBottom(false);
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
      {messages.map((msg, index) => (
        <MessageBubble
          key={`msg-${msg.id || 'id'}-${index}`}
          msg={msg}
          onCopyText={onCopyText}
          onSpeakText={onSpeakText}
          isSpeaking={speakingMsgId === msg.id}
          onJumpToCitation={onJumpToCitation}
          onRequestVideoLesson={onRequestVideoLesson}
          onSubmitVideoSettings={onSubmitVideoSettings}
          onCancelVideoLecture={onCancelVideoLecture}
          onQuickAction={onQuickAction}
          onSaveQuizToWorkspace={onSaveQuizToWorkspace}
          onSaveFlashcardsToWorkspace={onSaveFlashcardsToWorkspace}
        />
      ))}

      {/* AI Thinking/Processing Stream Indicator */}
      {isLoading && (
        <motion.div 
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center space-x-1.5 my-1 pl-1"
        >
          <div className="inline-flex items-center space-x-1.5 bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/60 rounded-full px-2.5 py-0.5 shadow-2xs text-[10px] font-semibold text-slate-700 dark:text-slate-300 max-w-full">
            <div className="flex space-x-0.5 shrink-0">
              <div className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-1 h-1 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-1 h-1 bg-pink-500 rounded-full animate-bounce" />
            </div>

            <span className="truncate max-w-[130px] sm:max-w-[240px] text-[10px] font-semibold">
              {isGeneratingImage ? (
                <span className="inline-flex items-center gap-1">
                  <ImageIcon className="w-2.5 h-2.5 text-amber-500 animate-pulse shrink-0" />
                  Generating visual...
                </span>
              ) : isWebSearching ? (
                <span className="inline-flex items-center gap-1">
                  <Globe className="w-2.5 h-2.5 text-indigo-500 animate-pulse shrink-0" />
                  Searching web...
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-indigo-500 animate-pulse shrink-0" />
                  Thinking...
                </span>
              )}
            </span>

            <button
              type="button"
              onClick={onCancelRequest}
              className="text-[9px] font-extrabold text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-1 py-0.2 rounded transition cursor-pointer shrink-0"
              title="Cancel Generation"
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
            error={errorMessage}
            errorCode={errorCode || undefined}
            onRetry={() => {
              onClearError();
              onRetryRequest?.();
            }}
            onOpenSettings={onOpenSettings}
            onSignIn={onSignIn}
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
          <div className="sticky bottom-4 right-4 ml-auto z-30 pointer-events-none flex justify-end w-fit">
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 10 }}
              transition={{ duration: 0.15 }}
            >
              <button
                type="button"
                onClick={scrollToBottom}
                aria-label="Scroll to latest messages"
                className="pointer-events-auto w-11 h-11 rounded-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white shadow-lg hover:shadow-indigo-500/30 active:scale-95 transition-all duration-200 cursor-pointer border border-indigo-400/30 flex items-center justify-center relative backdrop-blur-md"
              >
                <ArrowDown className="w-5 h-5 text-white" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-xs animate-pulse">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default MessageList;
