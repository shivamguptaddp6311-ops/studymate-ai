import React, { RefObject } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CloudUpload, X, Globe, Upload, FileText, Folder } from "lucide-react";
import { UserProfile } from "../../types";

export interface AttachedPdf {
  name: string;
  url?: string;
  source: "Google Drive" | "Local File";
  size?: string;
}

interface PDFUploaderProps {
  attachedPdf: AttachedPdf | null;
  onRemovePdf: () => void;
  pdfFileInputRef: RefObject<HTMLInputElement | null>;
  onPdfFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showDriveModal: boolean;
  setShowDriveModal: (val: boolean) => void;
  driveUrlInput: string;
  setDriveUrlInput: (val: string) => void;
  driveError: string | null;
  setDriveError: (val: string | null) => void;
  onImportDriveUrl: () => void;
  onSelectDriveSample: (name: string, size: string) => void;
  profile: UserProfile;
}

export function PDFUploader({
  attachedPdf,
  onRemovePdf,
  pdfFileInputRef,
  onPdfFileSelect,
  showDriveModal,
  setShowDriveModal,
  driveUrlInput,
  setDriveUrlInput,
  driveError,
  setDriveError,
  onImportDriveUrl,
  onSelectDriveSample,
  profile,
}: PDFUploaderProps) {
  return (
    <>
      {/* Hidden PDF File Input */}
      <input 
        type="file" 
        ref={pdfFileInputRef} 
        onChange={onPdfFileSelect}
        accept=".pdf,.doc,.docx,.txt"
        className="hidden"
      />

      {/* Selected PDF Attachment Preview Banner */}
      {attachedPdf && (
        <div className="px-4 py-2 border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/70 dark:bg-emerald-950/40 backdrop-blur-xl rounded-2xl mx-auto w-[94%] max-w-4xl mb-2 flex items-center justify-between flex-shrink-0 shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-gradient-to-tr from-emerald-500 to-teal-600 text-white rounded-xl shadow-md">
              <CloudUpload className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded">
                  {attachedPdf.source} PDF
                </span>
              </div>
              <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 block truncate max-w-xs">
                {attachedPdf.name}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onRemovePdf}
            className="p-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-500 rounded-full hover:bg-rose-100 transition cursor-pointer"
            title="Remove Attachment"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* GOOGLE DRIVE PDF UPLOAD MODAL */}
      <AnimatePresence>
        {showDriveModal && (
          <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-[160] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-white/20 dark:border-slate-800 rounded-3xl p-6 shadow-2xl max-w-lg w-full space-y-5 relative overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-600 text-white rounded-2xl shadow-lg">
                    <CloudUpload className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
                      Upload PDF from Google Drive
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Import textbook chapters, syllabus notes, or sample papers directly
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowDriveModal(false);
                    setDriveError(null);
                  }}
                  className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 dark:text-slate-400 rounded-full transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Option A: Paste Google Drive URL */}
              <div className="space-y-2 pt-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Paste Google Drive Shareable Link</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={driveUrlInput}
                    onChange={(e) => {
                      setDriveUrlInput(e.target.value);
                      setDriveError(null);
                    }}
                    placeholder="https://drive.google.com/file/d/..."
                    className="flex-1 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={onImportDriveUrl}
                    className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Import</span>
                  </button>
                </div>
                {driveError && (
                  <p className="text-[10px] text-rose-500 font-bold flex items-center gap-1">
                    <span>⚠️</span> {driveError}
                  </p>
                )}
              </div>

              {/* Divider */}
              <div className="flex items-center my-3">
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                <span className="px-3 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  OR SELECT DRIVE STUDY MATERIALS
                </span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
              </div>

              {/* Option B: Curated Sample Drive PDFs */}
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {[
                  { name: `NCERT_Class_${profile.classGrade || "10"}_Science_Physics_Ch1.pdf`, size: "1.8 MB", topic: "Electricity & Magnetism" },
                  { name: `CBSE_Class_${profile.classGrade || "10"}_Math_Sample_Paper_2026.pdf`, size: "2.4 MB", topic: "Board Exam Prep" },
                  { name: `Chemistry_Reaction_Mechanisms_FormulaSheet.pdf`, size: "950 KB", topic: "High Yield Formulae" },
                  { name: `Biology_Diagrams_and_Key_Notes.pdf`, size: "1.2 MB", topic: "Illustrated Notes" }
                ].map((doc, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onSelectDriveSample(doc.name, doc.size)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border border-slate-200/60 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-900 rounded-xl flex items-center justify-between transition cursor-pointer text-left group"
                  >
                    <div className="flex items-center space-x-2.5 overflow-hidden">
                      <div className="p-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg group-hover:scale-110 transition shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                          {doc.name}
                        </span>
                        <span className="text-[9px] text-slate-400 font-medium block">
                          Google Drive • {doc.topic} • {doc.size}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg shrink-0">
                      Attach
                    </span>
                  </button>
                ))}
              </div>

              {/* Local File Fallback Button */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowDriveModal(false);
                    pdfFileInputRef.current?.click();
                  }}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5 cursor-pointer"
                >
                  <Folder className="w-3.5 h-3.5" />
                  <span>Or upload PDF from device</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowDriveModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-xs rounded-xl transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export default PDFUploader;
