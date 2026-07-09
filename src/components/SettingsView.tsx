import React, { useState } from "react";
import { UserProfile } from "../types";
import { 
  Settings, Sun, Moon, Bell, Volume2, CloudLightning, ShieldAlert, 
  HelpCircle, CheckCircle, Database, Lock, Eye, Play, Sparkles, RefreshCw
} from "lucide-react";

interface SettingsViewProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  profile: UserProfile;
}

export default function SettingsView({ darkMode, onToggleDarkMode, profile }: SettingsViewProps) {
  // Local settings options states
  const [allowNotifications, setAllowNotifications] = useState(true);
  const [alarmVolume, setAlarmVolume] = useState(80);
  const [isBackupLinked, setIsBackupLinked] = useState(false);
  const [voiceAssistance, setVoiceAssistance] = useState(false);

  const [savingBackup, setSavingBackup] = useState(false);

  const handleBackupRequest = () => {
    setSavingBackup(true);
    // Simulate cloud backup latency
    setTimeout(() => {
      setSavingBackup(false);
      setIsBackupLinked(true);
      alert("StudyMate Database backed up successfully to Google Drive!");
    }, 1500);
  };

  return (
    <div id="settings_tab" className="space-y-6">

      {/* HEADER CARD */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
        <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center">
          <Settings className="w-6 h-6 text-indigo-500 mr-2" />
          System Settings
        </h1>
        <p className="text-xs text-slate-400">Configure theme preferences, custom notification limits, and cloud drive backup utilities.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Visual appearance card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
          <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm flex items-center">
            <Sun className="w-4.5 h-4.5 text-indigo-500 mr-1.5" />
            Visual Theme
          </h3>
          <p className="text-[10px] text-slate-400">Toggle between high-contrast light or warm eye-safe twilight dark displays.</p>

          <button
            onClick={onToggleDarkMode}
            className="w-full py-3 px-4 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 transition cursor-pointer"
          >
            <span>Current Theme</span>
            <span className="flex items-center space-x-1.5">
              {darkMode ? (
                <>
                  <Moon className="w-4 h-4 text-violet-400" />
                  <span>Twilight Dark</span>
                </>
              ) : (
                <>
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span>Clean Light</span>
                </>
              )}
            </span>
          </button>
        </div>

        {/* Alarms and notifications */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
          <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm flex items-center">
            <Bell className="w-4.5 h-4.5 text-indigo-500 mr-1.5" />
            Alerts & Volume
          </h3>

          <div className="space-y-4">
            {/* Notifications Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Push Alarms & Reminders</span>
                <p className="text-[9px] text-slate-400">Let app issue desktop audio notifications</p>
              </div>
              
              <button 
                onClick={() => setAllowNotifications(!allowNotifications)}
                className={`w-10 h-5.5 rounded-full p-0.5 transition-colors duration-200 outline-none ${
                  allowNotifications ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-800"
                }`}
              >
                <div className={`bg-white w-4.5 h-4.5 rounded-full shadow-sm transform transition-transform duration-200 ${
                  allowNotifications ? "translate-x-4.5" : "translate-x-0"
                }`} />
              </button>
            </div>

            {/* Volume range bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-500 font-bold">
                <span>Alarm Ringtone Volume</span>
                <span>{alarmVolume}%</span>
              </div>
              <input 
                type="range" 
                min="10" 
                max="100" 
                step="10"
                className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg accent-indigo-600 cursor-pointer"
                value={alarmVolume}
                onChange={(e) => setAlarmVolume(parseInt(e.target.value))}
              />
            </div>
          </div>
        </div>

        {/* Database backup options */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
          <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm flex items-center">
            <Database className="w-4.5 h-4.5 text-indigo-500 mr-1.5" />
            Google Drive Backup
          </h3>
          <p className="text-[10px] text-slate-400">Secure offline-first database. Link your Google Drive to enable encrypted auto-backups.</p>

          <button
            onClick={handleBackupRequest}
            disabled={savingBackup}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            {savingBackup ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Syncing cloud files...</span>
              </>
            ) : (
              <>
                <Database className="w-3.5 h-3.5" />
                <span>{isBackupLinked ? "Cloud database synchronized" : "Backup database now"}</span>
              </>
            )}
          </button>
        </div>

      </div>

      {/* Safety info card */}
      <div className="p-5 bg-indigo-500/5 border border-indigo-500/15 rounded-3xl flex items-start space-x-4">
        <div className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
          <Lock className="w-5 h-5" />
        </div>
        <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed space-y-1">
          <h4 className="font-bold text-slate-800 dark:text-slate-200">Data Privacy Protection</h4>
          <p>
            StudyMate utilizes an encrypted **offline-first local database architecture**. None of your private student details, captured assignment snapshots, or alarm logs are ever transmitted to third-party tracking networks. Your information remains exclusively yours, safely cached locally in your sandbox browser.
          </p>
        </div>
      </div>

    </div>
  );
}
