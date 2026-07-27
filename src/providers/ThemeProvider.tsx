import React, { createContext, useContext, useState, useEffect } from "react";

interface ThemeContextType {
  darkMode: boolean;
  setDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
  handleToggleDarkMode: () => void;
  textSize: "sm" | "md" | "lg";
  setTextSize: React.Dispatch<React.SetStateAction<"sm" | "md" | "lg">>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const savedDark = localStorage.getItem("studymate_dark_mode") === "true";
    if (typeof document !== "undefined") {
      if (savedDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
    return savedDark;
  });

  const [textSize, setTextSize] = useState<"sm" | "md" | "lg">(() => {
    const savedSize = (localStorage.getItem("studymate_text_size") as "sm" | "md" | "lg") || "md";
    if (typeof document !== "undefined") {
      document.documentElement.classList.remove("text-size-sm", "text-size-md", "text-size-lg");
      document.documentElement.classList.add(`text-size-${savedSize}`);
    }
    return savedSize;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("studymate_dark_mode", String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("text-size-sm", "text-size-md", "text-size-lg");
    root.classList.add(`text-size-${textSize}`);
    localStorage.setItem("studymate_text_size", textSize);
  }, [textSize]);

  const handleToggleDarkMode = () => {
    setDarkMode((prev) => !prev);
  };

  return (
    <ThemeContext.Provider
      value={{
        darkMode,
        setDarkMode,
        handleToggleDarkMode,
        textSize,
        setTextSize,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
