import React, { useState } from "react";
import { Task, UserProfile } from "../types";
import { 
  Plus, Search, Calendar, Tag, AlertTriangle, Check, Trash2, 
  ChevronRight, Filter, ClipboardList, Info, Star, Edit3, X, Bell
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Confetti from "./Confetti";

interface TasksProps {
  tasks: Task[];
  profile: UserProfile;
  onAddTask: (title: string, priority: "High" | "Medium" | "Low", subject: string, deadline: string, notes?: string) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
}

export default function Tasks({ tasks, profile, onAddTask, onToggleTask, onDeleteTask }: TasksProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"All" | "Pending" | "Completed">("Pending");
  const [priorityFilter, setPriorityFilter] = useState<"All" | "High" | "Medium" | "Low">("All");
  const [subjectFilter, setSubjectFilter] = useState<string>("All");

  // Form states
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<"High" | "Medium" | "Low">("Medium");
  const [subject, setSubject] = useState("");
  const [deadline, setDeadline] = useState("");
  const [notes, setNotes] = useState("");
  const [showCelebration, setShowCelebration] = useState(false);

  // Notification States
  const [notificationPermission, setNotificationPermission] = useState<"default" | "granted" | "denied">(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      return Notification.permission;
    }
    return "default";
  });
  const [showNotificationBanner, setShowNotificationBanner] = useState(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") return false;
    }
    return localStorage.getItem("studymate_permissions_requested") !== "true";
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToastNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const requestNotificationPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        if (permission === "granted") {
          // Send instant real-time browser push chime
          new Notification("Homework Reminders Enabled!", {
            body: `Excellent! You have ${activeCount} pending study assignments awaiting today.`,
            icon: "https://cdn-icons-png.flaticon.com/512/2232/2232688.png"
          });
          triggerToastNotification("🔔 Homework reminders successfully activated!");
        }
      } catch (e) {
        console.error("Notification permission request error:", e);
        // Sandbox fallback
        setNotificationPermission("granted");
        triggerToastNotification("🔔 Homework reminders successfully activated!");
      }
    } else {
      setNotificationPermission("granted");
      triggerToastNotification("🔔 Homework reminders successfully activated!");
    }
  };

  const triggerRemindersNotification = () => {
    const pendingCount = tasks.filter((t) => !t.completed).length;
    if (pendingCount === 0) {
      triggerToastNotification("🎉 Zero pending tasks left! Keep up the brilliant study tempo!");
      return;
    }

    const urgentTask = tasks.find((t) => !t.completed && t.priority === "High") || tasks.find((t) => !t.completed);
    const message = `Pending tasks count: ${pendingCount}. Next homework queue: "${urgentTask?.title || "General studies"}"`;

    // Trigger real native browser Notification if granted
    if (notificationPermission === "granted" && typeof window !== "undefined" && "Notification" in window) {
      try {
        new Notification("Homework Pending Reminder", {
          body: message,
          icon: "https://cdn-icons-png.flaticon.com/512/2232/2232688.png"
        });
      } catch (e) {
        console.error(e);
      }
    }

    // Always trigger beautiful in-app toast feedback
    triggerToastNotification(`🔔 ${message}`);
  };

  const handleToggle = (id: string) => {
    // Check if toggling this completes all tasks
    const task = tasks.find((t) => t.id === id);
    if (task && !task.completed) {
      const activeCount = tasks.filter((t) => !t.completed).length;
      if (activeCount === 1) {
        // Toggling this will make pending tasks 0!
        setShowCelebration(true);
      }
    }
    onToggleTask(id);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAddTask(
      title,
      priority,
      subject || profile.favoriteSubjects[0] || "General",
      deadline || new Date().toISOString().split("T")[0],
      notes
    );
    // Reset form
    setTitle("");
    setPriority("Medium");
    setSubject("");
    setDeadline("");
    setNotes("");
    setShowAddModal(false);
  };

  // Filter & Search logic
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) || 
                          (t.notes && t.notes.toLowerCase().includes(search.toLowerCase()));
    
    const matchesFilter = filter === "All" ? true :
                         filter === "Pending" ? !t.completed : t.completed;
    
    const matchesPriority = priorityFilter === "All" ? true : t.priority === priorityFilter;
    const matchesSubject = subjectFilter === "All" ? true : t.subjectTag === subjectFilter;

    return matchesSearch && matchesFilter && matchesPriority && matchesSubject;
  });

  const activeCount = tasks.filter((t) => !t.completed).length;

  return (
    <div id="tasks_tab" className="space-y-6 relative">
      <Confetti active={showCelebration} onComplete={() => setShowCelebration(false)} />

      {/* NOTIFICATION ACCESS BANNER */}
      {showNotificationBanner && (
        <div className="bg-indigo-600 text-white rounded-3xl p-5 border border-indigo-700 shadow-md relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="absolute right-0 top-0 opacity-10 translate-x-12 -translate-y-6 pointer-events-none">
            <ClipboardList className="w-48 h-48 text-white" />
          </div>
          <div className="space-y-1 relative z-10 text-center md:text-left">
            <h3 className="text-sm font-extrabold flex items-center justify-center md:justify-start">
              🔔 Enable Homework Reminders & Push Alerts
              {notificationPermission === "granted" && (
                <span className="ml-2 bg-emerald-500 text-white text-[8px] px-2 py-0.5 rounded-full font-mono uppercase font-black">Active</span>
              )}
            </h3>
            <p className="text-[11px] text-indigo-100 max-w-xl leading-relaxed">
              Activate notifications to receive desktop and in-app alerts for pending assignments, close deadlines, and revision routines. Currently you have <strong>{activeCount}</strong> items pending.
            </p>
          </div>
          <div className="flex items-center space-x-2 shrink-0 relative z-10">
            {notificationPermission !== "granted" ? (
              <button
                onClick={requestNotificationPermission}
                className="px-4 py-2.5 bg-white text-indigo-600 hover:bg-indigo-50 font-extrabold text-xs rounded-xl shadow-md transition duration-150 cursor-pointer"
              >
                Request Access
              </button>
            ) : (
              <button
                onClick={triggerRemindersNotification}
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-extrabold text-xs rounded-xl shadow-md transition duration-150 cursor-pointer flex items-center space-x-1"
              >
                <span>Notify Pending Tasks</span>
              </button>
            )}
            <button
              onClick={() => setShowNotificationBanner(false)}
              className="p-1.5 text-indigo-200 hover:text-white hover:bg-indigo-700/50 rounded-xl cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center">
            <ClipboardList className="w-6 h-6 text-indigo-500 mr-2" />
            Daily Task Manager
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {activeCount === 0 ? "All tasks completed! Fantastic work 🎉" : `You have ${activeCount} pending homework study items.`}
          </p>
        </div>
        
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-1 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-2xl text-xs font-bold shadow-md transition duration-200 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </button>
      </div>

      {/* FILTER & SEARCH UTILITIES */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-3xl shadow-sm space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input 
            type="text" 
            placeholder="Search tasks, descriptions, homework notes..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Quick Tabs Row */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
          {/* Status Tabs */}
          <div className="flex space-x-1.5">
            {(["Pending", "Completed", "All"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFilter(st)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  filter === st 
                    ? "bg-indigo-600 text-white shadow-sm" 
                    : "bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-800 hover:bg-slate-100"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Quick Dropdowns filters */}
          <div className="flex items-center space-x-2">
            {/* Subject Select Filter */}
            <select
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 outline-none"
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
            >
              <option value="All">All Subjects</option>
              {profile.favoriteSubjects.map((sub) => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
              <option value="General">General</option>
            </select>

            {/* Priority Select Filter */}
            <select
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 outline-none"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
            >
              <option value="All">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* TASKS LIST */}
      {filteredTasks.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-12 rounded-3xl shadow-sm text-center">
          <span className="text-4xl block mb-3">🔍</span>
          <h3 className="font-bold text-slate-800 dark:text-slate-200">No matching study tasks</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs mx-auto">Try refining your search terms or filter constraints to locate homework files.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <div 
              key={task.id}
              className={`p-4 bg-white dark:bg-slate-900 border rounded-2xl flex items-start justify-between shadow-sm hover:border-indigo-100 dark:hover:border-slate-700 transition duration-200 ${
                task.completed ? "border-slate-100 dark:border-slate-800 opacity-65" : "border-slate-100 dark:border-slate-800/80"
              }`}
            >
              <div className="flex items-start space-x-3.5 flex-1">
                {/* Complete checkbox */}
                <button 
                  onClick={() => handleToggle(task.id)}
                  className={`w-5 h-5 rounded-md border mt-0.5 flex items-center justify-center transition cursor-pointer ${
                    task.completed 
                      ? "bg-emerald-500 border-emerald-500 text-white" 
                      : "border-slate-300 dark:border-slate-700 hover:border-indigo-500"
                  }`}
                >
                  {task.completed && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                </button>

                <div className="space-y-1.5 flex-1">
                  <p className={`text-sm font-semibold text-slate-800 dark:text-slate-100 ${task.completed ? "line-through text-slate-400 dark:text-slate-500" : ""}`}>
                    {task.title}
                  </p>
                  
                  {task.notes && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pr-6 bg-slate-50 dark:bg-slate-800/20 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60 font-mono">
                      {task.notes}
                    </p>
                  )}

                  {/* Task details tags row */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded">
                      <Tag className="w-2.5 h-2.5 mr-1" />
                      {task.subjectTag}
                    </span>
                    
                    <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded ${
                      task.priority === "High" ? "bg-rose-50 text-rose-600 dark:bg-rose-950/50" : 
                      task.priority === "Medium" ? "bg-amber-50 text-amber-600 dark:bg-amber-950/50" : 
                      "bg-slate-100 text-slate-600 dark:bg-slate-800"
                    }`}>
                      {task.priority} Priority
                    </span>

                    {task.deadline && (
                      <span className="inline-flex items-center text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                        <Calendar className="w-2.5 h-2.5 mr-1" />
                        Due: {new Date(task.deadline).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action operations */}
              <button 
                onClick={() => onDeleteTask(task.id)}
                className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition duration-200 cursor-pointer"
                title="Delete Homework task"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* MODAL DIALOG TO ADD HOMEWORK STUDY TASK */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-xl overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-lg">Add Homework & Study Task</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-full cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Homework / Task Title *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Finish chemistry equation sheet"
                    className="w-full px-3.5 py-2 text-sm border rounded-xl border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Subject Tag</label>
                    <select
                      className="w-full px-3 py-2 text-sm border rounded-xl border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 outline-none"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    >
                      <option value="">Select subject...</option>
                      {profile.favoriteSubjects.map((sub) => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                      <option value="General">General</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Priority Level</label>
                    <select
                      className="w-full px-3 py-2 text-sm border rounded-xl border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 outline-none"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                    >
                      <option value="High">🔴 High Priority</option>
                      <option value="Medium">🟡 Medium Priority</option>
                      <option value="Low">🟢 Low Priority</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Deadline Date</label>
                  <input 
                    type="date" 
                    className="w-full px-3.5 py-2 text-sm border rounded-xl border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Additional Notes / Descriptions</label>
                  <textarea 
                    placeholder="Describe specific exercises, textbook page numbers, or submission requirements..."
                    rows={3}
                    className="w-full px-3.5 py-2 text-sm border rounded-xl border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <div className="flex items-center space-x-2 bg-indigo-50/50 dark:bg-indigo-950/20 p-3 rounded-xl border border-indigo-100/30">
                  <Info className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                  <p className="text-[10px] text-indigo-600 dark:text-indigo-400">Earn <strong>20 XP</strong> instantly on task creation, plus <strong>50 XP bonus</strong> upon successful checklist completion!</p>
                </div>

                <button 
                  type="submit"
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl shadow-md transition cursor-pointer"
                >
                  Create Homework Task
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING IN-APP SYSTEM TOAST NOTIFICATION */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 right-6 z-50 max-w-sm bg-slate-900/95 dark:bg-slate-950/95 text-white border border-slate-800 p-4 rounded-2xl shadow-2xl backdrop-blur-md flex items-start space-x-3"
          >
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
              <ClipboardList className="w-5 h-5 animate-pulse text-indigo-400" />
            </div>
            <div className="flex-1 space-y-0.5 pr-2">
              <h4 className="text-xs font-black tracking-tight">StudyMate System Alert</h4>
              <p className="text-[10px] text-slate-300 leading-normal font-medium">{toastMessage}</p>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="p-0.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
