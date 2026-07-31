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

// FIX: guest email caching
const getOrCreateGuestEmail = (): string => {
  const cachedEmail = window.localStorage.getItem("studymate_logged_in_email");
  if (cachedEmail) {
    return cachedEmail;
  }
  const randomId = Math.random().toString(36).substring(2, 10);
  return `guest-${randomId}@studymate.app`;
};

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
      // FIX: selective clear only
      window.localStorage.removeItem("studymate_token");
      window.localStorage.removeItem("studymate_refresh_token");
      window.localStorage.removeItem("studymate_remember_me");
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

  const isTokenValid = async (token: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/validate-token", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        return !!data.valid;
      }
    } catch (e) {
      console.warn("Token validation request failed:", e);
    }
    return false;
  };

  useEffect(() => {
    let isMounted = true;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        const cachedToken = window.localStorage.getItem("studymate_token");
        const cachedEmail = window.localStorage.getItem("studymate_logged_in_email");

        if (cachedToken && cachedEmail) {
          let tokenToUse: string | null = null;
          if (await isTokenValid(cachedToken)) {
            tokenToUse = cachedToken;
          } else {
            tokenToUse = await refreshClientToken();
          }

          if (tokenToUse) {
            if (isMounted) {
              setLoggedInEmail(cachedEmail);
              setSessionToken(tokenToUse);
              const cachedRefreshToken = window.localStorage.getItem("studymate_refresh_token");
              if (cachedRefreshToken) {
                setSessionRefreshToken(cachedRefreshToken);
              }
            }
            return;
          }
        }

        if (firebaseUser && firebaseUser.email) {
          const email = firebaseUser.email;
          let idToken = "";
          try {
            idToken = await firebaseUser.getIdToken();
          } catch (tokenErr) {
            console.warn("Could not retrieve fresh Firebase ID token:", tokenErr);
          }

          if (idToken) {
            let res: Response | null = null;
            for (let attempt = 0; attempt < 3; attempt++) {
              try {
                res = await fetch("/api/auth/login", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email, idToken })
                });
                if (res.ok) break;
              } catch (fetchErr) {
                if (attempt === 2) throw fetchErr;
                await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
              }
            }

            if (res && res.ok) {
              const data = await res.json();
              if (isMounted) {
                setLoggedInEmail(data.email);
                setSessionToken(data.token);
                if (data.refreshToken) {
                  setSessionRefreshToken(data.refreshToken);
                }
              }
              window.localStorage.setItem("studymate_remember_me", "true");
              window.localStorage.setItem("studymate_logged_in_email", data.email);
              window.localStorage.setItem("studymate_token", data.token);
              if (data.refreshToken && Capacitor.isNativePlatform()) {
                window.localStorage.setItem("studymate_refresh_token", data.refreshToken);
              }
              return;
            }
          }
        }

        try {
          const emailToUse = getOrCreateGuestEmail();
          const res = await fetch("/api/auth/guest-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: emailToUse })
          });
          if (res.ok) {
            const data = await res.json();
            if (isMounted) {
              setLoggedInEmail(data.email);
              setSessionToken(data.token);
              if (data.refreshToken) {
                setSessionRefreshToken(data.refreshToken);
              }
            }
            window.localStorage.setItem("studymate_logged_in_email", data.email);
            window.localStorage.setItem("studymate_token", data.token);
            if (data.refreshToken && Capacitor.isNativePlatform()) {
              window.localStorage.setItem("studymate_refresh_token", data.refreshToken);
            }
            return;
          }
        } catch (e) {
          console.warn("Auto guest session token provision failed:", e);
        }
      } finally {
        if (isMounted) {
          setBooted(true);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
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
