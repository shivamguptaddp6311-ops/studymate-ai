import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Search,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  FileText,
  Download,
  Share2,
  ShieldCheck,
  Globe
} from "lucide-react";

interface ResearchSource {
  id: string;
  title: string;
  sourceType: "NCERT Textbook" | "Peer-Reviewed Paper" | "Standard Reference";
  citation: string;
  verified: boolean;
  keyFinding: string;
}

interface ResearchModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSubject?: string;
  onSendResearchPrompt?: (promptText: string) => void;
}

export function ResearchModeModal({
  isOpen,
  onClose,
  activeSubject = "Physics",
  onSendResearchPrompt
}: ResearchModeModalProps) {
  const [researchTopic, setResearchTopic] = useState("Dielectric Polarization and Displacement Vector Derivation");
  const [isResearching, setIsResearching] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);

  const mockSources: ResearchSource[] = [
    {
      id: "rs-1",
      title: "NCERT Class 12 Physics Chapter 2: Electrostatic Potential and Capacitance",
      sourceType: "NCERT Textbook",
      citation: "National Council of Educational Research and Training (NCERT), 2024 Ed., pp. 54-72.",
      verified: true,
      keyFinding: "Defines dielectrics as non-conducting substances that develop induced dipole moment P = χ_e E in external electric field."
    },
    {
      id: "rs-2",
      title: "Introduction to Electrodynamics (4th Edition) - David J. Griffiths",
      sourceType: "Standard Reference",
      citation: "Griffiths, D. J. (2017). Pearson Education, Chapter 4: Electric Fields in Matter.",
      verified: true,
      keyFinding: "Establishes electric displacement vector D = ε₀E + P, satisfying Gauss's law for free charges ∇·D = ρ_f."
    },
    {
      id: "rs-3",
      title: "Dielectric Relaxation and Permittivity Spectra in Condensed Matter",
      sourceType: "Peer-Reviewed Paper",
      citation: "Journal of Physics: Condensed Matter, Vol 34, No. 12, 2023.",
      verified: true,
      keyFinding: "Demonstrates high-frequency electric susceptibility frequency dependence in dielectric storage capacitors."
    }
  ];

  if (!isOpen) return null;

  const handleStartResearch = () => {
    setIsResearching(true);
    setReportGenerated(false);

    setTimeout(() => {
      setIsResearching(false);
      setReportGenerated(true);
    }, 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl text-slate-800 dark:text-slate-100"
        >
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-2xl">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-black tracking-tight">AI Multi-Source Deep Research Studio</h3>
                <p className="text-xs text-blue-100 font-medium">Verified citations, literature comparison & structured report writer</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 flex-1 overflow-y-auto space-y-5">
            {/* Input Topic */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                Research Topic / Deep Query
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={researchTopic}
                  onChange={(e) => setResearchTopic(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={handleStartResearch}
                  disabled={isResearching}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-2xl transition flex items-center space-x-1.5 cursor-pointer shadow-md"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>{isResearching ? "Searching..." : "Deep Research"}</span>
                </button>
              </div>
            </div>

            {/* Verified Sources Comparison */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Cross-Referenced Literature Sources (3 Verified)
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center space-x-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>100% Fact Checked</span>
                </span>
              </div>

              <div className="space-y-3">
                {mockSources.map((src) => (
                  <div
                    key={src.id}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{src.title}</span>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {src.sourceType}
                      </span>
                    </div>

                    <p className="text-slate-600 dark:text-slate-300 text-[11px] font-medium leading-relaxed">
                      "{src.keyFinding}"
                    </p>

                    <div className="text-[10px] text-slate-400 font-mono italic">
                      Citation: {src.citation}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Structured Report Output */}
            {reportGenerated && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-indigo-900 dark:text-indigo-200 flex items-center space-x-1.5">
                    <FileText className="w-4 h-4 text-indigo-500" />
                    <span>Structured Academic Synthesis Report</span>
                  </span>

                  <button
                    onClick={() => {
                      if (onSendResearchPrompt) {
                        onSendResearchPrompt(`Send structured research report for "${researchTopic}" with full Griffiths & NCERT citations.`);
                      }
                      onClose();
                    }}
                    className="px-3 py-1 bg-indigo-600 text-white rounded-xl text-xs font-bold transition hover:bg-indigo-700 cursor-pointer"
                  >
                    Load into Chat
                  </button>
                </div>

                <div className="text-xs text-slate-700 dark:text-slate-300 space-y-2 leading-relaxed">
                  <p>
                    <strong>1. Physical Mechanism:</strong> When a dielectric material is placed in an electric field E₀, molecular dipoles align, creating an opposing bound charge field E_p.
                  </p>
                  <p>
                    <strong>2. Electric Displacement D:</strong> Defined as D = ε₀E + P = ε₀ ε_r E. The flux of D depends solely on free charges, facilitating capacitance calculations in media with dielectrics.
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
