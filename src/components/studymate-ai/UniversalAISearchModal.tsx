import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Search,
  Filter,
  FileText,
  MessageSquare,
  BookOpen,
  HelpCircle,
  FileCode,
  Bookmark,
  Sparkles,
  ArrowRight,
  Tag
} from "lucide-react";

interface SearchResult {
  id: string;
  type: "Chat" | "PDF" | "Note" | "Flashcard" | "Quiz" | "Formula";
  title: string;
  excerpt: string;
  subject: string;
  chapter: string;
  date: string;
  relevanceScore: number;
}

interface UniversalAISearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectResult?: (result: SearchResult) => void;
}

export function UniversalAISearchModal({
  isOpen,
  onClose,
  onSelectResult
}: UniversalAISearchModalProps) {
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("All");
  const [filterSubject, setFilterSubject] = useState<string>("All");

  const mockData: SearchResult[] = [
    {
      id: "sr-1",
      type: "Formula",
      title: "Gauss's Law Equation & Derivation",
      excerpt: "Φ_E = ∮ E · dA = Q_enclosed / ε₀. Electric flux through closed spherical Gaussian surface.",
      subject: "Physics",
      chapter: "Electrostatics",
      date: "Today",
      relevanceScore: 98
    },
    {
      id: "sr-2",
      type: "Chat",
      title: "AI Tutor Explanation: Electric Dipole Moment",
      excerpt: "Dipole moment p = q × 2a directed from negative charge to positive charge in uniform electric field.",
      subject: "Physics",
      chapter: "Electrostatics",
      date: "Yesterday",
      relevanceScore: 92
    },
    {
      id: "sr-3",
      type: "Note",
      title: "Class 12 Electrostatics Summary & Key Diagrams",
      excerpt: "Comprehensive revision sheet covering Coulomb's law, electric potential, capacitors in series and parallel.",
      subject: "Physics",
      chapter: "Electrostatics",
      date: "3 days ago",
      relevanceScore: 88
    },
    {
      id: "sr-4",
      type: "Quiz",
      title: "Capacitance & Dielectrics Practice Test",
      excerpt: "10 MCQs testing dielectric breakdown, energy stored in capacitor U = 1/2 CV².",
      subject: "Physics",
      chapter: "Capacitance",
      date: "1 week ago",
      relevanceScore: 84
    },
    {
      id: "sr-5",
      type: "Flashcard",
      title: "Equipotential Surfaces & Properties",
      excerpt: "Work done in moving a charge along an equipotential surface is always zero.",
      subject: "Physics",
      chapter: "Potential",
      date: "2 weeks ago",
      relevanceScore: 79
    }
  ];

  const filteredResults = mockData.filter((item) => {
    const matchesQuery =
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.excerpt.toLowerCase().includes(query.toLowerCase()) ||
      item.subject.toLowerCase().includes(query.toLowerCase());
    const matchesType = filterType === "All" || item.type === filterType;
    const matchesSubject = filterSubject === "All" || item.subject === filterSubject;
    return matchesQuery && matchesType && matchesSubject;
  });

  if (!isOpen) return null;

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "Formula":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30";
      case "Chat":
        return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30";
      case "Note":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
      case "Quiz":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";
      case "Flashcard":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30";
      default:
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30";
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl text-slate-800 dark:text-slate-100"
        >
          {/* Header & Search Bar */}
          <div className="p-5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2.5">
                <Search className="w-5 h-5 text-white" />
                <h3 className="text-base font-black tracking-tight">Universal AI Knowledge Search</h3>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search across all chats, PDFs, notes, formulas, flashcards..."
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-inner"
                autoFocus
              />
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="p-3 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
            <div className="flex items-center space-x-1.5 overflow-x-auto py-0.5">
              <span className="text-[10px] font-black uppercase text-slate-400 shrink-0">Type:</span>
              {["All", "Formula", "Chat", "Note", "Quiz", "Flashcard"].map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`px-2.5 py-1 rounded-xl font-bold transition shrink-0 cursor-pointer ${
                    filterType === t
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl px-2.5 py-1 focus:outline-none"
              >
                <option value="All">All Subjects</option>
                <option value="Physics">Physics</option>
                <option value="Chemistry">Chemistry</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Biology">Biology</option>
              </select>
            </div>
          </div>

          {/* Search Results List */}
          <div className="p-4 flex-1 overflow-y-auto space-y-3">
            {filteredResults.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Search className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-xs font-bold">No matching study materials found.</p>
                <p className="text-[11px] mt-1 text-slate-500">Try searching for keywords like "Gauss", "Coulomb", "Dipole".</p>
              </div>
            ) : (
              filteredResults.map((res) => (
                <motion.div
                  key={res.id}
                  whileHover={{ scale: 1.01 }}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2 cursor-pointer transition hover:border-indigo-500/50"
                  onClick={() => {
                    if (onSelectResult) onSelectResult(res);
                    onClose();
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${getTypeBadgeColor(res.type)}`}>
                      {res.type}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">{res.date} • {res.relevanceScore}% match</span>
                  </div>

                  <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                    <span>{res.title}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-indigo-500 opacity-80" />
                  </h4>

                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    {res.excerpt}
                  </p>

                  <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-bold pt-1">
                    <Tag className="w-3 h-3 text-indigo-400" />
                    <span>{res.subject}</span>
                    <span>•</span>
                    <span>{res.chapter}</span>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
