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
  FileText,
  Compass,
  Cpu,
  Bookmark,
  ChevronDown
} from "lucide-react";

export interface GeneratedImageRecord {
  id: string;
  imageUrl: string;
  prompt: string;
  revisedPrompt?: string;
  category: string;
  aspectRatio: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
  quality: "standard" | "hd";
  providerUsed: "gemini" | "openai" | "fal";
  createdAt: string;
  isFavorite?: boolean;
}

const CATEGORIES = [
  { id: "text-to-image", label: "Text to Image", icon: "✨", desc: "General custom image generation" },
  { id: "educational-diagram", label: "Educational Diagram", icon: "📐", desc: "Clean labeled educational concepts" },
  { id: "biology", label: "Biology Diagram", icon: "🧬", desc: "Anatomy, cells, and biological systems" },
  { id: "chemistry", label: "Chemistry Illustration", icon: "🧪", desc: "Molecules, reactions, and lab gear" },
  { id: "physics", label: "Physics Diagram", icon: "⚡", desc: "Forces, optics, fields, and circuits" },
  { id: "geography", label: "Geography Map", icon: "🗺️", desc: "Maps, topography, and landforms" },
  { id: "mindmap", label: "Mind Map", icon: "🧠", desc: "Branching concept graphs" },
  { id: "flowchart", label: "Flowchart", icon: "🔄", desc: "Process flows & decision trees" },
  { id: "chart", label: "Charts & Data", icon: "📊", desc: "Infographics & visual statistics" },
  { id: "ai-art", label: "AI Art", icon: "🎨", desc: "Artistic digital masterpieces" },
  { id: "logo", label: "Logo Design", icon: "🏷️", desc: "Minimalist brand logos" },
  { id: "icon", label: "App Icon", icon: "📱", desc: "Clean 3D & flat UI icons" },
  { id: "poster", label: "Poster", icon: "🖼️", desc: "Educational graphic posters" },
];

const ASPECT_RATIOS: { id: "1:1" | "16:9" | "9:16" | "4:3" | "3:4"; label: string; icon: string; sizeText: string }[] = [
  { id: "1:1", label: "Square", icon: "1:1", sizeText: "1024 × 1024" },
  { id: "16:9", label: "Landscape", icon: "16:9", sizeText: "1792 × 1024" },
  { id: "9:16", label: "Portrait", icon: "9:16", sizeText: "1024 × 1792" },
  { id: "4:3", label: "Standard 4:3", icon: "4:3", sizeText: "1024 × 768" },
  { id: "3:4", label: "Poster 3:4", icon: "3:4", sizeText: "768 × 1024" },
];

const SAMPLE_PROMPTS = [
  "Cross-section diagram of a human plant cell showing chloroplasts, nucleus, and cell wall with clear text labels",
  "Solar system planetary orbit diagram with distance scale and vector planets",
  "Water cycle physical geography diagram showing evaporation, condensation, precipitation, and runoff",
  "Mind map summarizing photosynthesis process with colorful branching nodes",
  "Flowchart explaining algorithm execution steps for binary search in computer science",
  "Double helix DNA structure diagram showing adenine, thymine, cytosine, and guanine base pairs",
  "Infographic chart displaying global renewable energy generation statistics by region",
  "Minimalist modern tech startup logo with a glowing gradient brain icon",
  "Cinematic artistic illustration of a futuristic study room floating among nebulae and galaxies"
];

export const ImageGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState("");
  const [category, setCategory] = useState("educational-diagram");
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "16:9" | "9:16" | "4:3" | "3:4">("1:1");
  const [quality, setQuality] = useState<"standard" | "hd">("standard");
  const [preferredProvider, setPreferredProvider] = useState<"auto" | "gemini" | "openai" | "fal">("auto");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<GeneratedImageRecord | null>(null);

  const [history, setHistory] = useState<GeneratedImageRecord[]>([]);
  const [activeTab, setActiveTab] = useState<"generator" | "history" | "favorites">("generator");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

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

  // Save history to localStorage on updates
  const saveHistory = (items: GeneratedImageRecord[]) => {
    setHistory(items);
    try {
      localStorage.setItem("studymate_image_gen_history", JSON.stringify(items.slice(0, 50)));
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
    setLoadingStage("Initializing multi-provider AI pipeline...");

    const stageTimers: NodeJS.Timeout[] = [];
    stageTimers.push(
      setTimeout(() => setLoadingStage("Routing request (Gemini → OpenAI → Fal.ai)..."), 1000),
      setTimeout(() => setLoadingStage("Enhancing prompt & rendering high-res canvas..."), 2500),
      setTimeout(() => setLoadingStage("Applying visual filters & compressing output..."), 5000)
    );

    try {
      const response = await fetch("/api/ai/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: textToUse.trim(),
          category,
          aspectRatio,
          quality,
          preferredProvider
        }),
        signal: controller.signal
      });

      stageTimers.forEach(clearTimeout);

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Server returned HTTP ${response.status}`);
      }

      const data = await response.json();

      const newRecord: GeneratedImageRecord = {
        id: "img-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
        imageUrl: data.imageUrl,
        prompt: textToUse.trim(),
        revisedPrompt: data.revisedPrompt,
        category,
        aspectRatio,
        quality,
        providerUsed: data.providerUsed,
        createdAt: new Date().toISOString(),
        isFavorite: false
      };

      setCurrentResult(newRecord);
      saveHistory([newRecord, ...history]);
      setLoading(false);
      setLoadingStage("");
    } catch (err: any) {
      stageTimers.forEach(clearTimeout);
      if (err.name === "AbortError" || controller.signal.aborted) {
        setError("Generation cancelled.");
      } else {
        setError(err.message || "Failed to generate image. Please try again.");
      }
      setLoading(false);
      setLoadingStage("");
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoading(false);
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
    if (currentResult && currentResult.id === id) {
      setCurrentResult({ ...currentResult, isFavorite: !currentResult.isFavorite });
    }
  };

  const handleDeleteItem = (id: string) => {
    const updated = history.filter((item) => item.id !== id);
    saveHistory(updated);
    if (currentResult?.id === id) {
      setCurrentResult(null);
    }
  };

  const handleClearHistory = () => {
    if (confirm("Are you sure you want to clear all generation history?")) {
      saveHistory([]);
      setCurrentResult(null);
    }
  };

  const handleDownload = (record: GeneratedImageRecord) => {
    const link = document.createElement("a");
    link.href = record.imageUrl;
    const filename = `studymate-${record.category}-${Date.now()}.${record.imageUrl.startsWith("data:image/jpeg") ? "jpg" : "png"}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = async (record: GeneratedImageRecord) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `StudyMate AI Image - ${record.category}`,
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

  const handleRandomSample = () => {
    const random = SAMPLE_PROMPTS[Math.floor(Math.random() * SAMPLE_PROMPTS.length)];
    setPrompt(random);
  };

  const filteredHistory = history.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return item.prompt.toLowerCase().includes(q) || item.category.toLowerCase().includes(q) || item.providerUsed.toLowerCase().includes(q);
  });

  const favoritesList = history.filter((item) => item.isFavorite);

  const getProviderBadge = (provider: string) => {
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
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 text-slate-800 dark:text-slate-100">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Multi-Provider AI Studio (Gemini • OpenAI • Fal.ai)
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            AI Image & Educational Diagram Generator
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            Generate high-resolution educational diagrams, science illustrations, mind maps, flowcharts, and custom artwork with automated provider fallback and zero configuration required.
          </p>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/80 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 self-start md:self-auto">
          <button
            onClick={() => setActiveTab("generator")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              activeTab === "generator"
                ? "bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-sm font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Sparkles className="w-4 h-4" /> Studio
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              activeTab === "history"
                ? "bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-sm font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Layers className="w-4 h-4" /> History ({history.length})
          </button>
          <button
            onClick={() => setActiveTab("favorites")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              activeTab === "favorites"
                ? "bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-sm font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Star className="w-4 h-4 text-amber-500 fill-amber-500/20" /> Favorites ({favoritesList.length})
          </button>
        </div>
      </div>

      {/* TAB 1: GENERATOR MAIN STUDIO */}
      {activeTab === "generator" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: CONTROLS & PROMPT */}
          <div className="lg:col-span-7 space-y-6">
            {/* CATEGORY SELECTOR PILLS */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>1. Select Diagram / Image Type</span>
                <span className="text-purple-600 dark:text-purple-400 lowercase text-[11px] font-normal">
                  Auto-optimizes prompt structure
                </span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                {CATEGORIES.map((cat) => {
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl text-left border text-xs transition-all ${
                        isSelected
                          ? "bg-purple-50 dark:bg-purple-950/40 border-purple-500 text-purple-900 dark:text-purple-200 font-semibold shadow-sm"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <span className="text-base">{cat.icon}</span>
                      <div className="truncate">
                        <div className="truncate">{cat.label}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* PROMPT TEXT AREA */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  2. Describe What You Want to Generate
                </label>
                <button
                  onClick={handleRandomSample}
                  type="button"
                  className="text-xs text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 font-medium"
                >
                  <Compass className="w-3.5 h-3.5" /> Try Sample Prompt
                </button>
              </div>

              <div className="relative">
                <textarea
                  rows={4}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g., Labeled diagram of human respiratory system with lungs, trachea, and diaphragm in clean vector style..."
                  className="w-full p-4 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm resize-none shadow-sm"
                />
                <div className="absolute bottom-3 right-3 text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                  {prompt.length} chars
                </div>
              </div>
            </div>

            {/* CONFIGURATION OPTIONS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
              {/* ASPECT RATIO */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-purple-500" /> Image Size / Aspect Ratio
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {ASPECT_RATIOS.map((ratio) => (
                    <button
                      key={ratio.id}
                      type="button"
                      onClick={() => setAspectRatio(ratio.id)}
                      className={`p-2 rounded-lg border text-center transition-all ${
                        aspectRatio === ratio.id
                          ? "bg-purple-600 text-white border-purple-600 font-medium"
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      <div className="text-xs font-semibold">{ratio.label}</div>
                      <div className="text-[10px] opacity-80 font-mono">{ratio.icon}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* QUALITY TOGGLE */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" /> Output Quality
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setQuality("standard")}
                    className={`p-2.5 rounded-lg border text-center transition-all ${
                      quality === "standard"
                        ? "bg-purple-600 text-white border-purple-600 font-medium"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <div className="text-xs font-semibold">Standard</div>
                    <div className="text-[10px] opacity-80">Fast & Balanced</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuality("hd")}
                    className={`p-2.5 rounded-lg border text-center transition-all ${
                      quality === "hd"
                        ? "bg-purple-600 text-white border-purple-600 font-medium"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <div className="text-xs font-semibold">HD Quality</div>
                    <div className="text-[10px] opacity-80">Maximum Detail</div>
                  </button>
                </div>
              </div>
            </div>

            {/* ADVANCED PROVIDER ROUTER TOGGLE */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900/80 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-purple-500" /> Advanced AI Provider Settings
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
              </button>

              {showAdvanced && (
                <div className="p-4 bg-white dark:bg-slate-900 space-y-3 border-t border-slate-200 dark:border-slate-800">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      Primary Provider (Auto-fallback enabled)
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: "auto", name: "Auto (Gemini → OpenAI → Fal)" },
                        { id: "gemini", name: "Google Gemini Imagen" },
                        { id: "openai", name: "OpenAI DALL-E 3" },
                        { id: "fal", name: "Fal.ai Flux" },
                      ].map((prov) => (
                        <button
                          key={prov.id}
                          type="button"
                          onClick={() => setPreferredProvider(prov.id as any)}
                          className={`p-2 rounded-lg border text-center text-xs transition-all ${
                            preferredProvider === prov.id
                              ? "bg-purple-100 dark:bg-purple-900/40 border-purple-500 text-purple-700 dark:text-purple-300 font-semibold"
                              : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {prov.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    If your selected provider encounters rate limits or errors, the AI Router will automatically fail over to the next configured provider without interrupting your generation.
                  </p>
                </div>
              )}
            </div>

            {/* GENERATE ACTION BUTTON */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={loading || !prompt.trim()}
                onClick={() => handleGenerate()}
                className="flex-1 py-3.5 px-6 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:via-indigo-500 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-purple-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Generating Image...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" /> Generate Image & Diagram
                  </>
                )}
              </button>

              {loading && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-xs font-semibold hover:bg-rose-100 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>

            {/* ERROR DISPLAY */}
            {error && (
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold">Generation Error</div>
                  <div className="mt-0.5 whitespace-pre-line">{error}</div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: PREVIEW CANVAS */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-purple-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Live Canvas Preview
                  </span>
                </div>
                {currentResult && (
                  <span
                    className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${
                      getProviderBadge(currentResult.providerUsed).bg
                    }`}
                  >
                    {getProviderBadge(currentResult.providerUsed).label}
                  </span>
                )}
              </div>

              {/* IMAGE DISPLAY CONTAINER */}
              <div className="relative aspect-square w-full rounded-xl bg-slate-950 flex items-center justify-center overflow-hidden border border-slate-800 group">
                {loading ? (
                  <div className="flex flex-col items-center justify-center text-center p-6 space-y-4">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin" />
                      <Sparkles className="w-6 h-6 text-purple-400 absolute inset-0 m-auto animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-white tracking-wide">
                        {loadingStage || "Generating Image..."}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Synthesizing visual representation with high resolution
                      </p>
                    </div>
                  </div>
                ) : currentResult ? (
                  <>
                    <img
                      src={currentResult.imageUrl}
                      alt={currentResult.prompt}
                      className="w-full h-full object-contain cursor-pointer transition-transform duration-300 group-hover:scale-105"
                      onClick={() => setLightboxImage(currentResult.imageUrl)}
                    />
                    <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button
                        onClick={() => setLightboxImage(currentResult.imageUrl)}
                        className="p-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full text-white transition-all shadow-lg"
                        title="View Fullscreen"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDownload(currentResult)}
                        className="p-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full text-white transition-all shadow-lg"
                        title="Download Image"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleShare(currentResult)}
                        className="p-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full text-white transition-all shadow-lg"
                        title="Share Prompt / Link"
                      >
                        <Share2 className="w-5 h-5" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
                    <div className="p-3 rounded-full bg-slate-900 border border-slate-800">
                      <Sparkles className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-xs font-medium text-slate-400">
                      No Image Generated Yet
                    </p>
                    <p className="text-[11px] text-slate-500 max-w-xs">
                      Enter a prompt above and click "Generate Image & Diagram" to render high-resolution visuals.
                    </p>
                  </div>
                )}
              </div>

              {/* CURRENT RESULT DETAILS & ACTIONS */}
              {currentResult && (
                <div className="space-y-3 text-xs border-t border-slate-100 dark:border-slate-800 pt-3">
                  <div className="bg-slate-50 dark:bg-slate-950/50 p-3 rounded-xl space-y-1.5 border border-slate-200 dark:border-slate-800">
                    <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                      <span>Prompt</span>
                      <button
                        onClick={() => handleCopyPrompt(currentResult.prompt)}
                        className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 font-medium"
                      >
                        {copiedText === currentResult.prompt ? (
                          <>
                            <Check className="w-3 h-3" /> Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" /> Copy
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                      {currentResult.prompt}
                    </p>
                  </div>

                  {/* ACTION BUTTON BAR */}
                  <div className="grid grid-cols-4 gap-2">
                    <button
                      onClick={() => handleDownload(currentResult)}
                      className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-medium flex flex-col items-center gap-1 transition-colors"
                    >
                      <Download className="w-4 h-4 text-purple-500" /> Download
                    </button>

                    <button
                      onClick={() => handleGenerate(currentResult.prompt)}
                      className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-medium flex flex-col items-center gap-1 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4 text-indigo-500" /> Regenerate
                    </button>

                    <button
                      onClick={() => handleToggleFavorite(currentResult.id)}
                      className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-medium flex flex-col items-center gap-1 transition-colors"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          currentResult.isFavorite ? "text-amber-500 fill-amber-500" : "text-slate-400"
                        }`}
                      />
                      {currentResult.isFavorite ? "Saved" : "Favorite"}
                    </button>

                    <button
                      onClick={() => handleShare(currentResult)}
                      className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-medium flex flex-col items-center gap-1 transition-colors"
                    >
                      <Share2 className="w-4 h-4 text-teal-500" /> Share
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: HISTORY */}
      {activeTab === "history" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search history by prompt, category, or provider..."
              className="w-full sm:w-96 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-purple-500"
            />
            {history.length > 0 && (
              <button
                onClick={handleClearHistory}
                className="text-xs text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 self-end sm:self-auto"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear All History
              </button>
            )}
          </div>

          {filteredHistory.length === 0 ? (
            <div className="text-center py-12 text-slate-500 space-y-2">
              <Layers className="w-8 h-8 mx-auto text-slate-400" />
              <p className="text-sm font-medium">No Image History Found</p>
              <p className="text-xs">Generated images will appear here automatically.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredHistory.map((item) => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden group hover:border-purple-500 transition-all flex flex-col"
                >
                  <div className="relative aspect-square bg-slate-950 overflow-hidden cursor-pointer">
                    <img
                      src={item.imageUrl}
                      alt={item.prompt}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onClick={() => setLightboxImage(item.imageUrl)}
                    />
                    <div className="absolute top-2 right-2 flex items-center gap-1.5">
                      <button
                        onClick={() => handleToggleFavorite(item.id)}
                        className="p-1.5 bg-slate-950/70 backdrop-blur-md rounded-full text-white hover:text-amber-400"
                      >
                        <Star className={`w-3.5 h-3.5 ${item.isFavorite ? "text-amber-400 fill-amber-400" : ""}`} />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 bg-slate-950/70 backdrop-blur-md rounded-full text-white hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                    <div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${getProviderBadge(item.providerUsed).bg}`}>
                        {getProviderBadge(item.providerUsed).label}
                      </span>
                      <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2 mt-1.5 font-medium">
                        {item.prompt}
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                      <button
                        onClick={() => {
                          setCurrentResult(item);
                          setActiveTab("generator");
                        }}
                        className="text-purple-600 dark:text-purple-400 hover:underline font-medium"
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

      {/* TAB 3: FAVORITES */}
      {activeTab === "favorites" && (
        <div className="space-y-6">
          {favoritesList.length === 0 ? (
            <div className="text-center py-12 text-slate-500 space-y-2">
              <Star className="w-8 h-8 mx-auto text-amber-400 fill-amber-400/20" />
              <p className="text-sm font-medium">No Favorite Images Saved</p>
              <p className="text-xs">Click the star icon on any generated image to bookmark it here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {favoritesList.map((item) => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden group hover:border-amber-500 transition-all flex flex-col"
                >
                  <div className="relative aspect-square bg-slate-950 overflow-hidden cursor-pointer">
                    <img
                      src={item.imageUrl}
                      alt={item.prompt}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onClick={() => setLightboxImage(item.imageUrl)}
                    />
                    <button
                      onClick={() => handleToggleFavorite(item.id)}
                      className="absolute top-2 right-2 p-1.5 bg-slate-950/70 backdrop-blur-md rounded-full text-amber-400"
                    >
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                    </button>
                  </div>
                  <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                    <div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${getProviderBadge(item.providerUsed).bg}`}>
                        {getProviderBadge(item.providerUsed).label}
                      </span>
                      <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2 mt-1.5 font-medium">
                        {item.prompt}
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => handleDownload(item)}
                        className="text-purple-600 dark:text-purple-400 hover:underline font-medium flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" /> Download
                      </button>
                      <button
                        onClick={() => {
                          setCurrentResult(item);
                          setActiveTab("generator");
                        }}
                        className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
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
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxImage(null)}
            className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md p-4 flex items-center justify-center cursor-pointer"
          >
            <div className="relative max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
              <button
                onClick={() => setLightboxImage(null)}
                className="absolute top-4 right-4 z-10 p-2 bg-slate-900/80 hover:bg-slate-800 rounded-full text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <img
                src={lightboxImage}
                alt="Fullscreen Preview"
                className="w-full h-full object-contain max-h-[85vh]"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ImageGenerator;
