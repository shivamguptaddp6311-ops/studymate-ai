import React, { useState, useEffect } from "react";
import { UserProfile } from "../types";
import { 
  Settings, Sun, Moon, Bell, Volume2, CloudLightning, ShieldAlert, 
  HelpCircle, CheckCircle, Database, Lock, Eye, Play, Sparkles, RefreshCw, Cpu,
  Activity, Check, XCircle
} from "lucide-react";

interface SettingsViewProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  profile: UserProfile | null;
  syncStatus: "synced" | "syncing" | "offline" | "idle";
  onTriggerSync: () => Promise<void>;
  onDeleteAccount: () => Promise<void>;
}

export default function SettingsView({ 
  darkMode, 
  onToggleDarkMode, 
  profile,
  syncStatus,
  onTriggerSync,
  onDeleteAccount
}: SettingsViewProps) {
  // Local settings options states
  const [allowNotifications, setAllowNotifications] = useState(true);
  const [alarmVolume, setAlarmVolume] = useState(80);
  const [isBackupLinked, setIsBackupLinked] = useState(false);

  const [savingBackup, setSavingBackup] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>(() => {
    return localStorage.getItem("studymate_ai_provider") || "auto";
  });
  const [providerStatuses, setProviderStatuses] = useState<Record<string, boolean>>({});

  const [timeoutLimit, setTimeoutLimit] = useState<number>(() => {
    return Number(localStorage.getItem("studymate_ai_timeout")) || 30000;
  });

  const [metrics, setMetrics] = useState<any>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  const fetchMetrics = () => {
    setLoadingMetrics(true);
    fetch("/api/ai/metrics")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new TypeError("Expected JSON response from server");
        }
        return res.json();
      })
      .then((data) => {
        setMetrics(data);
        setLoadingMetrics(false);
      })
      .catch((err) => {
        console.warn("Error fetching AI metrics:", err);
        setLoadingMetrics(false);
      });
  };

  useEffect(() => {
    fetch("/api/ai/providers")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new TypeError("Expected JSON response from server");
        }
        return res.json();
      })
      .then((data) => {
        if (data) {
          setProviderStatuses(data);
        }
      })
      .catch((err) => console.warn("Error fetching providers:", err));

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleTimeoutChange = (value: number) => {
    setTimeoutLimit(value);
    localStorage.setItem("studymate_ai_timeout", String(value));
  };

  const handleProviderChange = (value: string) => {
    setSelectedProvider(value);
    localStorage.setItem("studymate_ai_provider", value);
  };

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
            Google Cloud Sync
          </h3>
          <p className="text-[10px] text-slate-400">Permanently save and sync your study profile, homework, streaks, and settings to your Google account.</p>

          <div className="flex items-center justify-between text-xs font-bold border border-slate-100 dark:border-slate-800 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40">
            <span className="text-slate-500 text-[10px] uppercase tracking-wider">Sync Status</span>
            <div className="flex items-center space-x-1.5">
              {syncStatus === "syncing" ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
                  <span className="text-indigo-600 dark:text-indigo-400">Syncing...</span>
                </>
              ) : syncStatus === "offline" ? (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span className="text-amber-600 dark:text-amber-400">Saved Locally (Offline)</span>
                </>
              ) : (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400">Synced to Google</span>
                </>
              )}
            </div>
          </div>

          <button
            onClick={onTriggerSync}
            disabled={syncStatus === "syncing"}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === "syncing" ? "animate-spin" : ""}`} />
            <span>{syncStatus === "syncing" ? "Synchronizing..." : "Sync Database Now"}</span>
          </button>
        </div>

      </div>

      {/* AI Core & LLM Provider Engine */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/60 pb-5">
          <div className="space-y-1">
            <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm flex items-center">
              <Cpu className="w-4.5 h-4.5 text-indigo-500 mr-1.5 animate-pulse" />
              AI Core & LLM Provider Engine
            </h3>
            <p className="text-[10px] text-slate-400 max-w-xl">
              Choose your preferred AI partner or leverage the intelligent automated system to route requests. If a provider experiences an outage, StudyMate AI automatically falls back to secondary options.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="w-full sm:w-56">
              <label className="block text-[10px] font-bold text-slate-500 mb-1.5">Selected AI Provider</label>
              <select
                value={selectedProvider}
                onChange={(e) => handleProviderChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="auto">🌟 Auto-Fallback Mode (Recommended)</option>
                <option value="gemini">♊ Google Gemini</option>
                <option value="openai">🧠 OpenAI GPT-4o</option>
                <option value="groq">⚡ Groq LLaMA 3</option>
                <option value="openrouter">📡 OpenRouter Hub</option>
                <option value="anthropic">🦉 Anthropic Claude 3.5</option>
              </select>
            </div>
            <div className="w-full sm:w-48">
              <label className="block text-[10px] font-bold text-slate-500 mb-1.5">Request Timeout Limit</label>
              <select
                value={timeoutLimit}
                onChange={(e) => handleTimeoutChange(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="5000">⚡ 5 seconds (Fastest)</option>
                <option value="10000">🚀 10 seconds</option>
                <option value="15000">⏱️ 15 seconds (Recommended)</option>
                <option value="30000">🛡️ 30 seconds (Standard)</option>
                <option value="60000">🐳 60 seconds (Deep Think)</option>
              </select>
            </div>
          </div>
        </div>

        {/* METRICS SUMMARY GRID */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 rounded-2xl flex items-center space-x-3">
              <div className="p-2.5 bg-indigo-500/10 text-indigo-500 rounded-xl">
                <Activity className="w-4.5 h-4.5 animate-pulse" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total AI Queries</span>
                <span className="text-xl font-extrabold text-slate-800 dark:text-slate-100">{metrics.summary?.totalRequests || 0}</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 rounded-2xl flex items-center space-x-3">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl">
                <Check className="w-4.5 h-4.5" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Avg Success Rate</span>
                <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{metrics.summary?.successRate ?? 100}%</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 rounded-2xl flex items-center space-x-3">
              <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl">
                <RefreshCw className="w-4.5 h-4.5" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Avg Response Time</span>
                <span className="text-xl font-extrabold text-amber-600 dark:text-amber-400">{metrics.summary?.avgResponseTime || 0} ms</span>
              </div>
            </div>
          </div>
        )}

        <div className="pt-2">
          <span className="block text-[10px] font-bold text-slate-500 mb-3">Live Connection & Keys Status</span>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            
            {/* Auto Mode status */}
            <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/25 border border-indigo-100/50 dark:border-indigo-900/50 rounded-2xl flex flex-col justify-between space-y-1.5">
              <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400">Auto Mode</span>
              <span className="text-[9px] text-slate-400 leading-tight">Fallback Enabled</span>
              <div className="flex items-center space-x-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[8px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Ready</span>
              </div>
            </div>

            {/* Gemini status */}
            <div className={`p-3 border rounded-2xl flex flex-col justify-between space-y-1.5 ${
              providerStatuses.gemini 
                ? "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800" 
                : "bg-slate-50/50 dark:bg-slate-800/20 border-dashed border-slate-100 dark:border-slate-800"
            }`}>
              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">Gemini Key</span>
              <span className="text-[9px] text-slate-400 leading-tight">Primary backend model</span>
              <div className="flex items-center space-x-1">
                <div className={`w-1.5 h-1.5 rounded-full ${providerStatuses.gemini ? "bg-emerald-500" : "bg-slate-400"}`} />
                <span className={`text-[8px] font-bold uppercase ${providerStatuses.gemini ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}>
                  {providerStatuses.gemini ? "Configured" : "Not Found"}
                </span>
              </div>
            </div>

            {/* OpenAI status */}
            <div className={`p-3 border rounded-2xl flex flex-col justify-between space-y-1.5 ${
              providerStatuses.openai 
                ? "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800" 
                : "bg-slate-50/50 dark:bg-slate-800/20 border-dashed border-slate-100 dark:border-slate-800"
            }`}>
              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">OpenAI Key</span>
              <span className="text-[9px] text-slate-400 leading-tight">GPT-4o engine</span>
              <div className="flex items-center space-x-1">
                <div className={`w-1.5 h-1.5 rounded-full ${providerStatuses.openai ? "bg-emerald-500" : "bg-slate-400"}`} />
                <span className={`text-[8px] font-bold uppercase ${providerStatuses.openai ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}>
                  {providerStatuses.openai ? "Configured" : "Not Found"}
                </span>
              </div>
            </div>

            {/* Groq status */}
            <div className={`p-3 border rounded-2xl flex flex-col justify-between space-y-1.5 ${
              providerStatuses.groq 
                ? "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800" 
                : "bg-slate-50/50 dark:bg-slate-800/20 border-dashed border-slate-100 dark:border-slate-800"
            }`}>
              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">Groq Key</span>
              <span className="text-[9px] text-slate-400 leading-tight">LLaMA ultra-fast engine</span>
              <div className="flex items-center space-x-1">
                <div className={`w-1.5 h-1.5 rounded-full ${providerStatuses.groq ? "bg-emerald-500" : "bg-slate-400"}`} />
                <span className={`text-[8px] font-bold uppercase ${providerStatuses.groq ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}>
                  {providerStatuses.groq ? "Configured" : "Not Found"}
                </span>
              </div>
            </div>

            {/* OpenRouter status */}
            <div className={`p-3 border rounded-2xl flex flex-col justify-between space-y-1.5 ${
              providerStatuses.openrouter 
                ? "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800" 
                : "bg-slate-50/50 dark:bg-slate-800/20 border-dashed border-slate-100 dark:border-slate-800"
            }`}>
              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">OpenRouter Key</span>
              <span className="text-[9px] text-slate-400 leading-tight">Universal endpoint</span>
              <div className="flex items-center space-x-1">
                <div className={`w-1.5 h-1.5 rounded-full ${providerStatuses.openrouter ? "bg-emerald-500" : "bg-slate-400"}`} />
                <span className={`text-[8px] font-bold uppercase ${providerStatuses.openrouter ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}>
                  {providerStatuses.openrouter ? "Configured" : "Not Found"}
                </span>
              </div>
            </div>

            {/* Anthropic status */}
            <div className={`p-3 border rounded-2xl flex flex-col justify-between space-y-1.5 ${
              providerStatuses.anthropic 
                ? "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800" 
                : "bg-slate-50/50 dark:bg-slate-800/20 border-dashed border-slate-100 dark:border-slate-800"
            }`}>
              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">Anthropic Key</span>
              <span className="text-[9px] text-slate-400 leading-tight">Claude premium writing</span>
              <div className="flex items-center space-x-1">
                <div className={`w-1.5 h-1.5 rounded-full ${providerStatuses.anthropic ? "bg-emerald-500" : "bg-slate-400"}`} />
                <span className={`text-[8px] font-bold uppercase ${providerStatuses.anthropic ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}>
                  {providerStatuses.anthropic ? "Configured" : "Not Found"}
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* TELEMETRY RECENT LOGS */}
        {metrics?.recentLogs && metrics.recentLogs.length > 0 && (
          <div className="border-t border-slate-50 dark:border-slate-800 pt-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="block text-[10px] font-bold text-slate-500">Recent AI Request Telemetry Logs</span>
              <button 
                onClick={fetchMetrics} 
                className="text-[9px] font-extrabold text-indigo-500 hover:underline flex items-center space-x-1"
              >
                <RefreshCw className={`w-2.5 h-2.5 ${loadingMetrics ? "animate-spin" : ""}`} />
                <span>Refresh Logs</span>
              </button>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[10px] border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200/50 dark:border-slate-800">
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">Endpoint</th>
                      <th className="p-3">Provider Used</th>
                      <th className="p-3 text-right">Latency</th>
                      <th className="p-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 font-medium">
                    {metrics.recentLogs.slice(0, 5).map((log: any) => (
                      <tr key={log.id} className="hover:bg-slate-100/40 dark:hover:bg-slate-800/20 transition-colors">
                        <td className="p-3 text-slate-400 dark:text-slate-500 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td className="p-3 font-bold text-slate-700 dark:text-slate-300">
                          {log.endpoint || "AI request"}
                        </td>
                        <td className="p-3 capitalize text-slate-600 dark:text-slate-400">
                          {log.provider || "auto"}
                        </td>
                        <td className="p-3 text-right text-slate-600 dark:text-slate-400 font-bold font-mono">
                          {log.success ? `${log.responseTimeMs} ms` : "-"}
                        </td>
                        <td className="p-3 text-right">
                          {log.success ? (
                            <span className="px-2 py-0.5 rounded-full text-[8px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                              Success
                            </span>
                          ) : (
                            <span 
                              className="px-2 py-0.5 rounded-full text-[8px] font-extrabold bg-rose-500/10 text-rose-600 dark:text-rose-400 uppercase tracking-wider cursor-help"
                              title={log.errorMessage || "Request failed"}
                            >
                              Failed
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="bg-rose-500/5 border border-rose-500/15 p-6 rounded-3xl shadow-sm space-y-4">
        <div className="flex items-start space-x-3.5">
          <div className="p-2 bg-rose-500/10 text-rose-600 rounded-xl">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">Danger Zone: Permanent Deletion</h3>
            <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
              Wipe all files, logged schedules, high-score statistics, homework lists, and completely delete your StudyMate user profile from Google Cloud. This action is **irreversible**.
            </p>
          </div>
        </div>
        <button
          onClick={onDeleteAccount}
          className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl shadow transition flex items-center justify-center space-x-1.5 cursor-pointer"
        >
          <span>Wipe & Delete Google Account Link</span>
        </button>
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
