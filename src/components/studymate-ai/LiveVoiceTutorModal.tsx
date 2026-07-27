import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  PhoneOff,
  Phone,
  Radio,
  X,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Zap,
  MessageSquareText,
  User,
  Bot,
  Flame,
  ShieldCheck
} from "lucide-react";
import { useLiveTutor, LiveTranscriptItem } from "../../hooks/useLiveTutor";
import { StudyMateBrainLogo } from "../NavIcons";

interface LiveVoiceTutorModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
}

export const LiveVoiceTutorModal: React.FC<LiveVoiceTutorModalProps> = ({
  isOpen,
  onClose,
  userName = "Student"
}) => {
  const {
    connectionState,
    isMuted,
    isSpeakerMuted,
    isAiSpeaking,
    isUserSpeaking,
    audioLevel,
    transcripts,
    errorMessage,
    startVoiceChat,
    endCall,
    toggleMute,
    toggleSpeakerMute,
    clearErrorMessage
  } = useLiveTutor();

  const transcriptScrollRef = useRef<HTMLDivElement>(null);

  // Auto-start session when modal opens
  useEffect(() => {
    if (isOpen && connectionState === "idle") {
      startVoiceChat();
    }
  }, [isOpen, connectionState, startVoiceChat]);

  // Auto-scroll transcript feed
  useEffect(() => {
    if (transcriptScrollRef.current) {
      transcriptScrollRef.current.scrollTop = transcriptScrollRef.current.scrollHeight;
    }
  }, [transcripts, isAiSpeaking, isUserSpeaking]);

  if (!isOpen) return null;

  const isConnected = connectionState === "connected";
  const isConnecting = connectionState === "connecting";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative w-full max-w-2xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh]"
        >
          {/* Ambient Glows */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-40 bg-indigo-600/15 blur-3xl pointer-events-none rounded-full" />
          <div className="absolute bottom-0 right-0 w-80 h-40 bg-purple-600/10 blur-3xl pointer-events-none rounded-full" />

          {/* Modal Header */}
          <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between z-10 bg-slate-900/60 backdrop-blur-md">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <StudyMateBrainLogo isActive={isConnected} size={36} />
                {isConnected && (
                  <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full shadow-md animate-pulse" />
                )}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="font-extrabold text-base sm:text-lg text-white tracking-tight">
                    StudyMate AI Voice Tutor
                  </h2>
                  <span className="text-[9px] font-black uppercase tracking-wider bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-2 py-0.5 rounded-full shadow-xs">
                    GEMINI LIVE
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5 font-medium">
                  <Radio className={`w-3 h-3 ${isConnected ? "text-emerald-400 animate-pulse" : "text-slate-500"}`} />
                  <span>
                    {isConnecting
                      ? "Connecting Live Session..."
                      : isConnected
                      ? "2-Way Real-time Audio (24kHz PCM)"
                      : "Disconnected"}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                endCall();
                onClose();
              }}
              className="p-2.5 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 rounded-2xl transition cursor-pointer"
              title="Close Live Voice Session"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mx-4 mt-4 p-3.5 bg-rose-950/60 border border-rose-800/80 rounded-2xl flex items-center justify-between text-xs text-rose-200 shadow-lg z-10">
              <div className="flex items-center space-x-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  clearErrorMessage();
                  startVoiceChat();
                }}
                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg transition flex items-center space-x-1 shrink-0 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry</span>
              </button>
            </div>
          )}

          {/* Visualizer & Orb Area */}
          <div className="p-6 flex flex-col items-center justify-center relative z-10 border-b border-slate-800/50 bg-slate-950/40 min-h-[170px] sm:min-h-[200px]">
            {/* Live Audio Waves & Orb */}
            <div className="relative flex items-center justify-center">
              {/* Outer Pulsing Rings */}
              <div
                className={`absolute w-36 h-36 rounded-full transition-all duration-300 ${
                  isAiSpeaking
                    ? "bg-purple-500/20 scale-125 animate-ping"
                    : isUserSpeaking
                    ? "bg-emerald-500/20 scale-110 animate-pulse"
                    : "bg-indigo-500/10 scale-100"
                }`}
              />
              <div
                className={`absolute w-28 h-28 rounded-full transition-all duration-300 ${
                  isAiSpeaking
                    ? "bg-indigo-500/30 scale-110"
                    : isUserSpeaking
                    ? "bg-emerald-500/30 scale-105"
                    : "bg-indigo-500/15"
                }`}
              />

              {/* Central Glowing Core */}
              <div
                className={`relative w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-transform duration-200 ${
                  isAiSpeaking
                    ? "bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 shadow-indigo-500/50 scale-110"
                    : isUserSpeaking
                    ? "bg-gradient-to-tr from-emerald-500 to-teal-600 shadow-emerald-500/50 scale-105"
                    : "bg-gradient-to-tr from-slate-800 to-slate-700 text-slate-300 border border-slate-700"
                }`}
              >
                {isAiSpeaking ? (
                  <Sparkles className="w-8 h-8 text-white animate-spin" style={{ animationDuration: "4s" }} />
                ) : isUserSpeaking ? (
                  <Mic className="w-8 h-8 text-white animate-pulse" />
                ) : (
                  <Bot className="w-8 h-8 text-indigo-300" />
                )}
              </div>
            </div>

            {/* Visualizer Equalizer Bars */}
            <div className="flex items-center space-x-1.5 mt-5">
              {[40, 75, 30, 90, 60, 85, 45, 95, 50, 70].map((baseHeight, i) => {
                const dynamicHeight = isUserSpeaking
                  ? Math.max(12, Math.min(48, (audioLevel / 100) * baseHeight))
                  : isAiSpeaking
                  ? Math.max(10, Math.min(44, (i % 2 === 0 ? 35 : 22) + Math.sin(Date.now() / 150 + i) * 15))
                  : 8;

                return (
                  <div
                    key={i}
                    className={`w-1.5 rounded-full transition-all duration-100 ${
                      isAiSpeaking
                        ? "bg-gradient-to-t from-indigo-500 to-purple-400 shadow-xs"
                        : isUserSpeaking
                        ? "bg-gradient-to-t from-emerald-500 to-teal-300 shadow-xs"
                        : "bg-slate-700/60"
                    }`}
                    style={{ height: `${dynamicHeight}px` }}
                  />
                );
              })}
            </div>

            {/* Status Label */}
            <p className="mt-3 text-xs font-bold text-slate-300 text-center flex items-center gap-1.5">
              {isAiSpeaking ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                  <span className="text-indigo-300">StudyMate AI is speaking...</span>
                </>
              ) : isUserSpeaking ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-emerald-300">Listening to {userName}...</span>
                </>
              ) : isConnected ? (
                <span className="text-slate-400">Speak anytime — your Voice Tutor is listening live</span>
              ) : isConnecting ? (
                <span className="text-amber-300">Establishing real-time audio channel...</span>
              ) : (
                <span className="text-slate-500">Press "Start Voice Chat" to connect</span>
              )}
            </p>
          </div>

          {/* Real-time Live Transcript Log */}
          <div className="flex-1 p-4 overflow-y-auto z-10 min-h-[140px] max-h-[220px] sm:max-h-[280px]" ref={transcriptScrollRef}>
            <div className="flex items-center justify-between mb-3 text-[10px] font-black uppercase tracking-wider text-slate-500">
              <span className="flex items-center gap-1">
                <MessageSquareText className="w-3 h-3 text-indigo-400" />
                Live Conversation Transcript
              </span>
              <span>{transcripts.length} Messages</span>
            </div>

            {transcripts.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs italic font-medium">
                Transcripts will stream here in real time as you and AI converse...
              </div>
            ) : (
              <div className="space-y-3">
                {transcripts.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-start space-x-2.5 ${
                      item.role === "user" ? "flex-row-reverse space-x-reverse" : "flex-row"
                    }`}
                  >
                    <div
                      className={`p-1.5 rounded-xl text-white shrink-0 shadow-xs ${
                        item.role === "user" ? "bg-emerald-600" : "bg-indigo-600"
                      }`}
                    >
                      {item.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                    </div>
                    <div
                      className={`max-w-[82%] p-3 rounded-2xl text-xs font-medium leading-relaxed shadow-sm ${
                        item.role === "user"
                          ? "bg-emerald-950/40 text-emerald-100 border border-emerald-800/50 rounded-tr-none"
                          : "bg-slate-800/80 text-slate-100 border border-slate-700/60 rounded-tl-none"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1 text-[10px] text-slate-400 font-bold">
                        <span>{item.role === "user" ? userName : "StudyMate AI"}</span>
                        <span>{item.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <p className="whitespace-pre-wrap">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Barge-in Interruption Helper Note */}
          <div className="px-4 py-2 bg-indigo-950/30 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-indigo-300 font-medium z-10">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>
                <strong>Barge-in Interruption:</strong> Speak while AI is talking to pause playback instantly.
              </span>
            </span>
            <span className="hidden sm:inline-block text-[9px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30 font-bold">
              Full Duplex
            </span>
          </div>

          {/* Action Dock / Control Toolbar */}
          <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-around z-10">
            {/* Mute Mic Button */}
            <button
              type="button"
              onClick={toggleMute}
              disabled={!isConnected}
              className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col items-center gap-1 ${
                isMuted
                  ? "bg-rose-500/20 text-rose-400 border-rose-500/40"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
              } ${!isConnected && "opacity-50 cursor-not-allowed"}`}
              title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
            >
              {isMuted ? <MicOff className="w-5 h-5 text-rose-400" /> : <Mic className="w-5 h-5 text-emerald-400" />}
              <span className="text-[10px] font-bold">{isMuted ? "Muted" : "Mute Mic"}</span>
            </button>

            {/* Main Action Call Button: Start Voice Chat or End Call */}
            {isConnected || isConnecting ? (
              <button
                type="button"
                onClick={endCall}
                className="px-6 py-3.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-rose-600/30 transition-all hover:scale-105 cursor-pointer flex items-center space-x-2"
              >
                <PhoneOff className="w-5 h-5" />
                <span>End Call</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={startVoiceChat}
                className="px-6 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-emerald-600/30 transition-all hover:scale-105 cursor-pointer flex items-center space-x-2"
              >
                <Phone className="w-5 h-5" />
                <span>Start Voice Chat</span>
              </button>
            )}

            {/* Mute Speaker Button */}
            <button
              type="button"
              onClick={toggleSpeakerMute}
              disabled={!isConnected}
              className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col items-center gap-1 ${
                isSpeakerMuted
                  ? "bg-rose-500/20 text-rose-400 border-rose-500/40"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
              } ${!isConnected && "opacity-50 cursor-not-allowed"}`}
              title={isSpeakerMuted ? "Unmute Speaker" : "Mute Speaker"}
            >
              {isSpeakerMuted ? (
                <VolumeX className="w-5 h-5 text-rose-400" />
              ) : (
                <Volume2 className="w-5 h-5 text-indigo-400" />
              )}
              <span className="text-[10px] font-bold">{isSpeakerMuted ? "Muted" : "Speaker"}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default LiveVoiceTutorModal;
