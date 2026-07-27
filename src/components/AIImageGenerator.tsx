import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Image as ImageIcon,
  Download,
  Share2,
  Copy,
  RefreshCw,
  XCircle,
  Star,
  Trash2,
  Zap,
  Sliders,
  Maximize2,
  Check,
  AlertTriangle,
  Grid,
  Heart,
  Search,
  ChevronDown,
  Layers
} from "lucide-react";
import { UserProfile } from "../types";

export interface AIImageGeneratorProps {
  profile?: UserProfile;
  onAwardXP?: (amount: number, reason: string) => void;
  onAddNotification?: (title: string, message: string, type?: "info" | "success" | "alert") => void;
}

export interface GeneratedImageItem {
  id: string;
  prompt: string;
  revisedPrompt: string;
  category: string;
  aspectRatio: string;
  quality: string;
  providerUsed: string;
  imageUrl: string;
  timestamp: string;
  isFavorite?: boolean;
}

const CATEGORIES = [
  { id: "Educational Diagrams", label: "Educational Diagrams", icon: "📐", sample: "Cross section of human heart with labeled chambers" },
  { id: "Biology Diagrams", label: "Biology & Anatomy", icon: "🧬", sample: "Plant cell structure with nucleus and mitochondria labeled" },
  { id: "Chemistry Illustrations", label: "Chemistry & Reactions", icon: "🧪", sample: "Benzene ring molecular structure with electron clouds" },
  { id: "Physics Diagrams", label: "Physics & Circuits", icon: "⚡", sample: "Convex lens ray diagram showing real inverted image" },
  { id: "Geography Maps", label: "Geography Maps", icon: "🗺️", sample: "Topographical map of the Himalayas with elevation contours" },
  { id: "Mind Maps", label: "Mind Maps", icon: "🧠", sample: "Mind map of Indian Independence Movement with key events" },
  { id: "Flowcharts", label: "Flowcharts & Logic", icon: "🔀", sample: "Algorithm flowchart for Binary Search with decision nodes" },
  { id: "Charts", label: "Data Charts & Graphs", icon: "📊", sample: "Global energy consumption breakdown pie chart infographic" },
  { id: "AI Art", label: "AI Creative Art", icon: "🎨", sample: "Cyberpunk library with glowing holographic study tables" },
  { id: "Logos", label: "Logos & Emblems", icon: "🏷️", sample: "Minimalist owl study mascot logo with gradient geometry" },
  { id: "Icons", label: "App Icons", icon: "💎", sample: "3D glassmorphic study planner app icon" },
  { id: "Posters", label: "Study Posters", icon: "🖼️", sample: "Periodic Table of Elements typography wall poster" },
  { id: "Text to Image", label: "General Concept", icon: "✍️", sample: "Futuristic space station classroom looking at Earth" }
];

const ASPECT_RATIOS = [
  { id: "1:1", label: "Square (1:1)", icon: "⬛", desc: "Best for avatars, social & diagrams" },
  { id: "3:4", label: "Portrait (3:4)", icon: "📱", desc: "Best for posters & mobile views" },
  { id: "16:9", label: "Landscape (16:9)", icon: "📺", desc: "Best for presentations & wide charts" }
];

const QUALITIES = [
  { id: "standard", label: "Standard", desc: "Fast generation speed" },
  { id: "hd", label: "HD Quality", desc: "Ultra-sharp detail & 8k clarity" }
];

const PROVIDERS = [
  { id: "auto", label: "Auto Fallback (Recommended)", desc: "Gemini → OpenAI → Fal.ai" },
  { id: "gemini", label: "Google Gemini (Imagen 3)", desc: "Primary Google Model" },
  { id: "openai", label: "OpenAI (DALL-E 3)", desc: "Primary OpenAI Model" },
  { id: "fal", label: "Fal.ai (FLUX Schnell)", desc: "Fast Generative Diffusion" }
];

const STORAGE_KEY = "studymate_image_gen_history_v1";

export function AIImageGenerator({ profile, onAwardXP, onAddNotification }: AIImageGeneratorProps) {
  const [prompt, setPrompt] = useState("");
  const [category, setCategory] = useState("Educational Diagrams");
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "3:4" | "16:9" | "9:16" | "4:3">("1:1");
  const [quality, setQuality] = useState<"standard" | "hd">("standard");
  const [preferredProvider, setPreferredProvider] = useState<"auto" | "gemini" | "openai" | "fal">("auto");
  
  const [isLoading, setIsLoading] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [progressText, setProgressText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentImage, setCurrentImage] = useState<GeneratedImageItem | null>(null);
  
  const [history, setHistory] = useState<GeneratedImageItem[]>([]);
  const [activeTab, setActiveTab] = useState<"generate" | "gallery">("generate");
  const [filterFavorite, setFilterFavorite] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [zoomModalImage, setZoomModalImage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Load history from LocalStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load image generator history:", e);
    }
  }, []);

  // Save history to LocalStorage
  const saveHistoryToStorage = (updatedHistory: GeneratedImageItem[]) => {
    setHistory(updatedHistory);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory.slice(0, 50)));
    } catch (e) {
      console.error("Failed to save image generator history:", e);
    }
  };

  const handleGenerate = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    const promptToUse = customPrompt || prompt;
    if (!promptToUse.trim() || isLoading) return;

    setIsLoading(true);
    setErrorMessage(null);
    setProgressStep(1);
    setProgressText("Enhancing prompt and optimizing categories...");

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Simulate progress ticks
    const timer1 = setTimeout(() => {
      if (isLoading) {
        setProgressStep(2);
        setProgressText("Routing to optimal AI provider (Gemini → OpenAI → Fal)...");
      }
    }, 1200);

    const timer2 = setTimeout(() => {
      if (isLoading) {
        setProgressStep(3);
        setProgressText("Rendering high-resolution vector image...");
      }
    }, 3500);

    try {
      const authStorage = localStorage.getItem("studymate_auth_token_v1");
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };
      if (authStorage) {
        headers["Authorization"] = `Bearer ${authStorage}`;
      }

      const response = await fetch("/api/ai/generate-image", {
        method: "POST",
        headers,
        body: JSON.stringify({
          prompt: promptToUse.trim(),
          category,
          aspectRatio,
          quality,
          provider: preferredProvider
        }),
        signal: abortController.signal
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Server error (${response.status})`);
      }

      const data = await response.json();

      setProgressStep(4);
      setProgressText("Finalizing generated asset!");

      const newItem: GeneratedImageItem = {
        id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        prompt: promptToUse.trim(),
        revisedPrompt: data.revisedPrompt || promptToUse.trim(),
        category,
        aspectRatio,
        quality,
        providerUsed: data.providerUsed || "auto",
        imageUrl: data.imageUrl,
        timestamp: new Date().toISOString()
      };

      setCurrentImage(newItem);
      const newHistory = [newItem, ...history];
      saveHistoryToStorage(newHistory);

      if (onAwardXP) {
        onAwardXP(20, "Generated AI Diagram / Image");
      }
      if (onAddNotification) {
        onAddNotification("Image Generated", `Successfully generated image via ${data.providerUsed || "AI Router"}.`, "success");
      }
    } catch (err: any) {
      if (err.name === "AbortError" || abortController.signal.aborted) {
        if (onAddNotification) {
          onAddNotification("Generation Cancelled", "Image generation was cancelled.", "info");
        }
      } else {
        console.error("Image generation error:", err);
        setErrorMessage(err.message || "Failed to generate image. Please try again.");
        if (onAddNotification) {
          onAddNotification("Generation Failed", err.message || "Failed to generate image.", "alert");
        }
      }
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setIsLoading(false);
      setProgressStep(0);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const toggleFavorite = (id: string) => {
    const updated = history.map((item) =>
      item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
    );
    saveHistoryToStorage(updated);
    if (currentImage && currentImage.id === id) {
      setCurrentImage({ ...currentImage, isFavorite: !currentImage.isFavorite });
    }
  };

  const deleteItem = (id: string) => {
    const updated = history.filter((item) => item.id !== id);
    saveHistoryToStorage(updated);
    if (currentImage && currentImage.id === id) {
      setCurrentImage(null);
    }
  };

  const handleDownload = (item: GeneratedImageItem) => {
    try {
      const link = document.createElement("a");
      link.href = item.imageUrl;
      const cleanPrompt = item.prompt.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30);
      link.download = `StudyMate_${item.category}_${cleanPrompt}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      if (onAddNotification) {
        onAddNotification("Downloaded", "Image saved to your downloads folder.", "info");
      }
    } catch (e) {
      console.error("Download failed:", e);
    }
  };

  const handleCopyPrompt = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const filteredHistory = history.filter((item) => {
    if (filterFavorite && !item.isFavorite) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.prompt.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.providerUsed.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/50 rounded-3xl overflow-hidden border border-white/20 dark:border-slate-800/80 shadow-2xl relative">
      {/* Header Bar */}
      <div className="px-6 py-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              AI Diagram & Art Generator
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-medium">
                Multi-Provider Engine
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Generate educational diagrams, biology charts, mind maps & AI artwork via Gemini, OpenAI & Fal.ai
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
          <button
            onClick={() => setActiveTab("generate")}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === "generate"
                ? "bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Studio Generator
          </button>
          <button
            onClick={() => setActiveTab("gallery")}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === "gallery"
                ? "bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            Gallery ({history.length})
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {activeTab === "generate" ? (
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Category Selector Pills */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Select Visual Category
              </label>
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setCategory(cat.id);
                      if (!prompt) setPrompt(cat.sample);
                    }}
                    className={`px-3.5 py-2 rounded-2xl text-xs font-medium whitespace-nowrap transition-all border flex items-center gap-2 ${
                      category === cat.id
                        ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white border-transparent shadow-md shadow-purple-500/20 scale-[1.02]"
                        : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt Input Box */}
            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="relative bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm focus-within:ring-2 focus-within:ring-purple-500 transition-all">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={`Describe what you want to generate (e.g. "${CATEGORIES.find(c => c.id === category)?.sample || "Human Heart Diagram"}") ...`}
                  rows={3}
                  className="w-full bg-transparent border-none text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-0 text-sm resize-none"
                />

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const sample = CATEGORIES.find(c => c.id === category)?.sample;
                        if (sample) setPrompt(sample);
                      }}
                      className="text-xs text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 font-medium"
                    >
                      <Sparkles className="w-3 h-3" />
                      Try sample prompt
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 border ${
                        showAdvanced
                          ? "bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-200 dark:hover:bg-slate-700"
                      }`}
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      Settings
                      <ChevronDown className={`w-3 h-3 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
                    </button>

                    {isLoading ? (
                      <button
                        type="button"
                        onClick={handleCancel}
                        className="px-5 py-2.5 rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 text-xs font-bold transition-all flex items-center gap-2 border border-red-500/30"
                      >
                        <XCircle className="w-4 h-4" />
                        Cancel
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={!prompt.trim()}
                        className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-bold transition-all disabled:opacity-50 shadow-lg shadow-purple-500/20 flex items-center gap-2"
                      >
                        <Zap className="w-4 h-4 fill-white" />
                        Generate Image
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </form>

            {/* Advanced Settings Drawer */}
            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-3xl p-5 border border-slate-200 dark:border-slate-800 space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Aspect Ratio */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Aspect Ratio
                      </label>
                      <div className="grid grid-cols-1 gap-2">
                        {ASPECT_RATIOS.map((ar) => (
                          <button
                            key={ar.id}
                            type="button"
                            onClick={() => setAspectRatio(ar.id as any)}
                            className={`p-2.5 rounded-2xl text-xs font-medium text-left transition-all border flex items-center justify-between ${
                              aspectRatio === ar.id
                                ? "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800"
                                : "bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border-slate-200/60 dark:border-slate-800"
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span>{ar.icon}</span>
                              <span>{ar.label}</span>
                            </span>
                            <span className="text-[10px] text-slate-400">{ar.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Quality */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Rendering Quality
                      </label>
                      <div className="grid grid-cols-1 gap-2">
                        {QUALITIES.map((q) => (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => setQuality(q.id as any)}
                            className={`p-2.5 rounded-2xl text-xs font-medium text-left transition-all border flex items-center justify-between ${
                              quality === q.id
                                ? "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800"
                                : "bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border-slate-200/60 dark:border-slate-800"
                            }`}
                          >
                            <span>{q.label}</span>
                            <span className="text-[10px] text-slate-400">{q.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Provider Override */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                        AI Provider Priority
                      </label>
                      <div className="grid grid-cols-1 gap-2">
                        {PROVIDERS.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setPreferredProvider(p.id as any)}
                            className={`p-2.5 rounded-2xl text-xs font-medium text-left transition-all border flex items-center justify-between ${
                              preferredProvider === p.id
                                ? "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800"
                                : "bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border-slate-200/60 dark:border-slate-800"
                            }`}
                          >
                            <span>{p.label}</span>
                            <span className="text-[10px] text-slate-400">{p.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Loading Indicator / Progress State */}
            {isLoading && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-purple-200 dark:border-purple-900/50 shadow-xl text-center space-y-4">
                <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-purple-200 dark:border-purple-900 animate-ping opacity-25"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-t-purple-600 border-r-pink-500 border-b-transparent border-l-transparent animate-spin"></div>
                  <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400 animate-pulse" />
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Generating Image via AI System...
                  </h3>
                  <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 font-medium">
                    {progressText}
                  </p>
                </div>

                {/* Progress bar */}
                <div className="w-full max-w-md mx-auto bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-purple-600 to-pink-500 h-full transition-all duration-500"
                    style={{ width: `${(progressStep / 4) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {errorMessage && (
              <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 p-4 rounded-2xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-red-800 dark:text-red-300">Generation Failed</h4>
                  <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Current Image Preview Area */}
            {currentImage && !isLoading && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Result Preview
                    </span>
                    <span className="text-[10px] px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold uppercase">
                      Provider: {currentImage.providerUsed}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleFavorite(currentImage.id)}
                      className={`p-2 rounded-xl border text-xs font-medium transition-all ${
                        currentImage.isFavorite
                          ? "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                      }`}
                      title="Favorite"
                    >
                      <Star className={`w-4 h-4 ${currentImage.isFavorite ? "fill-amber-400" : ""}`} />
                    </button>

                    <button
                      onClick={() => handleDownload(currentImage)}
                      className="px-3 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 transition-all flex items-center gap-1.5 shadow-md shadow-purple-500/20"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </button>
                  </div>
                </div>

                {/* Main Render Box */}
                <div className="relative group rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center max-h-[500px]">
                  <img
                    src={currentImage.imageUrl}
                    alt={currentImage.prompt}
                    className="w-full h-auto max-h-[500px] object-contain rounded-2xl"
                  />

                  {/* Overlay buttons on hover */}
                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button
                      onClick={() => setZoomModalImage(currentImage.imageUrl)}
                      className="p-3 rounded-full bg-white/90 text-slate-900 hover:scale-110 transition-transform shadow-lg"
                      title="Zoom Fullscreen"
                    >
                      <Maximize2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleCopyLink(currentImage.imageUrl)}
                      className="p-3 rounded-full bg-white/90 text-slate-900 hover:scale-110 transition-transform shadow-lg"
                      title="Copy Link"
                    >
                      {copiedLink ? <Check className="w-5 h-5 text-emerald-600" /> : <Share2 className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Prompt Details */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl space-y-2 border border-slate-200/60 dark:border-slate-700/60">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                      Original Prompt
                    </span>
                    <button
                      onClick={() => handleCopyPrompt(currentImage.prompt)}
                      className="text-xs text-purple-600 dark:text-purple-400 font-medium flex items-center gap-1 hover:underline"
                    >
                      {copiedPrompt ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      {copiedPrompt ? "Copied" : "Copy Prompt"}
                    </button>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-200 font-medium">{currentImage.prompt}</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Gallery Tab */
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search history by prompt or category..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl text-xs border border-slate-200 dark:border-slate-700 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setFilterFavorite(!filterFavorite)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1.5 ${
                    filterFavorite
                      ? "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800"
                      : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <Star className={`w-3.5 h-3.5 ${filterFavorite ? "fill-amber-400" : ""}`} />
                  Favorites Only
                </button>

                {history.length > 0 && (
                  <button
                    onClick={() => {
                      if (confirm("Are you sure you want to clear your image generation history?")) {
                        saveHistoryToStorage([]);
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all"
                  >
                    Clear History
                  </button>
                )}
              </div>
            </div>

            {filteredHistory.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
                <ImageIcon className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Generated Images Found</h3>
                <p className="text-xs text-slate-500">
                  {filterFavorite ? "You haven't favorited any generated images yet." : "Generate your first AI diagram or image in the Studio tab."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {filteredHistory.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md group hover:shadow-xl transition-all"
                  >
                    <div className="relative aspect-square bg-slate-950 overflow-hidden">
                      <img
                        src={item.imageUrl}
                        alt={item.prompt}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />

                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          onClick={() => setZoomModalImage(item.imageUrl)}
                          className="p-2.5 rounded-full bg-white/90 text-slate-900 hover:scale-110 transition-transform shadow-md"
                        >
                          <Maximize2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownload(item)}
                          className="p-2.5 rounded-full bg-white/90 text-slate-900 hover:scale-110 transition-transform shadow-md"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleFavorite(item.id)}
                          className="p-2.5 rounded-full bg-white/90 text-slate-900 hover:scale-110 transition-transform shadow-md"
                        >
                          <Star className={`w-4 h-4 ${item.isFavorite ? "fill-amber-400 text-amber-500" : ""}`} />
                        </button>
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="p-2.5 rounded-full bg-red-500 text-white hover:scale-110 transition-transform shadow-md"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-slate-900/80 text-[10px] font-semibold text-white backdrop-blur-sm">
                        {item.providerUsed}
                      </span>
                    </div>

                    <div className="p-3 space-y-2">
                      <p className="text-xs text-slate-800 dark:text-slate-200 font-medium line-clamp-2">
                        {item.prompt}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>{item.category}</span>
                        <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Image Zoom Modal */}
      <AnimatePresence>
        {zoomModalImage && (
          <div
            className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setZoomModalImage(null)}
          >
            <div className="relative max-w-4xl max-h-[90vh] w-full" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setZoomModalImage(null)}
                className="absolute -top-10 right-0 text-white hover:text-purple-400 transition-colors"
              >
                <XCircle className="w-8 h-8" />
              </button>
              <img
                src={zoomModalImage}
                alt="Zoomed View"
                className="w-full h-auto max-h-[85vh] object-contain rounded-2xl shadow-2xl"
              />
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AIImageGenerator;
