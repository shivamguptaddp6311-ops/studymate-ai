import React from "react";
import { SourceBadge } from "./SourceBadge";
import { Play, ExternalLink, Maximize2 } from "lucide-react";

interface YoutubePlayerProps {
  title: string;
  embedUrl: string;
  sourceUrl?: string;
  description?: string;
  author?: string;
}

export const YoutubePlayer: React.FC<YoutubePlayerProps> = ({
  title,
  embedUrl,
  sourceUrl,
  description,
  author
}) => {
  // Ensure captions policy is active (cc_load_policy=1) in YouTube embed URL
  const formattedEmbedUrl = React.useMemo(() => {
    if (!embedUrl) return "";
    const urlObj = new URL(embedUrl.startsWith("http") ? embedUrl : `https://${embedUrl}`);
    urlObj.searchParams.set("cc_load_policy", "1");
    urlObj.searchParams.set("rel", "0");
    return urlObj.toString();
  }, [embedUrl]);

  const directYouTubeUrl = sourceUrl || embedUrl.replace("/embed/", "/watch?v=");

  const handleOpenFullscreen = () => {
    const iframe = document.getElementById(`yt_iframe_${title.replace(/\W+/g, "_")}`);
    if (iframe && iframe.requestFullscreen) {
      iframe.requestFullscreen();
    } else {
      window.open(directYouTubeUrl, "_blank");
    }
  };

  return (
    <div className="w-full rounded-2xl border border-slate-700/80 bg-slate-900 overflow-hidden shadow-xl my-4">
      <div className="p-4 border-b border-slate-800 bg-slate-900 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-500 shrink-0">
            <Play className="w-4 h-4 fill-current ml-0.5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-100 line-clamp-1">{title}</h4>
            {author && <p className="text-xs text-slate-400">Channel: {author}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={handleOpenFullscreen}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1 transition-colors"
            title="Watch Fullscreen"
            aria-label="Expand video fullscreen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Fullscreen</span>
          </button>
          <a
            href={directYouTubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg bg-red-600/90 hover:bg-red-600 text-white text-xs font-medium flex items-center gap-1 transition-colors"
            title="Open on YouTube"
            aria-label="Open video on YouTube"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>YouTube</span>
          </a>
        </div>
      </div>

      <div className="relative w-full aspect-video bg-black">
        <iframe
          id={`yt_iframe_${title.replace(/\W+/g, "_")}`}
          src={formattedEmbedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute top-0 left-0 w-full h-full border-0"
        />
      </div>

      {description && (
        <div className="p-3 bg-slate-950/80 text-xs text-slate-300 border-t border-slate-800 line-clamp-2">
          {description}
        </div>
      )}

      <div className="p-3 bg-slate-900 border-t border-slate-800">
        <SourceBadge
          source="YouTube Educational Video"
          sourceUrl={directYouTubeUrl}
          author={author}
          license="Standard YouTube License"
        />
      </div>
    </div>
  );
};

