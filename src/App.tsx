import React from "react";
import RecoveryBoundary from "./components/RecoveryBoundary";
import { AppProviders } from "./providers/AppProviders";
import AppRouter from "./components/AppRouter";

export function App() {
  return (
    <RecoveryBoundary>
      <AppProviders>
        <AppRouter />
      </AppProviders>
    </RecoveryBoundary>
  );
}

export default App;
