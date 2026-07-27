import React from "react";
import { ThemeProvider } from "./ThemeProvider";
import { AuthProvider } from "./AuthProvider";
import { NotificationProvider } from "./NotificationProvider";
import { StorageProvider } from "./StorageProvider";

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <StorageProvider>
            {children}
          </StorageProvider>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};
