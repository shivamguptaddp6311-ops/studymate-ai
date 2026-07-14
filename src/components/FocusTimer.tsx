import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Clock, Award, BookOpen } from 'lucide-react';
import { StudySession } from '../types';
import { saveSession } from '../storageUtils';

interface FocusTimerProps {
  onSessionComplete: (session: StudySession) => void;
  subjects: string[];
}

export const FocusTimer: React.FC<FocusTimerProps> = ({ onSessionComplete, subjects }) => {
  const [mode, setMode] = useState<'pomodoro' | 'short' | 'long'>('pomodoro');
  const [selectedSubject, setSelectedSubject] = useState<string>(subjects[0] || 'General Study');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('');
  const [notes, setNotes] = useState('');

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const modeDurations = {
    pomodoro: 25 * 60,
    short: 5 * 60,
    long: 15 * 60,
  };

  useEffect(() => {
    setTimeLeft(modeDurations[mode]);
    setIsRunning(false);
  }, [mode]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, timeLeft]);

  const handleTimerComplete = async () => {
    setIsRunning(false);
    playTimerSound();

    if (mode === 'pomodoro') {
      const durationInSeconds = modeDurations.pomodoro;
      const newSession: StudySession = {
        id: crypto.randomUUID(),
        subject: selectedSubject,
        duration: durationInSeconds,
        notes: notes.trim() || `Completed ${mode} session`,
        createdAt: new Date().toISOString(),
      };
      await saveSession(newSession);
      onSessionComplete(newSession);
      setNotes('');
    }

    alert(`Time's up! Great job finishing your ${mode === 'pomodoro' ? 'study block' : 'break'}!`);
    setTimeLeft(modeDurations[mode]);
  };

  const playTimerSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2);
      osc.start();
      osc.stop(ctx.currentTime + 1.2);
    } catch (e) {
      console.warn("Audio Context not supported or allowed by browser policies.", e);
    }
  };

  const toggleTimer = () => setIsRunning(!isRunning);

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(modeDurations[mode]);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCustomDuration = (e: React.FormEvent) => {
    e.preventDefault();
    const mins = parseInt(customMinutes);
    if (!isNaN(mins) && mins > 0 && mins <= 180) {
      setTimeLeft(mins * 60);
      setIsRunning(false);
      setCustomMinutes('');
    }
  };

  const progressPercent = (timeLeft / modeDurations[mode]) * 100;

  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
      <div className="flex flex-col items-center">
        {/* Mode Selectors */}
        <div className="flex space-x-1 bg-slate-50 p-1.5 rounded-2xl border border-slate-100 mb-8 w-full max-w-sm">
          {(['pomodoro', 'short', 'long'] as const).map((m) => (
            <button
              key={m}
              id={`timer-mode-${m}`}
              onClick={() => setMode(m)}
              className={`flex-1 py-2 text-sm font-medium rounded-xl transition-all duration-300 capitalize ${
                mode === m
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {m === 'pomodoro' ? 'Study' : m === 'short' ? 'Short Break' : 'Long Break'}
            </button>
          ))}
        </div>

        {/* Circular Timer Visual */}
        <div className="relative w-64 h-64 flex items-center justify-center mb-8">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="128"
              cy="128"
              r="116"
              className="stroke-slate-100"
              strokeWidth="6"
              fill="transparent"
            />
            <circle
              cx="128"
              cy="128"
              r="116"
              className="stroke-indigo-600 transition-all duration-300"
              strokeWidth="6"
              fill="transparent"
              strokeDasharray={2 * Math.PI * 116}
              strokeDashoffset={2 * Math.PI * 116 * (1 - progressPercent / 100)}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-5xl font-bold font-mono tracking-tight text-slate-900">
              {formatTime(timeLeft)}
            </span>
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400 mt-2 flex items-center gap-1">
              <Clock size={12} /> {mode === 'pomodoro' ? 'Focusing' : 'Resting'}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-4 mb-8">
          <button
            id="btn-timer-reset"
            onClick={resetTimer}
            className="p-3 text-slate-500 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-full border border-slate-100 transition-colors"
            title="Reset"
          >
            <RotateCcw size={20} />
          </button>
          <button
            id="btn-timer-toggle"
            onClick={toggleTimer}
            className={`px-8 py-4 font-semibold rounded-2xl flex items-center gap-2 shadow-sm transition-all duration-300 ${
              isRunning
                ? 'bg-slate-900 text-white hover:bg-slate-800'
                : 'bg-indigo-600 text-white hover:bg-indigo-500'
            }`}
          >
            {isRunning ? <Pause size={20} /> : <Play size={20} />}
            {isRunning ? 'Pause' : 'Start Focus'}
          </button>
        </div>

        {/* Extra inputs for Study Mode */}
        {mode === 'pomodoro' && (
          <div className="w-full max-w-sm space-y-4 border-t border-slate-100 pt-6">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <BookOpen size={12} /> Target Subject
              </label>
              <select
                id="timer-subject-select"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {subjects.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Award size={12} /> Focus Objective / Notes
              </label>
              <input
                id="timer-notes-input"
                type="text"
                placeholder="What are you studying right now?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>
        )}

        {/* Custom duration setup */}
        <form onSubmit={handleCustomDuration} className="w-full max-w-sm flex items-center gap-2 mt-6 pt-4 border-t border-slate-50">
          <input
            id="timer-custom-minutes"
            type="number"
            min="1"
            max="180"
            placeholder="Custom mins..."
            value={customMinutes}
            onChange={(e) => setCustomMinutes(e.target.value)}
            className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none"
          />
          <button
            id="btn-timer-custom"
            type="submit"
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
          >
            Apply
          </button>
        </form>
      </div>
    </div>
  );
};
