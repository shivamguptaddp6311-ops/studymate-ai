import { useState, useRef } from "react";
import { UserProfile } from "../types";
import { ChatMessage } from "../components/studymate-ai/types";
import { isImageGenerationRequest } from "../utils/imageIntent";

export function useAI() {
  const [isLoading, setIsLoading] = useState(false);
  const [isWebSearching, setIsWebSearching] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const lastRequestRef = useRef<{
    textToSend: string;
    userMessage: ChatMessage;
    messages: ChatMessage[];
    profile: UserProfile;
    usePersonalization: boolean;
    documentContextPrompt?: string;
    onAddMessage: (msg: ChatMessage) => void;
    onAwardXP?: (amount: number, reason: string) => void;
  } | null>(null);

  const handleCancelRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      setIsGeneratingImage(false);
      setIsWebSearching(false);
      setErrorMessage("Request cancelled successfully by user.");
    }
  };

  const handleRetry = () => {
    if (lastRequestRef.current) {
      setErrorMessage(null);
      handleSendAI(lastRequestRef.current);
    }
  };

  const solveScannedQuestion = async (
    base64Image: string,
    profile: UserProfile,
    onAwardXP?: (amount: number, reason: string) => void,
    onAddMessage?: (msg: ChatMessage) => void
  ) => {
    if (isLoading) return;

    setIsLoading(true);
    setErrorMessage(null);

    const timeoutLimit = Number(localStorage.getItem("studymate_ai_timeout")) || 30000;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutLimit);

    try {
      let token = localStorage.getItem("studymate_token") || window.localStorage.getItem("studymate_token") || "";
      let email = localStorage.getItem("studymate_logged_in_email") || window.localStorage.getItem("studymate_logged_in_email") || `guest-${Date.now()}@studymate.app`;

      if (!token) {
        try {
          const guestRes = await fetch("/api/auth/guest-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
          });
          if (guestRes.ok) {
            const guestData = await guestRes.json();
            token = guestData.token;
            window.localStorage.setItem("studymate_token", token);
            window.localStorage.setItem("studymate_logged_in_email", guestData.email);
          }
        } catch (e) {
          console.warn("Pre-flight solve token fetch failed:", e);
        }
      }

      let res = await fetch("/api/gemini/solve", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        signal: controller.signal,
        body: JSON.stringify({
          image: base64Image,
          grade: profile.classGrade,
          favSubjects: profile.favoriteSubjects,
          weakSubjects: profile.weakSubjects,
          explainBriefly: true,
          provider: localStorage.getItem("studymate_ai_provider") || "auto",
          timeoutMs: timeoutLimit
        })
      });

      if (res.status === 401) {
        try {
          const reauthRes = await fetch("/api/auth/guest-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({ email })
          });
          if (reauthRes.ok) {
            const reauthData = await reauthRes.json();
            token = reauthData.token;
            window.localStorage.setItem("studymate_token", token);
            window.localStorage.setItem("studymate_logged_in_email", reauthData.email);
            res = await fetch("/api/gemini/solve", {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
              },
              signal: controller.signal,
              body: JSON.stringify({
                image: base64Image,
                grade: profile.classGrade,
                favSubjects: profile.favoriteSubjects,
                weakSubjects: profile.weakSubjects,
                explainBriefly: true,
                provider: localStorage.getItem("studymate_ai_provider") || "auto",
                timeoutMs: timeoutLimit
              })
            });
          }
        } catch (e) {}
      }

      clearTimeout(timeoutId);

      if (res.status === 504) throw new Error("The AI partner timed out. Please try again.");
      if (res.status === 499) throw new Error("Request cancelled.");
      if (!res.ok) throw new Error("Failed to contact the StudyMate AI solver.");

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const stepsFormatted = data.steps ? data.steps.join("\n\n") : "";
      const botText = `### 📸 Question Scanned Solution
**Subject:** ${data.subject || "General"} • **Topic:** ${data.topic || "Topic"}

#### Step-by-Step Solution:
${stepsFormatted}

#### Direct Answer:
**${data.finalAnswer || "Solved successfully."}**

#### Concept Breakdown:
${data.conceptualExplanation || ""}`;

      if (onAddMessage) {
        onAddMessage({
          id: `scan-solve-${Date.now()}`,
          role: "model",
          text: botText,
          timestamp: new Date()
        });
      }

      if (onAwardXP) {
        onAwardXP(15, "Scanned & Mastered a question!");
      }

    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error(err);
      if (err.name === "AbortError" || controller.signal.aborted) {
        setErrorMessage("Request timed out or was cancelled.");
      } else {
        setErrorMessage(err.message || "Failed to process question scan.");
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleSendAI = async ({
    textToSend,
    userMessage,
    messages,
    profile,
    usePersonalization,
    documentContextPrompt,
    onAddMessage,
    onAwardXP
  }: {
    textToSend: string;
    userMessage: ChatMessage;
    messages: ChatMessage[];
    profile: UserProfile;
    usePersonalization: boolean;
    documentContextPrompt?: string;
    onAddMessage: (msg: ChatMessage) => void;
    onAwardXP?: (amount: number, reason: string) => void;
  }) => {
    // Save last request for retry capability
    lastRequestRef.current = {
      textToSend,
      userMessage,
      messages,
      profile,
      usePersonalization,
      documentContextPrompt,
      onAddMessage,
      onAwardXP
    };

    setIsLoading(true);
    setErrorMessage(null);

    const isImageGen = isImageGenerationRequest(textToSend);
    if (isImageGen) {
      setIsGeneratingImage(true);
    } else {
      const searchTriggers = [
        "latest", "today", "current", "recent", "newest", "recently", "breaking news",
        "weather", "stock price", "crypto price", "live sports", "sports score",
        "news on", "what happened in", "yesterday", "who won", "current president"
      ];
      const needsSearchPrediction = searchTriggers.some(trigger => textToSend.toLowerCase().includes(trigger));
      setIsWebSearching(needsSearchPrediction);
    }

    const timeoutLimit = Number(localStorage.getItem("studymate_ai_timeout")) || 45000;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutLimit);

    try {
      let token = localStorage.getItem("studymate_token") || window.localStorage.getItem("studymate_token") || "";
      let email = localStorage.getItem("studymate_logged_in_email") || window.localStorage.getItem("studymate_logged_in_email") || `guest-${Date.now()}@studymate.app`;

      if (!token) {
        try {
          const guestRes = await fetch("/api/auth/guest-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
          });
          if (guestRes.ok) {
            const guestData = await guestRes.json();
            token = guestData.token;
            window.localStorage.setItem("studymate_token", token);
            window.localStorage.setItem("studymate_logged_in_email", guestData.email);
          }
        } catch (e) {}
      }

      // --- ROUTING BRANCH 1: IMAGE GENERATION REQUEST ---
      if (isImageGen) {
        const endpoint = "/api/ai/generate-image";
        let response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          signal: controller.signal,
          body: JSON.stringify({
            prompt: textToSend,
            aspectRatio: "1:1",
            quality: "standard",
            provider: localStorage.getItem("studymate_ai_provider") || "auto",
            timeoutMs: timeoutLimit
          })
        });

        if (response.status === 401) {
          try {
            const reauthRes = await fetch("/api/auth/guest-token", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              signal: controller.signal,
              body: JSON.stringify({ email })
            });
            if (reauthRes.ok) {
              const reauthData = await reauthRes.json();
              token = reauthData.token;
              window.localStorage.setItem("studymate_token", token);
              window.localStorage.setItem("studymate_logged_in_email", reauthData.email);
              response = await fetch(endpoint, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${token}`
                },
                signal: controller.signal,
                body: JSON.stringify({
                  prompt: textToSend,
                  aspectRatio: "1:1",
                  quality: "standard",
                  provider: localStorage.getItem("studymate_ai_provider") || "auto",
                  timeoutMs: timeoutLimit
                })
              });
            }
          } catch (e) {}
        }

        clearTimeout(timeoutId);

        if (response.status === 504) throw new Error("Image generation timed out. Please try again.");
        if (response.status === 499) throw new Error("Request cancelled.");
        if (!response.ok) {
          const errBody = await response.json().catch(() => ({}));
          throw new Error(errBody.error || `Failed to generate image (status ${response.status})`);
        }

        const data = await response.json();
        if (data.error) throw new Error(data.error);

        if (!data.imageUrl) {
          throw new Error("No image URL was returned from the image generation providers.");
        }

        // Return generated image inside conversation as an image bubble with NO text
        onAddMessage({
          id: `msg-model-${Date.now()}`,
          role: "model",
          text: "", // Never reply with text when user requested an image
          image: data.imageUrl,
          timestamp: new Date()
        });

        if (onAwardXP) {
          onAwardXP(10, "Generated AI Visual Asset");
        }
        return;
      }

      // --- ROUTING BRANCH 2: NORMAL TEXT / CHAT REQUEST ---
      const recentHistory = messages
        .filter(m => m.id !== "welcome" && m.id !== "welcome-reset")
        .slice(-15)
        .map(m => ({
          role: m.role,
          message: m.text
        }));

      let finalPrompt = textToSend;
      if (documentContextPrompt) {
        finalPrompt = `${documentContextPrompt}\n\n[USER QUESTION]\n${finalPrompt || "Please summarize or answer key insights from the uploaded documents."}`;
      } else if (userMessage.pdf) {
        finalPrompt = `[Attached PDF Document (${userMessage.pdf.source}): "${userMessage.pdf.name}" (${userMessage.pdf.size || "PDF"})]\n\n` + (finalPrompt || "Please analyze this PDF document, summarize key concepts, formulas, and answer any questions from it.");
      }
      if (usePersonalization) {
        finalPrompt += `\n\n[Personalization Context: Student Grade level is "${profile.classGrade}", targeting exam "${profile.targetExam}". Favorite subjects are: ${profile.favoriteSubjects.join(", ") || "None"}. Weak subjects needing extra patient guidance are: ${profile.weakSubjects.join(", ") || "None"}.]`;
      }

      let response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        signal: controller.signal,
        body: JSON.stringify({
          message: finalPrompt,
          history: recentHistory,
          image: userMessage.image || undefined,
          provider: localStorage.getItem("studymate_ai_provider") || "auto",
          timeoutMs: timeoutLimit
        })
      });

      if (response.status === 401) {
        try {
          const reauthRes = await fetch("/api/auth/guest-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({ email })
          });
          if (reauthRes.ok) {
            const reauthData = await reauthRes.json();
            token = reauthData.token;
            window.localStorage.setItem("studymate_token", token);
            window.localStorage.setItem("studymate_logged_in_email", reauthData.email);
            response = await fetch("/api/gemini/chat", {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
              },
              signal: controller.signal,
              body: JSON.stringify({
                message: finalPrompt,
                history: recentHistory,
                image: userMessage.image || undefined,
                provider: localStorage.getItem("studymate_ai_provider") || "auto",
                timeoutMs: timeoutLimit
              })
            });
          }
        } catch (e) {}
      }

      clearTimeout(timeoutId);

      if (response.status === 504) throw new Error("The AI partner timed out. Please try again.");
      if (response.status === 499) throw new Error("Request cancelled.");
      if (!response.ok) throw new Error(`Server returned status ${response.status}`);

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      // If backend redirected to image generation
      if (data.imageUrl && !data.reply) {
        onAddMessage({
          id: `msg-model-${Date.now()}`,
          role: "model",
          text: "",
          image: data.imageUrl,
          timestamp: new Date()
        });
        if (onAwardXP) {
          onAwardXP(10, "Generated AI Visual Asset");
        }
        return;
      }

      const replyText = data.reply || "I apologize, but I was unable to generate a response. Please try again.";

      onAddMessage({
        id: `msg-model-${Date.now()}`,
        role: "model",
        text: replyText,
        image: data.imageUrl || undefined,
        timestamp: new Date(),
        searched: data.searched,
        searchQuery: data.searchQuery,
        sources: data.sources,
        searchError: data.searchError
      });

      if (onAwardXP && textToSend.length > 5) {
        onAwardXP(3, "Studied with StudyMate AI");
      }

    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError" || controller.signal.aborted) {
        setErrorMessage("Request timed out or was cancelled.");
      } else {
        setErrorMessage(err.message || "Failed to communicate with StudyMate AI.");
      }
    } finally {
      setIsLoading(false);
      setIsGeneratingImage(false);
      setIsWebSearching(false);
      abortControllerRef.current = null;
    }
  };

  return {
    isLoading,
    isWebSearching,
    isGeneratingImage,
    errorMessage,
    setErrorMessage,
    handleCancelRequest,
    handleRetry,
    solveScannedQuestion,
    handleSendAI,
  };
}
