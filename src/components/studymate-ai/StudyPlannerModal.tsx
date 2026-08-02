import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Calendar, CheckSquare, Clock, Plus, Target, Sparkles, AlertTriangle, ArrowRight } from "lucide-react";
import { StudyPlan } from "./types";

interface StudyPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyPlanPrompt: (promptText: string) => void;
}

export function StudyPlannerModal({
  isOpen,
  onClose,
  onApplyPlanPrompt
}: StudyPlannerModalProps) {
  const [plans, setPlans] = useState<StudyPlan[]>(() => {
    try {
      const saved = localStorage.getItem("studymate_study_planner");
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [
      {
        id: "sp-1",
        title: "Class 12 Physics CBSE Exam Sprint",
        subject: "Physics",
        targetExamDate: "2026-03-15",
        dailyTargetHours: 3.5,
        weeklyGoals: [
          { id: "g1", text: "Complete Electrostatics & Gauss Law numericals", completed: true, dueDate: "Today" },
          { id: "g2", text: "Finish Capacitance derivations & NCERT exercises", completed: false, dueDate: "Tomorrow" },
          { id: "g3", text: "Solve 2025 Past Board Question Paper 1", completed: false, dueDate: "In 3 days" }
        ],
        backlogItems: ["Ray Optics Formula Sheet", "Wave Optics interference derivation review"]
      }
    ];
  });

  const [activePlan] = useState<StudyPlan>(plans[0]);

  if (!isOpen) return null;

  const toggleGoal = (goalId: string) => {
    const updated = plans.map((p) => {
      if (p.id === activePlan.id) {
        return {
          ...p,
          weeklyGoals: p.weeklyGoals.map((g) => g.id === goalId ? { ...g, completed: !g.completed } : g)
        };
      }
      return p;
    });
    setPlans(updated);
    try {
      localStorage.setItem("studymate_study_planner", JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const calculateDaysLeft = (targetDate: string) => {
    try {
      const target = new Date(targetDate);
      const diff = target.getTime() - new Date().getTime();
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      return days > 0 ? days : 0;
    } catch {
      return 30;
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl text-slate-800 dark:text-slate-100"
        >
          {/* Header */}
          <div className="p-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-2xl">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight">Adaptive Study Planner</h3>
                <p className="text-xs text-teal-100 font-medium">Exam countdown, targets & backlog recovery</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 overflow-y-auto space-y-5 flex-1">
            {/* Exam Countdown Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 border border-teal-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-teal-600 dark:text-teal-400">Target Exam</span>
                <h4 className="text-sm font-black">{activePlan.title}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Daily Target: {activePlan.dailyTargetHours} hours/day</p>
              </div>

              <div className="text-right px-3 py-2 bg-white dark:bg-slate-800 rounded-2xl border border-teal-200 dark:border-teal-900 shadow-xs">
                <span className="text-2xl font-black text-teal-600 dark:text-teal-400">
                  {calculateDaysLeft(activePlan.targetExamDate)}
                </span>
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Days Left</span>
              </div>
            </div>

            {/* Weekly Targets List */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center space-x-1.5">
                <Target className="w-3.5 h-3.5 text-teal-500" />
                <span>Weekly Revision Targets</span>
              </h4>

              <div className="space-y-2">
                {activePlan.weeklyGoals.map((goal) => (
                  <div
                    key={goal.id}
                    onClick={() => toggleGoal(goal.id)}
                    className={`p-3 rounded-2xl border flex items-center justify-between transition cursor-pointer ${
                      goal.completed
                        ? "bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 line-through text-slate-400"
                        : "bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-5 h-5 rounded-lg border flex items-center justify-center ${
                        goal.completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 dark:border-slate-600"
                      }`}>
                        {goal.completed && <CheckSquare className="w-3.5 h-3.5" />}
                      </div>
                      <span className="text-xs font-bold">{goal.text}</span>
                    </div>

                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      {goal.dueDate}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Backlog Recovery Section */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-500 mb-2 flex items-center space-x-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Backlog Recovery List</span>
              </h4>

              <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/50 space-y-1.5">
                {activePlan.backlogItems.map((item, idx) => (
                  <div key={idx} className="flex items-center space-x-2 text-xs font-medium text-amber-900 dark:text-amber-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Optimization Trigger */}
            <button
              onClick={() => {
                const prompt = `[ADAPTIVE STUDY PLAN GENERATOR]
Exam Target: ${activePlan.title}
Days Remaining: ${calculateDaysLeft(activePlan.targetExamDate)}
Daily Study Hours: ${activePlan.dailyTargetHours}h

Please analyze my active workspace and generate a personalized 7-day revision schedule with daily targets, micro-goals, and a strategy to clear my backlogs:
${activePlan.backlogItems.join(", ")}.`;
                onApplyPlanPrompt(prompt);
                onClose();
              }}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:opacity-95 text-white font-extrabold text-sm rounded-2xl shadow-lg transition flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-emerald-200" />
              <span>Generate AI Adaptive Daily Schedule</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
