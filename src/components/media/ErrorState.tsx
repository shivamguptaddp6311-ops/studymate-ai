import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  message = "Could not load visual content. Please try again.",
  onRetry
}) => {
  return (
    <div
      role="alert"
      aria-live="polite"
      className="w-full p-4 rounded-xl border border-red-500/30 bg-red-950/20 text-red-200 flex items-center justify-between gap-3 text-sm my-3 shadow-md"
    >
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
        <span>{message}</span>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-900/40 hover:bg-red-800/60 border border-red-700/50 text-xs font-semibold text-red-100 transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-red-400"
          aria-label="Retry loading content"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      )}
    </div>
  );
};

