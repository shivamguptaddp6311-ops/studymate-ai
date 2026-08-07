import React, { useState, useEffect, useRef } from "react";
import { SourceBadge } from "./SourceBadge";
import { UnsplashProvider } from "../../services/providers/UnsplashProvider";
import { Maximize2, Download, X, ZoomIn, ZoomOut, RefreshCw, Share2, Check } from "lucide-react";

interface ImageViewerProps {
  url: string;
  title: string;
  description?: string;
  source: string;
  sourceUrl?: string;
  license?: string;
  author?: string;
  attributionLink?: string;
  downloadLocation?: string;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
  url,
  title,
  description,
  source,
  sourceUrl,
  license,
  author,
  attributionLink,
  downloadLocation
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [shared, setShared] = useState(false);

  // Fullscreen zoom/pan states
  const [zoomScale, setZoomScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    // If Unsplash image displayed, trigger download ping per terms
    if (downloadLocation && source === "Unsplash") {
      UnsplashProvider.triggerDownloadPing(downloadLocation);
    }
  }, [downloadLocation, source]);

  // Keyboard shortcut listener for Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  const handleDownload = async () => {
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${title.replace(/[^a-z0-9]+/gi, "_")}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      window.open(url, "_blank");
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: description || title,
          url
        });
        return;
      } catch (e) {
        // Fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch (e) {
      console.warn("Share clipboard failed:", e);
    }
  };

  const handleZoomIn = () => setZoomScale(p => Math.min(p + 0.25, 3));
  const handleZoomOut = () => setZoomScale(p => Math.max(p - 0.25, 0.75));
  const handleResetZoomPan = () => {
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const altText = description
    ? `${title} - ${description}`
    : title || "Educational diagram illustration";

  return (
    <div className="w-full rounded-2xl border border-slate-700/80 bg-slate-900 overflow-hidden shadow-xl my-4">
      <div className="p-4 border-b border-slate-800 bg-slate-900 flex items-center justify-between">
        <div>
          <h4 className="text-base font-semibold text-slate-100">{title}</h4>
          {description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1 transition-colors"
            title="Share or Copy Link"
            aria-label="Share visual image"
          >
            {shared ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{shared ? "Copied" : "Share"}</span>
          </button>
          <button
            onClick={() => setIsFullscreen(true)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1 transition-colors"
            title="Expand Fullscreen Inspector"
            aria-label="Expand visual image inspector"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Inspect</span>
          </button>
          <button
            onClick={handleDownload}
            className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1 transition-colors"
            title="Download Image"
            aria-label="Download image file"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>
        </div>
      </div>

      <div className="relative w-full min-h-[280px] max-h-[500px] bg-slate-950 flex items-center justify-center p-2 overflow-hidden group">
        {imageError ? (
          <div className="p-8 text-center text-slate-400 text-sm" role="alert" aria-live="polite">
            Failed to load image. Click source link below to view directly.
          </div>
        ) : (
          <img
            src={url}
            alt={altText}
            onError={() => setImageError(true)}
            className="max-h-[480px] w-auto object-contain rounded-lg transition-transform duration-300 group-hover:scale-[1.01] cursor-pointer"
            onClick={() => setIsFullscreen(true)}
            referrerPolicy="no-referrer"
          />
        )}
        {!imageError && (
          <div
            onClick={() => setIsFullscreen(true)}
            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
          >
            <div className="bg-slate-900/90 text-white text-xs font-medium px-3.5 py-1.5 rounded-full flex items-center gap-1.5 border border-slate-700 shadow-xl">
              <ZoomIn className="w-4 h-4 text-blue-400" />
              <span>Click to Inspect & Zoom</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-3 bg-slate-900 border-t border-slate-800">
        <SourceBadge
          source={source}
          sourceUrl={sourceUrl}
          license={license}
          author={author}
          attributionLink={attributionLink}
        />
      </div>

      {/* Fullscreen Inspector Modal */}
      {isFullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md p-4 flex flex-col items-center justify-between select-none"
          role="dialog"
          aria-modal="true"
          aria-label={`Visual Inspector: ${title}`}
        >
          {/* Header */}
          <div className="w-full max-w-6xl flex items-center justify-between py-2 border-b border-slate-800 text-white">
            <div>
              <h3 className="font-semibold text-lg">{title}</h3>
              {description && <p className="text-xs text-slate-400 line-clamp-1">{description}</p>}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 px-2 py-1 rounded-lg">
                <button
                  onClick={handleZoomOut}
                  className="p-1 text-slate-300 hover:text-white rounded"
                  title="Zoom Out"
                  aria-label="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono w-12 text-center text-slate-300">
                  {Math.round(zoomScale * 100)}%
                </span>
                <button
                  onClick={handleZoomIn}
                  className="p-1 text-slate-300 hover:text-white rounded"
                  title="Zoom In"
                  aria-label="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={handleResetZoomPan}
                  className="p-1 text-slate-400 hover:text-white rounded ml-1"
                  title="Reset Zoom"
                  aria-label="Reset position and zoom"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={() => setIsFullscreen(false)}
                className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300"
                title="Close Inspector (Esc)"
                aria-label="Close inspector"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Interactive Zoom/Pan Body */}
          <div
            onMouseDown={e => {
              setIsDragging(true);
              dragStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
            }}
            onMouseMove={e => {
              if (!isDragging) return;
              setPanOffset({
                x: e.clientX - dragStartRef.current.x,
                y: e.clientY - dragStartRef.current.y
              });
            }}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
            className="flex-1 w-full max-w-6xl flex items-center justify-center p-4 overflow-hidden cursor-grab active:cursor-grabbing"
          >
            <img
              src={url}
              alt={altText}
              style={{
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale})`,
                transition: isDragging ? "none" : "transform 0.15s ease-out"
              }}
              className="max-h-[75vh] max-w-full object-contain rounded-xl shadow-2xl"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Footer */}
          <div className="w-full max-w-6xl py-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <SourceBadge
              source={source}
              sourceUrl={sourceUrl}
              license={license}
              author={author}
              attributionLink={attributionLink}
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5"
              >
                {shared ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                <span>{shared ? "Copied" : "Share Link"}</span>
              </button>
              <button
                onClick={handleDownload}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg"
              >
                <Download className="w-4 h-4" />
                <span>Download High-Res</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

