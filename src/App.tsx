import React, { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import GlobalErrorBoundary from "./components/GlobalErrorBoundary";
import { AppProviders } from "./providers/AppProviders";
import AppRouter from "./components/AppRouter";
import { setupGlobalErrorMonitoring } from "./utils/logger";

export function App() {
  useEffect(() => {
    const cleanup = setupGlobalErrorMonitoring();

    if (Capacitor.isNativePlatform()) {
      StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
      StatusBar.setStyle({ style: Style.Default }).catch(() => {});
    }

    return cleanup;
  }, []);

  return (
    <GlobalErrorBoundary>
      <AppProviders>
        <AppRouter />
      </AppProviders>
    </GlobalErrorBoundary>
  );
}

export default App;
