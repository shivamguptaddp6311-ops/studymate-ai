import { useState, useRef, useEffect } from "react";

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function useVoice() {
  const [isListening, setIsListening] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  const toggleVoiceInput = (
    onTranscript: (text: string) => void,
    onNotification?: (title: string, text: string, type: "info") => void
  ) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      if (onNotification) {
        onNotification(
          "Voice Input Not Supported",
          "Your browser doesn't support live speech recognition. Try using Chrome or Edge.",
          "info"
        );
      }
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join("");
        onTranscript(transcript);
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Speech recognition launch failed:", err);
      setIsListening(false);
    }
  };

  const speakText = (text: string, msgId: string) => {
    if (!window.speechSynthesis) return;

    const isSpeaking = window.speechSynthesis.speaking || window.speechSynthesis.pending;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      if (speakingMsgId === msgId) {
        setSpeakingMsgId(null);
        return;
      }
    }

    const cleanText = text
      .replace(/[*_#`~]/g, "")
      .replace(/\[(.*?)\]\(.*?\)/g, "$1")
      .trim();

    if (!cleanText) {
      setSpeakingMsgId(null);
      return;
    }

    // Split text into reasonable sentence/phrase chunks to avoid truncation issues in long AI replies
    const rawChunks = cleanText.match(/[^.!?\n]+[.!?\n]*|\n+/g) || [cleanText];
    const chunks: string[] = [];
    let currentChunk = "";

    for (const rawPart of rawChunks) {
      const part = rawPart.trim();
      if (!part) continue;

      if ((currentChunk + " " + part).trim().length <= 200) {
        currentChunk = (currentChunk + " " + part).trim();
      } else {
        if (currentChunk) chunks.push(currentChunk);
        if (part.length > 200) {
          const words = part.split(/\s+/);
          let sub = "";
          for (const word of words) {
            if ((sub + " " + word).trim().length <= 200) {
              sub = (sub + " " + word).trim();
            } else {
              if (sub) chunks.push(sub);
              sub = word;
            }
          }
          if (sub) currentChunk = sub;
          else currentChunk = "";
        } else {
          currentChunk = part;
        }
      }
    }
    if (currentChunk) chunks.push(currentChunk);

    if (chunks.length === 0) {
      chunks.push(cleanText);
    }

    setSpeakingMsgId(msgId);

    chunks.forEach((chunk, index) => {
      const utterance = new SpeechSynthesisUtterance(chunk);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      if (index === chunks.length - 1) {
        utterance.onend = () => setSpeakingMsgId(null);
      }
      utterance.onerror = () => setSpeakingMsgId(null);

      window.speechSynthesis.speak(utterance);
    });
  };

  return {
    isListening,
    speakingMsgId,
    toggleVoiceInput,
    speakText,
  };
}
