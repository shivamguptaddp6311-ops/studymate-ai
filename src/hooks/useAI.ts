import { useState, useRef } from "react";
import { UserProfile } from "../types";
import { ChatMessage } from "../components/studymate-ai/types";
import { isImageGenerationRequest } from "../utils/imageIntent";
import { isVideoGenerationRequest } from "../utils/videoIntent";
import { preprocessImageForOCRAndVision } from "../utils/imageOptimizer";
import { fetchWithRetry } from "../utils/apiClient";
import { VisualContentRouter } from "../services/visual/VisualContentRouter";

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
    onUpdateMessage?: (id: string, updater: (prev: ChatMessage) => ChatMessage) => void;
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
      let imagePayload = base64Image;
      if (imagePayload && imagePayload.startsWith("data:image")) {
        try {
          const preprocessed = await preprocessImageForOCRAndVision(imagePayload, {
            autoRotate: true,
            deskew: true,
            denoise: true,
            improveContrast: true,
            resizeIntelligently: true,
            jpegQuality: 0.88
          });
          imagePayload = preprocessed.processedDataUrl;
        } catch (prepErr) {
          console.warn("[useAI] Preprocessing pipeline error for solveScannedQuestion:", prepErr);
        }
      }

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
          image: imagePayload,
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
    onUpdateMessage,
    onAwardXP
  }: {
    textToSend: string;
    userMessage: ChatMessage;
    messages: ChatMessage[];
    profile: UserProfile;
    usePersonalization: boolean;
    documentContextPrompt?: string;
    onAddMessage: (msg: ChatMessage) => void;
    onUpdateMessage?: (id: string, updater: (prev: ChatMessage) => ChatMessage) => void;
    onAwardXP?: (amount: number, reason: string) => void;
  }) => {
    const reqId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    if (isLoading) {
      console.warn(`[useAI] handleSendAI BLOCKED concurrent call (reqId: ${reqId}, previous request still in flight)`);
      return;
    }

    console.info(`[useAI] START handleSendAI (reqId: ${reqId})`);

    // Save last request for retry capability
    lastRequestRef.current = {
      textToSend,
      userMessage,
      messages,
      profile,
      usePersonalization,
      documentContextPrompt,
      onAddMessage,
      onUpdateMessage,
      onAwardXP
    };

    setIsLoading(true);
    setErrorMessage(null);

    const isVideoGen = isVideoGenerationRequest(textToSend);
    const isImageGen = !isVideoGen && isImageGenerationRequest(textToSend);
    if (isImageGen || isVideoGen) {
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
    }, isVideoGen ? 240000 : timeoutLimit);

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

      // --- ROUTING BRANCH 0: VIDEO GENERATION REQUEST ---
      if (isVideoGen) {
        const videoProviderSetting = localStorage.getItem("studymate_video_provider") || "veo";
        let subRes = await fetch("/api/video/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          signal: controller.signal,
          body: JSON.stringify({
            prompt: textToSend,
            imageUrl: userMessage.image || undefined,
            aspectRatio: "16:9",
            duration: "5s",
            resolution: "720p",
            generateAudio: true,
            preferredProvider: videoProviderSetting
          })
        });

        if (subRes.status === 401) {
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
              subRes = await fetch("/api/video/generate", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${token}`
                },
                signal: controller.signal,
                body: JSON.stringify({
                  prompt: textToSend,
                  imageUrl: userMessage.image || undefined,
                  aspectRatio: "16:9",
                  duration: "5s",
                  resolution: "720p",
                  generateAudio: true,
                  preferredProvider: videoProviderSetting
                })
              });
            }
          } catch (e) {}
        }

        if (!subRes.ok) {
          const errData = await subRes.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to initiate video generation (status ${subRes.status})`);
        }

        const subData = await subRes.json();
        const jobId = subData.jobId;

        // Poll for video completion
        let videoResult: any = null;
        const pollStartTime = Date.now();
        const maxPollMs = 210000; // 3.5 minutes

        while (!videoResult) {
          if (controller.signal.aborted) {
            throw new Error("Video generation request cancelled.");
          }
          if (Date.now() - pollStartTime > maxPollMs) {
            throw new Error("Video generation request timed out during render processing.");
          }

          await new Promise((resolve) => setTimeout(resolve, 4000));

          const statusRes = await fetch(`/api/video/status/${jobId}`, {
            headers: { "Authorization": `Bearer ${token}` },
            signal: controller.signal
          });

          if (statusRes.ok) {
            const statusData = await statusRes.json();
            if (statusData.status === "completed" && statusData.videoUrl) {
              videoResult = statusData;
              break;
            } else if (statusData.status === "failed") {
              throw new Error(statusData.error || "Video generation process failed across available providers.");
            } else if (statusData.status === "cancelled") {
              throw new Error("Video generation process was cancelled.");
            }
          }
        }

        clearTimeout(timeoutId);

        onAddMessage({
          id: `msg-model-${Date.now()}`,
          role: "model",
          text: `🎬 **Video Generated Successfully!**\n\nPrompt: _"${textToSend}"_`,
          videoUrl: videoResult.videoUrl,
          timestamp: new Date()
        });

        if (onAwardXP) {
          onAwardXP(15, "Generated AI Video Asset");
        }
        return;
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
        .filter(m => m.id !== "welcome" && m.id !== "welcome-reset" && m.text && m.text.trim().length > 0)
        .slice(-20)
        .map(m => ({
          role: m.role,
          content: m.text
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

      const assistantMsgId = `msg-model-${Date.now()}`;
      let data: any = null;

      // Attempt SSE Streaming Call
      try {
        const streamRes = await fetch("/api/gemini/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "text/event-stream",
            "Authorization": `Bearer ${token}`
          },
          signal: controller.signal,
          body: JSON.stringify({
            message: finalPrompt,
            history: recentHistory,
            image: userMessage.image || undefined,
            provider: localStorage.getItem("studymate_ai_provider") || "auto",
            stream: true,
            timeoutMs: timeoutLimit
          })
        });

        if (streamRes.ok && streamRes.headers.get("content-type")?.includes("text/event-stream") && streamRes.body) {
          const reader = streamRes.body.getReader();
          const decoder = new TextDecoder("utf-8");
          let buffer = "";
          let accumulatedReply = "";
          let streamDoneData: any = {};

          onAddMessage({
            id: assistantMsgId,
            role: "model",
            text: "",
            image: userMessage.image || undefined,
            timestamp: new Date()
          });

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data:")) continue;
              const jsonStr = trimmed.replace(/^data:\s*/, "");
              try {
                const parsed = JSON.parse(jsonStr);
                if (parsed.chunk) {
                  accumulatedReply += parsed.chunk;
                  if (onUpdateMessage) {
                    onUpdateMessage(assistantMsgId, prev => ({ ...prev, text: accumulatedReply }));
                  }
                }
                if (parsed.done) {
                  streamDoneData = parsed;
                }
              } catch (e) {
                // Ignore chunk parse errors
              }
            }
          }

          clearTimeout(timeoutId);

          // Immediately update message content from SSE stream
          if (onUpdateMessage) {
            onUpdateMessage(assistantMsgId, prev => ({
              ...prev,
              text: accumulatedReply || streamDoneData.reply || prev.text,
              searched: streamDoneData.searched,
              searchQuery: streamDoneData.searchQuery,
              sources: streamDoneData.sources,
              searchError: streamDoneData.searchError
            }));
          }

          if (onAwardXP && textToSend.length > 5) {
            onAwardXP(3, "Studied with StudyMate AI");
          }

          // Crucial: Clear loading flags immediately so UI loading indicator vanishes
          setIsLoading(false);
          setIsGeneratingImage(false);
          setIsWebSearching(false);

          // Run VisualContentRouter asynchronously in background without blocking loading indicator
          VisualContentRouter.route(textToSend)
            .then((visualResult) => {
              if (visualResult && onUpdateMessage) {
                onUpdateMessage(assistantMsgId, prev => ({
                  ...prev,
                  visualResult
                }));
              }
            })
            .catch((vErr) => {
              console.warn("[useAI] VisualContentRouter failed quietly:", vErr);
            });

          return;
        }
      } catch (streamErr: any) {
        console.warn("[useAI] SSE streaming attempt encountered issue, trying standard fetch:", streamErr?.message || streamErr);
      }

      // Fallback Non-Streaming JSON Call
      try {
        data = await fetchWithRetry<{
          error?: string;
          reply?: string;
          imageUrl?: string;
          searched?: boolean;
          searchQuery?: string;
          sources?: any[];
          searchError?: string;
        }>("/api/gemini/chat", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          signal: controller.signal,
          timeoutMs: timeoutLimit,
          retries: 2,
          body: JSON.stringify({
            message: finalPrompt,
            history: recentHistory,
            image: userMessage.image || undefined,
            provider: localStorage.getItem("studymate_ai_provider") || "auto",
            timeoutMs: timeoutLimit
          })
        });
      } catch (err: any) {
        if (err?.message?.includes("401") || err?.message?.toLowerCase().includes("unauthorized")) {
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
              data = await fetchWithRetry<{
                error?: string;
                reply?: string;
                imageUrl?: string;
                searched?: boolean;
                searchQuery?: string;
                sources?: any[];
                searchError?: string;
              }>("/api/gemini/chat", {
                method: "POST",
                headers: { 
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${token}`
                },
                signal: controller.signal,
                timeoutMs: timeoutLimit,
                retries: 2,
                body: JSON.stringify({
                  message: finalPrompt,
                  history: recentHistory,
                  image: userMessage.image || undefined,
                  provider: localStorage.getItem("studymate_ai_provider") || "auto",
                  timeoutMs: timeoutLimit
                })
              });
            } else {
              throw err;
            }
          } catch (e) {
            throw err;
          }
        } else {
          throw err;
        }
      }

      clearTimeout(timeoutId);

      if (data.error) throw new Error(data.error);

      // If backend redirected to image generation
      if (data.imageUrl && !data.reply) {
        onAddMessage({
          id: assistantMsgId,
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

      let visualResult = data.visualResult || null;
      if (!visualResult) {
        try {
          visualResult = await VisualContentRouter.route(textToSend);
        } catch (vErr) {
          console.warn("[useAI] VisualContentRouter failed quietly:", vErr);
        }
      }

      onAddMessage({
        id: assistantMsgId,
        role: "model",
        text: replyText,
        image: data.imageUrl || undefined,
        visualResult: visualResult || undefined,
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
      console.info(`[useAI] END handleSendAI finally (reqId: ${reqId})`);
      setIsLoading(false);
      setIsGeneratingImage(false);
      setIsWebSearching(false);
      abortControllerRef.current = null;
    }
  };

  const onRequestVideoLesson = (
    messageId: string,
    topicText: string,
    onAddMessage: (msg: ChatMessage) => void
  ) => {
    const lines = topicText.split("\n").map(l => l.replace(/^[#*\-\s]+/, "").trim()).filter(Boolean);
    const cleanTopic = (lines[0] || topicText).slice(0, 100);

    const pickerMsg: ChatMessage = {
      id: `msg-picker-${Date.now()}`,
      role: "model",
      text: `🎬 **Video Lesson Setup**: Choose settings below to generate a video lesson.`,
      videoSettingsPicker: {
        topic: cleanTopic,
        forMessageId: messageId
      },
      timestamp: new Date()
    };
    onAddMessage(pickerMsg);
  };

  const onSubmitVideoSettings = async (
    forMessageId: string,
    settings: any,
    messages: ChatMessage[],
    onUpdateMessage: (msgId: string, updater: (prev: ChatMessage) => ChatMessage) => void,
    onAddMessage: (msg: ChatMessage) => void
  ) => {
    const pickerMsg = messages.find(m => m.videoSettingsPicker?.forMessageId === forMessageId || m.id === forMessageId);
    const targetMsgId = pickerMsg ? pickerMsg.id : `msg-video-lecture-${Date.now()}`;

    if (!pickerMsg) {
      onAddMessage({
        id: targetMsgId,
        role: "model",
        text: `🎬 **Video Lesson**: Generating "${settings.topic}"...`,
        timestamp: new Date()
      });
    } else {
      onUpdateMessage(targetMsgId, (m) => ({
        ...m,
        text: `🎬 **Video Lesson**: Generating "${settings.topic}"...`,
        videoSettingsPicker: undefined
      }));
    }

    try {
      const sourceMsg = messages.find(m => m.id === forMessageId);
      const sourceText = sourceMsg?.text || settings.topic;

      const res = await fetch("/api/video/lecture/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: settings.topic,
          sourceText,
          settings
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to plan video lecture.");
      }

      const planData = await res.json();
      const jobId = planData.jobId;
      const initialSegments = planData.segments || [];

      onUpdateMessage(targetMsgId, (m) => ({
        ...m,
        lectureJobId: jobId,
        videoSegments: initialSegments
      }));

      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/video/lecture/status/${jobId}`);
          if (!statusRes.ok) return;

          const statusData = await statusRes.json();
          if (statusData.segments) {
            onUpdateMessage(targetMsgId, (m) => ({
              ...m,
              videoSegments: statusData.segments
            }));
          }

          const isFinished = statusData.status === "completed" || 
                             statusData.status === "failed" || 
                             statusData.status === "cancelled" ||
                             (statusData.segments && statusData.segments.every((s: any) => s.status === "completed" || s.status === "failed"));

          if (isFinished) {
            clearInterval(pollInterval);
          }
        } catch (pollErr) {
          console.warn("[VideoLecture] Polling error:", pollErr);
        }
      }, 3500);

    } catch (err: any) {
      onUpdateMessage(targetMsgId, (m) => ({
        ...m,
        text: `⚠️ Video lesson generation failed: ${err.message || err}`,
        videoSettingsPicker: undefined
      }));
    }
  };

  const onCancelVideoLecture = async (
    jobId: string,
    messageId: string,
    onUpdateMessage: (msgId: string, updater: (prev: ChatMessage) => ChatMessage) => void
  ) => {
    try {
      await fetch(`/api/video/lecture/cancel/${jobId}`, { method: "POST" });
    } catch (e) {
      console.warn("Cancel request error:", e);
    }
    onUpdateMessage(messageId, (m) => ({
      ...m,
      videoSegments: m.videoSegments?.map(s => 
        (s.status === "pending" || s.status === "generating") ? { ...s, status: "failed" } : s
      )
    }));
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
    onRequestVideoLesson,
    onSubmitVideoSettings,
    onCancelVideoLecture
  };
}
