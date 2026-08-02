import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Bot,
  FileText,
  HelpCircle,
  Bookmark,
  Sparkles,
  Zap,
  RotateCcw,
  CheckCircle2,
  Cpu,
  ArrowRight
} from "lucide-react";

interface AgentItem {
  id: string;
  name: string;
  icon: string;
  role: string;
  description: string;
  status: "idle" | "working" | "ready";
}

interface SpecializedAIAgentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerAgentPipeline?: (agentName: string, promptText: string) => void;
}

export function SpecializedAIAgentsModal({
  isOpen,
  onClose,
  onTriggerAgentPipeline
}: SpecializedAIAgentsModalProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<string>("agent-1");
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [pipelineLog, setPipelineLog] = useState<string[]>([]);

  const agents: AgentItem[] = [
    {
      id: "agent-1",
      name: "PDF & OCR Agent",
      icon: "📄",
      role: "Document Intelligence",
      description: "Extracts formulas, diagrams, table data and text from uploaded textbook PDFs and handwritten notes.",
      status: "ready"
    },
    {
      id: "agent-2",
      name: "Notes Structurer Agent",
      icon: "📝",
      role: "Knowledge Synthesis",
      description: "Transforms raw chat discussions and textbook extracts into structured Cornell or mind-map notes.",
      status: "ready"
    },
    {
      id: "agent-3",
      name: "Quiz Generator Agent",
      icon: "🎯",
      role: "Assessment Engine",
      description: "Crafts adaptive multiple-choice, numerical and assertion-reason questions targeted at weak areas.",
      status: "ready"
    },
    {
      id: "agent-4",
      name: "Flashcard Spaced Repetition Agent",
      icon: "🎴",
      role: "Memory Retain",
      description: "Auto-generates high-yield flashcards and manages optimal spaced repetition review intervals.",
      status: "ready"
    },
    {
      id: "agent-5",
      name: "Deep Research Agent",
      icon: "🔬",
      role: "Multi-Source Verification",
      description: "Cross-references scientific literature, textbook derivations, and verified web sources with citations.",
      status: "ready"
    },
    {
      id: "agent-6",
      name: "Exam Revision Agent",
      icon: "⚡",
      role: "Exam Readiness Booster",
      description: "Synthesizes entire chapter key points, formula cheat sheets, and high-probability exam questions.",
      status: "ready"
    }
  ];

  if (!isOpen) return null;

  const handleRunMultiAgentPipeline = () => {
    setPipelineRunning(true);
    setPipelineLog(["Initializing Agent Orchestration Mesh..."]);

    setTimeout(() => {
      setPipelineLog((prev) => [...prev, "📄 PDF Agent: Scanning Electrostatics Chapter PDF... Extracted 14 key formulas."]);
    }, 800);

    setTimeout(() => {
      setPipelineLog((prev) => [...prev, "📝 Notes Agent: Structuring key concepts into high-yield Markdown revision sheet."]);
    }, 1800);

    setTimeout(() => {
      setPipelineLog((prev) => [...prev, "🎯 Quiz Agent: Generated 5 adaptive NCERT exam practice questions."]);
    }, 2800);

    setTimeout(() => {
      setPipelineLog((prev) => [...prev, "✨ Consensus reached! Multi-agent study pack successfully assembled."]);
      setPipelineRunning(false);
    }, 3800);
  };

  const currentAgent = agents.find((a) => a.id === selectedAgentId) || agents[0];

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
          <div className="p-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-2xl">
                <Cpu className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-black tracking-tight">Specialized AI Agents Mesh</h3>
                <p className="text-xs text-purple-100 font-medium">Collaborative multi-agent intelligence ecosystem</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 flex-1 flex flex-col md:flex-row gap-4 overflow-y-auto">
            {/* Agent Selector List */}
            <div className="w-full md:w-64 space-y-2 shrink-0">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                Available AI Agents ({agents.length})
              </h4>

              {agents.map((ag) => (
                <button
                  key={ag.id}
                  onClick={() => setSelectedAgentId(ag.id)}
                  className={`w-full p-3 rounded-2xl border text-left transition flex items-center space-x-3 cursor-pointer ${
                    selectedAgentId === ag.id
                      ? "bg-indigo-600 border-indigo-400 text-white shadow-md"
                      : "bg-slate-850 border-slate-800 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <span className="text-xl">{ag.icon}</span>
                  <div>
                    <h5 className="text-xs font-extrabold block">{ag.name}</h5>
                    <span className="text-[10px] text-slate-300/80 font-medium">{ag.role}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Agent Detail & Pipeline Execution */}
            <div className="flex-1 bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-2.5">
                    <span className="text-2xl">{currentAgent.icon}</span>
                    <div>
                      <h4 className="text-sm font-black text-white">{currentAgent.name}</h4>
                      <span className="text-[10px] font-bold text-indigo-400 uppercase">{currentAgent.role}</span>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold uppercase">
                    Agent Ready
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {currentAgent.description}
                </p>

                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Agent Pipeline Task Example:</span>
                  <p className="text-xs text-indigo-200 font-mono">
                    "Execute {currentAgent.name} to extract key formulas, synthesize summary notes, and compile exam flashcards."
                  </p>
                </div>
              </div>

              {/* Multi-Agent Orchestration Execution */}
              <div className="pt-3 border-t border-slate-800 space-y-3">
                <button
                  onClick={handleRunMultiAgentPipeline}
                  disabled={pipelineRunning}
                  className="w-full py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:opacity-95 text-white font-black text-xs rounded-xl transition shadow-lg flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>{pipelineRunning ? "Running Multi-Agent Orchestration..." : "Run Collaborative Agent Mesh"}</span>
                </button>

                {/* Pipeline Execution Log */}
                {pipelineLog.length > 0 && (
                  <div className="p-3 bg-slate-900/90 rounded-xl border border-indigo-500/30 text-[11px] space-y-1 font-mono text-slate-300 max-h-32 overflow-y-auto">
                    {pipelineLog.map((log, i) => (
                      <p key={i} className={i === pipelineLog.length - 1 ? "text-emerald-400 font-bold" : ""}>
                        {log}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
