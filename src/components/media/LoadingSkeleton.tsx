import React from "react";

export const LoadingSkeleton: React.FC<{ message?: string }> = ({ message = "Loading educational visual content..." }) => {
  return (
    <div className="w-full min-h-[220px] rounded-xl border border-slate-700/60 bg-slate-900/60 p-6 flex flex-col items-center justify-center gap-3 animate-pulse">
      <div className="w-12 h-12 rounded-full border-2 border-blue-500/40 border-t-blue-500 animate-spin" />
      <p className="text-sm font-medium text-slate-300">{message}</p>
      <div className="w-48 h-3 bg-slate-800 rounded-full" />
    </div>
  );
};
