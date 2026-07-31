import React, { createContext, useContext, useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { auth, signOut, onAuthStateChanged } from "../lib/firebase";

interface AuthContextType {
  loggedInEmail: string | null;
  setLoggedInEmail: React.Dispatch<React.SetStateAction<string | null>>;
  sessionToken: string | null;
  setSessionToken: React.Dispatch<React.SetStateAction<string | null>>;
  sessionRefreshToken: string | null;
  booted: boolean;
  setBooted: React.Dispatch<React.SetStateAction<boolean>>;
  handleLoginSuccess: (email: string, token: string, refreshToken?: string, rememberMe?: boolean) => void;
  handleLogout: () => void;
  refreshClientToken: () => Promise<string | null>;
  isRememberMe: () => boolean;
  getStorageKey: (key: string) => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loggedInEmail, setLoggedInEmail] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [sessionRefreshToken, setSessionRefreshToken] = useState<string | null>(null);
  const [booted, setBooted] = useState(false);

  const isRememberMe = () => {
    return window.localStorage.getItem("studymate_remember_me") === "true";
  };

  const getStorageKey = (key: string) => {
    if (!loggedInEmail) return key;
    const dbPrefix = loggedInEmail.replace(/[^a-zA-Z0-9]/g, "_");
    return `${key}_${dbPrefix}`;
  };

  const handleLoginSuccess = (email: string, token: string, refreshToken?: string, rememberMe?: boolean) => {
    if (rememberMe) {
      window.localStorage.setItem("studymate_remember_me", "true");
      window.localStorage.setItem("studymate_logged_in_email", email);
      window.localStorage.setItem("studymate_token", token);
      if (refreshToken && Capacitor.isNativePlatform()) {
        window.localStorage.setItem("studymate_refresh_token", refreshToken);
      }
    } else {
      window.localStorage.clear();
      window.sessionStorage.clear();
    }
    setLoggedInEmail(email);
    setSessionToken(token);
    if (refreshToken) {
      setSessionRefreshToken(refreshToken);
    }
  };

  const handleLogout = () => {
    fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    signOut(auth).catch((e) => console.warn("Firebase signOut error:", e));

    window.localStorage.clear();
    window.sessionStorage.clear();

    setLoggedInEmail(null);
    setSessionToken(null);
    setSessionRefreshToken(null);
  };

  const refreshClientToken = async (): Promise<string | null> => {
    try {
      const storedRefreshToken = sessionRefreshToken || (Capacitor.isNativePlatform() ? window.localStorage.getItem("studymate_refresh_token") : null) || "";
      if (!storedRefreshToken) {
        handleLogout();
        return null;
      }
      
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: storedRefreshToken })
      });
      
      if (res.ok) {
        const data = await res.json();
        setSessionToken(data.token);
        if (data.refreshToken) {
          setSessionRefreshToken(data.refreshToken);
        }
        if (isRememberMe()) {
          window.localStorage.setItem("studymate_token", data.token);
          if (data.refreshToken && Capacitor.isNativePlatform()) {
            window.localStorage.setItem("studymate_refresh_token", data.refreshToken);
          }
        }
        return data.token;
      } else if (res.status === 401 || res.status === 403) {
        console.warn("Refresh token expired or blacklisted. Enforcing clean logout.");
        handleLogout();
      }
    } catch (e) {
      console.warn("Token refresh communication failed:", e);
    }
    return null;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser && firebaseUser.email) {
        try {
          const email = firebaseUser.email;
          let idToken = "";
          try {
            idToken = await firebaseUser.getIdToken();
          } catch (tokenErr) {
            console.warn("Could not retrieve fresh Firebase ID token, using cached session:", tokenErr);
          }
          
          let res: Response | null = null;
          if (idToken) {
            for (let attempt = 0; attempt < 3; attempt++) {
              try {
                res = await fetch("/api/auth/login", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json"
                  },
                  body: JSON.stringify({
                    email,
                    idToken
                  })
                });
                if (res.ok) break;
              } catch (fetchErr) {
                if (attempt === 2) throw fetchErr;
                await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
              }
            }
          }
          
          if (res && res.ok) {
            const data = await res.json();
            setLoggedInEmail(data.email);
            setSessionToken(data.token);
            if (data.refreshToken) {
              setSessionRefreshToken(data.refreshToken);
            }
            window.localStorage.setItem("studymate_remember_me", "true");
            window.localStorage.setItem("studymate_logged_in_email", data.email);
            window.localStorage.setItem("studymate_token", data.token);
            if (data.refreshToken && Capacitor.isNativePlatform()) {
              window.localStorage.setItem("studymate_refresh_token", data.refreshToken);
            }
          } else {
            const cachedEmail = window.localStorage.getItem("studymate_logged_in_email") || email;
            const cachedToken = window.localStorage.getItem("studymate_token");
            if (cachedToken) {
              setLoggedInEmail(cachedEmail);
              setSessionToken(cachedToken);
            } else {
              console.warn("Backend login rejected or no cached token on auto-restore.");
              handleLogout();
            }
          }
        } catch (e) {
          console.warn("Auto restore session operating in offline fallback mode:", e);
          const cachedEmail = window.localStorage.getItem("studymate_logged_in_email");
          const cachedToken = window.localStorage.getItem("studymate_token");
          if (cachedEmail && cachedToken) {
            setLoggedInEmail(cachedEmail);
            setSessionToken(cachedToken);
          }
        } finally {
          setBooted(true);
        }
      } else {
        const cachedEmail = window.localStorage.getItem("studymate_logged_in_email");
        const cachedToken = window.localStorage.getItem("studymate_token");

        if (cachedToken) {
          setLoggedInEmail(cachedEmail || `guest-${Date.now()}@studymate.app`);
          setSessionToken(cachedToken);
        } else {
          try {
            const emailToUse = cachedEmail || `guest-${Date.now()}@studymate.app`;
            const res = await fetch("/api/auth/guest-token", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: emailToUse })
            });
            if (res.ok) {
              const data = await res.json();
              setLoggedInEmail(data.email);
              setSessionToken(data.token);
              if (data.refreshToken) setSessionRefreshToken(data.refreshToken);
              window.localStorage.setItem("studymate_logged_in_email", data.email);
              window.localStorage.setItem("studymate_token", data.token);
              if (data.refreshToken && Capacitor.isNativePlatform()) {
                window.localStorage.setItem("studymate_refresh_token", data.refreshToken);
              }
            }
          } catch (e) {
            console.warn("Auto guest session token provision failed:", e);
          }
        }
        setBooted(true);
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        loggedInEmail,
        setLoggedInEmail,
        sessionToken,
        setSessionToken,
        sessionRefreshToken,
        booted,
        setBooted,
        handleLoginSuccess,
        handleLogout,
        refreshClientToken,
        isRememberMe,
        getStorageKey
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
