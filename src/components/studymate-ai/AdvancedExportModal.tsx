import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Download,
  FileText,
  FileCode,
  CheckCircle2,
  Sparkles,
  Printer,
  PackageCheck
} from "lucide-react";

interface AdvancedExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeWorkspaceName?: string;
}

export function AdvancedExportModal({
  isOpen,
  onClose,
  activeWorkspaceName = "Physics - Class 12"
}: AdvancedExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<string>("pdf");
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);

  const exportFormats = [
    { id: "pdf", name: "PDF Study Pack", ext: ".pdf", icon: "📄", desc: "Includes formatted notes, LaTeX formulas, and vector diagrams." },
    { id: "markdown", name: "Markdown Notebook", ext: ".md", icon: "📝", desc: "Clean markdown for Obsidian, Notion, or local editing." },
    { id: "docx", name: "Microsoft Word Document", ext: ".docx", icon: "📘", desc: "Fully editable Word document formatted with headings." },
    { id: "anki", name: "Anki Flashcard Deck", ext: ".apkg / .csv", icon: "🎴", desc: "Importable Anki deck with front/back formula triggers." },
    { id: "printable-quiz", name: "Printable Practice Test", ext: ".pdf", icon: "🖨️", desc: "Print-ready worksheet with separate answer key." }
  ];

  if (!isOpen) return null;

  const handleExport = () => {
    setIsExporting(true);
    setExportComplete(false);

    setTimeout(() => {
      setIsExporting(false);
      setExportComplete(true);
    }, 1500);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl text-slate-800 dark:text-slate-100"
        >
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-2xl">
                <Download className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-black tracking-tight">Advanced Study Export Center</h3>
                <p className="text-xs text-indigo-100 font-medium">Export workspace assets into PDF, Markdown, Anki & Word</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 flex-1 overflow-y-auto space-y-4">
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between">
              <span className="font-bold text-slate-600 dark:text-slate-300">Target Workspace:</span>
              <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{activeWorkspaceName}</span>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-400 block">
                Select Export Package Format
              </label>

              {exportFormats.map((fmt) => (
                <button
                  key={fmt.id}
                  onClick={() => {
                    setSelectedFormat(fmt.id);
                    setExportComplete(false);
                  }}
                  className={`w-full p-3.5 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
                    selectedFormat === fmt.id
                      ? "bg-indigo-50/80 dark:bg-indigo-950/60 border-indigo-500 text-slate-900 dark:text-white ring-2 ring-indigo-500/30"
                      : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{fmt.icon}</span>
                    <div>
                      <h4 className="text-xs font-extrabold flex items-center space-x-1.5">
                        <span>{fmt.name}</span>
                        <span className="text-[10px] font-mono text-indigo-500">{fmt.ext}</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{fmt.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-2xl transition flex items-center justify-center space-x-2 cursor-pointer shadow-lg mt-2"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? "Generating Package..." : "Export Package Now"}</span>
            </button>

            {exportComplete && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-2xl text-xs font-bold text-center flex items-center justify-center space-x-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Export generated successfully! Download ready.</span>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
