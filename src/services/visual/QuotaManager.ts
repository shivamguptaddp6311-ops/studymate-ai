import { ProviderId, QuotaState } from "../../types/visual";
import { db } from "../../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

interface InMemoryQuotaState {
  available: boolean;
  resetTime: number; // ms timestamp
  reason?: string;
}

export class QuotaManager {
  private static memoryState: Map<ProviderId, InMemoryQuotaState> = new Map();

  static async checkQuota(providerId: ProviderId): Promise<QuotaState> {
    const now = Date.now();
    const mem = this.memoryState.get(providerId);

    if (mem) {
      if (!mem.available && now < mem.resetTime) {
        return {
          available: false,
          resetTime: mem.resetTime,
          reason: mem.reason || "Quota exceeded"
        };
      } else if (!mem.available && now >= mem.resetTime) {
        // Reset state
        this.memoryState.delete(providerId);
      }
    }

    // Try checking Firestore persistent quota state
    try {
      if (db) {
        const docRef = doc(db, "provider_quota_state", providerId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.resetTime && now < data.resetTime) {
            this.memoryState.set(providerId, {
              available: false,
              resetTime: data.resetTime,
              reason: data.reason
            });
            return {
              available: false,
              resetTime: data.resetTime,
              reason: data.reason
            };
          }
        }
      }
    } catch (err) {
      // Ignore Firestore quota check error, default to available
    }

    return { available: true };
  }

  static async markQuotaExceeded(providerId: ProviderId, durationMs: number = 86400000, reason?: string): Promise<void> {
    const resetTime = Date.now() + durationMs;
    const state: InMemoryQuotaState = {
      available: false,
      resetTime,
      reason: reason || "Daily quota limit reached (403/429)"
    };

    this.memoryState.set(providerId, state);

    console.warn(`[QuotaManager] Provider '${providerId}' quota marked EXCEEDED until ${new Date(resetTime).toISOString()}. Reason: ${reason}`);

    try {
      if (db) {
        const docRef = doc(db, "provider_quota_state", providerId);
        await setDoc(docRef, {
          providerId,
          available: false,
          resetTime,
          reason: reason || "Daily quota limit reached",
          updatedAt: Date.now()
        }, { merge: true });
      }
    } catch (err) {
      console.warn(`[QuotaManager] Could not persist quota state to Firestore:`, err);
    }
  }

  static isQuotaError(status: number, message?: string): boolean {
    if (status === 429) return true;
    if (status === 403 && message && (message.includes("quota") || message.includes("rateLimitExceeded") || message.includes("Client-ID"))) {
      return true;
    }
    return false;
  }
}
