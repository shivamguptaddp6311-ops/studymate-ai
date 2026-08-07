import { VisualResult, ProviderId, VisualIntent } from "../../types/visual";
import { db } from "../../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { normalizeQuery } from "../../utils/queryNormalizer";

const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days TTL

export interface FirestoreCacheDoc {
  id: string;
  queryHash: string;
  normalizedQuery: string;
  provider: ProviderId;
  query: string;
  response: VisualResult;
  license: string;
  author: string;
  createdAt: number;
  expiresAt: number;
  version: string;
}

export class CacheManager {
  private static localMemoryCache: Map<string, FirestoreCacheDoc> = new Map();

  private static getCacheDocId(queryHash: string): string {
    return `vcache_${queryHash}`;
  }

  static async get(query: string): Promise<VisualResult | null> {
    if (!query) return null;

    const { normalizedQuery, queryHash } = normalizeQuery(query);
    const docId = this.getCacheDocId(queryHash);
    const now = Date.now();

    // 1. Check memory cache
    const memDoc = this.localMemoryCache.get(docId);
    if (memDoc) {
      if (memDoc.expiresAt && memDoc.expiresAt > now) {
        console.log(`[CacheManager] Memory cache hit for normalized query: "${normalizedQuery}"`);
        return memDoc.response;
      }
      this.localMemoryCache.delete(docId);
    }

    // 2. Check localStorage cache
    try {
      const lsRaw = localStorage.getItem(docId);
      if (lsRaw) {
        const parsed: FirestoreCacheDoc = JSON.parse(lsRaw);
        if (parsed.expiresAt && parsed.expiresAt > now) {
          this.localMemoryCache.set(docId, parsed);
          console.log(`[CacheManager] localStorage cache hit for normalized query: "${normalizedQuery}"`);
          return parsed.response;
        }
        localStorage.removeItem(docId);
      }
    } catch (e) {
      // Ignore localStorage errors
    }

    // 3. Check Firestore visual_cache collection
    try {
      if (db) {
        const docRef = doc(db, "visual_cache", docId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data() as FirestoreCacheDoc;
          if (data.expiresAt && data.expiresAt > now) {
            this.localMemoryCache.set(docId, data);
            console.log(`[CacheManager] Firestore cache hit for document: ${docId} ("${normalizedQuery}")`);
            return data.response;
          }
        }
      }
    } catch (err) {
      console.warn(`[CacheManager] Firestore cache check failed quietly:`, err);
    }

    return null;
  }

  static async set(query: string, provider: ProviderId, intent: VisualIntent, result: VisualResult): Promise<void> {
    if (!query || !result) return;

    const { normalizedQuery, queryHash } = normalizeQuery(query);
    const docId = this.getCacheDocId(queryHash);
    const createdAt = Date.now();
    const expiresAt = createdAt + TTL_MS;

    const cacheDoc: FirestoreCacheDoc = {
      id: docId,
      queryHash,
      normalizedQuery,
      provider: result.provider || provider,
      query,
      response: {
        ...result,
        cachedAt: createdAt
      },
      license: result.license || "Educational / Public Domain",
      author: result.author || "StudyMate Content Engine",
      createdAt,
      expiresAt,
      version: "1.0"
    };

    // Save to memory
    this.localMemoryCache.set(docId, cacheDoc);

    // Save to localStorage
    try {
      localStorage.setItem(docId, JSON.stringify(cacheDoc));
    } catch (e) {
      // Ignore quota errors
    }

    // Save to Firestore visual_cache collection
    try {
      if (db) {
        const docRef = doc(db, "visual_cache", docId);
        await setDoc(docRef, cacheDoc, { merge: true });
        console.log(`[CacheManager] Saved visual_cache document in Firestore for key: ${docId}`);
      }
    } catch (err) {
      console.warn(`[CacheManager] Could not save cache to Firestore:`, err);
    }
  }
}
