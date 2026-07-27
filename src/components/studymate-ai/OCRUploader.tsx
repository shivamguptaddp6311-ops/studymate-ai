import React, { RefObject, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Camera, 
  Crop, 
  X, 
  RotateCcw, 
  RotateCw, 
  Undo, 
  Check, 
  ImageIcon, 
  FileText, 
  Clipboard, 
  Sparkles, 
  BookOpen, 
  HelpCircle, 
  Globe, 
  Copy, 
  Send, 
  Zap, 
  Brain, 
  Layers, 
  FileCheck,
  AlertTriangle,
  Loader2
} from "lucide-react";
import { HomeworkSourceType, HomeworkActionType, ScanResult } from "../../hooks/useOCR";

interface OCRUploaderProps {
  cameraActive: boolean;
  stopCamera: () => void;
  videoRef: RefObject<HTMLVideoElement | null>;
  capturePhoto: () => void;
  activeSource: HomeworkSourceType;
  setActiveSource: (source: HomeworkSourceType) => void;
  cropSourceImage: string | null;
  setCropSourceImage: (val: string | null) => void;
  selectedPdf: { name: string; dataUrl: string; size?: string } | null;
  setSelectedPdf: (val: { name: string; dataUrl: string; size?: string } | null) => void;
  rotation: number;
  rotateClockwise: () => void;
  cropStageRef: RefObject<HTMLDivElement | null>;
  cropBox: { x: number; y: number; width: number; height: number };
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  pan: { x: number; y: number };
  undoHistory: Array<{ x: number; y: number; width: number; height: number }>;
  handleCropDragStart: (e: React.MouseEvent | React.TouchEvent, type: "center" | "tl" | "tr" | "bl" | "br" | "pan") => void;
  handleCropDragMove: (e: React.MouseEvent | React.TouchEvent) => void;
  handleCropDragEnd: () => void;
  handleResetCrop: () => void;
  handleUndoCrop: () => void;
  executeCrop: (onCropDone: (croppedDataUrl: string) => void) => void;
  ocrAction: HomeworkActionType;
  setOcrAction: (action: HomeworkActionType) => void;
  targetLanguage: string;
  setTargetLanguage: (lang: string) => void;
  isOcrProcessing: boolean;
  ocrError: string | null;
  scannedSolution: ScanResult | null;
  setScannedSolution: (val: ScanResult | null) => void;
  qualityWarning: string | null;
  onExecuteHomeworkScan: (params: { imagePayload?: string; action?: HomeworkActionType; lang?: string }) => void;
  onSendResultToChat?: (text: string) => void;
  onStartCamera: () => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  pdfFileInputRef: RefObject<HTMLInputElement | null>;
}

export function OCRUploader({
  cameraActive,
  stopCamera,
  videoRef,
  capturePhoto,
  activeSource,
  setActiveSource,
  cropSourceImage,
  setCropSourceImage,
  selectedPdf,
  setSelectedPdf,
  rotation,
  rotateClockwise,
  cropStageRef,
  cropBox,
  zoom,
  setZoom,
  pan,
  undoHistory,
  handleCropDragStart,
  handleCropDragMove,
  handleCropDragEnd,
  handleResetCrop,
  handleUndoCrop,
  executeCrop,
  ocrAction,
  setOcrAction,
  targetLanguage,
  setTargetLanguage,
  isOcrProcessing,
  ocrError,
  scannedSolution,
  setScannedSolution,
  qualityWarning,
  onExecuteHomeworkScan,
  onSendResultToChat,
  onStartCamera,
  fileInputRef,
  pdfFileInputRef
}: OCRUploaderProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"scan" | "result">("scan");

  const languages = [
    "Hindi", "English", "Spanish", "French", "German", 
    "Japanese", "Chinese", "Arabic", "Russian", "Portuguese"
  ];

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRunScan = () => {
    if (cropSourceImage) {
      executeCrop((croppedUrl) => {
        onExecuteHomeworkScan({ imagePayload: croppedUrl, action: ocrAction, lang: targetLanguage });
        setActiveTab("result");
      });
    } else if (selectedPdf) {
      onExecuteHomeworkScan({ imagePayload: selectedPdf.dataUrl, action: ocrAction, lang: targetLanguage });
      setActiveTab("result");
    }
  };

  const hasSourceToScan = !!cropSourceImage || !!selectedPdf;

  return (
    <>
      {/* LIVE CAMERA QUESTION SCANNER OVERLAY */}
      {cameraActive && (
        <div className="fixed inset-0 bg-slate-950/95 z-[150] flex flex-col items-center justify-between p-4 md:p-6 select-none backdrop-blur-xl">
          <div className="w-full max-w-md flex justify-between items-center text-white pt-4">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-indigo-500/20 border border-indigo-500/40 rounded-2xl">
                <Camera className="w-5 h-5 text-indigo-400 animate-pulse" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm flex items-center gap-1.5">
                  Scan Homework
                  <span className="text-[9px] bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wide">AI Vision</span>
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold">Align math, formulas, tables, diagrams, or printed text</p>
              </div>
            </div>
            <button 
              type="button"
              onClick={stopCamera} 
              className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-full transition cursor-pointer text-slate-300 hover:text-white"
              title="Close Camera"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="relative w-full max-w-sm aspect-square bg-slate-900 border border-indigo-500/30 rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center">
            <video 
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            {/* Alignment reticle overlay */}
            <div className="absolute inset-6 border border-white/20 rounded-2xl pointer-events-none flex items-center justify-center">
              <div className="w-8 h-8 border-t-3 border-l-3 border-indigo-500 absolute top-0 left-0 rounded-tl-lg"></div>
              <div className="w-8 h-8 border-t-3 border-r-3 border-indigo-500 absolute top-0 right-0 rounded-tr-lg"></div>
              <div className="w-8 h-8 border-b-3 border-l-3 border-indigo-500 absolute bottom-0 left-0 rounded-bl-lg"></div>
              <div className="w-8 h-8 border-b-3 border-r-3 border-indigo-500 absolute bottom-0 right-0 rounded-br-lg"></div>
              
              <span className="text-[10px] text-white/70 bg-slate-950/70 border border-white/10 px-2.5 py-1 rounded-xl font-bold tracking-wide text-center backdrop-blur-md">
                Align Homework Question Frame
              </span>
            </div>
          </div>

          <div className="w-full max-w-md pb-6 flex flex-col items-center space-y-4">
            <button
              type="button"
              onClick={capturePhoto}
              className="w-16 h-16 bg-white hover:bg-slate-200 border-4 border-indigo-500/40 rounded-full shadow-2xl transition active:scale-95 cursor-pointer flex items-center justify-center group"
              title="Capture Homework Image"
            >
              <div className="w-9 h-9 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-full group-hover:scale-105 transition"></div>
            </button>
            <p className="text-[10px] text-slate-400 font-semibold text-center max-w-xs">
              Supports printed text, handwriting, formulas, chemistry, physics, tables & diagrams.
            </p>
          </div>
        </div>
      )}

      {/* FULL HOMEWORK SCANNER INTERACTIVE MODAL STAGE */}
      {(cropSourceImage || selectedPdf || scannedSolution) && !cameraActive && (
        <div 
          className="fixed inset-0 bg-slate-950/95 z-[150] flex flex-col items-center justify-between p-3 sm:p-5 overflow-y-auto"
          onMouseMove={handleCropDragMove}
          onTouchMove={handleCropDragMove}
          onMouseUp={handleCropDragEnd}
          onTouchEnd={handleCropDragEnd}
        >
          {/* TOP HEADER & NAVIGATION BAR */}
          <div className="w-full max-w-2xl flex items-center justify-between text-white pt-2 pb-2 border-b border-slate-800/80">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-2xl shadow-md">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-black text-sm sm:text-base flex items-center gap-2">
                  Homework Scanner
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">PRO READY</span>
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold">Camera • Gallery • PDF • Screenshot</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {scannedSolution && (
                <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setActiveTab("scan")}
                    className={`px-3 py-1 rounded-lg transition ${activeTab === "scan" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
                  >
                    Crop & Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("result")}
                    className={`px-3 py-1 rounded-lg transition ${activeTab === "result" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
                  >
                    Results
                  </button>
                </div>
              )}

              <button 
                type="button"
                onClick={() => {
                  setCropSourceImage(null);
                  setSelectedPdf(null);
                  setScannedSolution(null);
                }} 
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full transition cursor-pointer text-slate-300 hover:text-white"
                title="Close Scanner"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* MAIN STAGE CONTENT AREA */}
          <div className="w-full max-w-2xl my-3 flex-1 flex flex-col items-center justify-center">
            {activeTab === "scan" && (
              <div className="w-full flex flex-col items-center space-y-4">
                {/* SOURCE SELECTOR TABS */}
                <div className="flex items-center justify-center gap-1.5 bg-slate-900/90 border border-slate-800/80 p-1.5 rounded-2xl max-w-md w-full">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSource("camera");
                      onStartCamera();
                    }}
                    className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                      activeSource === "camera" && cameraActive ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Camera</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveSource("gallery");
                      fileInputRef.current?.click();
                    }}
                    className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                      cropSourceImage && activeSource === "gallery" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Gallery</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveSource("pdf");
                      pdfFileInputRef.current?.click();
                    }}
                    className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                      selectedPdf ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveSource("screenshot")}
                    className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                      activeSource === "screenshot" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Clipboard className="w-3.5 h-3.5" />
                    <span>Paste</span>
                  </button>
                </div>

                {/* QUALITY WARNING BANNER */}
                {qualityWarning && (
                  <div className="w-full max-w-md bg-amber-950/60 border border-amber-800/80 p-2.5 rounded-2xl flex items-center space-x-2 text-amber-300 text-xs font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span>{qualityWarning}</span>
                  </div>
                )}

                {/* IMAGE CROPPER & PREVIEW STAGE */}
                {cropSourceImage ? (
                  <div 
                    ref={cropStageRef}
                    className="relative w-full max-w-md aspect-square bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden select-none cursor-crosshair flex items-center justify-center shadow-2xl"
                    onMouseDown={(e) => {
                      if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('bg-black/60')) {
                        handleCropDragStart(e, "pan");
                      }
                    }}
                    onTouchStart={(e) => {
                      if (e.touches.length === 2) {
                        handleCropDragStart(e, "pan");
                      } else if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('bg-black/60')) {
                        handleCropDragStart(e, "pan");
                      }
                    }}
                  >
                    <div 
                      className="w-full h-full transition-transform duration-75 ease-out"
                      style={{
                        transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
                        transformOrigin: "center center"
                      }}
                    >
                      <img 
                        src={cropSourceImage} 
                        alt="Homework to Crop" 
                        className="w-full h-full object-contain pointer-events-none" 
                      />
                    </div>

                    <div className="absolute inset-0 bg-black/60 pointer-events-none"></div>

                    {/* Draggable Crop Box */}
                    <div 
                      className="absolute border-2 border-indigo-400 bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] cursor-move rounded-md"
                      style={{
                        left: `${cropBox.x}%`,
                        top: `${cropBox.y}%`,
                        width: `${cropBox.width}%`,
                        height: `${cropBox.height}%`,
                      }}
                      onMouseDown={(e) => handleCropDragStart(e, "center")}
                      onTouchStart={(e) => handleCropDragStart(e, "center")}
                    >
                      <div 
                        className="absolute -top-2 -left-2 w-5 h-5 bg-indigo-500 border-2 border-white rounded-full cursor-nwse-resize active:scale-125 transition-transform shadow-md"
                        onMouseDown={(e) => { e.stopPropagation(); handleCropDragStart(e, "tl"); }}
                        onTouchStart={(e) => { e.stopPropagation(); handleCropDragStart(e, "tl"); }}
                      ></div>
                      <div 
                        className="absolute -top-2 -right-2 w-5 h-5 bg-indigo-500 border-2 border-white rounded-full cursor-nesw-resize active:scale-125 transition-transform shadow-md"
                        onMouseDown={(e) => { e.stopPropagation(); handleCropDragStart(e, "tr"); }}
                        onTouchStart={(e) => { e.stopPropagation(); handleCropDragStart(e, "tr"); }}
                      ></div>
                      <div 
                        className="absolute -bottom-2 -left-2 w-5 h-5 bg-indigo-500 border-2 border-white rounded-full cursor-nesw-resize active:scale-125 transition-transform shadow-md"
                        onMouseDown={(e) => { e.stopPropagation(); handleCropDragStart(e, "bl"); }}
                        onTouchStart={(e) => { e.stopPropagation(); handleCropDragStart(e, "bl"); }}
                      ></div>
                      <div 
                        className="absolute -bottom-2 -right-2 w-5 h-5 bg-indigo-500 border-2 border-white rounded-full cursor-nwse-resize active:scale-125 transition-transform shadow-md"
                        onMouseDown={(e) => { e.stopPropagation(); handleCropDragStart(e, "br"); }}
                        onTouchStart={(e) => { e.stopPropagation(); handleCropDragStart(e, "br"); }}
                      ></div>
                      
                      {/* Grid overlay */}
                      <div className="absolute inset-0 border border-dashed border-indigo-300/40 pointer-events-none flex items-center justify-center">
                        <div className="w-full h-px bg-indigo-300/30 absolute"></div>
                        <div className="h-full w-px bg-indigo-300/30 absolute"></div>
                      </div>
                    </div>
                  </div>
                ) : selectedPdf ? (
                  /* PDF PREVIEW CARD */
                  <div className="w-full max-w-md p-6 bg-slate-900 border border-indigo-500/30 rounded-3xl flex flex-col items-center justify-center space-y-3 text-center">
                    <div className="p-4 bg-gradient-to-tr from-cyan-500 to-blue-600 text-white rounded-2xl shadow-lg">
                      <FileText className="w-10 h-10" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-white text-sm">{selectedPdf.name}</h4>
                      <p className="text-xs text-slate-400 font-semibold">{selectedPdf.size || "PDF Document"} attached for AI Scanning</p>
                    </div>
                  </div>
                ) : (
                  /* SCREENSHOT PASTE / UPLOAD DROPZONE */
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full max-w-md p-8 bg-slate-900/80 border-2 border-dashed border-indigo-500/40 hover:border-indigo-500 rounded-3xl flex flex-col items-center justify-center space-y-3 text-center cursor-pointer transition"
                  >
                    <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-2xl">
                      <Clipboard className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="font-black text-white text-sm">Paste Screenshot or Drop File</h4>
                      <p className="text-xs text-slate-400 font-semibold mt-1">Press Ctrl+V to paste screenshot directly from clipboard, or click to pick an image/PDF.</p>
                    </div>
                  </div>
                )}

                {/* IMAGE TOOLBAR: ROTATE, RETAKE, RESET, UNDO, ZOOM */}
                {cropSourceImage && (
                  <div className="flex flex-wrap items-center justify-center gap-2 w-full max-w-md">
                    <button
                      type="button"
                      onClick={rotateClockwise}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-bold rounded-xl transition cursor-pointer border border-slate-700"
                      title="Rotate 90° Clockwise"
                    >
                      <RotateCw className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Rotate</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCropSourceImage(null);
                        onStartCamera();
                      }}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-bold rounded-xl transition cursor-pointer border border-slate-700"
                      title="Retake Photo"
                    >
                      <Camera className="w-3.5 h-3.5 text-blue-400" />
                      <span>Retake</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleResetCrop}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-bold rounded-xl transition cursor-pointer border border-slate-700"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                      <span>Reset</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleUndoCrop}
                      disabled={undoHistory.length === 0}
                      className={`flex items-center space-x-1 px-3 py-1.5 text-xs font-bold rounded-xl transition border ${
                        undoHistory.length === 0 
                          ? "bg-slate-900/50 text-slate-600 border-slate-900 cursor-not-allowed" 
                          : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 cursor-pointer"
                      }`}
                    >
                      <Undo className="w-3.5 h-3.5 text-purple-400" />
                      <span>Undo</span>
                    </button>

                    <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl px-1 py-0.5">
                      <button
                        type="button"
                        onClick={() => setZoom(prev => Math.max(1, prev - 0.25))}
                        className="px-2 text-slate-300 hover:text-white text-xs font-bold"
                      >
                        -
                      </button>
                      <span className="text-[10px] text-slate-400 font-mono font-bold px-1">{Math.round(zoom * 100)}%</span>
                      <button
                        type="button"
                        onClick={() => setZoom(prev => Math.min(5, prev + 0.25))}
                        className="px-2 text-slate-300 hover:text-white text-xs font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}

                {/* POST-OCR ACTION SELECTOR TOOLBAR */}
                <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 p-3 rounded-2xl space-y-2.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Select AI Action After Scanning:</span>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setOcrAction("solve")}
                      className={`py-2 px-2.5 rounded-xl text-xs font-extrabold transition flex items-center justify-center space-x-1 cursor-pointer border ${
                        ocrAction === "solve" 
                          ? "bg-indigo-600 text-white border-indigo-500 shadow-md" 
                          : "bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-750"
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>Solve</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setOcrAction("explain")}
                      className={`py-2 px-2.5 rounded-xl text-xs font-extrabold transition flex items-center justify-center space-x-1 cursor-pointer border ${
                        ocrAction === "explain" 
                          ? "bg-indigo-600 text-white border-indigo-500 shadow-md" 
                          : "bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-750"
                      }`}
                    >
                      <Brain className="w-3.5 h-3.5 text-purple-400" />
                      <span>Explain</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setOcrAction("summarize")}
                      className={`py-2 px-2.5 rounded-xl text-xs font-extrabold transition flex items-center justify-center space-x-1 cursor-pointer border ${
                        ocrAction === "summarize" 
                          ? "bg-indigo-600 text-white border-indigo-500 shadow-md" 
                          : "bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-750"
                      }`}
                    >
                      <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Summary</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setOcrAction("translate")}
                      className={`py-2 px-2.5 rounded-xl text-xs font-extrabold transition flex items-center justify-center space-x-1 cursor-pointer border ${
                        ocrAction === "translate" 
                          ? "bg-indigo-600 text-white border-indigo-500 shadow-md" 
                          : "bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-750"
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5 text-sky-400" />
                      <span>Translate</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setOcrAction("notes")}
                      className={`py-2 px-2.5 rounded-xl text-xs font-extrabold transition flex items-center justify-center space-x-1 cursor-pointer border ${
                        ocrAction === "notes" 
                          ? "bg-indigo-600 text-white border-indigo-500 shadow-md" 
                          : "bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-750"
                      }`}
                    >
                      <FileCheck className="w-3.5 h-3.5 text-teal-400" />
                      <span>Notes</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setOcrAction("flashcards")}
                      className={`py-2 px-2.5 rounded-xl text-xs font-extrabold transition flex items-center justify-center space-x-1 cursor-pointer border ${
                        ocrAction === "flashcards" 
                          ? "bg-indigo-600 text-white border-indigo-500 shadow-md" 
                          : "bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-750"
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5 text-pink-400" />
                      <span>Cards</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setOcrAction("quiz")}
                      className={`py-2 px-2.5 rounded-xl text-xs font-extrabold transition flex items-center justify-center space-x-1 cursor-pointer border col-span-2 ${
                        ocrAction === "quiz" 
                          ? "bg-indigo-600 text-white border-indigo-500 shadow-md" 
                          : "bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-750"
                      }`}
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-rose-400" />
                      <span>Generate Quiz</span>
                    </button>
                  </div>

                  {/* Target Language dropdown if Translate action is active */}
                  {ocrAction === "translate" && (
                    <div className="flex items-center space-x-2 pt-1">
                      <span className="text-[10px] text-slate-400 font-bold">Target Language:</span>
                      <select
                        value={targetLanguage}
                        onChange={(e) => setTargetLanguage(e.target.value)}
                        className="bg-slate-800 text-white text-xs font-bold px-2.5 py-1 rounded-xl border border-slate-700 outline-none"
                      >
                        {languages.map(lang => (
                          <option key={lang} value={lang}>{lang}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* ERROR ALERT */}
                {ocrError && (
                  <div className="w-full max-w-md bg-rose-950/80 border border-rose-800 text-rose-200 p-3 rounded-2xl text-xs font-bold text-center">
                    {ocrError}
                  </div>
                )}

                {/* PRIMARY EXECUTE OCR BUTTON */}
                <button
                  type="button"
                  onClick={handleRunScan}
                  disabled={!hasSourceToScan || isOcrProcessing}
                  className={`w-full max-w-md py-3.5 rounded-2xl font-black text-xs sm:text-sm text-white shadow-xl transition active:scale-[0.98] flex items-center justify-center space-x-2 ${
                    !hasSourceToScan || isOcrProcessing 
                      ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700" 
                      : "bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 cursor-pointer shadow-indigo-500/25"
                  }`}
                >
                  {isOcrProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Scanning Homework with AI Vision...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span className="capitalize">Scan & {ocrAction} Homework</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* RESULTS DISPLAY PANEL */}
            {activeTab === "result" && scannedSolution && (
              <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 space-y-4 text-slate-100 max-h-[75vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-xl">
                      <Check className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-white capitalize">Scanned Result: {scannedSolution.action}</h4>
                      <p className="text-[10px] text-slate-400 font-semibold">Parsed with Math LaTeX, Chemistry, Physics & Diagram context</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => handleCopyText(scannedSolution.actionOutput)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 rounded-xl transition cursor-pointer flex items-center space-x-1"
                    >
                      <Copy className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{copied ? "Copied!" : "Copy"}</span>
                    </button>

                    {onSendResultToChat && (
                      <button
                        type="button"
                        onClick={() => {
                          onSendResultToChat(scannedSolution.actionOutput);
                          setCropSourceImage(null);
                          setSelectedPdf(null);
                          setScannedSolution(null);
                        }}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white rounded-xl transition cursor-pointer flex items-center space-x-1 shadow-md"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Send to AI Chat</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* RENDER FLASHCARDS IF GENERATED */}
                {scannedSolution.flashcards && scannedSolution.flashcards.length > 0 && (
                  <div className="space-y-2 border-b border-slate-800 pb-4">
                    <h5 className="text-xs font-extrabold text-indigo-400 uppercase tracking-wider">Generated Flashcards ({scannedSolution.flashcards.length})</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {scannedSolution.flashcards.map((card, idx) => (
                        <div key={idx} className="p-3 bg-slate-800/80 border border-slate-700/80 rounded-2xl space-y-1">
                          <span className="text-[9px] font-black text-purple-400 uppercase">Q{idx + 1}: {card.question}</span>
                          <p className="text-xs text-slate-200 font-medium">A: {card.answer}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* RENDER QUIZ IF GENERATED */}
                {scannedSolution.quiz && scannedSolution.quiz.length > 0 && (
                  <div className="space-y-3 border-b border-slate-800 pb-4">
                    <h5 className="text-xs font-extrabold text-rose-400 uppercase tracking-wider">Practice Quiz Questions ({scannedSolution.quiz.length})</h5>
                    <div className="space-y-2.5">
                      {scannedSolution.quiz.map((q, qIdx) => (
                        <div key={qIdx} className="p-3.5 bg-slate-800/80 border border-slate-700/80 rounded-2xl space-y-2">
                          <p className="text-xs font-bold text-white">{qIdx + 1}. {q.question}</p>
                          <div className="grid grid-cols-2 gap-1.5">
                            {q.options?.map((opt, oIdx) => (
                              <div key={oIdx} className={`p-2 rounded-xl text-[11px] font-semibold border ${oIdx === q.correctAnswerIndex ? "bg-emerald-950/60 border-emerald-500/60 text-emerald-300" : "bg-slate-900/60 border-slate-800 text-slate-300"}`}>
                                {opt}
                              </div>
                            ))}
                          </div>
                          {q.explanation && (
                            <p className="text-[10px] text-slate-400 italic">Explanation: {q.explanation}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* FULL RAW OUTPUT TEXT */}
                <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80 text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed select-text">
                  {scannedSolution.actionOutput}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default OCRUploader;
