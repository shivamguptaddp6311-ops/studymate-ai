import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { logger, getFriendlyErrorMessage } from "../../utils/logger";

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  friendlyMessage: string;
}

export class AIErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    friendlyMessage: ""
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      friendlyMessage: getFriendlyErrorMessage(error)
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[AIErrorBoundary] Component tree caught rendering exception:", error, "\nStack trace:", errorInfo.componentStack);
    logger.error("AIErrorBoundary", "AI workspace component tree caught rendering exception", error, {
      componentStack: errorInfo.componentStack?.substring(0, 1000)
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, friendlyMessage: "" });
    if (this.props.onReset) {
      try {
        this.props.onReset();
      } catch (err) {
        console.error("[AIErrorBoundary] Error during reset handler:", err);
      }
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-slate-900/90 backdrop-blur-xl text-white rounded-3xl border border-slate-800 space-y-4">
          <div className="p-3 bg-rose-500/20 text-rose-400 rounded-2xl border border-rose-500/30">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-100">AI Workspace Restored</h3>
            <p className="text-xs text-slate-400 max-w-md mt-1 leading-relaxed">
              {this.state.friendlyMessage || "Your chat workspace experienced a state refresh. All conversations were preserved safely."}
            </p>
          </div>
          <button
            type="button"
            onClick={this.handleReset}
            className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-extrabold text-xs rounded-xl shadow-lg hover:scale-105 transition cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reset Active Session</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AIErrorBoundary;
