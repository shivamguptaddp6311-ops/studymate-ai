import { useState, useRef, useEffect, useCallback } from "react";
import { logger } from "../utils/logger";
import { checkImageQuality, compressImage, enhanceImageForOCR, rotateBase64Image, preprocessImageForOCRAndVision } from "../utils/imageOptimizer";
import { fetchWithRetry } from "../utils/apiClient";

export type HomeworkSourceType = "camera" | "gallery" | "pdf" | "screenshot";
export type HomeworkActionType = "solve" | "explain" | "summarize" | "translate" | "notes" | "flashcards" | "quiz";

export interface ScanResult {
  extractedText: string;
  actionOutput: string;
  action: HomeworkActionType;
  flashcards?: Array<{ question: string; answer: string; category?: string }>;
  quiz?: Array<{ question: string; options: string[]; correctAnswerIndex: number; explanation: string }>;
  notes?: { title: string; sections: Array<{ heading: string; content: string }>; formulas?: string[] };
  timestamp: number;
}

export function useOCR() {
  const [cameraActive, setCameraActive] = useState(false);
  const [activeSource, setActiveSource] = useState<HomeworkSourceType>("camera");
  const [cropSourceImage, setCropSourceImage] = useState<string | null>(null);
  const [rotation, setRotation] = useState<number>(0);
  const [selectedPdf, setSelectedPdf] = useState<{ name: string; dataUrl: string; size?: string } | null>(null);
  
  const [cropBox, setCropBox] = useState({ x: 10, y: 10, width: 80, height: 80 });
  const [dragType, setDragType] = useState<"none" | "center" | "tl" | "tr" | "bl" | "br" | "pan">("none");
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragBoxStart, setDragBoxStart] = useState({ x: 10, y: 10, width: 80, height: 80 });

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [undoHistory, setUndoHistory] = useState<{ x: number; y: number; width: number; height: number }[]>([]);
  const [pinchStartDist, setPinchStartDist] = useState(0);
  const [pinchStartZoom, setPinchStartZoom] = useState(1);
  const [pinchStartPan, setPinchStartPan] = useState({ x: 0, y: 0 });

  const [ocrAction, setOcrAction] = useState<HomeworkActionType>("solve");
  const [targetLanguage, setTargetLanguage] = useState<string>("Hindi");
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [scannedSolution, setScannedSolution] = useState<ScanResult | null>(null);
  const [qualityWarning, setQualityWarning] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cropStageRef = useRef<HTMLDivElement>(null);

  // Request deduplication cache & active request lock
  const ocrCacheRef = useRef<Map<string, ScanResult>>(new Map());
  const inFlightRequestRef = useRef<boolean>(false);

  const startCamera = async (
    fileFallbackTrigger: () => void,
    onError: (msg: string | null) => void
  ) => {
    let perms = { camera: "default" };
    try {
      const stored = localStorage.getItem("studymate_permissions_store");
      if (stored) perms = JSON.parse(stored);
    } catch (e) {}

    if (perms.camera === "denied") {
      onError("Camera access is blocked in your browser settings. Please grant Camera access and try again, or upload an image directly.");
      fileFallbackTrigger();
      return;
    }

    setActiveSource("camera");
    setCameraActive(true);
    onError(null);
    try {
      const constraints = { video: { facingMode: "environment" } };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((playErr) => {
          console.warn("Camera video stream play prevented or interrupted:", playErr);
        });
      }
      if (perms.camera !== "granted") {
        perms.camera = "granted";
        localStorage.setItem("studymate_permissions_store", JSON.stringify(perms));
      }
    } catch (err: any) {
      console.warn("Camera streaming not supported or blocked, opening gallery.", err);
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        perms.camera = "denied";
        localStorage.setItem("studymate_permissions_store", JSON.stringify(perms));
      }
      onError("Camera access failed or was blocked. Opening file upload as fallback.");
      setCameraActive(false);
      fileFallbackTrigger();
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const rotateClockwise = async () => {
    if (!cropSourceImage) return;
    const nextRotation = (rotation + 90) % 360;
    setRotation(nextRotation);
    try {
      const rotated = await rotateBase64Image(cropSourceImage, 90);
      setCropSourceImage(rotated);
    } catch (e) {
      console.error("Failed to rotate image:", e);
    }
  };

  const capturePhoto = async (
    fileFallbackTrigger: () => void,
    onAddNotification?: (title: string, text: string, type: "info") => void
  ) => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth || 1280;
      canvas.height = videoRef.current.videoHeight || 720;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        
        const quality = checkImageQuality(canvas);
        if (quality.warning) {
          setQualityWarning(quality.warning);
          if (onAddNotification) {
            onAddNotification("Image Quality Warning", quality.warning, "info");
          }
        } else {
          setQualityWarning(null);
        }

        let rawDataUrl = canvas.toDataURL("image/jpeg", 0.95);
        try {
          rawDataUrl = await enhanceImageForOCR(rawDataUrl);
          const compressed = await compressImage(rawDataUrl, 1200, 0.80);
          setCropSourceImage(compressed);
        } catch (err) {
          setCropSourceImage(rawDataUrl);
        }
        setCropBox({ x: 10, y: 10, width: 80, height: 80 });
        setRotation(0);
        setSelectedPdf(null);
        stopCamera();
      }
    } else {
      fileFallbackTrigger();
    }
  };

  // Clipboard paste event listener for direct Screenshot scanning
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onloadend = async () => {
              const base64 = reader.result as string;
              try {
                const compressed = await compressImage(base64, 1200, 0.80);
                setCropSourceImage(compressed);
              } catch (e) {
                setCropSourceImage(base64);
              }
              setActiveSource("screenshot");
              setRotation(0);
              setSelectedPdf(null);
              setCameraActive(false);
            };
            reader.readAsDataURL(file);
          }
          break;
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  const detectQuestionBoundaries = (imageSrc: string) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const size = 150;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        
        ctx.drawImage(img, 0, 0, size, size);
        const imgData = ctx.getImageData(0, 0, size, size);
        const data = imgData.data;

        let totalLuminance = 0;
        const numPixels = size * size;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i+1];
          const b = data[i+2];
          totalLuminance += 0.299 * r + 0.587 * g + 0.114 * b;
        }
        const avgLuminance = totalLuminance / numPixels;
        const textThreshold = Math.min(145, avgLuminance * 0.85);

        const rowDensity = new Array(size).fill(0);
        const colDensity = new Array(size).fill(0);

        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const idx = (y * size + x) * 4;
            const r = data[idx];
            const g = data[idx+1];
            const b = data[idx+2];
            const L = 0.299 * r + 0.587 * g + 0.114 * b;
            if (L < textThreshold) {
              rowDensity[y]++;
              colDensity[x]++;
            }
          }
        }

        const noiseThreshold = 2;
        let minY = 0, maxY = size - 1, minX = 0, maxX = size - 1;

        for (let y = 0; y < size; y++) {
          if (rowDensity[y] > noiseThreshold) { minY = y; break; }
        }
        for (let y = size - 1; y >= 0; y--) {
          if (rowDensity[y] > noiseThreshold) { maxY = y; break; }
        }
        for (let x = 0; x < size; x++) {
          if (colDensity[x] > noiseThreshold) { minX = x; break; }
        }
        for (let x = size - 1; x >= 0; x--) {
          if (colDensity[x] > noiseThreshold) { maxX = x; break; }
        }

        const margin = 5;
        const boxX = Math.max(0, Math.round((minX / size) * 100) - margin);
        const boxY = Math.max(0, Math.round((minY / size) * 100) - margin);
        const boxW = Math.min(100 - boxX, Math.round(((maxX - minX) / size) * 100) + margin * 2);
        const boxH = Math.min(100 - boxY, Math.round(((maxY - minY) / size) * 100) + margin * 2);

        if (boxW >= 15 && boxH >= 15 && boxW < 98 && boxH < 98) {
          setCropBox({ x: boxX, y: boxY, width: boxW, height: boxH });
        }
      } catch (err) {
        console.warn("Boundary detection failed:", err);
      }
    };
    img.src = imageSrc;
  };

  useEffect(() => {
    if (cropSourceImage) {
      detectQuestionBoundaries(cropSourceImage);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setUndoHistory([]);
    }
  }, [cropSourceImage]);

  const handleCropDragStart = (e: React.MouseEvent | React.TouchEvent, type: "center" | "tl" | "tr" | "bl" | "br" | "pan") => {
    e.preventDefault();
    if ('touches' in e && e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      setDragType("none");
      setPinchStartDist(dist);
      setPinchStartZoom(zoom);
      setPinchStartPan({ ...pan });
      return;
    }

    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    setDragType(type);
    setDragStart({ x: clientX, y: clientY });
    setDragBoxStart({ ...cropBox });
    setPinchStartPan({ ...pan });
  };

  const handleCropDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e && e.touches.length === 2) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      if (pinchStartDist > 0) {
        const factor = dist / pinchStartDist;
        const nextZoom = Math.max(1, Math.min(5, pinchStartZoom * factor));
        setZoom(nextZoom);
      }
      return;
    }

    if (dragType === "none") return;
    e.preventDefault();

    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const dx = clientX - dragStart.x;
    const dy = clientY - dragStart.y;

    if (dragType === "pan") {
      setPan({ x: pinchStartPan.x + dx, y: pinchStartPan.y + dy });
      return;
    }

    const rect = cropStageRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = ((clientX - rect.left) / rect.width) * 100;
    const mouseY = ((clientY - rect.top) / rect.height) * 100;

    const boxStart = dragBoxStart;
    const MIN_SIZE = 10;

    setCropBox(() => {
      let nextX = boxStart.x, nextY = boxStart.y, nextW = boxStart.width, nextH = boxStart.height;

      if (dragType === "center") {
        const pctDx = (dx / rect.width) * 100;
        const pctDy = (dy / rect.height) * 100;
        nextX = Math.max(0, Math.min(100 - boxStart.width, boxStart.x + pctDx));
        nextY = Math.max(0, Math.min(100 - boxStart.height, boxStart.y + pctDy));
      } else if (dragType === "tl") {
        const fixedRight = boxStart.x + boxStart.width;
        const fixedBottom = boxStart.y + boxStart.height;
        nextX = Math.max(0, Math.min(fixedRight - MIN_SIZE, mouseX));
        nextY = Math.max(0, Math.min(fixedBottom - MIN_SIZE, mouseY));
        nextW = fixedRight - nextX;
        nextH = fixedBottom - nextY;
      } else if (dragType === "tr") {
        const fixedLeft = boxStart.x;
        const fixedBottom = boxStart.y + boxStart.height;
        nextX = fixedLeft;
        nextY = Math.max(0, Math.min(fixedBottom - MIN_SIZE, mouseY));
        nextW = Math.max(MIN_SIZE, Math.min(100 - fixedLeft, mouseX - fixedLeft));
        nextH = fixedBottom - nextY;
      } else if (dragType === "bl") {
        const fixedRight = boxStart.x + boxStart.width;
        const fixedTop = boxStart.y;
        nextX = Math.max(0, Math.min(fixedRight - MIN_SIZE, mouseX));
        nextY = fixedTop;
        nextW = fixedRight - nextX;
        nextH = Math.max(MIN_SIZE, Math.min(100 - fixedTop, mouseY - fixedTop));
      } else if (dragType === "br") {
        const fixedLeft = boxStart.x;
        const fixedTop = boxStart.y;
        nextX = fixedLeft;
        nextY = fixedTop;
        nextW = Math.max(MIN_SIZE, Math.min(100 - fixedLeft, mouseX - fixedLeft));
        nextH = Math.max(MIN_SIZE, Math.min(100 - fixedTop, mouseY - fixedTop));
      }

      return {
        x: Math.round(nextX),
        y: Math.round(nextY),
        width: Math.round(nextW),
        height: Math.round(nextH)
      };
    });
  };

  const handleCropDragEnd = () => {
    if (dragType !== "none") {
      setUndoHistory(prev => {
        const nextHist = [...prev, { ...cropBox }];
        if (nextHist.length > 20) nextHist.shift();
        return nextHist;
      });
    }
    setDragType("none");
    setPinchStartDist(0);
  };

  const handleUndoCrop = () => {
    if (undoHistory.length > 0) {
      const prevBox = undoHistory[undoHistory.length - 1];
      setCropBox(prevBox);
      setUndoHistory(prev => prev.slice(0, -1));
    }
  };

  const handleResetCrop = () => {
    setCropBox({ x: 10, y: 10, width: 80, height: 80 });
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setUndoHistory([]);
    setRotation(0);
  };

  const executeCrop = (onCropDone: (croppedDataUrl: string) => void) => {
    if (!cropSourceImage) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const Wi = img.naturalWidth;
        const Hi = img.naturalHeight;

        const rect = cropStageRef.current?.getBoundingClientRect();
        const Ws = rect ? rect.width : 350;
        const Hs = rect ? rect.height : 350;

        const Ls = (cropBox.x / 100) * Ws;
        const Ts = (cropBox.y / 100) * Hs;
        const Rs = ((cropBox.x + cropBox.width) / 100) * Ws;
        const Bs = ((cropBox.y + cropBox.height) / 100) * Hs;

        const getOriginalCoords = (xs: number, ys: number) => {
          const f = Math.min(Ws / Wi, Hs / Hi);
          const Wd = Wi * f;
          const Hd = Hi * f;
          const Xd = (Ws - Wd) / 2;
          const Yd = (Hs - Hd) / 2;

          const Cx = Ws / 2;
          const Cy = Hs / 2;

          const x1 = Cx + (xs - Cx - pan.x) / zoom;
          const y1 = Cy + (ys - Cy - pan.y) / zoom;

          const xi = (x1 - Xd) / f;
          const yi = (y1 - Yd) / f;

          return { x: xi, y: yi };
        };

        const topLeft = getOriginalCoords(Ls, Ts);
        const bottomRight = getOriginalCoords(Rs, Bs);

        const sx = Math.max(0, Math.min(Wi - 1, topLeft.x));
        const sy = Math.max(0, Math.min(Hi - 1, topLeft.y));
        const sWidth = Math.max(10, Math.min(Wi - sx, bottomRight.x - topLeft.x));
        const sHeight = Math.max(10, Math.min(Hi - sy, bottomRight.y - topLeft.y));

        canvas.width = sWidth;
        canvas.height = sHeight;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);
        const croppedDataUrl = canvas.toDataURL("image/jpeg", 0.85);
        
        onCropDone(croppedDataUrl);
      }
    };
    img.src = cropSourceImage;
  };

  /**
   * Production-ready Homework Scanner Core Execution Pipeline.
   * Handles request deduplication, compression, multi-type recognition, and action execution.
   */
  const executeHomeworkScan = async ({
    imagePayload,
    action = ocrAction,
    lang = targetLanguage
  }: {
    imagePayload?: string;
    action?: HomeworkActionType;
    lang?: string;
  }): Promise<ScanResult | null> => {
    // 1. Determine payload (cropped image or selected PDF)
    const activePayload = imagePayload || cropSourceImage || selectedPdf?.dataUrl;
    if (!activePayload) {
      setOcrError("No image or document provided for Homework Scanning.");
      return null;
    }

    // 2. Compute deduplication cache key based on payload length, fingerprint, action, and language
    const payloadFingerprint = activePayload.length > 500
      ? `${activePayload.slice(0, 100)}_${activePayload.slice(-100)}_${activePayload.length}`
      : activePayload;
    const cacheKey = `ocr_${payloadFingerprint}_${action}_${lang}`;

    // Check duplicate request cache
    if (ocrCacheRef.current.has(cacheKey)) {
      logger.info("HomeworkScanner", "Returning deduplicated cached result for key", { cacheKey });
      const cached = ocrCacheRef.current.get(cacheKey)!;
      setScannedSolution(cached);
      return cached;
    }

    // Prevent concurrent duplicate requests
    if (inFlightRequestRef.current) {
      console.warn("[HomeworkScanner] A scanning request is already in progress. Ignoring duplicate trigger.");
      return null;
    }

    inFlightRequestRef.current = true;
    setIsOcrProcessing(true);
    setOcrError(null);

    try {
      // 3. Apply automatic preprocessing pipeline (Auto-rotate, Deskew, Denoise, Contrast & Intelligent Resize)
      let finalPayload = activePayload;
      if (finalPayload.startsWith("data:image")) {
        try {
          const preprocessed = await preprocessImageForOCRAndVision(finalPayload, {
            autoRotate: true,
            deskew: true,
            denoise: true,
            improveContrast: true,
            resizeIntelligently: true,
            jpegQuality: 0.88
          });
          finalPayload = preprocessed.processedDataUrl;
        } catch (e) {
          finalPayload = await compressImage(finalPayload, 1200, 0.80);
        }
      }

      // 4. Construct high-precision Vision OCR Prompt specifying multi-type recognition and targeted action
      const actionPrompts: Record<HomeworkActionType, string> = {
        solve: "Solve this homework problem step-by-step. Show all formulas, intermediate calculations, working steps, and box the verified final answer clearly.",
        explain: "Provide a detailed, student-friendly explanation of all concepts, formulas, and diagrams in this homework scanner image. Break down tough ideas with intuitive analogies.",
        summarize: "Provide a concise study summary of this scanned homework sheet. List key takeaways, core definitions, and high-yield formulas in bullet points.",
        translate: `Translate all extracted text, questions, and problem statements into ${lang}. Keep mathematical equations and chemical formulas intact in standard LaTeX notation.`,
        notes: "Convert this scanned homework sheet into beautifully structured Study Notes with clear section headings, key terms definitions, formula reference list, and a summary box.",
        flashcards: "Generate 5 to 8 high-yield question & answer Flashcards from this scanned content. Format your output strictly as a JSON block with an array of objects: ```json [ { \"question\": \"...\", \"answer\": \"...\", \"category\": \"...\" } ] ``` and also provide a readable summary.",
        quiz: "Generate 5 multiple-choice practice quiz questions based on this scanned homework. Format your output strictly as a JSON block with an array of objects: ```json [ { \"question\": \"...\", \"options\": [\"A\", \"B\", \"C\", \"D\"], \"correctAnswerIndex\": 0, \"explanation\": \"...\" } ] ``` and also provide a readable summary."
      };

      const promptText = `[Production Homework Scanner Engine]
Task: Process this scanned educational material.
Recognition Directives:
• Recognize both printed text and handwritten notes accurately.
• Format all mathematical equations in LaTeX ($...$ or $$...$$).
• Preserve and format chemical formulas and reactions clearly ($H_2SO_4$, $Na^+$, etc.).
• Format physics formulas with variables, constants, and units.
• Parse structured tables into standard Markdown table format (| Header | ... |).
• Describe biology diagrams, anatomical labels, and process flowcharts accurately.

Selected Action Directive: ${actionPrompts[action]}

Instructions:
1. First, list the verbatim [Extracted Content].
2. Second, provide the requested [Action Output] under '### Result'.`;

      // 5. Send request through existing authenticated AI endpoint (/api/gemini/chat)
      let token = localStorage.getItem("studymate_token") || "";
      let email = localStorage.getItem("studymate_logged_in_email") || `guest-${Date.now()}@studymate.app`;

      if (!token) {
        try {
          const guestRes = await fetch("/api/auth/guest-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
          });
          if (guestRes.ok) {
            const guestData = await guestRes.json();
            token = guestData.token;
            localStorage.setItem("studymate_token", token);
          }
        } catch (e) {}
      }

      const resData = await fetchWithRetry<{
        reply?: string;
        response?: string;
        text?: string;
        error?: string;
      }>("/api/gemini/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        timeoutMs: 35000,
        retries: 2,
        body: JSON.stringify({
          message: promptText,
          image: finalPayload,
          provider: localStorage.getItem("studymate_ai_provider") || "auto",
          timeoutMs: 35000
        })
      });
      const rawOutput = resData.reply || resData.response || resData.text || "No response received from Homework Scanner.";

      // 6. Parse structured JSON outputs for Flashcards or Quiz if applicable
      let flashcards: Array<{ question: string; answer: string; category?: string }> | undefined;
      let quiz: Array<{ question: string; options: string[]; correctAnswerIndex: number; explanation: string }> | undefined;

      const jsonMatch = rawOutput.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          if (action === "flashcards" && Array.isArray(parsed)) {
            flashcards = parsed;
          } else if (action === "quiz" && Array.isArray(parsed)) {
            quiz = parsed;
          }
        } catch (e) {
          console.warn("[HomeworkScanner] Could not parse embedded JSON output:", e);
        }
      }

      const resultObj: ScanResult = {
        extractedText: rawOutput.split("### Result")[0] || rawOutput,
        actionOutput: rawOutput,
        action,
        flashcards,
        quiz,
        timestamp: Date.now()
      };

      // Store in deduplication cache
      ocrCacheRef.current.set(cacheKey, resultObj);
      setScannedSolution(resultObj);
      return resultObj;

    } catch (err: any) {
      console.error("[HomeworkScanner] Processing error:", err);
      const errMsg = err.message || "Failed to process homework scan. Please try again with better lighting.";
      setOcrError(errMsg);
      return null;
    } finally {
      setIsOcrProcessing(false);
      inFlightRequestRef.current = false;
    }
  };

  return {
    cameraActive,
    setCameraActive,
    activeSource,
    setActiveSource,
    cropSourceImage,
    setCropSourceImage,
    rotation,
    setRotation,
    rotateClockwise,
    selectedPdf,
    setSelectedPdf,
    cropBox,
    setCropBox,
    dragType,
    zoom,
    setZoom,
    pan,
    setPan,
    undoHistory,
    ocrAction,
    setOcrAction,
    targetLanguage,
    setTargetLanguage,
    isOcrProcessing,
    ocrError,
    setOcrError,
    scannedSolution,
    setScannedSolution,
    qualityWarning,
    setQualityWarning,
    videoRef,
    cropStageRef,
    startCamera,
    stopCamera,
    capturePhoto,
    handleCropDragStart,
    handleCropDragMove,
    handleCropDragEnd,
    handleUndoCrop,
    handleResetCrop,
    executeCrop,
    executeHomeworkScan
  };
}
