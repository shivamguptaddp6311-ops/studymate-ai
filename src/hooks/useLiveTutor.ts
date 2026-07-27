import { useState, useRef, useCallback, useEffect } from "react";

export type ConnectionState = "idle" | "connecting" | "connected" | "error" | "disconnected";

export interface LiveTranscriptItem {
  id: string;
  role: "user" | "ai";
  text: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export function useLiveTutor() {
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0); // 0 to 100 for visualizer
  const [transcripts, setTranscripts] = useState<LiveTranscriptItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Refs for WebSockets, AudioContexts, streams, and playback scheduling
  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const nextStartTimeRef = useRef<number>(0);
  const isMutedRef = useRef(false);
  const isSpeakerMutedRef = useRef(false);

  // Keep ref values in sync with state for callbacks
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    isSpeakerMutedRef.current = isSpeakerMuted;
  }, [isSpeakerMuted]);

  // Utility to convert Float32 audio to 16-bit PCM ArrayBuffer
  const floatTo16BitPCM = (input: Float32Array): ArrayBuffer => {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return output.buffer;
  };

  // Utility to convert ArrayBuffer to base64 string
  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  // Downsample Float32 audio to target sample rate (16kHz) & convert to base64 PCM
  const processAndEncodeAudio = (inputData: Float32Array, inputSampleRate: number): string => {
    const targetSampleRate = 16000;
    if (inputSampleRate === targetSampleRate) {
      return arrayBufferToBase64(floatTo16BitPCM(inputData));
    }
    const ratio = inputSampleRate / targetSampleRate;
    const newLength = Math.floor(inputData.length / ratio);
    const result = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      const origIndex = Math.floor(i * ratio);
      result[i] = inputData[origIndex];
    }
    return arrayBufferToBase64(floatTo16BitPCM(result));
  };

  // Convert base64 24kHz PCM from Gemini into AudioBuffer
  const base64ToAudioBuffer = (
    base64: string,
    audioCtx: AudioContext,
    sampleRate = 24000
  ): AudioBuffer => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const int16Array = new Int16Array(bytes.buffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
    }
    const buffer = audioCtx.createBuffer(1, float32Array.length, sampleRate);
    buffer.getChannelData(0).set(float32Array);
    return buffer;
  };

  // Stop all active AI playback sources (used for interruption / barge-in or end call)
  const stopAndClearPlayback = useCallback(() => {
    activeSourcesRef.current.forEach((src) => {
      try {
        src.stop();
        src.disconnect();
      } catch (e) {}
    });
    activeSourcesRef.current = [];
    if (outputAudioCtxRef.current) {
      nextStartTimeRef.current = outputAudioCtxRef.current.currentTime;
    }
    setIsAiSpeaking(false);
  }, []);

  // Playback an incoming base64 24kHz PCM chunk from Gemini
  const queueAudioChunk = useCallback(
    (base64Data: string) => {
      if (isSpeakerMutedRef.current) return;

      if (!outputAudioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        outputAudioCtxRef.current = new AudioContextClass({ sampleRate: 24000 });
      }

      const audioCtx = outputAudioCtxRef.current;
      if (audioCtx.state === "suspended") {
        audioCtx.resume();
      }

      try {
        const audioBuffer = base64ToAudioBuffer(base64Data, audioCtx, 24000);
        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtx.destination);

        const currentTime = audioCtx.currentTime;
        if (nextStartTimeRef.current < currentTime) {
          nextStartTimeRef.current = currentTime + 0.02;
        }

        source.start(nextStartTimeRef.current);
        nextStartTimeRef.current += audioBuffer.duration;

        activeSourcesRef.current.push(source);
        setIsAiSpeaking(true);

        source.onended = () => {
          const idx = activeSourcesRef.current.indexOf(source);
          if (idx !== -1) {
            activeSourcesRef.current.splice(idx, 1);
          }
          if (activeSourcesRef.current.length === 0) {
            setIsAiSpeaking(false);
          }
        };
      } catch (err) {
        console.error("Error playing AI audio chunk:", err);
      }
    },
    []
  );

  // Append or stream text transcript
  const addTranscript = useCallback((role: "user" | "ai", text: string) => {
    if (!text || !text.trim()) return;
    const cleanText = text.trim();

    setTranscripts((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === role && last.isStreaming) {
        return [
          ...prev.slice(0, -1),
          {
            ...last,
            text: `${last.text} ${cleanText}`.replace(/\s+/g, " ").trim(),
            timestamp: new Date()
          }
        ];
      }
      return [
        ...prev,
        {
          id: `tr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          role,
          text: cleanText,
          timestamp: new Date(),
          isStreaming: true
        }
      ];
    });
  }, []);

  // Mark current active streaming transcripts as complete
  const markTurnComplete = useCallback(() => {
    setTranscripts((prev) =>
      prev.map((item) => (item.isStreaming ? { ...item, isStreaming: false } : item))
    );
  }, []);

  // Disconnect & cleanup call
  const endCall = useCallback(() => {
    stopAndClearPlayback();

    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
        processorRef.current.onaudioprocess = null;
      } catch (e) {}
      processorRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (inputAudioCtxRef.current) {
      try {
        inputAudioCtxRef.current.close();
      } catch (e) {}
      inputAudioCtxRef.current = null;
    }

    if (outputAudioCtxRef.current) {
      try {
        outputAudioCtxRef.current.close();
      } catch (e) {}
      outputAudioCtxRef.current = null;
    }

    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (e) {}
      wsRef.current = null;
    }

    setConnectionState("disconnected");
    setIsUserSpeaking(false);
    setIsAiSpeaking(false);
    setAudioLevel(0);
  }, [stopAndClearPlayback]);

  // Start real-time voice call session
  const startVoiceChat = useCallback(async () => {
    endCall();
    setErrorMessage(null);
    setConnectionState("connecting");

    // 1. Request microphone permission
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMessage("Microphone access is not available in this browser context. Try opening the app in a new window.");
      setConnectionState("error");
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      mediaStreamRef.current = stream;
    } catch (err: any) {
      console.error("Microphone access error:", err);
      let msg = "Microphone access denied. Please allow microphone permissions in browser settings.";
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        msg = "Microphone permission denied. Please allow mic access in your browser site settings or try opening the app in a new tab.";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        msg = "No microphone device detected on your system.";
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        msg = "Microphone is currently in use by another application.";
      }
      setErrorMessage(msg);
      setConnectionState("error");
      return;
    }

    // 2. Set up AudioContext for microphone recording
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const inputCtx = new AudioContextClass();
      inputAudioCtxRef.current = inputCtx;

      const outputCtx = new AudioContextClass({ sampleRate: 24000 });
      outputAudioCtxRef.current = outputCtx;
      nextStartTimeRef.current = outputCtx.currentTime;

      // 3. Establish WebSocket connection to server Live Tutor endpoint
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/api/live-tutor`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[LiveTutor] Client WebSocket connected");
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "ready") {
            setConnectionState("connected");
          } else if (msg.type === "audio" && msg.data) {
            queueAudioChunk(msg.data);
          } else if (msg.type === "ai_transcript" && msg.text) {
            addTranscript("ai", msg.text);
          } else if (msg.type === "user_transcript" && msg.text) {
            addTranscript("user", msg.text);
          } else if (msg.type === "interrupted") {
            // Barge-in: AI was interrupted by user voice
            stopAndClearPlayback();
            markTurnComplete();
          } else if (msg.type === "turn_complete") {
            markTurnComplete();
          } else if (msg.type === "error") {
            setErrorMessage(msg.message || "Voice session encountered an error.");
            setConnectionState("error");
          }
        } catch (e) {
          console.error("Error reading Live Tutor message:", e);
        }
      };

      ws.onerror = (err) => {
        console.error("WebSocket error:", err);
        setErrorMessage("Connection to AI Voice server lost. Retrying...");
        setConnectionState("error");
      };

      ws.onclose = () => {
        console.log("WebSocket closed");
        setConnectionState((prev) => (prev === "connected" ? "disconnected" : prev));
      };

      // 4. Connect microphone audio processor to send audio frames over WebSocket
      const source = inputCtx.createMediaStreamSource(stream);
      const processor = inputCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      source.connect(processor);
      processor.connect(inputCtx.destination);

      processor.onaudioprocess = (e) => {
        const inputBuffer = e.inputBuffer.getChannelData(0);

        // Compute RMS volume level for visualizer & user speaking state
        let sum = 0;
        for (let i = 0; i < inputBuffer.length; i++) {
          sum += inputBuffer[i] * inputBuffer[i];
        }
        const rms = Math.sqrt(sum / inputBuffer.length);
        const level = Math.min(100, Math.round(rms * 400));
        setAudioLevel(level);
        setIsUserSpeaking(level > 15);

        // Send audio PCM if not muted and WS is open
        if (!isMutedRef.current && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          const base64Pcm = processAndEncodeAudio(inputBuffer, inputCtx.sampleRate);
          wsRef.current.send(
            JSON.stringify({
              type: "audio",
              data: base64Pcm
            })
          );
        }
      };
    } catch (err: any) {
      console.error("Voice setup failed:", err);
      setErrorMessage("Failed to start voice tutor session: " + (err.message || err));
      setConnectionState("error");
    }
  }, [endCall, queueAudioChunk, addTranscript, markTurnComplete, stopAndClearPlayback]);

  // Toggle Mute State
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  // Toggle Speaker Mute State
  const toggleSpeakerMute = useCallback(() => {
    setIsSpeakerMuted((prev) => {
      const next = !prev;
      if (next) {
        stopAndClearPlayback();
      }
      return next;
    });
  }, [stopAndClearPlayback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endCall();
    };
  }, [endCall]);

  return {
    connectionState,
    isMuted,
    isSpeakerMuted,
    isAiSpeaking,
    isUserSpeaking,
    audioLevel,
    transcripts,
    errorMessage,
    startVoiceChat,
    endCall,
    toggleMute,
    toggleSpeakerMute,
    clearErrorMessage: () => setErrorMessage(null)
  };
}
