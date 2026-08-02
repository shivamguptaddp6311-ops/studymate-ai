import React, { useState } from "react";
import { motion } from "motion/react";
import { 
  Sparkles, Check, Globe, Volume2, VolumeX, Copy, ExternalLink, CloudUpload, Video, Loader2, StopCircle, AlertCircle
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { ChatMessage, VideoSettings } from "./types";
import { VideoSettingsPicker } from "./VideoSettingsPicker";

interface ChatMessageBubbleProps {
  msg: ChatMessage;
  onCopyText: (text: string) => void;
  onSpeakText: (text: string, msgId: string) => void;
  isSpeaking: boolean;
  onJumpToCitation?: (docName: string, pageNumber: number) => void;
  onRequestVideoLesson?: (messageId: string, topicText: string) => void;
  onSubmitVideoSettings?: (forMessageId: string, settings: VideoSettings) => void;
  onCancelVideoLecture?: (jobId: string, messageId: string) => void;
  onQuickAction?: (actionPrompt: string) => void;
}

export const MessageBubble = React.memo(function MessageBubble({ 
  msg, 
  onCopyText, 
  onSpeakText,
  isSpeaking,
  onJumpToCitation,
  onRequestVideoLesson,
  onSubmitVideoSettings,
  onCancelVideoLecture,
  onQuickAction
}: ChatMessageBubbleProps) {
  const isUser = msg?.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (msg?.text) {
      onCopyText(msg.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getFormattedTime = () => {
    try {
      if (!msg?.timestamp) return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const d = msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp);
      return isNaN(d.getTime()) 
        ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
        : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return "";
    }
  };
  
  if (!msg) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", damping: 25, stiffness: 350 }}
      className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-1.5 w-full my-1`}
    >
      {/* Sender Header Label & Timestamp */}
      <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 px-2">
        {isUser ? (
          <>
            <span className="font-extrabold text-indigo-600 dark:text-indigo-400">You</span>
            <span className="w-1 h-1 rounded-full bg-indigo-400/50" />
            <span className="font-mono text-[9px]">{getFormattedTime()}</span>
          </>
        ) : (
          <>
            <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 animate-pulse shrink-0 flex items-center justify-center shadow-xs">
              <Sparkles className="w-2.5 h-2.5 text-white" />
            </div>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 dark:from-indigo-400 dark:to-purple-300 font-extrabold">
              StudyMate AI
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
            <span className="font-mono text-[9px]">{getFormattedTime()}</span>
            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              {msg.providerUsed ? (
                msg.providerUsed.toLowerCase().includes("anthropic") || msg.providerUsed.toLowerCase().includes("claude") ? "Claude" :
                msg.providerUsed.toLowerCase().includes("groq") || msg.providerUsed.toLowerCase().includes("grok") ? "Grok" :
                msg.providerUsed.toLowerCase().includes("openai") || msg.providerUsed.toLowerCase().includes("gpt") ? "OpenAI" :
                msg.providerUsed.toLowerCase().includes("openrouter") ? "OpenRouter" :
                msg.providerUsed.toLowerCase().includes("fal") ? "Fal" : "Gemini"
              ) : "Gemini"}
            </span>
          </>
        )}
      </div>

      {/* Floating Glass Message Card */}
      <div
        className={`max-w-[88%] md:max-w-[78%] rounded-3xl p-4 md:p-5 text-sm leading-relaxed transition-all duration-300 relative group overflow-hidden ${
          isUser
            ? "bg-gradient-to-br from-indigo-600/95 via-indigo-600 to-purple-600/95 text-white rounded-tr-sm border border-indigo-400/30 shadow-[0_10px_30px_rgba(99,102,241,0.18)] font-medium"
            : "bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl text-slate-800 dark:text-slate-100 rounded-tl-sm border border-white/30 dark:border-slate-800/80 shadow-md"
        }`}
      >
        {/* Subtle background ambient highlight for AI bubble */}
        {!isUser && (
          <div className="absolute top-0 left-0 w-36 h-36 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent blur-2xl pointer-events-none rounded-full" />
        )}

        {/* Attached or Generated image preview */}
        {msg.image && (
          <div className="mb-3.5 max-w-md rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 shadow-lg relative group bg-slate-900/10 dark:bg-slate-950/40">
            <img 
              src={msg.image} 
              alt={isUser ? "Attached Visual" : "Generated AI Image"} 
              className="w-full h-auto max-h-[360px] object-contain transition-all duration-300 group-hover:scale-[1.02]" 
              referrerPolicy="no-referrer"
            />
            <div className="absolute top-2.5 right-2.5 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full text-[10px] text-white font-extrabold flex items-center gap-1.5 shadow-md">
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>{isUser ? "Attached Image" : "AI Generated Image"}</span>
            </div>
          </div>
        )}

        {/* Generated Video Player */}
        {msg.videoUrl && (
          <div className="mb-3.5 max-w-md rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 shadow-lg relative group bg-slate-900/20 dark:bg-slate-950/60">
            <video
              src={msg.videoUrl}
              controls
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-auto max-h-[360px] object-contain rounded-2xl"
            />
            <div className="absolute top-2.5 right-2.5 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full text-[10px] text-white font-extrabold flex items-center gap-1.5 shadow-md">
              <Sparkles className="w-3 h-3 text-pink-400" />
              <span>AI Video Rendered</span>
            </div>
          </div>
        )}

        {/* Attached PDF Preview */}
        {msg.pdf && (
          <div className="mb-3.5 max-w-sm rounded-2xl p-3 bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/60 dark:border-slate-700/60 shadow-md flex items-center space-x-3">
            <div className="p-2.5 bg-gradient-to-tr from-emerald-500 to-teal-600 text-white rounded-xl shadow-xs shrink-0">
              <CloudUpload className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-1.5">
                <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  {msg.pdf.source}
                </span>
              </div>
              <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100 truncate mt-0.5">
                {msg.pdf.name}
              </p>
              {msg.pdf.size && (
                <p className="text-[10px] text-slate-400 font-medium">{msg.pdf.size}</p>
              )}
            </div>
            {msg.pdf.url && (
              <a
                href={msg.pdf.url}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-lg transition shrink-0"
                title="Open PDF Document"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        )}

        {/* Formatted Markdown Content */}
        {msg.text && msg.text.trim().length > 0 && (
          <div className={`prose dark:prose-invert max-w-none text-xs md:text-sm leading-relaxed ${
            isUser 
              ? "text-white prose-headings:text-white prose-p:text-indigo-50/95 prose-strong:text-white prose-a:text-white hover:prose-a:opacity-80" 
              : "text-slate-800 dark:text-slate-200 prose-headings:text-slate-900 dark:prose-headings:text-white prose-p:leading-relaxed prose-strong:text-indigo-600 dark:prose-strong:text-indigo-400 prose-a:text-indigo-500 hover:prose-a:underline"
          }`}>
            <ReactMarkdown>{msg.text}</ReactMarkdown>
          </div>
        )}

        {/* Verified Search Sources */}
        {!isUser && msg.searched && (
          <div className="mt-4 pt-3.5 border-t border-slate-200/50 dark:border-slate-800/50 space-y-2">
            <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              <Globe className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
              <span>Verified Web Sources ({msg.sources?.length || 0})</span>
            </div>
            {msg.sources && msg.sources.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {msg.sources.map((source, idx) => (
                  <a
                    key={idx}
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    referrerPolicy="no-referrer"
                    className="flex items-center space-x-1.5 bg-slate-50/80 hover:bg-indigo-50 dark:bg-slate-950/50 dark:hover:bg-indigo-950/30 border border-slate-200/60 hover:border-indigo-300 dark:border-slate-800/60 dark:hover:border-indigo-900/60 px-2.5 py-1 rounded-lg text-xs text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition duration-200 shadow-xs shrink-0"
                  >
                    <span className="w-4 h-4 rounded bg-indigo-100 dark:bg-indigo-950 text-[9px] font-bold flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                      {idx + 1}
                    </span>
                    <span className="max-w-[150px] truncate">{source.title}</span>
                  </a>
                ))}
              </div>
            ) : msg.searchError ? (
              <p className="text-[10px] text-rose-500 dark:text-rose-400 font-medium flex items-center space-x-1">
                <span>⚠️</span>
                <span>Live search failed. Answer served from AI knowledge base.</span>
              </p>
            ) : (
              <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">No direct sources linked.</p>
            )}
          </div>
        )}

        {/* Inline Video Settings Picker Card */}
        {msg.videoSettingsPicker && onSubmitVideoSettings && (
          <div className="my-2">
            <VideoSettingsPicker
              data={msg.videoSettingsPicker}
              onSubmit={(settings) => onSubmitVideoSettings(msg.videoSettingsPicker!.forMessageId, settings)}
            />
          </div>
        )}

        {/* Multi-segment Video Lecture Display */}
        {msg.videoSegments && msg.videoSegments.length > 0 && (
          <div className="my-3 space-y-3">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/50 dark:border-slate-800/50">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-500 flex items-center gap-1">
                <Video className="w-3.5 h-3.5" />
                <span>Video Lesson ({msg.videoSegments.length} {msg.videoSegments.length === 1 ? "part" : "parts"})</span>
              </span>

              {/* Stop / Cancel button if any segment is running */}
              {onCancelVideoLecture && msg.lectureJobId && msg.videoSegments.some(s => s.status === "pending" || s.status === "generating") && (
                <button
                  type="button"
                  onClick={() => onCancelVideoLecture(msg.lectureJobId!, msg.id)}
                  className="px-2 py-0.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                >
                  <StopCircle className="w-3 h-3 text-rose-500" />
                  <span>Stop Generation</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3">
              {msg.videoSegments.map((seg, idx) => (
                <div 
                  key={idx}
                  className="rounded-2xl p-3 bg-slate-900/90 text-white border border-slate-800 shadow-md relative overflow-hidden"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-200 truncate pr-2">
                      {seg.label || `Part ${seg.order} of ${seg.total}`}
                    </span>
                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      seg.status === "completed" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                      seg.status === "failed" ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" :
                      "bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse"
                    }`}>
                      {seg.status}
                    </span>
                  </div>

                  {seg.status === "completed" && seg.videoUrl && (
                    <div className="rounded-xl overflow-hidden border border-slate-700 bg-black relative">
                      <video
                        src={seg.videoUrl}
                        controls
                        autoPlay={idx === 0}
                        loop
                        muted
                        playsInline
                        className="w-full h-auto max-h-[300px] object-contain rounded-xl"
                      />
                    </div>
                  )}

                  {(seg.status === "pending" || seg.status === "generating") && (
                    <div className="p-6 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col items-center justify-center space-y-2 text-center">
                      <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
                      <p className="text-xs font-extrabold text-indigo-300 animate-pulse">
                        Rendering {seg.label || `Part ${seg.order} of ${seg.total}`}...
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Generating frame motion, lighting, and camera motion
                      </p>
                    </div>
                  )}

                  {seg.status === "failed" && (
                    <div className="p-3 rounded-xl border border-rose-900/50 bg-rose-950/30 text-rose-300 text-xs flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>This video segment could not be completed.</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick AI Actions for AI responses */}
        {!isUser && msg.text && msg.text.trim().length > 30 && (
          <div className="mt-3 pt-2 border-t border-slate-200/30 dark:border-slate-800/40 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <button
              type="button"
              onClick={() => onQuickAction?.(`Summarize the following response into key bullet points:\n\n${msg.text}`)}
              className="px-2 py-0.5 bg-slate-100 hover:bg-purple-50 dark:bg-slate-800 dark:hover:bg-purple-950/40 text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-300 border border-slate-200/60 dark:border-slate-700/60 rounded-lg text-[10px] font-bold transition shrink-0 cursor-pointer"
            >
              📝 Summarize
            </button>

            <button
              type="button"
              onClick={() => onQuickAction?.(`Explain the following response in much simpler terms with a real-world analogy:\n\n${msg.text}`)}
              className="px-2 py-0.5 bg-slate-100 hover:bg-purple-50 dark:bg-slate-800 dark:hover:bg-purple-950/40 text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-300 border border-slate-200/60 dark:border-slate-700/60 rounded-lg text-[10px] font-bold transition shrink-0 cursor-pointer"
            >
              💡 Explain Simpler
            </button>

            <button
              type="button"
              onClick={() => onQuickAction?.(`Generate a 5-question practice quiz based on this content:\n\n${msg.text}`)}
              className="px-2 py-0.5 bg-slate-100 hover:bg-purple-50 dark:bg-slate-800 dark:hover:bg-purple-950/40 text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-300 border border-slate-200/60 dark:border-slate-700/60 rounded-lg text-[10px] font-bold transition shrink-0 cursor-pointer"
            >
              🎯 Make Quiz
            </button>

            <button
              type="button"
              onClick={() => onQuickAction?.(`Create 5 high-yield revision flashcards for this topic:\n\n${msg.text}`)}
              className="px-2 py-0.5 bg-slate-100 hover:bg-purple-50 dark:bg-slate-800 dark:hover:bg-purple-950/40 text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-300 border border-slate-200/60 dark:border-slate-700/60 rounded-lg text-[10px] font-bold transition shrink-0 cursor-pointer"
            >
              🃏 Flashcards
            </button>

            <button
              type="button"
              onClick={() => onQuickAction?.(`Translate the following explanation into simple Hindi and English bilingual format:\n\n${msg.text}`)}
              className="px-2 py-0.5 bg-slate-100 hover:bg-purple-50 dark:bg-slate-800 dark:hover:bg-purple-950/40 text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-300 border border-slate-200/60 dark:border-slate-700/60 rounded-lg text-[10px] font-bold transition shrink-0 cursor-pointer"
            >
              🌐 Translate
            </button>

            <button
              type="button"
              onClick={() => {
                try {
                  const saved = JSON.parse(localStorage.getItem("studymate_saved_notes") || "[]");
                  const newNotes = [msg.text.slice(0, 150) + "...", ...saved];
                  localStorage.setItem("studymate_saved_notes", JSON.stringify(newNotes));
                  alert("Saved to Study Notes!");
                } catch {
                  // ignore
                }
              }}
              className="px-2 py-0.5 bg-slate-100 hover:bg-purple-50 dark:bg-slate-800 dark:hover:bg-purple-950/40 text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-300 border border-slate-200/60 dark:border-slate-700/60 rounded-lg text-[10px] font-bold transition shrink-0 cursor-pointer"
            >
              📌 Save to Notes
            </button>

            <button
              type="button"
              onClick={() => onQuickAction?.(`Continue expanding in deeper academic detail on this response:\n\n${msg.text}`)}
              className="px-2 py-0.5 bg-slate-100 hover:bg-purple-50 dark:bg-slate-800 dark:hover:bg-purple-950/40 text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-300 border border-slate-200/60 dark:border-slate-700/60 rounded-lg text-[10px] font-bold transition shrink-0 cursor-pointer"
            >
              ➡️ Continue
            </button>
          </div>
        )}

        {/* Action Toolbar for AI responses */}
        {!isUser && (
          <div className="mt-3 pt-2.5 border-t border-slate-200/40 dark:border-slate-800/40 flex items-center justify-between opacity-80 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center space-x-2">
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-500" /> Adaptive Academic Model
              </span>

              {/* "🎬 Learn through video" Button */}
              {onRequestVideoLesson && msg.text && msg.text.trim().length > 80 && !msg.videoUrl && !msg.videoSegments && !msg.videoSettingsPicker && (
                <button
                  type="button"
                  onClick={() => onRequestVideoLesson(msg.id, msg.text)}
                  className="px-2.5 py-1 bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-indigo-500/20 border border-indigo-500/30 text-indigo-600 dark:text-indigo-300 hover:text-indigo-700 dark:hover:text-white rounded-xl text-xs font-extrabold transition flex items-center space-x-1.5 shadow-2xs group cursor-pointer"
                  title="Learn this topic through an interactive video lesson"
                >
                  <Video className="w-3.5 h-3.5 text-purple-500 group-hover:scale-110 transition-transform" />
                  <span>🎬 Learn through video</span>
                </button>
              )}
            </div>

            <div className="flex items-center space-x-1.5">
              {/* Voice Read Aloud */}
              <button
                type="button"
                onClick={() => onSpeakText(msg.text, msg.id)}
                className={`p-1.5 rounded-lg text-xs transition cursor-pointer flex items-center space-x-1 ${
                  isSpeaking 
                    ? "bg-indigo-500 text-white animate-pulse" 
                    : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                }`}
                title="Listen to Explanation"
              >
                {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>

              {/* Copy Response */}
              <button
                type="button"
                onClick={handleCopy}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs transition cursor-pointer flex items-center space-x-1"
                title="Copy text"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-[9px] font-bold text-emerald-500">Copied</span>
                  </>
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
});

export default MessageBubble;
