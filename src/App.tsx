import React, { useEffect } from "react";
import GlobalErrorBoundary from "./components/GlobalErrorBoundary";
import { AppProviders } from "./providers/AppProviders";
import AppRouter from "./components/AppRouter";
import { setupGlobalErrorMonitoring } from "./utils/logger";

export function App() {
  useEffect(() => {
    const cleanup = setupGlobalErrorMonitoring();
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
