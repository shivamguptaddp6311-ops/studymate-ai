import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Shield,
  Cloud,
  Lock,
  RefreshCw,
  CheckCircle2,
  HardDrive,
  Key,
  Database,
  Smartphone
} from "lucide-react";

interface CloudSecuritySyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CloudSecuritySyncModal({
  isOpen,
  onClose
}: CloudSecuritySyncModalProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState("Just now");
  const [biometricEnabled, setBiometricEnabled] = useState(true);
  const [localEncryption, setLocalEncryption] = useState(true);

  if (!isOpen) return null;

  const handleSyncNow = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setLastSynced("Just now");
    }, 1500);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl text-white"
        >
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-2xl">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-black tracking-tight">Offline-First Cloud Sync & Security</h3>
                <p className="text-xs text-emerald-100 font-medium">AES-256 local encrypted storage & Firebase Cloud Sync</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
            {/* Sync Banner */}
            <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Cloud className="w-4 h-4 text-emerald-400" />
                  <span className="font-black text-white text-xs">Sync Status: Online & Up-to-Date</span>
                </div>
                <p className="text-[11px] text-slate-400">Last background sync: {lastSynced}</p>
              </div>

              <button
                onClick={handleSyncNow}
                disabled={isSyncing}
                className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs rounded-xl transition flex items-center space-x-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                <span>{isSyncing ? "Syncing..." : "Sync Now"}</span>
              </button>
            </div>

            {/* Offline-First Capability Checklist */}
            <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800 space-y-2">
              <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                Offline-First Local Storage Engine
              </h4>

              <div className="space-y-1.5 text-slate-300 font-medium text-[11px]">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Chats, Notes, Flashcards & Quizzes cached locally</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Conflict-safe CRDT timestamp synchronization</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Zero data loss during internet disconnections</span>
                </div>
              </div>
            </div>

            {/* Security Controls */}
            <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800 space-y-3">
              <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                Security & Biometric Privacy
              </h4>

              <div className="flex items-center justify-between">
                <div>
                  <span className="font-extrabold text-white block">AES-256 Local Encryption</span>
                  <span className="text-[10px] text-slate-400">Encrypt local SQLite/Hive database with device key</span>
                </div>
                <input
                  type="checkbox"
                  checked={localEncryption}
                  onChange={(e) => setLocalEncryption(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <div>
                  <span className="font-extrabold text-white block">Biometric Lock (Face ID / Fingerprint)</span>
                  <span className="text-[10px] text-slate-400">Require biometric auth to unlock StudyMate AI</span>
                </div>
                <input
                  type="checkbox"
                  checked={biometricEnabled}
                  onChange={(e) => setBiometricEnabled(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
