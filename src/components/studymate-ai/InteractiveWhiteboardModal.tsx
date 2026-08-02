import React, { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Pencil,
  Eraser,
  RotateCcw,
  Download,
  Sparkles,
  Play,
  Square,
  Circle as CircleIcon,
  Minus,
  Type,
  CheckCircle2,
  Bookmark,
  Share2,
  Trash2
} from "lucide-react";
import { WhiteboardStep } from "./types";

interface InteractiveWhiteboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSubject?: string;
  activeChapter?: string;
  onSaveWhiteboardToNotes?: (title: string, canvasDataUrl: string) => void;
}

export function InteractiveWhiteboardModal({
  isOpen,
  onClose,
  activeSubject = "Physics",
  activeChapter = "Electrostatics",
  onSaveWhiteboardToNotes
}: InteractiveWhiteboardModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#6366f1");
  const [lineWidth, setLineWidth] = useState(3);
  const [tool, setTool] = useState<"pen" | "eraser" | "line" | "rect" | "circle">("pen");
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [aiSolving, setAiSolving] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const sampleWhiteboardSteps: WhiteboardStep[] = [
    {
      stepNumber: 1,
      title: "1. State Gauss's Law Equation",
      mathLatexOrText: "Φ_E = ∮ E · dA = Q_enclosed / ε₀",
      explanation: "Define total electric flux passing through a closed Gaussian sphere."
    },
    {
      stepNumber: 2,
      title: "2. Spherical Surface Symmetry",
      mathLatexOrText: "E × (4π r²) = Q / ε₀",
      explanation: "Electric field strength E is radially outward and uniform across area A = 4πr²."
    },
    {
      stepNumber: 3,
      title: "3. Final Electric Field Derivation",
      mathLatexOrText: "E = (1 / 4πε₀) × (Q / r²)",
      explanation: "Proves Coulomb's law using Gauss's spherical flux symmetry!"
    }
  ];

  // Initialize canvas
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.parentElement?.clientWidth || 700;
    canvas.height = 420;

    // Fill grid background
    ctx.fillStyle = "#0f172a"; // dark slate
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid lines
    ctx.strokeStyle = "rgba(51, 65, 85, 0.3)";
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setStartPos({ x, y });

    if (tool === "pen" || tool === "eraser") {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.strokeStyle = tool === "eraser" ? "#0f172a" : color;
      ctx.lineWidth = tool === "eraser" ? lineWidth * 4 : lineWidth;
      ctx.lineCap = "round";
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (tool === "pen" || tool === "eraser") {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const endDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPos) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.fillStyle = color;

    if (tool === "line") {
      ctx.beginPath();
      ctx.moveTo(startPos.x, startPos.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (tool === "rect") {
      ctx.strokeRect(startPos.x, startPos.y, x - startPos.x, y - startPos.y);
    } else if (tool === "circle") {
      const radius = Math.sqrt(Math.pow(x - startPos.x, 2) + Math.pow(y - startPos.y, 2));
      ctx.beginPath();
      ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
      ctx.stroke();
    }
    setStartPos(null);
  };

  const handleClearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  // AI Live Whiteboard Solver Simulation
  const handleAIAutoSolve = () => {
    setAiSolving(true);
    setCurrentStepIndex(0);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear & redraw grid
    handleClearCanvas();

    let step = 0;
    const interval = setInterval(() => {
      if (step >= sampleWhiteboardSteps.length) {
        clearInterval(interval);
        setAiSolving(false);
        return;
      }

      const st = sampleWhiteboardSteps[step];
      const yOffset = 80 + step * 100;

      // Draw Step Box on Canvas
      ctx.fillStyle = "#1e293b";
      ctx.roundRect(40, yOffset - 30, canvas.width - 80, 75, 12);
      ctx.fill();
      ctx.strokeStyle = "#6366f1";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 16px monospace";
      ctx.fillText(st.title, 60, yOffset - 5);

      ctx.fillStyle = "#34d399";
      ctx.font = "bold 20px monospace";
      ctx.fillText(st.mathLatexOrText, 60, yOffset + 25);

      setCurrentStepIndex(step);
      step++;
    }, 1200);
  };

  const handleDownloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeSubject}_${activeChapter}_whiteboard.png`;
    a.click();
  };

  const handleSaveToNotes = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    if (onSaveWhiteboardToNotes) {
      onSaveWhiteboardToNotes(`${activeSubject}: ${activeChapter} Whiteboard Notes`, url);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl text-white"
        >
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 backdrop-blur-md rounded-2xl">
                <Pencil className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-black tracking-tight">Interactive AI Whiteboard</h3>
                <p className="text-xs text-indigo-100 font-medium">{activeSubject} • {activeChapter}</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleAIAutoSolve}
                disabled={aiSolving}
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition flex items-center space-x-1.5 cursor-pointer shadow-md"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{aiSolving ? "AI Drawing..." : "AI Live Solve"}</span>
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

          {/* Tools Palette Toolbar */}
          <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
            {/* Drawing Tools */}
            <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setTool("pen")}
                className={`p-2 rounded-lg text-xs font-bold transition ${tool === "pen" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
                title="Pen"
              >
                <Pencil className="w-4 h-4" />
              </button>

              <button
                onClick={() => setTool("eraser")}
                className={`p-2 rounded-lg text-xs font-bold transition ${tool === "eraser" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
                title="Eraser"
              >
                <Eraser className="w-4 h-4" />
              </button>

              <button
                onClick={() => setTool("line")}
                className={`p-2 rounded-lg text-xs font-bold transition ${tool === "line" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
                title="Line"
              >
                <Minus className="w-4 h-4" />
              </button>

              <button
                onClick={() => setTool("rect")}
                className={`p-2 rounded-lg text-xs font-bold transition ${tool === "rect" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
                title="Rectangle"
              >
                <Square className="w-4 h-4" />
              </button>

              <button
                onClick={() => setTool("circle")}
                className={`p-2 rounded-lg text-xs font-bold transition ${tool === "circle" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
                title="Circle"
              >
                <CircleIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Colors */}
            <div className="flex items-center space-x-1.5">
              {["#6366f1", "#10b981", "#ef4444", "#f59e0b", "#38bdf8", "#ffffff"].map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setColor(c);
                    setTool("pen");
                  }}
                  className={`w-6 h-6 rounded-full border-2 transition cursor-pointer ${color === c ? "border-white scale-110 shadow-md" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleClearCanvas}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
                title="Clear Board"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                onClick={handleSaveToNotes}
                className="px-3 py-1.5 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>Save to Notes</span>
              </button>

              <button
                onClick={handleDownloadImage}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
                title="Download PNG"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Canvas Viewport */}
          <div className="relative flex-1 bg-slate-950 flex items-center justify-center p-2 overflow-hidden">
            <canvas
              ref={canvasRef}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              className="border border-slate-800 rounded-2xl cursor-crosshair max-w-full"
            />
          </div>

          {/* Step Explanations Bar when AI solving */}
          {aiSolving && (
            <div className="p-3 bg-indigo-950/80 border-t border-indigo-800/60 flex items-center space-x-3 text-xs text-indigo-200 shrink-0">
              <Sparkles className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
              <div>
                <span className="font-bold block text-indigo-300">
                  {sampleWhiteboardSteps[currentStepIndex]?.title}
                </span>
                <span className="text-[11px] text-slate-300">
                  {sampleWhiteboardSteps[currentStepIndex]?.explanation}
                </span>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
