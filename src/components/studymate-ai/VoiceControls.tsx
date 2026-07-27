import React from "react";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";

interface VoiceControlsProps {
  isListening: boolean;
  onToggleListen: () => void;
  isSpeaking?: boolean;
  onStopSpeaking?: () => void;
  compact?: boolean;
}

export function VoiceControls({
  isListening,
  onToggleListen,
  isSpeaking,
  onStopSpeaking,
  compact = false
}: VoiceControlsProps) {
  if (compact) {
    return (
      <button
        type="button"
        onClick={onToggleListen}
        className={`p-2 rounded-full transition cursor-pointer ${
          isListening
            ? "bg-rose-500 text-white animate-pulse"
            : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
        }`}
        title={isListening ? "Stop Voice Input" : "Start Voice Input"}
      >
        {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      </button>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <button
        type="button"
        onClick={onToggleListen}
        className={`px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 ${
          isListening
            ? "bg-rose-500 text-white animate-pulse shadow-md"
            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200"
        }`}
      >
        {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
        <span>{isListening ? "Listening..." : "Voice Input"}</span>
      </button>

      {isSpeaking && onStopSpeaking && (
        <button
          type="button"
          onClick={onStopSpeaking}
          className="px-3 py-1.5 bg-indigo-600 text-white rounded-full text-xs font-bold animate-pulse cursor-pointer flex items-center space-x-1.5"
        >
          <VolumeX className="w-3.5 h-3.5" />
          <span>Stop Speech</span>
        </button>
      )}
    </div>
  );
}

export default VoiceControls;
