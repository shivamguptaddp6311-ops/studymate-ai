import React, { Component, ErrorInfo, ReactNode } from "react";
import PremiumErrorCard from "./PremiumErrorCard";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class RecoveryBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[Uncaught Error in Component Tree]", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleGoBack = () => {
    this.setState({ hasError: false, error: null });
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "/";
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 text-center select-none font-sans">
          <PremiumErrorCard
            type="general"
            title="Application Interface Interrupted"
            description="An unexpected interface boundary error occurred. Don't worry, your study statistics and saved notes remain safe in cloud memory."
            error={this.state.error}
            onRetry={this.handleReset}
            onGoBack={this.handleGoBack}
          />
        </div>
      );
    }

    return this.props.children;
  }
}

