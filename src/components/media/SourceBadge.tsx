import React from "react";
import { ExternalLink, ShieldCheck } from "lucide-react";

interface SourceBadgeProps {
  source: string;
  sourceUrl?: string;
  license?: string;
  author?: string;
  attributionLink?: string;
}

export const SourceBadge: React.FC<SourceBadgeProps> = ({
  source,
  sourceUrl,
  license,
  author,
  attributionLink
}) => {
  const lowerSource = (source || "").toLowerCase();

  let formattedSourceText = source;
  if (lowerSource.includes("wikimedia")) {
    formattedSourceText = `Image from Wikimedia Commons${license ? ` — ${license}` : ""}${author ? ` — ${author}` : ""}`;
  } else if (lowerSource.includes("unsplash")) {
    formattedSourceText = `Photo from Unsplash${author ? ` — ${author}` : ""}`;
  } else if (lowerSource.includes("youtube")) {
    formattedSourceText = `Video from YouTube`;
  } else if (lowerSource.includes("mermaid")) {
    formattedSourceText = `Diagram generated using Mermaid`;
  } else if (lowerSource.includes("pubchem")) {
    formattedSourceText = `Structure from PubChem`;
  } else if (lowerSource.includes("nasa")) {
    formattedSourceText = `Astronomy image from NASA`;
  } else if (lowerSource.includes("wikipedia")) {
    formattedSourceText = `Summary from Wikipedia`;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 bg-slate-800/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-700/60 shadow-sm">
      <div className="flex items-center gap-1 font-medium text-slate-200">
        <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
        <span>{formattedSourceText}</span>
      </div>

      {!lowerSource.includes("wikimedia") && !lowerSource.includes("unsplash") && author && (
        <>
          <span className="text-slate-600">•</span>
          <span className="text-slate-300">
            By{" "}
            {attributionLink ? (
              <a
                href={attributionLink}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-blue-400 transition-colors"
              >
                {author}
              </a>
            ) : (
              author
            )}
          </span>
        </>
      )}

      {!lowerSource.includes("wikimedia") && license && (
        <>
          <span className="text-slate-600">•</span>
          <span className="text-slate-400 text-[11px] px-1.5 py-0.5 rounded bg-slate-900/60 border border-slate-700/40">
            {license}
          </span>
        </>
      )}

      {sourceUrl && (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-medium transition-colors"
        >
          <span>View Source</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );
};

