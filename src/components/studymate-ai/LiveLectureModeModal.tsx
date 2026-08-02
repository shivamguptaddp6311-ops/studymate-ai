import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Play,
  Pause,
  Video,
  Sparkles,
  HelpCircle,
  FileText,
  Award,
  CheckCircle2,
  ListOrdered,
  Volume2,
  Square,
  Bot
} from "lucide-react";

interface LiveLectureModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSubject?: string;
  activeChapter?: string;
  onSendLecturePrompt?: (promptText: string) => void;
}

export function LiveLectureModeModal({
  isOpen,
  onClose,
  activeSubject = "Physics",
  activeChapter = "Electrostatics",
  onSendLecturePrompt
}: LiveLectureModeModalProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const lectureSections = [
    { title: "Introduction to Electric Charge & Conservation", duration: "03:20", status: "completed" },
    { title: "Coulomb's Law in Vector Form", duration: "05:15", status: "active" },
    { title: "Superposition Principle for Point Charges", duration: "04:45", status: "upcoming" },
    { title: "Electric Field Lines & Flux Density", duration: "06:10", status: "upcoming" },
    { title: "Instant Quiz Check", duration: "02:00", status: "upcoming" }
  ];

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentSection((prev) => (prev < lectureSections.length - 1 ? prev + 1 : prev));
      }, 4000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying]);

  if (!isOpen) return null;

  const handleFinishLecture = () => {
    setIsPlaying(false);
    setShowSummary(true);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl text-white"
        >
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-rose-600 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-2xl">
                <Video className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-black tracking-tight">AI Live Lecture Mode</h3>
                <p className="text-xs text-purple-100 font-medium">Continuous AI teaching • Auto chapter progression</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setIsRecording(!isRecording)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center space-x-1 cursor-pointer ${
                  isRecording ? "bg-rose-500 text-white animate-pulse" : "bg-white/10 hover:bg-white/20 text-white"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isRecording ? "bg-white" : "bg-rose-400"}`} />
                <span>{isRecording ? "REC Active" : "Record Session"}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-5 flex-1 overflow-y-auto space-y-5">
            {/* Live Teaching Broadcast View */}
            <div className="relative h-48 bg-gradient-to-tr from-slate-950 via-indigo-950 to-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center text-center overflow-hidden">
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-extrabold uppercase flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span>LIVE AI TEACHING</span>
              </div>

              <Bot className="w-12 h-12 text-indigo-400 mb-2 animate-bounce" />
              <h4 className="text-sm font-black text-indigo-200">
                {lectureSections[currentSection]?.title}
              </h4>
              <p className="text-xs text-slate-400 mt-1 max-w-md">
                "Coulomb's Law states that force between two static charges is directly proportional to product of charges..."
              </p>

              {/* Progress Bar */}
              <div className="w-full max-w-md bg-slate-800 h-1.5 rounded-full mt-4 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all duration-300"
                  style={{ width: `${((currentSection + 1) / lectureSections.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between p-3 bg-slate-850 rounded-2xl border border-slate-800">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl transition flex items-center space-x-1.5 cursor-pointer shadow-md"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                  <span>{isPlaying ? "Pause Lecture" : "Play Live Lecture"}</span>
                </button>

                <button
                  onClick={handleFinishLecture}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl transition cursor-pointer"
                >
                  Finish & Get Summary
                </button>
              </div>

              <span className="text-xs text-slate-400 font-bold">
                Section {currentSection + 1} of {lectureSections.length}
              </span>
            </div>

            {/* Lecture Syllabus Agenda */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                Lecture Agenda & Auto Progression
              </h4>
              <div className="space-y-2">
                {lectureSections.map((sec, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-2xl border flex items-center justify-between text-xs font-medium transition ${
                      idx === currentSection
                        ? "bg-indigo-950/80 border-indigo-500/80 text-white font-bold"
                        : idx < currentSection
                        ? "bg-slate-900/60 border-slate-800/80 text-slate-400"
                        : "bg-slate-900 border-slate-800 text-slate-300"
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      {idx < currentSection ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : idx === currentSection ? (
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-ping shrink-0" />
                      ) : (
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-700 shrink-0" />
                      )}
                      <span>{sec.title}</span>
                    </div>

                    <span className="text-[10px] font-mono text-slate-400">{sec.duration}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary View Modal content */}
            {showSummary && (
              <div className="p-4 rounded-2xl bg-indigo-950/90 border border-indigo-800/80 space-y-2 text-xs">
                <div className="flex items-center space-x-2 text-indigo-300 font-black">
                  <FileText className="w-4 h-4" />
                  <span>AI Generated Lecture Summary Notes</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  • Mastered Coulomb's vector equation and charge conservation laws.<br />
                  • Superposition principle applied to multi-charge configurations.<br />
                  • Session audio recorded & stored in workspace assets for offline review.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
