import React, { useState } from "react";
import { UserProfile, TimetableItem } from "../types";
import { 
  Calendar, Clock, Sparkles, Plus, Trash2, ArrowRight, BookOpen, 
  ListTodo, Compass, AlarmClock, AlertCircle, RefreshCw, Trophy, X
} from "lucide-react";

interface PlannerProps {
  profile: UserProfile;
  timetable: TimetableItem[];
  onAddTimetableItem: (day: string, time: string, subject: string, topic: string) => void;
  onDeleteTimetableItem: (id: string) => void;
  onLoadAISchedule: (aiSchedule: { timetable: TimetableItem[]; studyTips: string[] }) => void;
}

export default function Planner({
  profile,
  timetable,
  onAddTimetableItem,
  onDeleteTimetableItem,
  onLoadAISchedule
}: PlannerProps) {
  const [activeTab, setActiveTab] = useState<"Timetable" | "Countdown">("Timetable");
  const [showAdd, setShowAdd] = useState(false);
  const [day, setDay] = useState("Monday");
  const [time, setTime] = useState("04:00 PM - 05:30 PM");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");

  const [loadingAI, setLoadingAI] = useState(false);
  const [aiTips, setAiTips] = useState<string[]>([
    "Use active recall: quiz yourself instead of just reading chapters.",
    "Implement Spaced Repetition: revise concepts after 1, 3, 7, and 14 days.",
    "Solve previous year boards/exam question sheets under strict time pressure."
  ]);

  // Exam list data with live countdown calculations
  const [exams, setExams] = useState([
    { id: "ex-1", name: "Mathematics Mid-Term", date: "2026-07-20", subject: "Mathematics" },
    { id: "ex-2", name: "Physics Laws of Motion exam", date: "2026-08-05", subject: "Physics" },
    { id: "ex-3", name: "Chemistry Lab Practical Test", date: "2026-08-15", subject: "Chemistry" }
  ]);

  const [newExamName, setNewExamName] = useState("");
  const [newExamDate, setNewExamDate] = useState("");
  const [newExamSub, setNewExamSub] = useState("");
  const [showAddExam, setShowAddExam] = useState(false);

  const calculateDaysLeft = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const handleAIScheduleRequest = async () => {
    setLoadingAI(true);
    try {
      const response = await fetch("/api/gemini/suggest-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.fullName,
          grade: profile.classGrade,
          targetExam: profile.targetExam,
          dailyGoalHours: profile.dailyStudyGoal,
          preferredTime: profile.preferredStudyTime,
          favSubjects: profile.favoriteSubjects,
          weakSubjects: profile.weakSubjects
        })
      });

      if (!response.ok) {
        throw new Error("Failed to load suggested schedule.");
      }

      const data = await response.json();
      if (data && data.timetable) {
        // Map to TimetableItems
        const loadedItems: TimetableItem[] = [];
        data.timetable.forEach((item: any, idx: number) => {
          if (item.sessions) {
            item.sessions.forEach((session: any, sIdx: number) => {
              loadedItems.push({
                id: `ai-timetable-${idx}-${sIdx}`,
                day: item.day,
                time: session.time || "04:00 PM - 05:30 PM",
                subject: session.subject || "Study",
                topic: session.topic || "Review"
              });
            });
          }
        });

        onLoadAISchedule({
          timetable: loadedItems,
          studyTips: data.studyTips || ["Active recall rules!"]
        });

        if (data.studyTips) {
          setAiTips(data.studyTips);
        }

        alert("AI Study Schedule integrated successfully into your Study Planner!");
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "An error occurred.");
    } finally {
      setLoadingAI(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) return;
    onAddTimetableItem(day, time, subject, topic || "General Study Session");
    setSubject("");
    setTopic("");
    setShowAdd(false);
  };

  const handleAddExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExamName.trim() || !newExamDate) return;
    setExams([
      ...exams,
      {
        id: `exam-${Date.now()}`,
        name: newExamName,
        date: newExamDate,
        subject: newExamSub || "General"
      }
    ]);
    setNewExamName("");
    setNewExamDate("");
    setNewExamSub("");
    setShowAddExam(false);
  };

  const handleDeleteExam = (id: string) => {
    setExams(exams.filter((e) => e.id !== id));
  };

  const WEEKDAYS_GRID = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  return (
    <div id="planner_tab" className="space-y-6">

      {/* HEADER CONTROLS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center">
            <Calendar className="w-6 h-6 text-indigo-500 mr-2" />
            Study Planner & Timetable
          </h1>
          <p className="text-xs text-slate-400">Organize subjects, map out weekly schedules, and monitor exam deadlines.</p>
        </div>

        {/* Tab Toggle selectors */}
        <div className="flex space-x-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-stretch md:self-auto">
          {["Timetable", "Countdown"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`flex-1 md:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition ${
                activeTab === tab 
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm" 
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab === "Timetable" ? "Weekly Timetable" : "Exam Countdown"}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "Timetable" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Timetable Grid list */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* TIMETABLE VIEW HEADER */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-extrabold text-slate-800 dark:text-slate-100 flex items-center text-sm">
                  <Compass className="w-4.5 h-4.5 text-indigo-500 mr-1.5" />
                  Weekly Study Timetable
                </h3>
                
                <div className="flex space-x-2">
                  <button 
                    onClick={handleAIScheduleRequest}
                    disabled={loadingAI}
                    className="flex items-center space-x-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 text-white px-3 py-1.5 rounded-xl text-[10px] font-extrabold shadow-sm active:scale-95 transition"
                  >
                    {loadingAI ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    <span>{loadingAI ? "Constructing..." : "Generate AI Timetable"}</span>
                  </button>
                  
                  <button 
                    onClick={() => setShowAdd(true)}
                    className="flex items-center space-x-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-xl px-3 py-1.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Block</span>
                  </button>
                </div>
              </div>

              {timetable.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50/20">
                  <span className="text-3xl block mb-2">📅</span>
                  <p className="text-xs font-bold text-slate-700">Your timetable is empty</p>
                  <p className="text-[10px] text-slate-400 max-w-xs mx-auto mt-1">Tap 'Generate AI Timetable' to let StudyMate AI study your weak subjects and design a custom daily roadmap instantly!</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                  {WEEKDAYS_GRID.map((d) => {
                    const dayItems = timetable.filter((t) => t.day === d);
                    if (dayItems.length === 0) return null;

                    return (
                      <div key={d} className="space-y-2 border-l-2 border-indigo-200 dark:border-indigo-800/60 pl-3">
                        <h4 className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 tracking-wider uppercase">{d}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {dayItems.map((item) => (
                            <div 
                              key={item.id}
                              className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl flex justify-between items-start"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{item.subject}</span>
                                  <span className="text-[9px] text-slate-400 font-medium flex items-center">
                                    <Clock className="w-2.5 h-2.5 mr-0.5" />
                                    {item.time}
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal italic">
                                  Focus: {item.topic}
                                </p>
                              </div>
                              <button 
                                onClick={() => onDeleteTimetableItem(item.id)}
                                className="p-1 text-slate-300 hover:text-rose-500 rounded-lg"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* Right Column: AI Revision Advice */}
          <div className="space-y-6">
            
            {/* STUDY RULES / REVISION SUGGESTIONS CARD */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
              <h3 className="font-extrabold text-slate-800 dark:text-slate-100 flex items-center text-sm">
                <Trophy className="w-4.5 h-4.5 text-indigo-500 mr-1.5" />
                AI Study Techniques
              </h3>

              <div className="space-y-3">
                {aiTips.map((tip, idx) => (
                  <div key={idx} className="flex items-start space-x-2.5 p-3 bg-slate-50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800 rounded-xl">
                    <span className="text-xs bg-indigo-50 dark:bg-indigo-950 font-bold text-indigo-600 dark:text-indigo-400 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </span>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-normal">{tip}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* CLASS GOAL CORRELATION */}
            <div className="bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 border border-indigo-500/15 p-6 rounded-3xl text-xs text-slate-600 dark:text-slate-400 leading-relaxed space-y-2">
              <h4 className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center">
                <AlertCircle className="w-3.5 h-3.5 mr-1" /> Custom Subject Weights
              </h4>
              <p>
                Based on your selected profile, we highly prioritize revision for your listed weak subjects:
                <strong className="text-slate-800 dark:text-slate-200"> {profile.weakSubjects.join(", ") || "None listed"}</strong>. We recommend dedicating at least 2 days a week to core weak concept testing.
              </p>
            </div>

          </div>

        </div>
      ) : (
        /* EXAM COUNTDOWN VIEW */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Exam Countdown Card lists */}
          <div className="md:col-span-2 space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">Target Exams Countdown</h3>
                <button 
                  onClick={() => setShowAddExam(true)}
                  className="flex items-center space-x-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold px-2.5 py-1.5 rounded-lg"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Exam</span>
                </button>
              </div>

              <div className="space-y-3.5">
                {exams.map((ex) => {
                  const daysLeft = calculateDaysLeft(ex.date);
                  return (
                    <div 
                      key={ex.id}
                      className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 w-fit block">
                          {ex.subject}
                        </span>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">{ex.name}</h4>
                        <span className="text-[10px] text-slate-400 block font-medium">Exam Date: {new Date(ex.date).toLocaleDateString()}</span>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <span className={`text-2xl font-black ${daysLeft <= 7 ? "text-rose-500" : daysLeft <= 14 ? "text-amber-500" : "text-indigo-600 dark:text-indigo-400"}`}>
                            {daysLeft}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold block uppercase">Days Left</span>
                        </div>
                        
                        <button 
                          onClick={() => handleDeleteExam(ex.id)}
                          className="p-1 text-slate-300 hover:text-rose-500 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Guidelines on Board countdowns */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm text-center flex flex-col justify-center items-center py-10 space-y-3">
            <span className="text-4xl">⏱️</span>
            <h3 className="font-bold text-slate-800 dark:text-slate-100">Prepare Smartly</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-normal">
              Keep tight tabs on your examination timelines. Having visible countdowns activates your subconscious focus, ensuring you schedule daily study times to match.
            </p>
          </div>

        </div>
      )}

      {/* ADD TIMETABLE BLOCK MODAL POPUP */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-xl overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Add Study Block</h3>
                <button onClick={() => setShowAdd(false)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-full cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Weekday</label>
                    <select
                      className="w-full px-3 py-2 text-sm border rounded-xl border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 outline-none"
                      value={day}
                      onChange={(e) => setDay(e.target.value)}
                    >
                      {WEEKDAYS_GRID.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Subject</label>
                    <select
                      className="w-full px-3 py-2 text-sm border rounded-xl border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 outline-none"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      required
                    >
                      <option value="">Select subject...</option>
                      {profile.favoriteSubjects.map((sub) => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                      <option value="General">General</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Study Duration Interval</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 04:00 PM - 05:30 PM"
                    className="w-full px-3.5 py-2 text-sm border rounded-xl border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 outline-none"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Revision Topic Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Solve sample exercises"
                    className="w-full px-3.5 py-2 text-sm border rounded-xl border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 outline-none"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl transition"
                >
                  Save Timetable Block
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ADD EXAM MODAL POPUP */}
      {showAddExam && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-xl overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Register Exam</h3>
                <button onClick={() => setShowAddExam(false)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-full cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddExam} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Exam Name *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Physics Laws of Motion test"
                    className="w-full px-3.5 py-2 text-sm border rounded-xl border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                    value={newExamName}
                    onChange={(e) => setNewExamName(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Subject</label>
                    <select
                      className="w-full px-3 py-2 text-sm border rounded-xl border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 outline-none"
                      value={newExamSub}
                      onChange={(e) => setNewExamSub(e.target.value)}
                    >
                      <option value="">Select subject...</option>
                      {profile.favoriteSubjects.map((sub) => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                      <option value="General">General</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Exam Date *</label>
                    <input 
                      type="date" 
                      className="w-full px-3 py-2 text-sm border rounded-xl border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 outline-none"
                      value={newExamDate}
                      onChange={(e) => setNewExamDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl transition"
                >
                  Save Exam Date
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
