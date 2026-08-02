import React, { useState } from "react";
import { VideoSettingsPickerData, VideoSettings } from "./types";
import { Sparkles, Video, Check, Layers, Monitor, Zap } from "lucide-react";

interface VideoSettingsPickerProps {
  data: VideoSettingsPickerData;
  onSubmit: (settings: VideoSettings) => void;
}

export const VideoSettingsPicker: React.FC<VideoSettingsPickerProps> = ({ data, onSubmit }) => {
  const [quality, setQuality] = useState<"540p" | "720p" | "1080p" | null>("720p");
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16" | "1:1" | null>("16:9");
  const [depth, setDepth] = useState<"overview" | "full" | null>("overview");

  const isFormValid = quality !== null && aspectRatio !== null && depth !== null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || !quality || !aspectRatio || !depth) return;
    onSubmit({
      quality,
      aspectRatio,
      depth,
      topic: data.topic
    });
  };

  return (
    <div className="w-full max-w-lg rounded-2xl p-4 bg-slate-900/90 text-white border border-indigo-500/30 shadow-xl space-y-4 my-2">
      {/* Header */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2.5">
        <div className="p-1.5 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 text-white shrink-0">
          <Video className="w-4 h-4 animate-pulse" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400">
            🎬 Learn Through Video
          </h4>
          <p className="text-[11px] text-slate-300 truncate font-medium">
            Topic: <span className="text-indigo-300 font-semibold">{data.topic}</span>
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 text-xs">
        {/* Quality Options */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-400" />
            <span>Quality & Speed</span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: "540p", label: "Fast (540p)" },
              { id: "720p", label: "Balanced (720p)" },
              { id: "1080p", label: "High (1080p)" }
            ].map((opt) => {
              const selected = quality === opt.id;
              return (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => setQuality(opt.id as any)}
                  className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition flex items-center space-x-1 cursor-pointer ${
                    selected
                      ? "bg-indigo-600 text-white border-indigo-400 shadow-sm"
                      : "bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800"
                  }`}
                >
                  {selected && <Check className="w-3 h-3 text-indigo-200" />}
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Aspect Ratio Options */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Monitor className="w-3 h-3 text-indigo-400" />
            <span>Aspect Ratio</span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: "16:9", label: "Landscape 16:9" },
              { id: "9:16", label: "Vertical 9:16 (reels-style)" },
              { id: "1:1", label: "Square 1:1" }
            ].map((opt) => {
              const selected = aspectRatio === opt.id;
              return (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => setAspectRatio(opt.id as any)}
                  className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition flex items-center space-x-1 cursor-pointer ${
                    selected
                      ? "bg-indigo-600 text-white border-indigo-400 shadow-sm"
                      : "bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800"
                  }`}
                >
                  {selected && <Check className="w-3 h-3 text-indigo-200" />}
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Lesson Depth */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Layers className="w-3 h-3 text-purple-400" />
            <span>Lesson Depth</span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: "overview", label: "Quick overview (1 short clip)" },
              { id: "full", label: "Full explainer (auto multi-part if needed)" }
            ].map((opt) => {
              const selected = depth === opt.id;
              return (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => setDepth(opt.id as any)}
                  className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition flex items-center space-x-1 cursor-pointer ${
                    selected
                      ? "bg-indigo-600 text-white border-indigo-400 shadow-sm"
                      : "bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800"
                  }`}
                >
                  {selected && <Check className="w-3 h-3 text-indigo-200" />}
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={!isFormValid}
            className={`w-full py-2.5 px-4 rounded-xl font-extrabold text-xs transition flex items-center justify-center space-x-2 cursor-pointer shadow-md ${
              isFormValid
                ? "bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 text-white hover:opacity-95 shadow-indigo-500/25"
                : "bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed"
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Generate Video Lesson</span>
          </button>
        </div>
      </form>
    </div>
  );
};
