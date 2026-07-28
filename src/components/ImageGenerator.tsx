import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Image as ImageIcon,
  Download,
  Share2,
  Copy,
  RefreshCw,
  Star,
  Trash2,
  SlidersHorizontal,
  Zap,
  Check,
  AlertCircle,
  Eye,
  X,
  Layers,
  Compass,
  ChevronDown,
  Edit3,
  Sliders,
  Grid,
  Maximize2
} from "lucide-react";

export interface GeneratedImageRecord {
  id: string;
  imageUrl: string;
  prompt: string;
  negativePrompt?: string;
  style?: string;
  category?: string;
  aspectRatio: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
  quality: "standard" | "medium" | "hd" | "4k";
  providerUsed: "gemini" | "openai" | "fal";
  createdAt: string;
  isFavorite?: boolean;
}

export interface ImageGeneratorProps {
  onClose?: () => void;
  initialPrompt?: string;
}

const STYLES = [
  { id: "realistic", label: "Realistic", icon: "📸", prefix: "Photorealistic hyper-detailed photograph of " },
  { id: "anime", label: "Anime", icon: "🌸", prefix: "Vibrant high quality Japanese anime illustration of " },
  { id: "3d", label: "3D Render", icon: "🧊", prefix: "3D Octane render, volumetric lighting, Pixar style of " },
  { id: "cartoon", label: "Cartoon", icon: "🎨", prefix: "Clean colorful vector cartoon illustration of " },
  { id: "digital-art", label: "Digital Art", icon: "🖼️", prefix: "Masterpiece digital concept art, highly detailed of " },
  { id: "sketch", label: "Sketch", icon: "✏️", prefix: "Detailed pencil sketch, architectural line art of " },
  { id: "painting", label: "Painting", icon: "🖌️", prefix: "Classic textured oil painting, rich colors of " },
  { id: "cinematic", label: "Cinematic", icon: "🎬", prefix: "Cinematic movie still, 8k resolution, dramatic lighting of " },
  { id: "diagram", label: "Diagram", icon: "📐", prefix: "Clean labeled educational diagram, vector infographic of " }
];

const ASPECT_RATIOS: { id: "1:1" | "16:9" | "9:16" | "4:3" | "3:4"; label: string; icon: string; sizeText: string }[] = [
  { id: "1:1", label: "Square", icon: "1:1", sizeText: "1024 × 1024" },
  { id: "16:9", label: "Landscape", icon: "16:9", sizeText: "1792 × 1024" },
  { id: "9:16", label: "Portrait", icon: "9:16", sizeText: "1024 × 1792" },
  { id: "4:3", label: "Standard", icon: "4:3", sizeText: "1024 × 768" },
  { id: "3:4", label: "Poster", icon: "3:4", sizeText: "768 × 1024" },
];

const IMAGE_SIZES: { id: "standard" | "medium" | "hd" | "4k"; label: string; dims: string }[] = [
  { id: "standard", label: "Standard", dims: "512 × 512" },
  { id: "medium", label: "Medium", dims: "768 × 768" },
  { id: "hd", label: "HD Quality", dims: "1024 × 1024" },
  { id: "4k", label: "4K Ultra", dims: "1536 × 1536" }
];

const NUMBER_OF_IMAGES = [1, 2, 3, 4];

const SAMPLE_PROMPTS = [
  "Cross-section diagram of a human plant cell with chloroplasts, nucleus, and cell wall with clear labels",
  "Solar system planetary orbit diagram with distance scale and vector planets",
  "Futuristic cyberpunk study room with glowing neon holographic displays floating in space",
  "Double helix DNA structure diagram showing adenine, thymine, cytosine, and guanine base pairs",
  "Water cycle physical geography diagram showing evaporation, condensation, and runoff",
  "Mind map summarizing photosynthesis process with colorful branching nodes",
  "Cinematic portrait of an astronaut studying ancient scrolls inside a cosmic library",
  "Minimalist modern tech startup logo with a glowing gradient brain icon"
];

export const ImageGenerator: React.FC<ImageGeneratorProps> = ({ onClose, initialPrompt = "" }) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [negativePrompt, setNegativePrompt] = useState("");
  const [style, setStyle] = useState("realistic");
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "16:9" | "9:16" | "4:3" | "3:4">("1:1");
  const [quality, setQuality] = useState<"standard" | "medium" | "hd" | "4k">("hd");
  const [numImages, setNumImages] = useState(1);
  const [preferredProvider, setPreferredProvider] = useState<"auto" | "gemini" | "openai" | "fal">("auto");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [loading, setLoading] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [loadingStage, setLoadingStage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [currentBatch, setCurrentBatch] = useState<GeneratedImageRecord[]>([]);
  const [history, setHistory] = useState<GeneratedImageRecord[]>([]);
  const [activeTab, setActiveTab] = useState<"generator" | "history" | "favorites">("generator");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [lightboxRecord, setLightboxRecord] = useState<GeneratedImageRecord | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("studymate_image_gen_history");
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load image history:", e);
    }
  }, []);

  // Save history to localStorage
  const saveHistory = (items: GeneratedImageRecord[]) => {
    setHistory(items);
    try {
      localStorage.setItem("studymate_image_gen_history", JSON.stringify(items.slice(0, 100)));
    } catch (e) {
      console.error("Failed to save image history:", e);
    }
  };

  const handleGenerate = async (overridePrompt?: string) => {
    const textToUse = overridePrompt || prompt;
    if (!textToUse.trim()) {
      setError("Please enter a prompt to generate an image.");
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);
    setProgressPercent(10);
    setLoadingStage("Analyzing prompt & styling parameters...");

    // Animate progress indicator smoothly
    const progressTimer = setInterval(() => {
      setProgressPercent((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.floor(Math.random() * 8) + 4;
      });
    }, 400);

    const stageTimers: NodeJS.Timeout[] = [
      setTimeout(() => setLoadingStage("Routing request (Gemini Imagen → OpenAI → Fal.ai)..."), 1000),
      setTimeout(() => setLoadingStage("Synthesizing high-resolution AI visuals..."), 2500),
      setTimeout(() => setLoadingStage("Applying style filters & rendering canvas grid..."), 5500)
    ];

    try {
      // Build styled prompt with prefix and negative prompt directives
      const selectedStyleObj = STYLES.find((s) => s.id === style);
      let finalPrompt = textToUse.trim();
      if (selectedStyleObj && selectedStyleObj.prefix && !finalPrompt.toLowerCase().includes(selectedStyleObj.id)) {
        finalPrompt = `${selectedStyleObj.prefix}${finalPrompt}`;
      }
      if (negativePrompt.trim()) {
        finalPrompt += ` [Avoid: ${negativePrompt.trim()}]`;
      }

      // Generate batch of requests (1 to 4 images)
      const token = localStorage.getItem("studymate_token") || localStorage.getItem("studymate_auth_token_v1") || "";
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const count = Math.max(1, Math.min(4, numImages));
      const requests = Array.from({ length: count }).map((_, idx) => {
        const promptVariation = idx > 0 ? `${finalPrompt} (variation ${idx + 1})` : finalPrompt;
        return fetch("/api/ai/generate-image", {
          method: "POST",
          headers,
          body: JSON.stringify({
            prompt: promptVariation,
            category: style,
            aspectRatio,
            quality: quality === "4k" ? "hd" : quality,
            preferredProvider
          }),
          signal: controller.signal
        }).then(async (res) => {
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `HTTP ${res.status} error from image provider`);
          }
          return res.json();
        });
      });

      const results = await Promise.all(requests);

      clearInterval(progressTimer);
      stageTimers.forEach(clearTimeout);
      setProgressPercent(100);
      setLoadingStage("Complete!");

      const newRecords: GeneratedImageRecord[] = results.map((data, idx) => ({
        id: "img-" + Date.now() + "-" + idx + "-" + Math.random().toString(36).substring(2, 6),
        imageUrl: data.imageUrl,
        prompt: textToUse.trim(),
        negativePrompt: negativePrompt.trim() || undefined,
        style,
        category: style,
        aspectRatio,
        quality,
        providerUsed: data.providerUsed || "gemini",
        createdAt: new Date().toISOString(),
        isFavorite: false
      }));

      setCurrentBatch(newRecords);
      saveHistory([...newRecords, ...history]);
      setLoading(false);
      setProgressPercent(0);
      setLoadingStage("");
    } catch (err: any) {
      clearInterval(progressTimer);
      stageTimers.forEach(clearTimeout);
      if (err.name === "AbortError" || controller.signal.aborted) {
        setError("Generation cancelled.");
      } else {
        setError(err.message || "Failed to generate image. Please check network connection or try again.");
      }
      setLoading(false);
      setProgressPercent(0);
      setLoadingStage("");
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoading(false);
      setProgressPercent(0);
      setLoadingStage("");
      setError("Generation cancelled.");
    }
  };

  const handleCopyPrompt = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleToggleFavorite = (id: string) => {
    const updated = history.map((item) =>
      item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
    );
    saveHistory(updated);

    setCurrentBatch((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isFavorite: !item.isFavorite } : item))
    );

    if (lightboxRecord && lightboxRecord.id === id) {
      setLightboxRecord({ ...lightboxRecord, isFavorite: !lightboxRecord.isFavorite });
    }
  };

  const handleDeleteItem = (id: string) => {
    const updated = history.filter((item) => item.id !== id);
    saveHistory(updated);
    setCurrentBatch((prev) => prev.filter((item) => item.id !== id));
    if (lightboxRecord?.id === id) {
      setLightboxRecord(null);
    }
  };

  const handleClearHistory = () => {
    if (window.confirm("Are you sure you want to clear all image generation history?")) {
      saveHistory([]);
      setCurrentBatch([]);
    }
  };

  const handleDownload = (record: GeneratedImageRecord) => {
    const link = document.createElement("a");
    link.href = record.imageUrl;
    const extension = record.imageUrl.startsWith("data:image/jpeg") ? "jpg" : "png";
    link.download = `studymate-art-${record.style || "image"}-${Date.now()}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = async (record: GeneratedImageRecord) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "StudyMate AI Generated Image",
          text: record.prompt,
          url: window.location.href
        });
      } catch (e) {
        handleCopyPrompt(record.prompt);
      }
    } else {
      handleCopyPrompt(record.prompt);
    }
  };

  const handleEditPrompt = (record: GeneratedImageRecord) => {
    setPrompt(record.prompt);
    if (record.negativePrompt) setNegativePrompt(record.negativePrompt);
    if (record.style) setStyle(record.style);
    if (record.aspectRatio) setAspectRatio(record.aspectRatio);
    if (record.quality) setQuality(record.quality);
    setActiveTab("generator");
  };

  const handleRandomSample = () => {
    const random = SAMPLE_PROMPTS[Math.floor(Math.random() * SAMPLE_PROMPTS.length)];
    setPrompt(random);
  };

  const filteredHistory = history.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.prompt.toLowerCase().includes(q) ||
      (item.style && item.style.toLowerCase().includes(q)) ||
      (item.providerUsed && item.providerUsed.toLowerCase().includes(q))
    );
  });

  const favoritesList = history.filter((item) => item.isFavorite);

  const getProviderBadge = (provider?: string) => {
    switch (provider) {
      case "gemini":
        return { label: "Google Gemini Imagen", bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" };
      case "openai":
        return { label: "OpenAI DALL-E 3", bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" };
      case "fal":
        return { label: "Fal.ai Flux", bg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" };
      default:
        return { label: "Multi-Provider AI", bg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20" };
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6 text-slate-800 dark:text-slate-100 font-sans">
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-start gap-3">
          <div className="p-3 bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-600 rounded-2xl text-white shadow-lg shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                AI Image & Diagram Studio
              </h1>
              <span className="text-[10px] font-extrabold uppercase bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 px-2.5 py-0.5 rounded-full">
                Gemini • OpenAI • Fal.ai
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-xl leading-relaxed">
              Generate custom educational diagrams, science illustrations, artwork, and 3D visual concepts with automated provider failover.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          {onClose && (
            <button
              onClick={onClose}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-300 font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
            >
              <X className="w-4 h-4" /> Close
            </button>
          )}

          {/* TAB SWITCHER */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setActiveTab("generator")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === "generator"
                  ? "bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" /> Studio
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === "history"
                  ? "bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> History ({history.length})
            </button>
            <button
              onClick={() => setActiveTab("favorites")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === "favorites"
                  ? "bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" /> Favorites ({favoritesList.length})
            </button>
          </div>
        </div>
      </div>

      {/* MAIN STUDIO VIEW */}
      {activeTab === "generator" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* CONTROLS COLUMN */}
          <div className="lg:col-span-7 space-y-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
            {/* PROMPT TEXTAREA */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5 text-purple-500" /> Image Prompt
                </label>
                <button
                  onClick={handleRandomSample}
                  type="button"
                  className="text-xs text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                >
                  <Compass className="w-3.5 h-3.5" /> Try Sample
                </button>
              </div>

              <div className="relative">
                <textarea
                  rows={3}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the image or diagram in detail (e.g., Cross-section diagram of plant cell with labeled chloroplasts and nucleus...)"
                  className="w-full p-3.5 rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm resize-none"
                />
                <div className="absolute bottom-2.5 right-3 text-[10px] text-slate-400 font-mono">
                  {prompt.length} chars
                </div>
              </div>
            </div>

            {/* NEGATIVE PROMPT INPUT */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <span>Negative Prompt (Optional)</span>
                <span className="text-[10px] text-slate-400 font-normal">(Elements to exclude)</span>
              </label>
              <input
                type="text"
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder="e.g., blurry, low quality, extra limbs, bad anatomy, text, watermark..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* STYLE SELECTOR */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Visual Art Style
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto pr-1">
                {STYLES.map((st) => {
                  const isSelected = style === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setStyle(st.id)}
                      className={`flex items-center gap-2 p-2 rounded-xl border text-xs transition-all cursor-pointer text-left ${
                        isSelected
                          ? "bg-purple-600 text-white border-purple-600 font-bold shadow-xs"
                          : "bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                      }`}
                    >
                      <span className="text-base">{st.icon}</span>
                      <span className="truncate">{st.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ASPECT RATIO & IMAGE SIZE & NUMBER OF IMAGES */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-200 dark:border-slate-800/80">
              {/* ASPECT RATIO */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  Aspect Ratio
                </label>
                <div className="grid grid-cols-2 gap-1">
                  {ASPECT_RATIOS.slice(0, 4).map((ratio) => (
                    <button
                      key={ratio.id}
                      type="button"
                      onClick={() => setAspectRatio(ratio.id)}
                      className={`p-1.5 rounded-lg border text-center transition cursor-pointer text-[11px] ${
                        aspectRatio === ratio.id
                          ? "bg-indigo-600 text-white border-indigo-600 font-bold"
                          : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      <div>{ratio.label}</div>
                      <div className="text-[9px] opacity-80 font-mono">{ratio.icon}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* IMAGE SIZE */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  Resolution / Size
                </label>
                <div className="grid grid-cols-2 gap-1">
                  {IMAGE_SIZES.map((sz) => (
                    <button
                      key={sz.id}
                      type="button"
                      onClick={() => setQuality(sz.id)}
                      className={`p-1.5 rounded-lg border text-center transition cursor-pointer text-[11px] ${
                        quality === sz.id
                          ? "bg-indigo-600 text-white border-indigo-600 font-bold"
                          : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      <div>{sz.label}</div>
                      <div className="text-[9px] opacity-80 font-mono">{sz.dims}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* NUMBER OF IMAGES */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  Batch Count
                </label>
                <div className="grid grid-cols-4 gap-1">
                  {NUMBER_OF_IMAGES.map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setNumImages(num)}
                      className={`p-2 rounded-lg border text-center transition cursor-pointer text-xs font-bold ${
                        numImages === num
                          ? "bg-purple-600 text-white border-purple-600"
                          : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      {num}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ADVANCED PROVIDER SETTINGS TOGGLE */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950/80 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-purple-500" /> AI Provider & Fallback Router
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
              </button>

              {showAdvanced && (
                <div className="p-3.5 bg-white dark:bg-slate-900 space-y-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
                    {[
                      { id: "auto", name: "Auto (Gemini → OpenAI → Fal)" },
                      { id: "gemini", name: "Google Gemini Imagen" },
                      { id: "openai", name: "OpenAI DALL-E 3" },
                      { id: "fal", name: "Fal.ai Flux" }
                    ].map((prov) => (
                      <button
                        key={prov.id}
                        type="button"
                        onClick={() => setPreferredProvider(prov.id as any)}
                        className={`p-2 rounded-lg border text-center transition cursor-pointer ${
                          preferredProvider === prov.id
                            ? "bg-purple-100 dark:bg-purple-950/60 border-purple-500 text-purple-700 dark:text-purple-300 font-bold"
                            : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {prov.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ACTION GENERATE BUTTON */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                disabled={loading || !prompt.trim()}
                onClick={() => handleGenerate()}
                className="flex-1 py-3.5 px-6 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-extrabold text-sm shadow-lg shadow-purple-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Generating ({numImages} {numImages > 1 ? "Images" : "Image"})...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" /> Generate {numImages > 1 ? `${numImages} Images` : "Image"}
                  </>
                )}
              </button>

              {loading && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-xs font-bold hover:bg-rose-100 transition cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>

            {/* ERROR DISPLAY */}
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold">Generation Issue</div>
                  <div className="mt-0.5">{error}</div>
                </div>
              </div>
            )}
          </div>

          {/* CANVAS PREVIEW GRID COLUMN */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Grid className="w-4 h-4 text-purple-500" />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Generated Output Canvas
                  </span>
                </div>
                {currentBatch.length > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                    {currentBatch.length} {currentBatch.length > 1 ? "Results" : "Result"}
                  </span>
                )}
              </div>

              {/* PROGRESS BAR DISPLAY DURING GENERATION */}
              {loading && (
                <div className="space-y-3 p-4 bg-slate-950 rounded-xl border border-slate-800 text-center">
                  <div className="flex items-center justify-between text-xs text-white font-bold">
                    <span>{loadingStage || "Synthesizing AI Artwork..."}</span>
                    <span className="font-mono text-purple-400">{progressPercent}%</span>
                  </div>

                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <motion.div
                      className="bg-gradient-to-r from-purple-500 via-indigo-500 to-pink-500 h-full rounded-full"
                      initial={{ width: "0%" }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ ease: "easeInOut" }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">Rendering high resolution AI output using fallback pipeline...</p>
                </div>
              )}

              {/* IMAGE GRID CONTAINER */}
              {!loading && currentBatch.length === 0 && (
                <div className="flex flex-col items-center justify-center text-center p-8 text-slate-500 space-y-2 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl min-h-[300px]">
                  <div className="p-3.5 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Canvas Empty
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
                    Enter your prompt on the left and click "Generate Image" to render visuals.
                  </p>
                </div>
              )}

              {!loading && currentBatch.length > 0 && (
                <div className={`grid gap-3 ${currentBatch.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                  {currentBatch.map((record) => (
                    <div
                      key={record.id}
                      className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 group shadow-md"
                    >
                      <img
                        src={record.imageUrl}
                        alt={record.prompt}
                        className="w-full h-auto max-h-[320px] object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
                        onClick={() => setLightboxRecord(record)}
                        referrerPolicy="no-referrer"
                      />

                      {/* BADGE */}
                      <span className="absolute top-2 left-2 text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-white border border-white/10">
                        {getProviderBadge(record.providerUsed).label.split(" ")[0]}
                      </span>

                      {/* HOVER OVERLAY ACTIONS */}
                      <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                        <button
                          onClick={() => setLightboxRecord(record)}
                          className="p-2 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full text-white cursor-pointer"
                          title="Fullscreen Preview"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownload(record)}
                          className="p-2 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full text-white cursor-pointer"
                          title="Download Image"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleFavorite(record.id)}
                          className="p-2 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full text-white cursor-pointer"
                          title="Favorite"
                        >
                          <Star className={`w-4 h-4 ${record.isFavorite ? "text-amber-400 fill-amber-400" : ""}`} />
                        </button>
                        <button
                          onClick={() => handleEditPrompt(record)}
                          className="p-2 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full text-white cursor-pointer"
                          title="Edit Prompt"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ACTION BAR FOR CURRENT RESULT */}
              {currentBatch.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl space-y-1">
                    <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                      <span>Current Prompt</span>
                      <button
                        onClick={() => handleCopyPrompt(currentBatch[0].prompt)}
                        className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                      >
                        {copiedText === currentBatch[0].prompt ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        {copiedText === currentBatch[0].prompt ? "Copied!" : "Copy"}
                      </button>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-[11px] line-clamp-2 leading-relaxed">
                      {currentBatch[0].prompt}
                    </p>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5">
                    <button
                      onClick={() => handleDownload(currentBatch[0])}
                      className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg text-slate-700 dark:text-slate-300 font-bold flex flex-col items-center gap-1 cursor-pointer transition text-[10px]"
                    >
                      <Download className="w-3.5 h-3.5 text-purple-500" /> Download
                    </button>
                    <button
                      onClick={() => handleGenerate(currentBatch[0].prompt)}
                      className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg text-slate-700 dark:text-slate-300 font-bold flex flex-col items-center gap-1 cursor-pointer transition text-[10px]"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-indigo-500" /> Regenerate
                    </button>
                    <button
                      onClick={() => handleEditPrompt(currentBatch[0])}
                      className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg text-slate-700 dark:text-slate-300 font-bold flex flex-col items-center gap-1 cursor-pointer transition text-[10px]"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-amber-500" /> Edit Prompt
                    </button>
                    <button
                      onClick={() => handleShare(currentBatch[0])}
                      className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg text-slate-700 dark:text-slate-300 font-bold flex flex-col items-center gap-1 cursor-pointer transition text-[10px]"
                    >
                      <Share2 className="w-3.5 h-3.5 text-teal-500" /> Share
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* HISTORY TAB */}
      {activeTab === "history" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search history by prompt or style..."
              className="w-full sm:w-80 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-purple-500"
            />
            {history.length > 0 && (
              <button
                onClick={handleClearHistory}
                className="text-xs text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear All History
              </button>
            )}
          </div>

          {filteredHistory.length === 0 ? (
            <div className="text-center py-12 text-slate-500 space-y-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <Layers className="w-8 h-8 mx-auto text-slate-400" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No History Found</p>
              <p className="text-xs text-slate-400">Generated images will appear here automatically.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredHistory.map((item) => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden group hover:border-purple-500 transition flex flex-col shadow-xs"
                >
                  <div className="relative aspect-square bg-slate-950 overflow-hidden cursor-pointer">
                    <img
                      src={item.imageUrl}
                      alt={item.prompt}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      onClick={() => setLightboxRecord(item)}
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-2 right-2 flex items-center gap-1">
                      <button
                        onClick={() => handleToggleFavorite(item.id)}
                        className="p-1.5 bg-slate-950/70 backdrop-blur-md rounded-full text-white hover:text-amber-400 cursor-pointer"
                      >
                        <Star className={`w-3.5 h-3.5 ${item.isFavorite ? "text-amber-400 fill-amber-400" : ""}`} />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 bg-slate-950/70 backdrop-blur-md rounded-full text-white hover:text-rose-400 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="p-3 space-y-2 flex-1 flex flex-col justify-between text-xs">
                    <div>
                      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded border ${getProviderBadge(item.providerUsed).bg}`}>
                        {getProviderBadge(item.providerUsed).label.split(" ")[0]}
                      </span>
                      <p className="text-xs text-slate-800 dark:text-slate-200 line-clamp-2 mt-1 font-bold">
                        {item.prompt}
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                      <button
                        onClick={() => handleEditPrompt(item)}
                        className="text-purple-600 dark:text-purple-400 hover:underline font-bold cursor-pointer"
                      >
                        Load Prompt
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* FAVORITES TAB */}
      {activeTab === "favorites" && (
        <div className="space-y-4">
          {favoritesList.length === 0 ? (
            <div className="text-center py-12 text-slate-500 space-y-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <Star className="w-8 h-8 mx-auto text-amber-400 fill-amber-400/20" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No Favorites Saved</p>
              <p className="text-xs text-slate-400">Click the star icon on any image to save it here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {favoritesList.map((item) => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden group hover:border-amber-500 transition flex flex-col shadow-xs"
                >
                  <div className="relative aspect-square bg-slate-950 overflow-hidden cursor-pointer">
                    <img
                      src={item.imageUrl}
                      alt={item.prompt}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      onClick={() => setLightboxRecord(item)}
                      referrerPolicy="no-referrer"
                    />
                    <button
                      onClick={() => handleToggleFavorite(item.id)}
                      className="absolute top-2 right-2 p-1.5 bg-slate-950/70 backdrop-blur-md rounded-full text-amber-400 cursor-pointer"
                    >
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                    </button>
                  </div>
                  <div className="p-3 space-y-2 flex-1 flex flex-col justify-between text-xs">
                    <p className="text-xs text-slate-800 dark:text-slate-200 line-clamp-2 font-bold">
                      {item.prompt}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => handleDownload(item)}
                        className="text-purple-600 dark:text-purple-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="w-3 h-3" /> Download
                      </button>
                      <button
                        onClick={() => handleEditPrompt(item)}
                        className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold cursor-pointer"
                      >
                        Load Canvas
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* LIGHTBOX FULLSCREEN PREVIEW MODAL */}
      <AnimatePresence>
        {lightboxRecord && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxRecord(null)}
            className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-md p-4 flex items-center justify-center cursor-pointer"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-4xl w-full max-h-[90vh] overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl flex flex-col"
            >
              <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-white">
                <div className="flex items-center gap-2 truncate">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-xs font-bold truncate">{lightboxRecord.prompt}</span>
                </div>
                <button
                  onClick={() => setLightboxRecord(null)}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-full text-white cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-hidden bg-black flex items-center justify-center p-2">
                <img
                  src={lightboxRecord.imageUrl}
                  alt={lightboxRecord.prompt}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="p-4 bg-slate-900 border-t border-slate-800 text-xs text-white space-y-3">
                <p className="text-slate-300 leading-relaxed font-medium">
                  {lightboxRecord.prompt}
                </p>
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
                  <span className="text-[10px] text-slate-400">
                    Provider: {getProviderBadge(lightboxRecord.providerUsed).label}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownload(lightboxRecord)}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </button>
                    <button
                      onClick={() => handleToggleFavorite(lightboxRecord.id)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Star className={`w-3.5 h-3.5 ${lightboxRecord.isFavorite ? "text-amber-400 fill-amber-400" : ""}`} />
                      Favorite
                    </button>
                    <button
                      onClick={() => {
                        handleEditPrompt(lightboxRecord);
                        setLightboxRecord(null);
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Edit Prompt
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ImageGenerator;
