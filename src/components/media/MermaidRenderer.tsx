import React, { useEffect, useRef, useState } from "react";
import { SourceBadge } from "./SourceBadge";
import { Code, Download, ZoomIn, ZoomOut, RefreshCw, Copy, Check, Moon, Sun, Move } from "lucide-react";

interface MermaidRendererProps {
  code: string;
  title?: string;
  description?: string;
  source?: string;
  license?: string;
}

export const MermaidRenderer: React.FC<MermaidRendererProps> = ({
  code,
  title = "Diagram",
  description,
  source = "Mermaid.js Engine",
  license = "MIT License"
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgHtml, setSvgHtml] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [showRawCode, setShowRawCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Zoom & Pan states
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    let isMounted = true;
    const renderDiagram = async () => {
      try {
        const mermaidModule = await import("mermaid");
        const mermaid = mermaidModule.default;

        mermaid.initialize({
          startOnLoad: false,
          theme: isDarkMode ? "dark" : "default",
          securityLevel: "loose",
          fontFamily: "ui-sans-serif, system-ui, sans-serif"
        });

        const uniqueId = `mermaid_svg_${Math.random().toString(36).substring(2, 9)}`;
        const { svg } = await mermaid.render(uniqueId, code);
        if (isMounted) {
          setSvgHtml(svg);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          console.warn("[MermaidRenderer] Render failed:", err?.message || err);
          setError(err?.message || "Failed to render diagram code.");
        }
      }
    };

    if (code) {
      renderDiagram();
    }

    return () => {
      isMounted = false;
    };
  }, [code, isDarkMode]);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 2.5));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));
  const handleResetZoomPan = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  const copySvgToClipboard = async () => {
    if (!svgHtml) return;
    try {
      await navigator.clipboard.writeText(svgHtml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn("Clipboard copy failed:", e);
    }
  };

  const downloadSvg = () => {
    if (!svgHtml) return;
    const blob = new Blob([svgHtml], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]+/gi, "_")}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Drag pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (showRawCode || error) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Keyboard navigation for zoom & pan
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      handleZoomIn();
    } else if (e.key === "-") {
      e.preventDefault();
      handleZoomOut();
    } else if (e.key === "0") {
      e.preventDefault();
      handleResetZoomPan();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      setPan(prev => ({ ...prev, x: prev.x - 20 }));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setPan(prev => ({ ...prev, x: prev.x + 20 }));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setPan(prev => ({ ...prev, y: prev.y - 20 }));
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setPan(prev => ({ ...prev, y: prev.y + 20 }));
    }
  };

  return (
    <div className="w-full rounded-2xl border border-slate-700/80 bg-slate-900 overflow-hidden shadow-xl my-4">
      <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-slate-900">
        <div>
          <h4 className="text-base font-semibold text-slate-100">{title}</h4>
          {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {/* Theme Toggle */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1 transition-colors"
            title={isDarkMode ? "Switch to Light Theme" : "Switch to Dark Theme"}
            aria-label="Toggle diagram theme"
          >
            {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-400" />}
            <span className="hidden sm:inline">{isDarkMode ? "Light" : "Dark"}</span>
          </button>

          {/* Toggle Code */}
          <button
            onClick={() => setShowRawCode(!showRawCode)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1 transition-colors"
            title="Toggle Mermaid Source Code"
            aria-label="Toggle Mermaid source code"
          >
            <Code className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{showRawCode ? "Diagram" : "Source"}</span>
          </button>

          {svgHtml && !showRawCode && (
            <>
              {/* Copy SVG */}
              <button
                onClick={copySvgToClipboard}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1 transition-colors"
                title="Copy SVG Markup"
                aria-label="Copy SVG code"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
              </button>

              {/* Download SVG */}
              <button
                onClick={downloadSvg}
                className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1 transition-colors"
                title="Download SVG Diagram"
                aria-label="Download SVG file"
              >
                <Download className="w-3.5 h-3.5" />
                <span>SVG</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Control Bar for Zoom / Pan */}
      {svgHtml && !showRawCode && !error && (
        <div className="px-4 py-2 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-400">
              <Move className="w-3 h-3 text-blue-400" /> Drag or use Arrow keys to pan
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleZoomOut}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              title="Zoom Out (-)"
              aria-label="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-xs w-12 text-center text-slate-300">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              title="Zoom In (+)"
              aria-label="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetZoomPan}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors ml-1"
              title="Reset View (0)"
              aria-label="Reset zoom and position"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Interactive Diagram Canvas */}
      <div
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`p-6 ${isDarkMode ? "bg-slate-950" : "bg-slate-100"} flex items-center justify-center min-h-[260px] overflow-hidden select-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-grab active:cursor-grabbing transition-colors`}
        aria-label={`Interactive Diagram Container: ${title}. Use plus minus or arrow keys to navigate.`}
      >
        {showRawCode ? (
          <pre className="text-xs text-emerald-400 font-mono bg-slate-900 p-4 rounded-xl w-full border border-slate-800 overflow-x-auto whitespace-pre-wrap select-text">
            {code}
          </pre>
        ) : error ? (
          <div className="text-center p-4" aria-live="polite">
            <p className="text-sm text-amber-400 font-medium mb-2">Could not render graphical diagram.</p>
            <pre className="text-xs text-slate-400 bg-slate-900 p-3 rounded-lg text-left overflow-x-auto font-mono select-text">
              {code}
            </pre>
          </div>
        ) : (
          <div
            ref={containerRef}
            role="img"
            aria-label={title || "Mermaid SVG diagram"}
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
              transformOrigin: "center center",
              transition: isDragging ? "none" : "transform 0.15s ease-out"
            }}
            className="w-full flex justify-center [&_svg]:max-w-full [&_svg]:h-auto"
            dangerouslySetInnerHTML={{ __html: svgHtml }}
          />
        )}
      </div>

      <div className="p-3 bg-slate-900/90 border-t border-slate-800">
        <SourceBadge source={source} license={license} />
      </div>
    </div>
  );
};

