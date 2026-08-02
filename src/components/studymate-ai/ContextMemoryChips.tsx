import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Layers, X, Plus, Sparkles, BookOpen, FileText, Check } from "lucide-react";

interface ContextChip {
  id: string;
  label: string;
  type: "subject" | "pdf" | "workspace" | "grade" | "chapter";
}

interface ContextMemoryChipsProps {
  chips?: ContextChip[];
  onRemoveChip?: (id: string) => void;
  onAddChip?: (label: string) => void;
}

export function ContextMemoryChips({
  chips: initialChips,
  onRemoveChip,
  onAddChip
}: ContextMemoryChipsProps) {
  const [chips, setChips] = useState<ContextChip[]>(initialChips || [
    { id: "ctx-1", label: "Physics Notes", type: "subject" },
    { id: "ctx-2", label: "NCERT Class 12", type: "grade" },
    { id: "ctx-3", label: "Last PDF", type: "pdf" },
    { id: "ctx-4", label: "Current Workspace", type: "workspace" }
  ]);

  const [showAddPopover, setShowAddPopover] = useState(false);
  const [customInput, setCustomInput] = useState("");

  const handleRemove = (id: string) => {
    setChips((prev) => prev.filter((c) => c.id !== id));
    if (onRemoveChip) onRemoveChip(id);
  };

  const handleAdd = (label: string) => {
    if (!label.trim()) return;
    const newChip: ContextChip = {
      id: `ctx-${Date.now()}`,
      label: label.trim(),
      type: "subject"
    };
    setChips((prev) => [...prev, newChip]);
    if (onAddChip) onAddChip(label.trim());
    setCustomInput("");
    setShowAddPopover(false);
  };

  if (chips.length === 0 && !showAddPopover) {
    return (
      <div className="px-3 py-1 bg-white/40 dark:bg-slate-950/40 backdrop-blur-xs flex items-center space-x-2 text-[10px] text-slate-400 font-bold">
        <button
          type="button"
          onClick={() => setShowAddPopover(true)}
          className="hover:text-purple-600 transition flex items-center space-x-1 cursor-pointer"
        >
          <Plus className="w-3 h-3 text-purple-500" />
          <span>Add Context Memory Chip</span>
        </button>
      </div>
    );
  }

  return (
    <div className="px-3 md:px-5 py-1.5 bg-white/60 dark:bg-slate-950/60 backdrop-blur-md border-t border-slate-200/40 dark:border-slate-800/50 flex items-center space-x-2 overflow-x-auto no-scrollbar shrink-0 z-20">
      <div className="flex items-center space-x-1 text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0">
        <Layers className="w-3 h-3 text-purple-500" />
        <span className="hidden sm:inline">Context:</span>
      </div>

      <div className="flex items-center space-x-1.5">
        <AnimatePresence>
          {chips.map((chip) => (
            <motion.span
              key={chip.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50/90 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 shrink-0 shadow-2xs"
            >
              <span>{chip.label}</span>
              <button
                type="button"
                onClick={() => handleRemove(chip.id)}
                className="hover:text-rose-500 transition cursor-pointer p-0.5 rounded-full hover:bg-indigo-200/50 dark:hover:bg-indigo-900/50 ml-0.5"
                title="Remove context"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>

        {/* Add Context Chip Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowAddPopover(!showAddPopover)}
            className="p-1 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer flex items-center justify-center shrink-0"
            title="Add Context Memory Chip"
          >
            <Plus className="w-3 h-3" />
          </button>

          {showAddPopover && (
            <div className="absolute bottom-7 left-0 z-50 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shadow-xl space-y-1.5">
              <span className="text-[10px] font-extrabold text-slate-400 block px-1">Add Context Memory</span>
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAdd(customInput);
                  }
                }}
                placeholder="e.g. Organic Chemistry"
                className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium focus:outline-none text-slate-800 dark:text-slate-100"
                autoFocus
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => handleAdd(customInput)}
                  className="px-2 py-0.5 bg-purple-600 text-white rounded-lg text-[10px] font-bold hover:bg-purple-500 transition cursor-pointer"
                >
                  Add Chip
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ContextMemoryChips;
