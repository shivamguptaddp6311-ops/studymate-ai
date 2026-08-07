import React, { lazy, Suspense } from "react";
import { VisualResult } from "../../types/visual";
import { ImageViewer } from "./ImageViewer";
import { SourceBadge } from "./SourceBadge";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { BookOpen } from "lucide-react";

const MermaidRenderer = lazy(() =>
  import("./MermaidRenderer").then(m => ({ default: m.MermaidRenderer }))
);
const YoutubePlayer = lazy(() =>
  import("./YoutubePlayer").then(m => ({ default: m.YoutubePlayer }))
);

interface VisualContentCardProps {
  result: VisualResult;
}

export const VisualContentCard: React.FC<VisualContentCardProps> = ({ result }) => {
  if (!result) return null;

  if (result.type === "mermaid_code" && result.mediaData) {
    return (
      <Suspense fallback={<LoadingSkeleton message="Rendering Mermaid diagram..." />}>
        <MermaidRenderer
          code={result.mediaData}
          title={result.title}
          description={result.description}
          source={result.source}
          license={result.license}
        />
      </Suspense>
    );
  }

  if (result.type === "video" && result.embedUrl) {
    return (
      <Suspense fallback={<LoadingSkeleton message="Loading YouTube video player..." />}>
        <YoutubePlayer
          title={result.title}
          embedUrl={result.embedUrl}
          sourceUrl={result.sourceUrl}
          description={result.description}
          author={result.author}
        />
      </Suspense>
    );
  }

  if (result.type === "diagram_svg" && result.mediaData) {
    return (
      <div className="w-full rounded-2xl border border-slate-700/80 bg-slate-900 overflow-hidden shadow-xl my-4">
        <div className="p-4 border-b border-slate-800 bg-slate-900">
          <h4 className="text-base font-semibold text-slate-100">{result.title}</h4>
          {result.description && <p className="text-xs text-slate-400 mt-0.5">{result.description}</p>}
        </div>
        <div
          className="p-6 bg-slate-950 flex items-center justify-center min-h-[220px] overflow-x-auto [&_svg]:max-w-full [&_svg]:h-auto"
          dangerouslySetInnerHTML={{ __html: result.mediaData }}
        />
        <div className="p-3 bg-slate-900 border-t border-slate-800">
          <SourceBadge source={result.source} sourceUrl={result.sourceUrl} license={result.license} />
        </div>
      </div>
    );
  }

  if (result.type === "wikipedia_summary") {
    return (
      <div className="w-full rounded-2xl border border-slate-700/80 bg-slate-900 overflow-hidden shadow-xl my-4 p-4 flex flex-col md:flex-row gap-4">
        {result.thumbnailUrl && (
          <img
            src={result.thumbnailUrl}
            alt={result.title}
            className="w-full md:w-48 h-48 object-cover rounded-xl border border-slate-800 shrink-0"
            referrerPolicy="no-referrer"
          />
        )}
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <BookOpen className="w-4 h-4" />
              <span>Wikipedia Overview</span>
            </div>
            <h4 className="text-lg font-bold text-slate-100">{result.title}</h4>
            <p className="text-sm text-slate-300 mt-2 leading-relaxed">{result.description}</p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800">
            <SourceBadge
              source="Wikipedia"
              sourceUrl={result.sourceUrl}
              license={result.license}
              author={result.author}
            />
          </div>
        </div>
      </div>
    );
  }

  // Standard Image (Wikimedia, Unsplash, PubChem, NASA, etc.)
  if (result.url) {
    return (
      <ImageViewer
        url={result.url}
        title={result.title}
        description={result.description}
        source={result.source}
        sourceUrl={result.sourceUrl}
        license={result.license}
        author={result.author}
        attributionLink={result.attributionLink}
        downloadLocation={result.downloadLocation}
      />
    );
  }

  return null;
};
