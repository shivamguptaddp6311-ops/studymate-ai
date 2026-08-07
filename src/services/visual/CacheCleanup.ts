import { db } from "../../lib/firebase";
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";

/**
 * Scheduled Daily Cleanup Task for Firestore `visual_cache`
 * Deletes documents where `expiresAt < Date.now()` to control storage cost and bloat.
 */
export class CacheCleanup {
  private static isRunning = false;

  static async runCleanup(): Promise<number> {
    if (this.isRunning || !db) return 0;
    this.isRunning = true;

    let deletedCount = 0;
    try {
      const now = Date.now();
      const cacheRef = collection(db, "visual_cache");
      const expiredQuery = query(cacheRef, where("expiresAt", "<", now));
      const snap = await getDocs(expiredQuery);

      if (!snap.empty) {
        const deletePromises = snap.docs.map(d => deleteDoc(doc(db, "visual_cache", d.id)));
        await Promise.all(deletePromises);
        deletedCount = snap.docs.length;
        console.log(`[CacheCleanup] Cleaned up ${deletedCount} expired visual_cache documents from Firestore.`);
      }
    } catch (err) {
      console.warn("[CacheCleanup] Cache cleanup task error:", err);
    } finally {
      this.isRunning = false;
    }

    return deletedCount;
  }
}

// Trigger daily cleanup interval (every 24 hours)
if (typeof window !== "undefined") {
  setTimeout(() => {
    CacheCleanup.runCleanup().catch(() => {});
  }, 10000); // Run 10s after app boot

  setInterval(() => {
    CacheCleanup.runCleanup().catch(() => {});
  }, 24 * 60 * 60 * 1000); // Repeat every 24 hours
}
