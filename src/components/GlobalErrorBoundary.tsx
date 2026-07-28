import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, ArrowLeft, ShieldCheck } from "lucide-react";
import { logger, getFriendlyErrorMessage } from "../utils/logger";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  friendlyMessage: string;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    friendlyMessage: "",
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      friendlyMessage: getFriendlyErrorMessage(error),
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error("GlobalErrorBoundary", "React component tree caught uncaught rendering exception", error, {
      componentStack: errorInfo.componentStack?.substring(0, 500),
    });
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 font-sans">
          <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 text-center backdrop-blur-xl">
            <div className="inline-flex p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black tracking-tight text-white">
                Workspace Recovery Mode
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                {this.state.friendlyMessage || "An unexpected view error occurred. Your study history, notes, and test records are securely stored in cloud memory."}
              </p>
            </div>

            <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800 text-left flex items-start space-x-3 text-xs text-slate-300">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white block">Automatic Recovery Ready</span>
                <span>Click reset to reload the active view without losing saved documents or notes.</span>
              </div>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={this.handleGoHome}
                className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-extrabold rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Dashboard</span>
              </button>

              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-90 text-white text-xs font-extrabold rounded-xl shadow-lg transition flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reset View</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;
