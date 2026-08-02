import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Share2,
  Sparkles,
  BookOpen,
  HelpCircle,
  FileCode,
  Zap,
  Layers,
  Search,
  ChevronRight
} from "lucide-react";

interface NodeItem {
  id: string;
  label: string;
  type: "Subject" | "Chapter" | "Concept" | "Formula" | "Mistake";
  x: number;
  y: number;
  connectedTo: string[];
}

interface KnowledgeGraphModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSubject?: string;
  onSelectConceptNode?: (nodeLabel: string) => void;
}

export function KnowledgeGraphModal({
  isOpen,
  onClose,
  activeSubject = "Physics",
  onSelectConceptNode
}: KnowledgeGraphModalProps) {
  const [selectedNode, setSelectedNode] = useState<NodeItem | null>(null);

  const nodes: NodeItem[] = [
    { id: "n1", label: "Electrostatics", type: "Subject", x: 250, y: 150, connectedTo: ["n2", "n3", "n4"] },
    { id: "n2", label: "Coulomb's Law", type: "Concept", x: 120, y: 80, connectedTo: ["n5"] },
    { id: "n3", label: "Gauss's Law", type: "Concept", x: 380, y: 80, connectedTo: ["n6"] },
    { id: "n4", label: "Electric Potential", type: "Concept", x: 250, y: 260, connectedTo: ["n7"] },
    { id: "n5", label: "F = (1/4πε₀) q1q2/r²", type: "Formula", x: 60, y: 20, connectedTo: [] },
    { id: "n6", label: "Φ_E = Q/ε₀", type: "Formula", x: 440, y: 20, connectedTo: [] },
    { id: "n7", label: "V = W / q₀", type: "Formula", x: 250, y: 340, connectedTo: [] }
  ];

  if (!isOpen) return null;

  const getNodeColor = (type: string) => {
    switch (type) {
      case "Subject":
        return "#6366f1";
      case "Concept":
        return "#10b981";
      case "Formula":
        return "#a855f7";
      case "Mistake":
        return "#ef4444";
      default:
        return "#3b82f6";
    }
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
          <div className="p-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-2xl">
                <Share2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-black tracking-tight">Interactive Knowledge Graph</h3>
                <p className="text-xs text-emerald-100 font-medium">Visual map linking chapters, formulas & mistakes</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 flex-1 flex flex-col md:flex-row gap-4 overflow-hidden">
            {/* Graph Canvas */}
            <div className="relative flex-1 bg-slate-950 rounded-2xl border border-slate-800 p-4 min-h-[300px] flex items-center justify-center overflow-hidden">
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {nodes.map((node) =>
                  node.connectedTo.map((targetId) => {
                    const target = nodes.find((n) => n.id === targetId);
                    if (!target) return null;
                    return (
                      <line
                        key={`${node.id}-${target.id}`}
                        x1={node.x}
                        y1={node.y}
                        x2={target.x}
                        y2={target.y}
                        stroke="#334155"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                      />
                    );
                  })
                )}
              </svg>

              {nodes.map((node) => (
                <motion.div
                  key={node.id}
                  whileHover={{ scale: 1.15 }}
                  onClick={() => setSelectedNode(node)}
                  className="absolute cursor-pointer flex flex-col items-center justify-center p-2 rounded-2xl shadow-lg border border-white/20 backdrop-blur-md"
                  style={{
                    left: `${node.x - 45}px`,
                    top: `${node.y - 25}px`,
                    backgroundColor: getNodeColor(node.type)
                  }}
                >
                  <span className="text-[10px] font-black uppercase text-white/80">{node.type}</span>
                  <span className="text-xs font-extrabold text-white whitespace-nowrap">{node.label}</span>
                </motion.div>
              ))}
            </div>

            {/* Inspector Panel */}
            <div className="w-full md:w-64 bg-slate-850 p-4 rounded-2xl border border-slate-800 space-y-3 shrink-0 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                  Concept Node Inspector
                </h4>

                {selectedNode ? (
                  <div className="space-y-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-700">
                      <span className="text-[10px] font-extrabold uppercase text-indigo-400">{selectedNode.type}</span>
                      <h5 className="text-sm font-extrabold text-white mt-0.5">{selectedNode.label}</h5>
                    </div>

                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      Connected concept node in {activeSubject}. Linked to practice questions, formula derivations and mistake logs.
                    </p>

                    <button
                      onClick={() => {
                        if (onSelectConceptNode) onSelectConceptNode(selectedNode.label);
                        onClose();
                      }}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl transition cursor-pointer flex items-center justify-center space-x-1"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Study This Concept</span>
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">
                    Click any node in the interactive network graph to view connections and study resources.
                  </p>
                )}
              </div>

              {/* Legend */}
              <div className="pt-2 border-t border-slate-800 space-y-1 text-[10px] font-bold text-slate-400">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  <span>Subject / Chapter</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Core Concept</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                  <span>Formula Derivation</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
