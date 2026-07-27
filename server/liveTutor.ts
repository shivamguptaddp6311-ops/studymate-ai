import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";

export function setupLiveTutorWebSocket(wss: WebSocketServer) {
  wss.on("connection", async (clientWs: WebSocket, req: IncomingMessage) => {
    console.log("[LiveTutor] Client connected to real-time voice tutor");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      clientWs.send(JSON.stringify({
        type: "error",
        message: "Gemini API key is missing on the server. Please check environment variables."
      }));
      clientWs.close();
      return;
    }

    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    let session: any = null;
    let isConnected = false;

    try {
      session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: "You are StudyMate AI, an encouraging, friendly, and highly knowledgeable real-time AI Voice Tutor. Speak concisely, clearly, and engagingly. Guide the student step-by-step with homework, concepts, exam prep, and study tips.",
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            if (clientWs.readyState !== WebSocket.OPEN) return;

            // Handle model turn parts
            if (message.serverContent?.modelTurn?.parts) {
              for (const part of message.serverContent.modelTurn.parts) {
                if (part.inlineData?.data) {
                  clientWs.send(JSON.stringify({
                    type: "audio",
                    data: part.inlineData.data
                  }));
                }
                if (part.text) {
                  clientWs.send(JSON.stringify({
                    type: "ai_transcript",
                    text: part.text
                  }));
                }
              }
            }

            // Output audio transcription
            const outputTrans = (message.serverContent as any)?.outputTranscription || (message.serverContent as any)?.outputAudioTranscription;
            if (outputTrans?.text) {
              clientWs.send(JSON.stringify({
                type: "ai_transcript",
                text: outputTrans.text
              }));
            }

            // User input transcription
            const inputTrans = (message.serverContent as any)?.inputTranscription || (message.serverContent as any)?.inputAudioTranscription;
            if (inputTrans?.text) {
              clientWs.send(JSON.stringify({
                type: "user_transcript",
                text: inputTrans.text
              }));
            }

            // Interruption signal (barge-in triggered)
            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({
                type: "interrupted"
              }));
            }

            // Turn completion
            if (message.serverContent?.turnComplete) {
              clientWs.send(JSON.stringify({
                type: "turn_complete"
              }));
            }
          },
          onerror: (err: any) => {
            console.error("[LiveTutor] Gemini Live session error:", err);
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({
                type: "error",
                message: err.message || "Live session error encountered."
              }));
            }
          },
          onclose: () => {
            console.log("[LiveTutor] Gemini Live session closed");
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: "close" }));
            }
          }
        },
      });

      isConnected = true;
      clientWs.send(JSON.stringify({
        type: "ready",
        message: "Connected to StudyMate AI Live Voice Session"
      }));

    } catch (err: any) {
      console.error("[LiveTutor] Live session connection failed:", err);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({
          type: "error",
          message: err.message || "Unable to establish Gemini Live audio connection."
        }));
        clientWs.close();
      }
      return;
    }

    clientWs.on("message", (raw: any) => {
      if (!isConnected || !session) return;
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "audio" && msg.data) {
          session.sendRealtimeInput({
            audio: { data: msg.data, mimeType: "audio/pcm;rate=16000" },
          });
        } else if (msg.type === "text" && msg.text) {
          session.sendRealtimeInput({
            text: msg.text
          });
        }
      } catch (e) {
        console.error("[LiveTutor] Error reading client message:", e);
      }
    });

    const cleanup = () => {
      isConnected = false;
      if (session) {
        try {
          session.close();
        } catch (e) {}
      }
    };

    clientWs.on("close", cleanup);
    clientWs.on("error", cleanup);
  });
}
