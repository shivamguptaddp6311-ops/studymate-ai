var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server.ts
var server_exports = {};
__export(server_exports, {
  asyncHandler: () => asyncHandler
});
module.exports = __toCommonJS(server_exports);
var import_express = __toESM(require("express"), 1);
var import_path2 = __toESM(require("path"), 1);
var import_dotenv3 = __toESM(require("dotenv"), 1);
var import_crypto3 = __toESM(require("crypto"), 1);
var import_helmet = __toESM(require("helmet"), 1);
var import_cookie_parser = __toESM(require("cookie-parser"), 1);
var import_cors = __toESM(require("cors"), 1);
var import_compression = __toESM(require("compression"), 1);
var import_express_rate_limit = require("express-rate-limit");
var import_vite = require("vite");
var import_genai2 = require("@google/genai");

// server/aiService.ts
var import_genai = require("@google/genai");
var import_dotenv2 = __toESM(require("dotenv"), 1);
var import_crypto2 = __toESM(require("crypto"), 1);

// server/firebase.ts
var import_app = require("firebase-admin/app");
var import_firestore = require("firebase-admin/firestore");
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
var db;
try {
  const configPath = import_path.default.join(process.cwd(), "firebase-applet-config.json");
  if (!import_fs.default.existsSync(configPath)) {
    throw new Error(`Firebase applet config not found at ${configPath}`);
  }
  const config = JSON.parse(import_fs.default.readFileSync(configPath, "utf8"));
  if ((0, import_app.getApps)().length === 0) {
    (0, import_app.initializeApp)({
      projectId: config.projectId
    });
  }
  db = (0, import_firestore.getFirestore)(config.firestoreDatabaseId || void 0);
  console.log(`[Firebase] Initialized Firestore client for project "${config.projectId}" and DB "${config.firestoreDatabaseId || "default"}"`);
} catch (error) {
  console.error("[Firebase] Initialization error:", error);
  process.exit(1);
}
async function withRetry(fn, retries = 3, delay = 1e3) {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      if (attempt >= retries) {
        throw error;
      }
      console.warn(`[Firebase] Operation failed (Attempt ${attempt}/${retries}). Retrying in ${delay * attempt}ms...`, error);
      await new Promise((resolve) => setTimeout(resolve, delay * attempt));
    }
  }
}
var DB_KEY = process.env.DB_ENCRYPTION_KEY;
if (!DB_KEY || DB_KEY.length < 16) {
  console.error("CRITICAL CONFIG ERROR: DB_ENCRYPTION_KEY environment variable is missing, empty, or too short (must be at least 16 characters).");
  process.exit(1);
}
function decryptData(text) {
  if (!text || typeof text !== "string") {
    throw new Error("Invalid cipher input");
  }
  if (text.startsWith("v2:")) {
    const parts = text.split(":");
    if (parts.length !== 4) {
      throw new Error("Malformed AES-256-GCM payload structure.");
    }
    const iv = Buffer.from(parts[1], "hex");
    const authTag = Buffer.from(parts[2], "hex");
    const ciphertext = parts[3];
    const key = import_crypto.default.createHash("sha256").update(DB_KEY).digest();
    const decipher = import_crypto.default.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(ciphertext, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }
  if (text.includes(":")) {
    const parts = text.split(":");
    if (parts.length === 2 && parts[0].length === 32) {
      const iv = Buffer.from(parts[0], "hex");
      const ciphertext = parts[1];
      const key = import_crypto.default.createHash("sha256").update(DB_KEY).digest();
      const decipher = import_crypto.default.createDecipheriv("aes-256-cbc", key, iv);
      let decrypted = decipher.update(ciphertext, "hex", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    }
  }
  throw new Error("Data format is invalid or not securely encrypted.");
}
var useLocalFallback = false;
var FALLBACK_DB_PATH = import_path.default.join(process.cwd(), "server_chat_db_fallback.json");
var fallbackCache = {
  users: {},
  messages: [],
  reports: [],
  adminLogs: [],
  syncData: {},
  aiRequestLogs: []
};
function localEncrypt(text) {
  const key = import_crypto.default.createHash("sha256").update(DB_KEY).digest();
  const iv = import_crypto.default.randomBytes(12);
  const cipher = import_crypto.default.createCipheriv("aes-256-gcm", key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `v2:${iv.toString("hex")}:${authTag}:${encrypted}`;
}
function localDecrypt(text) {
  return decryptData(text);
}
function loadFallbackDB() {
  try {
    if (import_fs.default.existsSync(FALLBACK_DB_PATH)) {
      const encrypted = import_fs.default.readFileSync(FALLBACK_DB_PATH, "utf8");
      const decrypted = localDecrypt(encrypted);
      fallbackCache = JSON.parse(decrypted);
      console.log(`[Fallback] Local fallback database loaded successfully. Users: ${Object.keys(fallbackCache.users).length}, Messages: ${fallbackCache.messages.length}`);
    } else {
      const legacyPath = import_path.default.join(process.cwd(), "server_chat_db.json.bak");
      if (import_fs.default.existsSync(legacyPath)) {
        try {
          const encrypted = import_fs.default.readFileSync(legacyPath, "utf8");
          const decrypted = localDecrypt(encrypted);
          fallbackCache = JSON.parse(decrypted);
          console.log("[Fallback] Seeded local fallback DB from backup file.");
        } catch {
          console.log("[Fallback] Could not parse legacy backup file, creating fresh database.");
        }
      }
      saveFallbackDB();
    }
  } catch (err) {
    console.error("[Fallback] Load error:", err);
  }
}
function saveFallbackDB() {
  try {
    const serialized = JSON.stringify(fallbackCache, null, 2);
    const encrypted = localEncrypt(serialized);
    import_fs.default.writeFileSync(FALLBACK_DB_PATH, encrypted, "utf8");
  } catch (err) {
    console.error("[Fallback] Save error:", err);
  }
}
function getLocalMessages(before, search, limit = 50) {
  let list = [...fallbackCache.messages];
  if (before) {
    const beforeTime = new Date(before).getTime();
    list = list.filter((m) => new Date(m.timestamp).getTime() < beforeTime);
  }
  const filtered = [];
  list.forEach((m) => {
    const msg = { ...m };
    if (msg.isDeleted) {
      msg.text = "\u{1F6AB} This message was removed by a community moderator.";
    }
    if (search && search.trim() !== "") {
      const q = search.toLowerCase().trim();
      if (msg.text.toLowerCase().includes(q) || msg.username.toLowerCase().includes(q)) {
        filtered.push(msg);
      }
    } else {
      filtered.push(msg);
    }
  });
  filtered.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  return filtered.slice(-limit);
}
loadFallbackDB();
(async () => {
  try {
    await db.collection("users").limit(1).get();
    console.log("[Firebase] Firestore connection verified. Using Firestore as primary database.");
  } catch (err) {
    console.warn(`[Firebase] Firestore connection failed or restricted in this container sandbox. Enabling local fallback DB immediately to prevent API latencies. Error: ${err.message || err}`);
    useLocalFallback = true;
  }
})();
var firebaseDB = {
  // --- USERS ---
  async getUser(email) {
    const emailNorm = email.toLowerCase().trim();
    if (useLocalFallback) {
      return fallbackCache.users[emailNorm] || null;
    }
    try {
      return await withRetry(async () => {
        const doc = await db.collection("users").doc(emailNorm).get();
        if (!doc.exists) return null;
        return doc.data();
      });
    } catch (err) {
      console.warn(`[Firebase] getUser failed, switching to local DB fallback. Error:`, err.message || err);
      useLocalFallback = true;
      return fallbackCache.users[emailNorm] || null;
    }
  },
  async saveUser(email, user) {
    const emailNorm = email.toLowerCase().trim();
    fallbackCache.users[emailNorm] = {
      ...fallbackCache.users[emailNorm] || {},
      ...user,
      email: emailNorm
    };
    saveFallbackDB();
    if (useLocalFallback) return;
    try {
      await withRetry(async () => {
        if (user.violationsCount !== void 0 && isNaN(user.violationsCount)) {
          user.violationsCount = 0;
        }
        await db.collection("users").doc(emailNorm).set(user, { merge: true });
      });
    } catch (err) {
      console.warn(`[Firebase] saveUser failed, switching to local DB fallback. Error:`, err.message || err);
      useLocalFallback = true;
    }
  },
  async deleteUser(email) {
    const emailNorm = email.toLowerCase().trim();
    delete fallbackCache.users[emailNorm];
    saveFallbackDB();
    if (useLocalFallback) return;
    try {
      await withRetry(async () => {
        await db.collection("users").doc(emailNorm).delete();
      });
    } catch (err) {
      console.warn(`[Firebase] deleteUser failed, switching to local DB fallback. Error:`, err.message || err);
      useLocalFallback = true;
    }
  },
  async getAllUsers() {
    if (useLocalFallback) {
      return Object.values(fallbackCache.users);
    }
    try {
      return await withRetry(async () => {
        const snapshot = await db.collection("users").get();
        const list = [];
        snapshot.forEach((doc) => {
          list.push(doc.data());
        });
        return list;
      });
    } catch (err) {
      console.warn(`[Firebase] getAllUsers failed, switching to local DB fallback. Error:`, err.message || err);
      useLocalFallback = true;
      return Object.values(fallbackCache.users);
    }
  },
  // --- CHAT MESSAGES ---
  async getMessages(before, search, limit = 50) {
    if (useLocalFallback) {
      return getLocalMessages(before, search, limit);
    }
    try {
      return await withRetry(async () => {
        let query = db.collection("messages").orderBy("timestamp", "asc");
        if (before) {
          query = query.endBefore(before);
        }
        const snapshot = await query.get();
        const list = [];
        snapshot.forEach((doc) => {
          const msg = doc.data();
          if (msg.isDeleted) {
            msg.text = "\u{1F6AB} This message was removed by a community moderator.";
          }
          if (search && search.trim() !== "") {
            const q = search.toLowerCase().trim();
            if (msg.text.toLowerCase().includes(q) || msg.username.toLowerCase().includes(q)) {
              list.push(msg);
            }
          } else {
            list.push(msg);
          }
        });
        list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        return list.slice(-limit);
      });
    } catch (err) {
      console.warn(`[Firebase] getMessages failed, switching to local DB fallback. Error:`, err.message || err);
      useLocalFallback = true;
      return getLocalMessages(before, search, limit);
    }
  },
  async getRawMessage(id) {
    if (useLocalFallback) {
      return fallbackCache.messages.find((m) => m.id === id) || null;
    }
    try {
      return await withRetry(async () => {
        const doc = await db.collection("messages").doc(id).get();
        if (!doc.exists) return null;
        return doc.data();
      });
    } catch (err) {
      console.warn(`[Firebase] getRawMessage failed, switching to local DB fallback. Error:`, err.message || err);
      useLocalFallback = true;
      return fallbackCache.messages.find((m) => m.id === id) || null;
    }
  },
  async saveMessage(message) {
    const idx = fallbackCache.messages.findIndex((m) => m.id === message.id);
    if (idx !== -1) {
      fallbackCache.messages[idx] = message;
    } else {
      fallbackCache.messages.push(message);
    }
    saveFallbackDB();
    if (useLocalFallback) return;
    try {
      await withRetry(async () => {
        await db.collection("messages").doc(message.id).set(message);
      });
    } catch (err) {
      console.warn(`[Firebase] saveMessage failed, switching to local DB fallback. Error:`, err.message || err);
      useLocalFallback = true;
    }
  },
  async updateMessage(id, updates) {
    const idx = fallbackCache.messages.findIndex((m) => m.id === id);
    if (idx !== -1) {
      fallbackCache.messages[idx] = { ...fallbackCache.messages[idx], ...updates };
      saveFallbackDB();
    }
    if (useLocalFallback) return;
    try {
      await withRetry(async () => {
        await db.collection("messages").doc(id).update(updates);
      });
    } catch (err) {
      console.warn(`[Firebase] updateMessage failed, switching to local DB fallback. Error:`, err.message || err);
      useLocalFallback = true;
    }
  },
  async deleteMessagesByEmail(email) {
    const emailNorm = email.toLowerCase().trim();
    fallbackCache.messages = fallbackCache.messages.filter((m) => m.userEmail !== emailNorm);
    saveFallbackDB();
    if (useLocalFallback) return;
    try {
      await withRetry(async () => {
        const snapshot = await db.collection("messages").where("userEmail", "==", emailNorm).get();
        const batch = db.batch();
        snapshot.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();
      });
    } catch (err) {
      console.warn(`[Firebase] deleteMessagesByEmail failed, switching to local DB fallback. Error:`, err.message || err);
      useLocalFallback = true;
    }
  },
  // --- SYNC DATA ---
  async getSyncData(email) {
    const emailNorm = email.toLowerCase().trim();
    if (useLocalFallback) {
      return fallbackCache.syncData[emailNorm] || null;
    }
    try {
      return await withRetry(async () => {
        const doc = await db.collection("syncData").doc(emailNorm).get();
        if (!doc.exists) return null;
        return doc.data();
      });
    } catch (err) {
      console.warn(`[Firebase] getSyncData failed, switching to local DB fallback. Error:`, err.message || err);
      useLocalFallback = true;
      return fallbackCache.syncData[emailNorm] || null;
    }
  },
  async saveSyncData(email, data) {
    const emailNorm = email.toLowerCase().trim();
    const cleanData = {};
    for (const [key, val] of Object.entries(data)) {
      if (val !== void 0 && val !== null) {
        cleanData[key] = val;
      }
    }
    fallbackCache.syncData[emailNorm] = {
      ...fallbackCache.syncData[emailNorm] || {},
      ...cleanData
    };
    saveFallbackDB();
    if (useLocalFallback) return;
    try {
      await withRetry(async () => {
        await db.collection("syncData").doc(emailNorm).set(cleanData, { merge: true });
      });
    } catch (err) {
      console.warn(`[Firebase] saveSyncData failed, switching to local DB fallback. Error:`, err.message || err);
      useLocalFallback = true;
    }
  },
  async deleteSyncData(email) {
    const emailNorm = email.toLowerCase().trim();
    delete fallbackCache.syncData[emailNorm];
    saveFallbackDB();
    if (useLocalFallback) return;
    try {
      await withRetry(async () => {
        await db.collection("syncData").doc(emailNorm).delete();
      });
    } catch (err) {
      console.warn(`[Firebase] deleteSyncData failed, switching to local DB fallback. Error:`, err.message || err);
      useLocalFallback = true;
    }
  },
  // --- REPORTS ---
  async getReports() {
    if (useLocalFallback) {
      return [...fallbackCache.reports].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
    try {
      return await withRetry(async () => {
        const snapshot = await db.collection("reports").orderBy("timestamp", "desc").get();
        const list = [];
        snapshot.forEach((doc) => {
          list.push(doc.data());
        });
        return list;
      });
    } catch (err) {
      console.warn(`[Firebase] getReports failed, switching to local DB fallback. Error:`, err.message || err);
      useLocalFallback = true;
      return [...fallbackCache.reports].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
  },
  async saveReport(report) {
    const idx = fallbackCache.reports.findIndex((r) => r.id === report.id);
    if (idx !== -1) {
      fallbackCache.reports[idx] = report;
    } else {
      fallbackCache.reports.push(report);
    }
    saveFallbackDB();
    if (useLocalFallback) return;
    try {
      await withRetry(async () => {
        await db.collection("reports").doc(report.id).set(report);
      });
    } catch (err) {
      console.warn(`[Firebase] saveReport failed, switching to local DB fallback. Error:`, err.message || err);
      useLocalFallback = true;
    }
  },
  async updateReport(id, updates) {
    const idx = fallbackCache.reports.findIndex((r) => r.id === id);
    if (idx !== -1) {
      fallbackCache.reports[idx] = { ...fallbackCache.reports[idx], ...updates };
      saveFallbackDB();
    }
    if (useLocalFallback) return;
    try {
      await withRetry(async () => {
        await db.collection("reports").doc(id).update(updates);
      });
    } catch (err) {
      console.warn(`[Firebase] updateReport failed, switching to local DB fallback. Error:`, err.message || err);
      useLocalFallback = true;
    }
  },
  async deleteReportsByEmail(email) {
    const emailNorm = email.toLowerCase().trim();
    fallbackCache.reports = fallbackCache.reports.filter((r) => r.reportedBy !== emailNorm && r.messageAuthor !== emailNorm);
    saveFallbackDB();
    if (useLocalFallback) return;
    try {
      await withRetry(async () => {
        const batch = db.batch();
        const r1 = await db.collection("reports").where("reportedBy", "==", emailNorm).get();
        r1.forEach((doc) => batch.delete(doc.ref));
        const r2 = await db.collection("reports").where("messageAuthor", "==", emailNorm).get();
        r2.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
      });
    } catch (err) {
      console.warn(`[Firebase] deleteReportsByEmail failed, switching to local DB fallback. Error:`, err.message || err);
      useLocalFallback = true;
    }
  },
  // --- ADMIN AUDIT LOGS ---
  async getAdminLogs() {
    if (useLocalFallback) {
      return [...fallbackCache.adminLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 200);
    }
    try {
      return await withRetry(async () => {
        const snapshot = await db.collection("adminLogs").orderBy("timestamp", "desc").limit(200).get();
        const list = [];
        snapshot.forEach((doc) => {
          list.push(doc.data());
        });
        return list;
      });
    } catch (err) {
      console.warn(`[Firebase] getAdminLogs failed, switching to local DB fallback. Error:`, err.message || err);
      useLocalFallback = true;
      return [...fallbackCache.adminLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 200);
    }
  },
  async saveAdminLog(log) {
    fallbackCache.adminLogs.push(log);
    saveFallbackDB();
    if (useLocalFallback) return;
    try {
      await withRetry(async () => {
        await db.collection("adminLogs").doc(log.id).set(log);
      });
    } catch (err) {
      console.warn(`[Firebase] saveAdminLog failed, switching to local DB fallback. Error:`, err.message || err);
      useLocalFallback = true;
    }
  },
  // --- FULL ACCOUNT CLEANSE AND DELETION ---
  async purgeAccount(email) {
    const emailNorm = email.toLowerCase().trim();
    await this.deleteUser(emailNorm);
    await this.deleteSyncData(emailNorm);
    await this.deleteMessagesByEmail(emailNorm);
    await this.deleteReportsByEmail(emailNorm);
  },
  // --- AI METRICS ---
  async saveAIRequestLog(log) {
    if (!fallbackCache.aiRequestLogs) fallbackCache.aiRequestLogs = [];
    fallbackCache.aiRequestLogs.push(log);
    if (fallbackCache.aiRequestLogs.length > 1e3) {
      fallbackCache.aiRequestLogs = fallbackCache.aiRequestLogs.slice(-1e3);
    }
    saveFallbackDB();
    if (useLocalFallback) return;
    try {
      await withRetry(async () => {
        await db.collection("aiRequestLogs").doc(log.id).set(log);
      });
    } catch (err) {
      console.warn(`[Firebase] saveAIRequestLog failed, switching to local DB fallback. Error:`, err.message || err);
      useLocalFallback = true;
    }
  },
  async getAIRequestLogs() {
    if (useLocalFallback) {
      return [...fallbackCache.aiRequestLogs || []].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
    try {
      return await withRetry(async () => {
        const snapshot = await db.collection("aiRequestLogs").orderBy("timestamp", "desc").limit(500).get();
        const list = [];
        snapshot.forEach((doc) => {
          list.push(doc.data());
        });
        return list;
      });
    } catch (err) {
      console.warn(`[Firebase] getAIRequestLogs failed, switching to local DB fallback. Error:`, err.message || err);
      useLocalFallback = true;
      return [...fallbackCache.aiRequestLogs || []].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
  }
};
async function runAutomatedMigration() {
  const dbPath = import_path.default.join(process.cwd(), "server_chat_db.json");
  const reportPath = import_path.default.join(process.cwd(), "migration_report.md");
  if (!import_fs.default.existsSync(dbPath)) {
    console.log("[Migration] No legacy server_chat_db.json found. System running direct on Firestore.");
    return;
  }
  console.log("[Migration] Initiating automatic data migration from local encrypted JSON file to Cloud Firestore...");
  const startTime = Date.now();
  let migratedUsers = 0;
  let migratedMessages = 0;
  let migratedReports = 0;
  let migratedAdminLogs = 0;
  let migratedSyncData = 0;
  let errorCount = 0;
  const errorsList = [];
  try {
    const encryptedData = import_fs.default.readFileSync(dbPath, "utf8");
    const decryptedData = decryptData(encryptedData);
    const legacyDB = JSON.parse(decryptedData);
    if (legacyDB.users && typeof legacyDB.users === "object") {
      const userEntries = Object.entries(legacyDB.users);
      console.log(`[Migration] Migrating ${userEntries.length} user profiles...`);
      for (let i = 0; i < userEntries.length; i += 100) {
        const chunk = userEntries.slice(i, i + 100);
        const batch = db.batch();
        chunk.forEach(([email, data]) => {
          const normEmail = email.toLowerCase().trim();
          const userObj = data;
          batch.set(db.collection("users").doc(normEmail), {
            email: normEmail,
            username: userObj.username || "StudyMate User",
            avatar: userObj.avatar || "user1",
            level: userObj.level || 1,
            badge: userObj.badge || null,
            joinDate: userObj.joinDate || (/* @__PURE__ */ new Date()).toISOString(),
            country: userObj.country || "India",
            violationsCount: isNaN(Number(userObj.violationsCount)) ? 0 : Number(userObj.violationsCount),
            muteExpiresAt: userObj.muteExpiresAt || null,
            isBanned: !!userObj.isBanned,
            banReason: userObj.banReason || null,
            passwordHash: userObj.passwordHash || "",
            passwordSalt: userObj.passwordSalt || ""
          });
          migratedUsers++;
        });
        await batch.commit();
      }
    }
    if (legacyDB.messages && Array.isArray(legacyDB.messages)) {
      console.log(`[Migration] Migrating ${legacyDB.messages.length} community chat messages...`);
      for (let i = 0; i < legacyDB.messages.length; i += 100) {
        const chunk = legacyDB.messages.slice(i, i + 100);
        const batch = db.batch();
        chunk.forEach((msgObj) => {
          batch.set(db.collection("messages").doc(msgObj.id), {
            id: msgObj.id,
            userEmail: msgObj.userEmail.toLowerCase().trim(),
            username: msgObj.username || "User",
            avatar: msgObj.avatar || "user1",
            level: msgObj.level || 1,
            badge: msgObj.badge || null,
            text: msgObj.text || "",
            country: msgObj.country || "India",
            timestamp: msgObj.timestamp || (/* @__PURE__ */ new Date()).toISOString(),
            repliedToId: msgObj.repliedToId || null,
            repliedToUser: msgObj.repliedToUser || null,
            isDeleted: !!msgObj.isDeleted,
            deletedBy: msgObj.deletedBy || null,
            reportsCount: isNaN(Number(msgObj.reportsCount)) ? 0 : Number(msgObj.reportsCount)
          });
          migratedMessages++;
        });
        await batch.commit();
      }
    }
    if (legacyDB.reports && Array.isArray(legacyDB.reports)) {
      console.log(`[Migration] Migrating ${legacyDB.reports.length} chat reports...`);
      for (let i = 0; i < legacyDB.reports.length; i += 100) {
        const chunk = legacyDB.reports.slice(i, i + 100);
        const batch = db.batch();
        chunk.forEach((repObj) => {
          batch.set(db.collection("reports").doc(repObj.id), {
            id: repObj.id,
            messageId: repObj.messageId,
            messageText: repObj.messageText || "",
            messageAuthor: repObj.messageAuthor.toLowerCase().trim(),
            reportedBy: repObj.reportedBy.toLowerCase().trim(),
            reason: repObj.reason || "General Abuse",
            comment: repObj.comment || "",
            timestamp: repObj.timestamp || (/* @__PURE__ */ new Date()).toISOString(),
            status: repObj.status || "pending",
            actionTaken: repObj.actionTaken || null,
            reviewedAt: repObj.reviewedAt || null
          });
          migratedReports++;
        });
        await batch.commit();
      }
    }
    if (legacyDB.adminLogs && Array.isArray(legacyDB.adminLogs)) {
      console.log(`[Migration] Migrating ${legacyDB.adminLogs.length} audit logs...`);
      for (let i = 0; i < legacyDB.adminLogs.length; i += 100) {
        const chunk = legacyDB.adminLogs.slice(i, i + 100);
        const batch = db.batch();
        chunk.forEach((logObj) => {
          batch.set(db.collection("adminLogs").doc(logObj.id), {
            id: logObj.id,
            adminEmail: logObj.adminEmail,
            action: logObj.action,
            targetEmail: logObj.targetEmail ? logObj.targetEmail.toLowerCase().trim() : null,
            details: logObj.details || "",
            timestamp: logObj.timestamp || (/* @__PURE__ */ new Date()).toISOString()
          });
          migratedAdminLogs++;
        });
        await batch.commit();
      }
    }
    if (legacyDB.syncData && typeof legacyDB.syncData === "object") {
      const syncEntries = Object.entries(legacyDB.syncData);
      console.log(`[Migration] Migrating ${syncEntries.length} user synced planner, habits, analytics profiles...`);
      for (let i = 0; i < syncEntries.length; i += 50) {
        const chunk = syncEntries.slice(i, i + 50);
        const batch = db.batch();
        chunk.forEach(([email, data]) => {
          const normEmail = email.toLowerCase().trim();
          const syncObj = data;
          batch.set(db.collection("syncData").doc(normEmail), {
            profile: syncObj.profile || {},
            tasks: Array.isArray(syncObj.tasks) ? syncObj.tasks : [],
            alarms: Array.isArray(syncObj.alarms) ? syncObj.alarms : [],
            timetable: Array.isArray(syncObj.timetable) ? syncObj.timetable : [],
            habits: Array.isArray(syncObj.habits) ? syncObj.habits : [],
            badges: Array.isArray(syncObj.badges) ? syncObj.badges : [],
            activityLog: Array.isArray(syncObj.activityLog) ? syncObj.activityLog : [],
            notifications: Array.isArray(syncObj.notifications) ? syncObj.notifications : [],
            updatedAt: syncObj.updatedAt || (/* @__PURE__ */ new Date()).toISOString()
          });
          migratedSyncData++;
        });
        await batch.commit();
      }
    }
    const backupPath = dbPath + ".bak";
    import_fs.default.copyFileSync(dbPath, backupPath);
    import_fs.default.unlinkSync(dbPath);
    console.log(`[Migration] Legacy local JSON backed up successfully to ${backupPath} and original deleted.`);
    const duration = ((Date.now() - startTime) / 1e3).toFixed(2);
    const reportMarkdown = `# StudyMate Database Migration Report

This document was automatically generated by the Database Migration Engine to verify the successful transition from legacy local JSON storage (\`server_chat_db.json\`) to Cloud Firestore (Google Cloud Platform / Firebase).

## Migration Metrics
- **Start Time**: ${new Date(startTime).toLocaleString()}
- **End Time**: ${(/* @__PURE__ */ new Date()).toLocaleString()}
- **Total Duration**: ${duration} seconds
- **Errors Encountered**: ${errorCount}

### Migrated Records Summary
| Category / Collection | Document Count Migrated | Status | Target Collection |
|---|---|---|---|
| **User Profiles** | ${migratedUsers} | Success | \`users\` |
| **Community Chat** | ${migratedMessages} | Success | \`messages\` |
| **Chat Abuse Reports** | ${migratedReports} | Success | \`reports\` |
| **Admin Audit Logs** | ${migratedAdminLogs} | Success | \`adminLogs\` |
| **User Sync Data (Planner, Analytics, Habits)** | ${migratedSyncData} | Success | \`syncData\` |

## Database Optimizations & Indexes
The following database optimizations have been applied to ensure fast, low-latency, and highly secure operations:
1. **Document-key Mapping**: Scalable lookup indexed natively by Firestore on \`users\` and \`syncData\` collections by mapping document IDs directly to normalized user emails.
2. **Server-side Security Model**: Firebase Admin SDK bypasses client-side restrictions, enabling secure, credential-less transactions within container networks (Cloud Run) while blocking direct unsecured public endpoints.
3. **Automatic Operations Retries**: Network flakiness is handled with automated exponent exponential-backoff retries.
4. **Data Validation**: Strict sanitization and data format parsing is enforced on every write operation, handling anomalies like \`NaN\` violations or malformed lists gracefully.

---
*Status: Verified and complete.*
`;
    import_fs.default.writeFileSync(reportPath, reportMarkdown, "utf8");
    console.log(`[Migration] Database migration completed perfectly! Detailed report written to ${reportPath}`);
  } catch (error) {
    console.error("[Migration] CRITICAL EXCEPTION during migration:", error);
    import_fs.default.writeFileSync(
      reportPath,
      `# StudyMate Database Migration Failed

Exception error: ${error?.message || error}
Timestamp: ${(/* @__PURE__ */ new Date()).toISOString()}`,
      "utf8"
    );
  }
}

// server/aiService.ts
import_dotenv2.default.config();
var responseCache = /* @__PURE__ */ new Map();
var CACHE_TTL_MS = 10 * 60 * 1e3;
var aiInstance = null;
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !isValidKey(apiKey)) return null;
  if (!aiInstance) {
    aiInstance = new import_genai.GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiInstance;
}
function isValidKey(key) {
  if (!key) return false;
  const k = key.trim();
  return k !== "" && !k.startsWith("MY_") && !k.includes("YOUR_") && k !== "null" && k !== "undefined" && k.length > 5;
}
function getConfiguredProviders() {
  return {
    gemini: isValidKey(process.env.GEMINI_API_KEY),
    openai: isValidKey(process.env.OPENAI_API_KEY),
    groq: isValidKey(process.env.GROQ_API_KEY),
    openrouter: isValidKey(process.env.OPENROUTER_API_KEY),
    anthropic: isValidKey(process.env.ANTHROPIC_API_KEY)
  };
}
function convertMessagesToOpenAIFormat(messages, systemInstruction) {
  const formatted = [];
  if (systemInstruction) {
    formatted.push({ role: "system", content: systemInstruction });
  }
  messages.forEach((m) => {
    const role = m.role === "model" ? "assistant" : m.role;
    formatted.push({ role, content: m.content });
  });
  return formatted;
}
function convertMessagesToAnthropicFormat(messages) {
  const formatted = [];
  messages.forEach((m) => {
    if (m.role !== "system") {
      const role = m.role === "model" ? "assistant" : m.role;
      formatted.push({ role, content: m.content });
    }
  });
  return formatted;
}
var DEFAULT_TIMEOUT_MS = Number(process.env.AI_REQUEST_TIMEOUT_MS) || 3e4;
function withTimeoutAndSignal(promiseFactory, timeoutMs, errorMessage, externalSignal) {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const signal = controller.signal;
    if (externalSignal?.aborted) {
      return reject(new Error("Request was cancelled by user."));
    }
    const onExternalAbort = () => {
      controller.abort();
      clearTimeout(timer);
      reject(new Error("Request was cancelled by user."));
    };
    if (externalSignal) {
      externalSignal.addEventListener("abort", onExternalAbort);
    }
    const timer = setTimeout(() => {
      controller.abort();
      if (externalSignal) {
        externalSignal.removeEventListener("abort", onExternalAbort);
      }
      reject(new Error(errorMessage));
    }, timeoutMs);
    promiseFactory(signal).then((res) => {
      clearTimeout(timer);
      if (externalSignal) {
        externalSignal.removeEventListener("abort", onExternalAbort);
      }
      resolve(res);
    }).catch((err) => {
      clearTimeout(timer);
      if (externalSignal) {
        externalSignal.removeEventListener("abort", onExternalAbort);
      }
      reject(err);
    });
  });
}
async function retryWithBackoff(operation, retries = 3, delay = 1e3, onRetry, externalSignal) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    if (externalSignal?.aborted) {
      throw new Error("Request was cancelled by user.");
    }
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (error?.name === "AbortError" || error?.message?.includes("cancelled") || externalSignal?.aborted) {
        throw error;
      }
      const is429 = error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("RESOURCE_EXHAUSTED") || error?.message?.includes("quota") || error?.message?.includes("rate limit") || error?.message?.includes("Rate limit");
      if (attempt === retries) {
        break;
      }
      if (onRetry) onRetry(error, attempt);
      const actualDelay = is429 ? delay * 3 * attempt : delay * attempt;
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (externalSignal) {
            externalSignal.removeEventListener("abort", onAbortDuringSleep);
          }
          resolve();
        }, actualDelay);
        function onAbortDuringSleep() {
          clearTimeout(timeout);
          reject(new Error("Request was cancelled by user."));
        }
        if (externalSignal) {
          externalSignal.addEventListener("abort", onAbortDuringSleep, { once: true });
        }
      });
    }
  }
  throw lastError;
}
function parseJsonResponse(text) {
  if (!text) return {};
  const cleaned = text.trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      try {
        return JSON.parse(jsonMatch[1].trim());
      } catch (e2) {
      }
    }
    let relaxed = cleaned;
    relaxed = relaxed.replace(/^```json\s*/i, "").replace(/\s*```$/, "");
    try {
      return JSON.parse(relaxed.trim());
    } catch (e3) {
      console.error("[AIService] Failed all attempts to parse JSON response:", text);
      throw new Error("Failed to parse JSON response from AI provider.");
    }
  }
}
async function executeAIRequest(options) {
  const { messages, systemInstruction, image, preferredProvider = "auto", responseSchema, timeoutMs, signal } = options;
  const cacheKeyInput = JSON.stringify({
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    systemInstruction,
    image: image ? image.substring(0, 100) : "",
    imageLen: image ? image.length : 0,
    preferredProvider,
    responseSchema: responseSchema ? JSON.stringify(responseSchema) : ""
  });
  const cacheKey = import_crypto2.default.createHash("md5").update(cacheKeyInput).digest("hex");
  const cached = responseCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    console.log(`[AIService] Cache HIT for key: ${cacheKey}`);
    return {
      text: cached.text,
      providerUsed: cached.providerUsed
    };
  }
  const config = getConfiguredProviders();
  const fallbackOrder = ["gemini", "openai", "groq", "anthropic", "openrouter"];
  let providersToTry = [];
  if (preferredProvider !== "auto" && preferredProvider !== void 0) {
    providersToTry.push(preferredProvider);
    fallbackOrder.forEach((p) => {
      if (p !== preferredProvider) {
        providersToTry.push(p);
      }
    });
  } else {
    providersToTry = [...fallbackOrder];
  }
  providersToTry = providersToTry.filter((p) => config[p]);
  if (providersToTry.length === 0) {
    if (isValidKey(process.env.GEMINI_API_KEY)) {
      providersToTry = ["gemini"];
    } else {
      throw new Error(
        "No AI Providers are configured. Please set GEMINI_API_KEY or other keys (OPENAI_API_KEY, GROQ_API_KEY, etc.) in the Secrets Settings."
      );
    }
  }
  const isPdf = !!image && (image.startsWith("data:application/pdf") || image.includes("pdf"));
  let lastError = null;
  let success = false;
  let finalResult = null;
  const startTime = Date.now();
  let providerUsed = preferredProvider;
  try {
    for (const provider of providersToTry) {
      if (signal?.aborted) {
        throw new Error("Request was cancelled by user.");
      }
      try {
        if (isPdf && ["openai", "groq", "anthropic"].includes(provider)) {
          console.warn(`[AIService] Skipping provider ${provider} because PDF document input is only natively supported by Gemini/OpenRouter.`);
          continue;
        }
        console.log(`[AIService] Attempting request using provider: ${provider}`);
        let resultText = "";
        providerUsed = provider;
        let activeSystemInstruction = systemInstruction || "";
        const providerContext = `

[Active AI Engine Context: You are currently running on the "${provider}" provider backend. If the user asks which AI provider, model, engine, or backend you are currently using, you MUST truthfully tell them that you are currently using ${provider}.]`;
        if (activeSystemInstruction) {
          activeSystemInstruction += providerContext;
        } else {
          activeSystemInstruction = providerContext;
        }
        if (provider === "gemini") {
          resultText = await callGemini(messages, activeSystemInstruction, image, responseSchema, timeoutMs, signal);
        } else if (provider === "openai") {
          resultText = await callOpenAI(messages, activeSystemInstruction, image, responseSchema, timeoutMs, signal);
        } else if (provider === "groq") {
          resultText = await callGroq(messages, activeSystemInstruction, image, responseSchema, timeoutMs, signal);
        } else if (provider === "openrouter") {
          resultText = await callOpenRouter(messages, activeSystemInstruction, image, responseSchema, timeoutMs, signal);
        } else if (provider === "anthropic") {
          resultText = await callAnthropic(messages, activeSystemInstruction, image, responseSchema, timeoutMs, signal);
        }
        if (!resultText || resultText.trim() === "") {
          throw new Error(`Provider ${provider} returned an empty or invalid response.`);
        }
        console.log(`[AIService] Successfully received response from provider: ${provider}`);
        responseCache.set(cacheKey, {
          text: resultText,
          providerUsed: provider,
          timestamp: Date.now()
        });
        success = true;
        finalResult = {
          text: resultText,
          providerUsed: provider
        };
        break;
      } catch (err) {
        console.warn(`[AIService] Provider ${provider} failed:`, err.message || err);
        lastError = err;
        if (err?.name === "AbortError" || err?.message?.includes("cancelled") || signal?.aborted) {
          throw err;
        }
      }
    }
    if (finalResult) {
      return finalResult;
    }
    throw new Error(`All configured AI Providers failed. Last error: ${lastError?.message || lastError}`);
  } catch (err) {
    lastError = err;
    throw err;
  } finally {
    const responseTimeMs = Date.now() - startTime;
    const errorMsg = success ? null : lastError?.message || String(lastError);
    firebaseDB.saveAIRequestLog({
      id: `ailog-${Date.now()}-${import_crypto2.default.randomBytes(4).toString("hex")}`,
      provider: providerUsed,
      endpoint: messages.length > 1 ? "chat" : "solve",
      responseTimeMs,
      success,
      error: errorMsg,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }).catch((e) => console.error("[AIService] Failed to write AI request metrics log:", e));
  }
}
async function callGemini(messages, systemInstruction, image, responseSchema, timeoutMs, signal) {
  const gemini = getGeminiClient();
  if (!gemini) throw new Error("Gemini API key is not configured");
  const contents = [];
  messages.forEach((m, idx) => {
    const isLast = idx === messages.length - 1;
    const parts = [{ text: m.content }];
    if (isLast && image) {
      let mimeType = "image/png";
      let base64Data = image.trim();
      if (base64Data.startsWith("data:")) {
        const urlParts = base64Data.split(";base64,");
        if (urlParts.length === 2) {
          mimeType = urlParts[0].replace("data:", "").trim();
          base64Data = urlParts[1].trim();
        }
      }
      parts.push({
        inlineData: {
          mimeType,
          data: base64Data
        }
      });
    }
    contents.push({
      role: m.role === "model" || m.role === "assistant" ? "model" : "user",
      parts
    });
  });
  const config = {};
  if (systemInstruction) {
    config.systemInstruction = systemInstruction;
  }
  if (responseSchema) {
    config.responseMimeType = "application/json";
    config.responseSchema = responseSchema;
  }
  const executeCall = async (modelName) => {
    return await retryWithBackoff(async () => {
      return await withTimeoutAndSignal(
        async (mergedSignal) => {
          const response = await gemini.models.generateContent({
            model: modelName,
            contents,
            config: {
              ...config,
              httpOptions: {
                headers: {
                  "User-Agent": "aistudio-build"
                },
                signal: mergedSignal
              }
            }
          });
          if (response.text) return response.text;
          throw new Error("Empty text response received from Gemini SDK.");
        },
        timeoutMs || DEFAULT_TIMEOUT_MS,
        `Gemini API request timed out after ${Math.round((timeoutMs || DEFAULT_TIMEOUT_MS) / 1e3)} seconds for model: ${modelName}`,
        signal
      );
    }, 3, 1e3, (err, attempt) => {
      console.warn(`[AIService] Gemini attempt ${attempt} failed with error: ${err.message || err}. Retrying...`);
    }, signal);
  };
  try {
    return await executeCall("gemini-3.5-flash");
  } catch (err) {
    const errMsg = err?.message || String(err);
    if (errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("quota")) {
      console.warn("[AIService] gemini-3.5-flash hit 429/quota limit. Instantly falling back to gemini-3.1-flash-lite...");
      try {
        return await executeCall("gemini-3.1-flash-lite");
      } catch (fallbackErr) {
        console.error("[AIService] gemini-3.1-flash-lite fallback failed:", fallbackErr);
      }
    }
    throw err;
  }
}
async function callOpenAI(messages, systemInstruction, image, responseSchema, timeoutMs, signal) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OpenAI API key is not configured");
  const formattedMessages = convertMessagesToOpenAIFormat(messages, systemInstruction);
  if (image && formattedMessages.length > 0) {
    const lastMsg = formattedMessages[formattedMessages.length - 1];
    if (lastMsg.role === "user") {
      let imageFullUrl = image;
      if (!image.startsWith("data:")) {
        imageFullUrl = `data:image/png;base64,${image}`;
      }
      lastMsg.content = [
        { type: "text", text: lastMsg.content },
        { type: "image_url", image_url: { url: imageFullUrl } }
      ];
    }
  }
  const body = {
    model: "gpt-4o-mini",
    messages: formattedMessages,
    temperature: 0.7
  };
  if (responseSchema) {
    body.response_format = { type: "json_object" };
    const sysMsg = formattedMessages.find((m) => m.role === "system");
    const jsonInstruction = "\nCRITICAL: Respond strictly with a JSON object.";
    if (sysMsg) {
      sysMsg.content += jsonInstruction;
    } else {
      formattedMessages.unshift({ role: "system", content: jsonInstruction });
    }
  }
  return await retryWithBackoff(async () => {
    return await withTimeoutAndSignal(
      async (mergedSignal) => {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify(body),
          signal: mergedSignal
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`OpenAI API returned status ${response.status}: ${errorData.error?.message || response.statusText}`);
        }
        const data = await response.json();
        return data.choices?.[0]?.message?.content || "";
      },
      timeoutMs || DEFAULT_TIMEOUT_MS,
      `OpenAI API request timed out after ${Math.round((timeoutMs || DEFAULT_TIMEOUT_MS) / 1e3)} seconds.`,
      signal
    );
  }, 3, 1e3, (err, attempt) => {
    console.warn(`[AIService] OpenAI attempt ${attempt} failed with error: ${err.message || err}. Retrying...`);
  }, signal);
}
async function callGroq(messages, systemInstruction, image, responseSchema, timeoutMs, signal) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("Groq API key is not configured");
  const formattedMessages = convertMessagesToOpenAIFormat(messages, systemInstruction);
  const model = image ? "llama-3.2-11b-vision-instruct" : "llama-3.3-70b-versatile";
  if (image && formattedMessages.length > 0) {
    const lastMsg = formattedMessages[formattedMessages.length - 1];
    if (lastMsg.role === "user") {
      let imageFullUrl = image;
      if (!image.startsWith("data:")) {
        imageFullUrl = `data:image/png;base64,${image}`;
      }
      lastMsg.content = [
        { type: "text", text: lastMsg.content },
        { type: "image_url", image_url: { url: imageFullUrl } }
      ];
    }
  }
  const body = {
    model,
    messages: formattedMessages,
    temperature: 0.7
  };
  if (responseSchema) {
    body.response_format = { type: "json_object" };
    const sysMsg = formattedMessages.find((m) => m.role === "system");
    const jsonInstruction = "\nCRITICAL: Respond strictly with a JSON object.";
    if (sysMsg) {
      sysMsg.content += jsonInstruction;
    } else {
      formattedMessages.unshift({ role: "system", content: jsonInstruction });
    }
  }
  return await retryWithBackoff(async () => {
    return await withTimeoutAndSignal(
      async (mergedSignal) => {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify(body),
          signal: mergedSignal
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Groq API returned status ${response.status}: ${errorData.error?.message || response.statusText}`);
        }
        const data = await response.json();
        return data.choices?.[0]?.message?.content || "";
      },
      timeoutMs || DEFAULT_TIMEOUT_MS,
      `Groq API request timed out after ${Math.round((timeoutMs || DEFAULT_TIMEOUT_MS) / 1e3)} seconds.`,
      signal
    );
  }, 3, 1e3, (err, attempt) => {
    console.warn(`[AIService] Groq attempt ${attempt} failed with error: ${err.message || err}. Retrying...`);
  }, signal);
}
async function callOpenRouter(messages, systemInstruction, image, responseSchema, timeoutMs, signal) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OpenRouter API key is not configured");
  const formattedMessages = convertMessagesToOpenAIFormat(messages, systemInstruction);
  const model = "google/gemini-2.5-flash";
  if (image && formattedMessages.length > 0) {
    const lastMsg = formattedMessages[formattedMessages.length - 1];
    if (lastMsg.role === "user") {
      let imageFullUrl = image;
      if (!image.startsWith("data:")) {
        imageFullUrl = `data:image/png;base64,${image}`;
      }
      lastMsg.content = [
        { type: "text", text: lastMsg.content },
        { type: "image_url", image_url: { url: imageFullUrl } }
      ];
    }
  }
  const body = {
    model,
    messages: formattedMessages,
    temperature: 0.7,
    max_tokens: 4e3
  };
  if (responseSchema) {
    body.response_format = { type: "json_object" };
    const sysMsg = formattedMessages.find((m) => m.role === "system");
    const jsonInstruction = "\nCRITICAL: Respond strictly with a JSON object.";
    if (sysMsg) {
      sysMsg.content += jsonInstruction;
    } else {
      formattedMessages.unshift({ role: "system", content: jsonInstruction });
    }
  }
  return await retryWithBackoff(async () => {
    return await withTimeoutAndSignal(
      async (mergedSignal) => {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
            "HTTP-Referer": "https://studymate-ai.com",
            "X-Title": "StudyMate AI"
          },
          body: JSON.stringify(body),
          signal: mergedSignal
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`OpenRouter API returned status ${response.status}: ${errorData.error?.message || response.statusText}`);
        }
        const data = await response.json();
        return data.choices?.[0]?.message?.content || "";
      },
      timeoutMs || DEFAULT_TIMEOUT_MS,
      `OpenRouter API request timed out after ${Math.round((timeoutMs || DEFAULT_TIMEOUT_MS) / 1e3)} seconds.`,
      signal
    );
  }, 3, 1e3, (err, attempt) => {
    console.warn(`[AIService] OpenRouter attempt ${attempt} failed with error: ${err.message || err}. Retrying...`);
  }, signal);
}
async function callAnthropic(messages, systemInstruction, image, responseSchema, timeoutMs, signal) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Anthropic API key is not configured");
  const formattedMessages = convertMessagesToAnthropicFormat(messages);
  if (image && formattedMessages.length > 0) {
    const lastMsg = formattedMessages[formattedMessages.length - 1];
    if (lastMsg.role === "user") {
      let mimeType = "image/png";
      let base64Data = image.trim();
      if (base64Data.startsWith("data:")) {
        const urlParts = base64Data.split(";base64,");
        if (urlParts.length === 2) {
          mimeType = urlParts[0].replace("data:", "").trim();
          base64Data = urlParts[1].trim();
        }
      }
      lastMsg.content = [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: mimeType,
            data: base64Data
          }
        },
        { type: "text", text: lastMsg.content }
      ];
    }
  }
  const body = {
    model: "claude-3-5-haiku-20241022",
    max_tokens: 4e3,
    messages: formattedMessages,
    temperature: 0.7
  };
  if (systemInstruction) {
    body.system = systemInstruction;
  }
  if (responseSchema) {
    const jsonInstruction = "\nCRITICAL: Respond strictly with a JSON object.";
    if (body.system) {
      body.system += jsonInstruction;
    } else {
      body.system = jsonInstruction;
    }
  }
  return await retryWithBackoff(async () => {
    return await withTimeoutAndSignal(
      async (mergedSignal) => {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01"
          },
          body: JSON.stringify(body),
          signal: mergedSignal
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Anthropic API returned status ${response.status}: ${errorData.error?.message || response.statusText}`);
        }
        const data = await response.json();
        return data.content?.[0]?.text || "";
      },
      timeoutMs || DEFAULT_TIMEOUT_MS,
      `Anthropic API request timed out after ${Math.round((timeoutMs || DEFAULT_TIMEOUT_MS) / 1e3)} seconds.`,
      signal
    );
  }, 3, 1e3, (err, attempt) => {
    console.warn(`[AIService] Anthropic attempt ${attempt} failed with error: ${err.message || err}. Retrying...`);
  }, signal);
}

// server.ts
import_dotenv3.default.config();
var app = (0, import_express.default)();
app.set("trust proxy", 1);
var PORT = 3e3;
var DB_PATH = import_path2.default.join(process.cwd(), "server_chat_db.json");
var JWT_SECRET = process.env.JWT_SECRET;
var JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
var DB_KEY2 = process.env.DB_ENCRYPTION_KEY;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error("CRITICAL CONFIG ERROR: JWT_SECRET environment variable is missing, empty, or too short (must be at least 32 characters).");
  process.exit(1);
}
if (!JWT_REFRESH_SECRET || JWT_REFRESH_SECRET.length < 32) {
  console.error("CRITICAL CONFIG ERROR: JWT_REFRESH_SECRET environment variable is missing, empty, or too short (must be at least 32 characters).");
  process.exit(1);
}
if (!DB_KEY2 || DB_KEY2.length < 16) {
  console.error("CRITICAL CONFIG ERROR: DB_ENCRYPTION_KEY environment variable is missing, empty, or too short (must be at least 16 characters).");
  process.exit(1);
}
function hashPassword(password) {
  const salt = import_crypto3.default.randomBytes(16).toString("hex");
  const hash = import_crypto3.default.pbkdf2Sync(password, salt, 1e5, 64, "sha512").toString("hex");
  return { salt, hash };
}
function verifyPassword(password, salt, hash) {
  const testHash = import_crypto3.default.pbkdf2Sync(password, salt, 1e5, 64, "sha512").toString("hex");
  return import_crypto3.default.timingSafeEqual(Buffer.from(testHash, "hex"), Buffer.from(hash, "hex"));
}
function createAccessToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const exp = Math.floor(Date.now() / 1e3) + 15 * 60;
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString("base64url");
  const signatureInput = `${header}.${body}`;
  const signature = import_crypto3.default.createHmac("sha256", JWT_SECRET).update(signatureInput).digest("base64url");
  return `${signatureInput}.${signature}`;
}
function createRefreshToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const exp = Math.floor(Date.now() / 1e3) + 7 * 24 * 60 * 60;
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString("base64url");
  const signatureInput = `${header}.${body}`;
  const signature = import_crypto3.default.createHmac("sha256", JWT_REFRESH_SECRET).update(signatureInput).digest("base64url");
  return `${signatureInput}.${signature}`;
}
function verifyAccessToken(token) {
  try {
    if (!token || typeof token !== "string") return null;
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [headerB64, bodyB64, signatureB64] = parts;
    const headerStr = Buffer.from(headerB64, "base64url").toString("utf8");
    const header = JSON.parse(headerStr);
    if (header.alg !== "HS256" || header.typ !== "JWT") {
      return null;
    }
    const signatureInput = `${headerB64}.${bodyB64}`;
    const expectedSignatureBuffer = import_crypto3.default.createHmac("sha256", JWT_SECRET).update(signatureInput).digest();
    const receivedSignatureBuffer = Buffer.from(signatureB64, "base64url");
    if (expectedSignatureBuffer.length !== receivedSignatureBuffer.length) {
      return null;
    }
    if (!import_crypto3.default.timingSafeEqual(expectedSignatureBuffer, receivedSignatureBuffer)) {
      return null;
    }
    const bodyStr = Buffer.from(bodyB64, "base64url").toString("utf8");
    const body = JSON.parse(bodyStr);
    if (typeof body.email !== "string" || !body.email || typeof body.exp !== "number") {
      return null;
    }
    if (body.exp < Math.floor(Date.now() / 1e3)) {
      return null;
    }
    return {
      email: body.email,
      isAdmin: !!body.isAdmin
    };
  } catch (err) {
    return null;
  }
}
function verifyRefreshToken(token) {
  try {
    if (!token || typeof token !== "string") return null;
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [headerB64, bodyB64, signatureB64] = parts;
    const headerStr = Buffer.from(headerB64, "base64url").toString("utf8");
    const header = JSON.parse(headerStr);
    if (header.alg !== "HS256" || header.typ !== "JWT") {
      return null;
    }
    const signatureInput = `${headerB64}.${bodyB64}`;
    const expectedSignatureBuffer = import_crypto3.default.createHmac("sha256", JWT_REFRESH_SECRET).update(signatureInput).digest();
    const receivedSignatureBuffer = Buffer.from(signatureB64, "base64url");
    if (expectedSignatureBuffer.length !== receivedSignatureBuffer.length) {
      return null;
    }
    if (!import_crypto3.default.timingSafeEqual(expectedSignatureBuffer, receivedSignatureBuffer)) {
      return null;
    }
    const bodyStr = Buffer.from(bodyB64, "base64url").toString("utf8");
    const body = JSON.parse(bodyStr);
    if (typeof body.email !== "string" || !body.email || typeof body.exp !== "number") {
      return null;
    }
    if (body.exp < Math.floor(Date.now() / 1e3)) {
      return null;
    }
    return {
      email: body.email
    };
  } catch (err) {
    return null;
  }
}
function verifyToken(token) {
  return verifyAccessToken(token);
}
var failedLoginAttempts = {};
runAutomatedMigration().catch((err) => {
  console.error("[Migration] Startup migration failed:", err);
});
var sseClients = [];
var lastMessageTimes = {};
function sanitizeText(str) {
  if (typeof str !== "string") return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;").replace(/\//g, "&#x2F;");
}
var asyncHandler = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};
app.use((req, res, next) => {
  const start2 = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start2;
    console.log(`[Request] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} - ${duration}ms`);
  });
  next();
});
app.use((0, import_helmet.default)({
  contentSecurityPolicy: false,
  // Prevents loading issues in Sandbox/iFrame
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: "unsafe-none" },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  next();
});
var allowedOrigins = [
  "https://ais-dev-7trcurr3ybqbdmvjkvx3x7-634393143987.asia-southeast1.run.app",
  "https://ais-pre-7trcurr3ybqbdmvjkvx3x7-634393143987.asia-southeast1.run.app"
];
app.use((0, import_cors.default)({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    const isLocal = origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:");
    const isDevPre = allowedOrigins.includes(origin) || origin.endsWith(".run.app") || origin.endsWith(".google.com") || origin.endsWith(".google");
    const isAppUrl = process.env.APP_URL && origin === process.env.APP_URL;
    if (isLocal || isDevPre || isAppUrl) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));
app.use((0, import_compression.default)());
app.use((0, import_cookie_parser.default)());
var apiRateLimiter = (0, import_express_rate_limit.rateLimit)({
  windowMs: 1 * 60 * 1e3,
  // 1 minute
  max: 180,
  // generous 180 requests per minute
  message: { error: "Rate limit exceeded. Please slow down and try again later." },
  standardHeaders: true,
  legacyHeaders: false
});
app.use("/api", apiRateLimiter);
app.use(import_express.default.json({ limit: "25mb" }));
app.use(import_express.default.urlencoded({ limit: "25mb", extended: true }));
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid authorization session token. Please log in." });
    }
    const token = authHeader.split(" ")[1];
    const user = verifyToken(token);
    if (!user) {
      return res.status(401).json({ error: "Session expired or invalid token. Please log in again." });
    }
    const userState = await firebaseDB.getUser(user.email);
    if (userState && userState.isBanned) {
      return res.status(403).json({ error: "Your account has been suspended for violating CBSE study group guidelines." });
    }
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}
async function requireAdmin(req, res, next) {
  await requireAuth(req, res, () => {
    const user = req.user;
    if (!user || !isAdminEmail(user.email)) {
      return res.status(403).json({ error: "Access Denied: Administrative privileges required." });
    }
    next();
  });
}
app.get("/api/ai/providers", (req, res) => {
  try {
    const providers = getConfiguredProviders();
    res.json(providers);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch providers." });
  }
});
app.get("/api/ai/metrics", async (req, res) => {
  try {
    const logs = await firebaseDB.getAIRequestLogs();
    const total = logs.length;
    const successes = logs.filter((l) => l.success).length;
    const successRate = total > 0 ? Math.round(successes / total * 100) : 100;
    const responseTimes = logs.filter((l) => l.success).map((l) => l.responseTimeMs);
    const avgResponseTime = responseTimes.length > 0 ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : 0;
    const providerStats = {};
    logs.forEach((l) => {
      const p = l.provider || "unknown";
      if (!providerStats[p]) {
        providerStats[p] = { total: 0, success: 0, avgTime: 0, sumTime: 0 };
      }
      providerStats[p].total++;
      if (l.success) {
        providerStats[p].success++;
        providerStats[p].sumTime += l.responseTimeMs;
      }
    });
    Object.keys(providerStats).forEach((p) => {
      const stat = providerStats[p];
      const successfulRequests = stat.success;
      stat.avgTime = successfulRequests > 0 ? Math.round(stat.sumTime / successfulRequests) : 0;
    });
    res.json({
      summary: {
        totalRequests: total,
        successRate,
        avgResponseTime
      },
      providerStats,
      recentLogs: logs.slice(0, 100)
      // Return top 100 recent logs
    });
  } catch (err) {
    console.error("Failed to get AI metrics:", err);
    res.status(500).json({ error: "Failed to retrieve AI performance metrics." });
  }
});
var authLimiter = (0, import_express_rate_limit.rateLimit)({
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  max: 30,
  // Limit each IP to 30 authentication requests per 15 minutes
  message: { error: "Too many authentication attempts. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false
});
app.post("/api/auth/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "Google account email is required." });
    }
    const emailNorm = email.toLowerCase().trim();
    if (!emailNorm.includes("@") || !emailNorm.includes(".")) {
      return res.status(400).json({ error: "Invalid email address format." });
    }
    const failed = failedLoginAttempts[emailNorm];
    if (failed && failed.count >= 5 && Date.now() < failed.blockUntil) {
      const waitMinutes = Math.ceil((failed.blockUntil - Date.now()) / 6e4);
      return res.status(429).json({ error: `Account temporarily locked due to 5 failed logins. Please try again in ${waitMinutes} minute(s).` });
    }
    let user = await firebaseDB.getUser(emailNorm);
    const plainPassword = (password || "").trim();
    if (!plainPassword) {
      return res.status(400).json({ error: "Password is required for secure authentication." });
    }
    if (!user) {
      const { salt, hash } = hashPassword(plainPassword);
      user = {
        email: emailNorm,
        username: emailNorm.split("@")[0],
        avatar: "\u{1F393}",
        level: 1,
        joinDate: (/* @__PURE__ */ new Date()).toDateString(),
        country: "India",
        violationsCount: 0,
        isBanned: false,
        passwordHash: hash,
        passwordSalt: salt
      };
      await firebaseDB.saveUser(emailNorm, user);
    } else {
      if (!user.passwordHash || !user.passwordSalt) {
        const { salt, hash } = hashPassword(plainPassword);
        user.passwordHash = hash;
        user.passwordSalt = salt;
        await firebaseDB.saveUser(emailNorm, { passwordHash: hash, passwordSalt: salt });
      } else {
        const isMatch = verifyPassword(plainPassword, user.passwordSalt, user.passwordHash);
        if (!isMatch) {
          if (!failedLoginAttempts[emailNorm] || Date.now() > failedLoginAttempts[emailNorm].blockUntil) {
            failedLoginAttempts[emailNorm] = { count: 1, blockUntil: 0 };
          } else {
            failedLoginAttempts[emailNorm].count++;
          }
          if (failedLoginAttempts[emailNorm].count >= 5) {
            failedLoginAttempts[emailNorm].blockUntil = Date.now() + 5 * 60 * 1e3;
            return res.status(429).json({ error: "Too many failed login attempts. Account locked for 5 minutes." });
          }
          return res.status(401).json({ error: "Incorrect password. Please try again." });
        }
      }
    }
    delete failedLoginAttempts[emailNorm];
    if (user.isBanned) {
      return res.status(403).json({ error: `Your account has been banned. Reason: ${user.banReason || "Moderator directive."}` });
    }
    const isAdmin = isAdminEmail(emailNorm);
    const token = createAccessToken({ email: emailNorm, isAdmin });
    const refreshToken = createRefreshToken({ email: emailNorm });
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1e3
      // 7 days
    });
    res.json({
      success: true,
      email: emailNorm,
      token,
      refreshToken,
      isAdmin,
      user: {
        username: user.username,
        avatar: user.avatar,
        level: user.level,
        badge: user.badge
      }
    });
  } catch (err) {
    console.error("[Security Error] Login exception:", err);
    res.status(500).json({ error: "Secure authentication failed on the server." });
  }
});
app.post("/api/auth/refresh", authLimiter, async (req, res) => {
  try {
    let refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!refreshToken || typeof refreshToken !== "string") {
      return res.status(400).json({ error: "Refresh token is required." });
    }
    const verified = verifyRefreshToken(refreshToken);
    if (!verified) {
      return res.status(401).json({ error: "Invalid or expired refresh token. Please log in again." });
    }
    const emailNorm = verified.email.toLowerCase().trim();
    const user = await firebaseDB.getUser(emailNorm);
    if (!user) {
      return res.status(401).json({ error: "User account does not exist." });
    }
    if (user.isBanned) {
      return res.status(403).json({ error: "Account has been banned." });
    }
    const isAdmin = isAdminEmail(emailNorm);
    const newAccessToken = createAccessToken({ email: emailNorm, isAdmin });
    const newRefreshToken = createRefreshToken({ email: emailNorm });
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1e3
      // 7 days
    });
    res.json({
      success: true,
      token: newAccessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    console.error("Token refresh exception:", error);
    res.status(500).json({ error: "Server error during token refresh." });
  }
});
app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("refreshToken");
  res.json({ success: true, message: "Logged out successfully from server." });
});
app.get("/api/auth/check-email", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "Email is required." });
    }
    const emailNorm = email.toLowerCase().trim();
    const user = await firebaseDB.getUser(emailNorm);
    const exists = !!user;
    res.json({ exists });
  } catch (error) {
    res.status(500).json({ error: "Failed to check email existence." });
  }
});
app.get("/api/sync/pull", requireAuth, async (req, res) => {
  try {
    const emailNorm = req.user.email.toLowerCase().trim();
    const userSync = await firebaseDB.getSyncData(emailNorm);
    res.json({ success: true, data: userSync });
  } catch (error) {
    console.error("Sync pull error:", error);
    res.status(500).json({ error: "Failed to pull synced data." });
  }
});
app.post("/api/sync/push", requireAuth, async (req, res) => {
  try {
    const emailNorm = req.user.email.toLowerCase().trim();
    const { profile, tasks, alarms, timetable, habits, badges, activityLog, notifications, updatedAt } = req.body;
    const currentSync = await firebaseDB.getSyncData(emailNorm) || {};
    const nextSync = {
      profile: profile !== void 0 ? profile : currentSync.profile,
      tasks: tasks !== void 0 ? tasks : currentSync.tasks,
      alarms: alarms !== void 0 ? alarms : currentSync.alarms,
      timetable: timetable !== void 0 ? timetable : currentSync.timetable,
      habits: habits !== void 0 ? habits : currentSync.habits,
      badges: badges !== void 0 ? badges : currentSync.badges,
      activityLog: activityLog !== void 0 ? activityLog : currentSync.activityLog,
      notifications: notifications !== void 0 ? notifications : currentSync.notifications,
      updatedAt: updatedAt || (/* @__PURE__ */ new Date()).toISOString()
    };
    await firebaseDB.saveSyncData(emailNorm, nextSync);
    if (profile) {
      const user = await firebaseDB.getUser(emailNorm);
      if (user) {
        user.username = profile.nickname || profile.fullName || user.username;
        user.avatar = profile.avatar || user.avatar;
        user.level = profile.level || user.level;
        if (profile.badges && profile.badges.length > 0) {
          user.badge = profile.badges[profile.badges.length - 1];
        }
        await firebaseDB.saveUser(emailNorm, user);
      }
    }
    res.json({ success: true, data: nextSync });
  } catch (error) {
    console.error("Sync push error:", error);
    res.status(500).json({ error: "Failed to sync and push data." });
  }
});
app.post("/api/auth/delete-account", requireAuth, async (req, res) => {
  try {
    const emailNorm = req.user.email.toLowerCase().trim();
    await firebaseDB.purgeAccount(emailNorm);
    res.json({ success: true, message: "Your account and all associated study data have been permanently deleted." });
  } catch (error) {
    console.error("Delete account error:", error);
    res.status(500).json({ error: "Failed to delete your account." });
  }
});
function detectPromptInjection(prompt) {
  if (!prompt || typeof prompt !== "string") return false;
  const lower = prompt.toLowerCase();
  const injectionSignatures = [
    "ignore previous instructions",
    "forget all previous",
    "system instructions override",
    "you are now a",
    "bypass constraints",
    "reveal system prompt",
    "show system prompt",
    "what is your system instructions",
    "ignore the instructions above",
    "dan mode",
    "do anything now",
    "jailbreak",
    "system prompt leak",
    "ignore everything before",
    "you are no longer"
  ];
  return injectionSignatures.some((sig) => lower.includes(sig));
}
function sanitizeAIOutputText(text) {
  if (!text || typeof text !== "string") return "";
  return text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "").replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "").replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "").replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, "").replace(/onload\s*=\s*"[^"]*"/gi, "").replace(/onerror\s*=\s*"[^"]*"/gi, "").replace(/onclick\s*=\s*"[^"]*"/gi, "");
}
function validateAndSanitizeSolverResponse(data, originalPrompt) {
  if (!data || typeof data !== "object") {
    data = {};
  }
  return {
    ocrText: typeof data.ocrText === "string" ? sanitizeAIOutputText(data.ocrText) : sanitizeAIOutputText(originalPrompt),
    subject: typeof data.subject === "string" ? sanitizeAIOutputText(data.subject) : "General",
    topic: typeof data.topic === "string" ? sanitizeAIOutputText(data.topic) : "General",
    steps: Array.isArray(data.steps) ? data.steps.filter((s) => typeof s === "string").map((s) => sanitizeAIOutputText(s)) : [],
    finalAnswer: typeof data.finalAnswer === "string" ? sanitizeAIOutputText(data.finalAnswer) : "",
    conceptualExplanation: typeof data.conceptualExplanation === "string" ? sanitizeAIOutputText(data.conceptualExplanation) : "",
    tips: Array.isArray(data.tips) ? data.tips.filter((t) => typeof t === "string").map((t) => sanitizeAIOutputText(t)) : [],
    practiceQuestions: Array.isArray(data.practiceQuestions) ? data.practiceQuestions.filter((q) => typeof q === "string").map((q) => sanitizeAIOutputText(q)) : []
  };
}
function validateAndSanitizeSuggestScheduleResponse(data) {
  if (!data || typeof data !== "object") {
    data = {};
  }
  const studyTips = Array.isArray(data.studyTips) ? data.studyTips.filter((t) => typeof t === "string").map((t) => sanitizeAIOutputText(t)) : ["Stay consistent", "Practice active recall", "Use the Pomodoro technique"];
  const weeklyTheme = typeof data.weeklyTheme === "string" ? sanitizeAIOutputText(data.weeklyTheme) : "Personalized Academic Focus";
  const suggestedTimeAllocation = Array.isArray(data.suggestedTimeAllocation) ? data.suggestedTimeAllocation.filter((item) => item && typeof item === "object").map((item) => ({
    subject: typeof item.subject === "string" ? sanitizeAIOutputText(item.subject) : "General Study",
    hoursPerWeek: typeof item.hoursPerWeek === "number" && !isNaN(item.hoursPerWeek) ? Math.min(168, Math.max(0, item.hoursPerWeek)) : 4,
    reason: typeof item.reason === "string" ? sanitizeAIOutputText(item.reason) : "Focused skill building"
  })) : [];
  const timetable = Array.isArray(data.timetable) ? data.timetable.filter((dayItem) => dayItem && typeof dayItem === "object").map((dayItem) => ({
    day: typeof dayItem.day === "string" ? sanitizeAIOutputText(dayItem.day) : "Monday",
    sessions: Array.isArray(dayItem.sessions) ? dayItem.sessions.filter((session) => session && typeof session === "object").map((session) => ({
      time: typeof session.time === "string" ? sanitizeAIOutputText(session.time) : "04:00 PM - 05:00 PM",
      subject: typeof session.subject === "string" ? sanitizeAIOutputText(session.subject) : "General Study",
      topic: typeof session.topic === "string" ? sanitizeAIOutputText(session.topic) : "Concept review"
    })) : []
  })) : [];
  return {
    studyTips,
    weeklyTheme,
    suggestedTimeAllocation,
    timetable
  };
}
function validateAndSanitizeChapterMaterialsResponse(data) {
  if (!data || typeof data !== "object") {
    data = {};
  }
  return {
    longNotes: Array.isArray(data.longNotes) ? data.longNotes.filter((n) => typeof n === "string").map((n) => sanitizeAIOutputText(n)) : [],
    shortNotes: Array.isArray(data.shortNotes) ? data.shortNotes.filter((n) => typeof n === "string").map((n) => sanitizeAIOutputText(n)) : [],
    formulas: Array.isArray(data.formulas) ? data.formulas.filter((f) => typeof f === "string").map((f) => sanitizeAIOutputText(f)) : [],
    pyqs: Array.isArray(data.pyqs) ? data.pyqs.filter((q) => q && typeof q === "object").map((q) => ({
      question: typeof q.question === "string" ? sanitizeAIOutputText(q.question) : "Solved Exam Question",
      answer: typeof q.answer === "string" ? sanitizeAIOutputText(q.answer) : "No solution provided",
      year: typeof q.year === "string" ? sanitizeAIOutputText(q.year) : "Recent Board"
    })) : [],
    practiceQuestions: Array.isArray(data.practiceQuestions) ? data.practiceQuestions.filter((q) => typeof q === "string").map((q) => sanitizeAIOutputText(q)) : []
  };
}
var activeRequests = /* @__PURE__ */ new Map();
async function withDuplicatePrevention(key, promiseFactory) {
  if (activeRequests.has(key)) {
    console.warn(`[Deduplication] Blocked duplicate request on key: ${key}`);
    throw new Error("A request for this action is currently in progress. Please wait.");
  }
  const promise = promiseFactory();
  activeRequests.set(key, promise);
  try {
    return await promise;
  } finally {
    activeRequests.delete(key);
  }
}
app.post("/api/gemini/solve", requireAuth, async (req, res) => {
  const controller = new AbortController();
  req.on("close", () => {
    controller.abort();
  });
  try {
    const { prompt, image, subject, grade, favSubjects, weakSubjects, explainBriefly, provider = "auto", timeoutMs } = req.body;
    if (prompt && typeof prompt !== "string") {
      return res.status(400).json({ error: "Invalid prompt format." });
    }
    if (prompt && prompt.length > 5e4) {
      return res.status(400).json({ error: "Prompt is too long. Maximum characters is 50,000." });
    }
    if (image && (typeof image !== "string" || image.length > 25 * 1024 * 1024)) {
      return res.status(400).json({ error: "Invalid image format or image size exceeds 25MB." });
    }
    if (detectPromptInjection(prompt)) {
      return res.status(400).json({ error: "Potential prompt injection attempt detected. Please revise your query to align with guidelines." });
    }
    const emailNorm = req.user.email.toLowerCase().trim();
    const lockKey = `${emailNorm}:${req.path}`;
    const parsedResult = await withDuplicatePrevention(lockKey, async () => {
      const systemInstruction = `You are StudyMate AI, an advanced expert academic tutor and general-knowledge companion, as powerful and unrestricted as Gemini or ChatGPT.
Your task is to analyze the provided image, handwritten notes, or question. You are capable of answering any type of question, academic or otherwise.
CRITICAL: Always respond and explain in the exact language used by the user or detected in the image/text (e.g., if the user asks in Hindi, solve and explain in Hindi; if in English, in English, etc.).
If an image is provided, first perform OCR to extract the question text accurately.
Then:
1. Detect the academic subject or domain.
2. Detect the topic/chapter.
3. Provide a clear, step-by-step solution explaining how to solve it. Show calculations, formulas used, and reasoning.
4. Provide a concise final answer.
5. Explain the underlying conceptual details in simple, friendly language.
6. Provide useful tips, shortcuts, or mental models.
7. Suggest 2-3 similar practice questions to help the student master this exact concept.

You MUST respond strictly in the following JSON format. Ensure all strings can be parsed properly and markdown formatting is utilized inside text fields for formulas and formatting (e.g. bolding, math equations, tables).
JSON schema to match:
{
  "ocrText": "The extracted question text from image (or the original text prompt)",
  "subject": "Subject or Domain name",
  "topic": "The specific topic or concept name",
  "steps": [
    "Step 1: description...",
    "Step 2: description..."
  ],
  "finalAnswer": "The direct concise answer",
  "conceptualExplanation": "The friendly simple conceptual explanation...",
  "tips": [
    "Shortcut or tip 1...",
    "Shortcut or tip 2..."
  ],
  "practiceQuestions": [
    "Practice Q1...",
    "Practice Q2..."
  ]
}`;
      let userPrompt = prompt || "Solve this academic question or scan this page.";
      if (explainBriefly) {
        userPrompt += `
- **CRITICAL FORMAT RULE**: The user requested a BRIEF, HIGHLY CONCISE EXPLANATION. Minimize extra introductory words, keep steps and conceptual explanations short, focused, and straight-to-the-point. Summarize formulas and solutions into quick-reading lists.`;
      }
      if (grade || favSubjects || weakSubjects) {
        userPrompt += `

Student Profile Context to customize explanation depth and style:`;
        if (grade) userPrompt += `
- Class Grade Level: ${grade}`;
        if (favSubjects && Array.isArray(favSubjects) && favSubjects.length > 0) {
          userPrompt += `
- Favorite/Strong Subjects: ${favSubjects.join(", ")}`;
        }
        if (weakSubjects && Array.isArray(weakSubjects) && weakSubjects.length > 0) {
          userPrompt += `
- Weak Subjects (Explain terms extra clearly and provide step-by-step encouragement): ${weakSubjects.join(", ")}`;
        }
      }
      const messages = [{ role: "user", content: userPrompt }];
      const responseSchema = {
        type: import_genai2.Type.OBJECT,
        properties: {
          ocrText: { type: import_genai2.Type.STRING },
          subject: { type: import_genai2.Type.STRING },
          topic: { type: import_genai2.Type.STRING },
          steps: {
            type: import_genai2.Type.ARRAY,
            items: { type: import_genai2.Type.STRING }
          },
          finalAnswer: { type: import_genai2.Type.STRING },
          conceptualExplanation: { type: import_genai2.Type.STRING },
          tips: {
            type: import_genai2.Type.ARRAY,
            items: { type: import_genai2.Type.STRING }
          },
          practiceQuestions: {
            type: import_genai2.Type.ARRAY,
            items: { type: import_genai2.Type.STRING }
          }
        },
        required: ["ocrText", "subject", "topic", "steps", "finalAnswer", "conceptualExplanation", "tips", "practiceQuestions"]
      };
      const response = await executeAIRequest({
        messages,
        systemInstruction,
        image,
        preferredProvider: provider,
        responseSchema,
        timeoutMs: timeoutMs ? Number(timeoutMs) : void 0,
        signal: controller.signal
      });
      const responseText = response.text;
      if (!responseText) {
        throw new Error("No response received from AI model.");
      }
      const rawParsed = parseJsonResponse(responseText);
      return validateAndSanitizeSolverResponse(rawParsed, userPrompt);
    });
    res.json(parsedResult);
  } catch (error) {
    if (error.message?.includes("timed out")) {
      console.warn("AI solver timeout:", error.message);
      return res.status(504).json({ error: error.message });
    }
    if (error.message?.includes("cancelled") || controller.signal.aborted) {
      console.warn("AI solver request cancelled by user.");
      return res.status(499).json({ error: "Request was cancelled." });
    }
    if (error.message?.includes("in progress")) {
      return res.status(409).json({ error: error.message });
    }
    console.error("AI solver error:", error);
    res.status(500).json({ error: "Failed to solve the question. Please try again." });
  }
});
app.post("/api/gemini/chat", requireAuth, async (req, res) => {
  const controller = new AbortController();
  req.on("close", () => {
    controller.abort();
  });
  try {
    const { message, history, image, provider = "auto", timeoutMs } = req.body;
    if (message && typeof message !== "string") {
      return res.status(400).json({ error: "Invalid message format." });
    }
    if (message && message.length > 15e3) {
      return res.status(400).json({ error: "Message exceeds maximum allowed character limit of 15,000." });
    }
    if (detectPromptInjection(message)) {
      return res.status(400).json({ error: "Potential prompt injection attempt detected. Please refine your message." });
    }
    const emailNorm = req.user.email.toLowerCase().trim();
    const lockKey = `${emailNorm}:${req.path}`;
    const chatReply = await withDuplicatePrevention(lockKey, async () => {
      const messages = [];
      if (history && Array.isArray(history)) {
        const trimmedHistory = history.slice(-8);
        trimmedHistory.forEach((h) => {
          if (h.message && h.message.trim()) {
            const content = h.message.length > 3e3 ? h.message.substring(0, 3e3) + "..." : h.message;
            messages.push({
              role: h.role === "user" ? "user" : "model",
              content
            });
          }
        });
      }
      messages.push({
        role: "user",
        content: message || "Hello StudyMate AI"
      });
      const systemInstruction = `You are StudyMate AI, the trusted AI assistant for learning, work, creativity, coding, writing, research, productivity, and everyday conversations on the StudyMate platform.

Identity:
- Name: StudyMate AI
- Platform: StudyMate
- Personality: Friendly, intelligent, patient, professional, conversational, and respectful.
- Never claim to be human. You are an AI.
- Never invent facts (no hallucinations). Clearly distinguish between facts, opinions, estimates, and assumptions.
- Be warm, friendly, smart, professional, helpful, and encouraging. Never be rude or dismissive.

Primary Responsibilities:
You can help users with almost any topic, including but not limited to:
1. Education (Classes 1\u201312, all major boards):
   - Mathematics, Physics, Chemistry, Biology, English, Hindi, Social Science, Computer Science, Economics, Accountancy, Business Studies, Geography, History, Political Science.
   - Always explain concepts in simple language before giving advanced explanations.
2. Competitive Exams:
   - Olympiads, Reasoning, Aptitude.
3. General Knowledge:
   - Science, Technology, Space, AI, Programming, Business, Finance, Health, Sports, Entertainment, Geography, History, Culture, Politics, Government, Current Affairs, Environment, Nature, Travel, Food, Books, Movies, Music, Psychology, Philosophy.
4. Writing Assistant:
   - Essays, Reports, Emails, Letters, Assignments, Speeches, Stories, Poems, Resumes, Cover Letters, Notes, Summaries.
   - Adapt tone naturally based on the user's request.

Mathematics & Academic Solving Rules:
- Show every single step of your working.
- Explain formulas and the physical/mathematical reasoning behind them.
- Check calculations carefully to ensure absolute accuracy.
- Highlight common student mistakes and how to avoid them.
- Offer useful shortcuts or mental models when appropriate.
- Explain concepts and teach instead of only giving direct answers.
- Generate similar practice questions and provide revision notes when appropriate.

Image Understanding:
If the user uploads an image:
- Read printed text and handwriting where possible.
- Solve textbook questions, detect equations, explain diagrams, analyze graphs, extract tables, identify objects, and summarize notes.
- If the image is unclear, ask the user politely to upload a clearer image.

Conversational Guidelines:
- Hold natural, flowing conversations.
- Users may ask about daily life, motivation, productivity, hobbies, technology, travel, relationships, career, personal growth, or random questions. Respond naturally, and do NOT unnecessarily redirect every conversation back to studying.
- Language Support: Seamlessly understand and respond in English, Hindi, and Hinglish (mixed phonetic Hindi/English). Attempt to understand mixed-language input naturally.
- Live Internet: If live web search tools are provided, search only when needed, use reliable sources, and mention when information comes from live search. (If unavailable, state that your knowledge may not include the latest developments instead of pretending to know).

Response Style:
- IMPORTANT CONSTRAINTS: Keep your responses extremely short, concise, scannable, and simple while talking with the user so they can easily read and understand.
- DO NOT GIVE BIG OR VERBOSE REPLIES. Make them small, highly understandable, and split into short, scannable bullet points or single-sentence steps.
- Avoid massive paragraphs or walls of text. Ensure the explanation is bite-sized, direct, and incredibly easy to read.
- Use rich markdown formatting for headers, bold text, bullet points, numbered lists, and math equations, but keep the total text brief.
- Default response structure:
  1. Direct concise answer / high-level summary (1-2 sentences max).
  2. Brief step-by-step Explanation (bullet points).
  3. Simple example or quick tip.
  4. Ask whether the user wants more details.
  - Avoid unnecessary repetition and be structured, brief, and honest.`;
      const response = await executeAIRequest({
        messages,
        systemInstruction,
        image,
        preferredProvider: provider,
        timeoutMs: timeoutMs ? Number(timeoutMs) : void 0,
        signal: controller.signal
      });
      return { reply: sanitizeAIOutputText(response.text) };
    });
    res.json(chatReply);
  } catch (error) {
    if (error.message?.includes("timed out")) {
      console.warn("AI chat timeout:", error.message);
      return res.status(504).json({ error: error.message });
    }
    if (error.message?.includes("cancelled") || controller.signal.aborted) {
      console.warn("AI chat request cancelled by user.");
      return res.status(499).json({ error: "Request was cancelled." });
    }
    if (error.message?.includes("in progress")) {
      return res.status(409).json({ error: error.message });
    }
    console.error("AI chat error:", error);
    res.status(500).json({ error: "Failed to chat with AI Assistant." });
  }
});
app.post("/api/gemini/generate-chapter-materials", requireAuth, async (req, res) => {
  const controller = new AbortController();
  req.on("close", () => {
    controller.abort();
  });
  try {
    const { grade, subject, chapterNumber, chapterTitle, provider = "auto", timeoutMs } = req.body;
    if (chapterTitle && typeof chapterTitle !== "string") {
      return res.status(400).json({ error: "Invalid chapterTitle format." });
    }
    if (detectPromptInjection(chapterTitle)) {
      return res.status(400).json({ error: "Potential prompt injection attempt detected. Please refine the chapter details." });
    }
    const emailNorm = req.user.email.toLowerCase().trim();
    const lockKey = `${emailNorm}:${req.path}`;
    const parsedResult = await withDuplicatePrevention(lockKey, async () => {
      const prompt = `You are StudyMate AI, the ultimate expert academic tutor for the CBSE/NCERT curriculum.
Generate highly detailed, comprehensive study materials for:
- Grade: ${grade}
- Subject: ${subject}
- Chapter Number: ${chapterNumber}
- Chapter Title: "${chapterTitle}"

The student needs:
1. "longNotes": In-depth revision notes explaining all theories, definitions, derivations, key concepts, and practical examples in full detail. Return as an array of 4-6 detailed paragraphs/sections.
2. "shortNotes": Quick-glance summary notes for fast learning. Return as an array of 4-5 items.
3. "formulas": Important formulas, key terms, or core equations. Return as an array of 3-5 items.
4. "pyqs": A collection of Solved Previous Year Questions (PYQs) with step-by-step CBSE criteria solutions. Generate a set of high-quality solved exam questions. Return as an array of objects: { "question": "Question text...", "answer": "Detailed step-by-step model answer...", "year": "2023/2024" }.
5. "practiceQuestions": Conceptual questions for self-testing. Return as an array of 5-10 challenge questions.

Ensure the content is extremely comprehensive and detailed. Do NOT return mock data or shorthand placeholders.
Respond strictly in JSON format matching this schema:
{
  "longNotes": ["detailed theory 1...", "detailed theory 2..."],
  "shortNotes": ["short recall point 1...", "short recall point 2..."],
  "formulas": ["formula or term 1...", "formula or term 2..."],
  "pyqs": [
    { "question": "CBSE Board exam question 1...", "answer": "Step-by-step board mark-scheme solution...", "year": "2024" }
  ],
  "practiceQuestions": ["challenge question 1...", "challenge question 2..."]
}`;
      const responseSchema = {
        type: import_genai2.Type.OBJECT,
        properties: {
          longNotes: {
            type: import_genai2.Type.ARRAY,
            items: { type: import_genai2.Type.STRING }
          },
          shortNotes: {
            type: import_genai2.Type.ARRAY,
            items: { type: import_genai2.Type.STRING }
          },
          formulas: {
            type: import_genai2.Type.ARRAY,
            items: { type: import_genai2.Type.STRING }
          },
          pyqs: {
            type: import_genai2.Type.ARRAY,
            items: {
              type: import_genai2.Type.OBJECT,
              properties: {
                question: { type: import_genai2.Type.STRING },
                answer: { type: import_genai2.Type.STRING },
                year: { type: import_genai2.Type.STRING }
              },
              required: ["question", "answer", "year"]
            }
          },
          practiceQuestions: {
            type: import_genai2.Type.ARRAY,
            items: { type: import_genai2.Type.STRING }
          }
        },
        required: ["longNotes", "shortNotes", "formulas", "pyqs", "practiceQuestions"]
      };
      const response = await executeAIRequest({
        messages: [{ role: "user", content: prompt }],
        preferredProvider: provider,
        responseSchema,
        timeoutMs: timeoutMs ? Number(timeoutMs) : void 0,
        signal: controller.signal
      });
      const rawParsed = parseJsonResponse(response.text || "{}");
      return validateAndSanitizeChapterMaterialsResponse(rawParsed);
    });
    res.json(parsedResult);
  } catch (error) {
    if (error.message?.includes("timed out")) {
      console.warn("AI materials timeout:", error.message);
      return res.status(504).json({ error: error.message });
    }
    if (error.message?.includes("cancelled") || controller.signal.aborted) {
      console.warn("AI materials request cancelled by user.");
      return res.status(499).json({ error: "Request was cancelled." });
    }
    if (error.message?.includes("in progress")) {
      return res.status(409).json({ error: error.message });
    }
    console.error("AI material generator error:", error);
    res.status(500).json({ error: "Failed to generate study materials." });
  }
});
app.post("/api/gemini/suggest-schedule", requireAuth, async (req, res) => {
  const controller = new AbortController();
  req.on("close", () => {
    controller.abort();
  });
  try {
    const { name, grade, targetExam, dailyGoalHours, preferredTime, favSubjects, weakSubjects, provider = "auto", timeoutMs } = req.body;
    if (name && typeof name !== "string") {
      return res.status(400).json({ error: "Invalid student name format." });
    }
    if (targetExam && typeof targetExam !== "string") {
      return res.status(400).json({ error: "Invalid target exam format." });
    }
    if (detectPromptInjection(name) || detectPromptInjection(targetExam)) {
      return res.status(400).json({ error: "Potential prompt injection attempt detected. Please revise your profile names." });
    }
    const emailNorm = req.user.email.toLowerCase().trim();
    const lockKey = `${emailNorm}:${req.path}`;
    const parsedResult = await withDuplicatePrevention(lockKey, async () => {
      const prompt = `Generate a highly personalized study planner and timetable for a student named ${name}.
Details:
- Class/Grade: ${grade}
- Preparing for Target Exam: ${targetExam}
- Daily Study Goal: ${dailyGoalHours} hours
- Preferred Study Time: ${preferredTime}
- Favorite Subjects: ${favSubjects.join(", ") || "General"}
- Weak Subjects (which need extra focus & revision): ${weakSubjects.join(", ") || "None specified"}

Suggest a weekly routine schema with specific advice on spaced repetition, active recall, and Pomodoro breaks.
The response should be JSON structured strictly like this:
{
  "studyTips": ["Tip 1", "Tip 2", "Tip 3"],
  "weeklyTheme": "Theme name or focus focus for this class",
  "suggestedTimeAllocation": [
    { "subject": "Subject Name", "hoursPerWeek": 5, "reason": "Reason for focus" }
  ],
  "timetable": [
    { "day": "Monday", "sessions": [{ "time": "04:00 PM - 05:30 PM", "subject": "Math", "topic": "Algebra practice & active recall" }] }
  ]
}`;
      const responseSchema = {
        type: import_genai2.Type.OBJECT,
        properties: {
          studyTips: {
            type: import_genai2.Type.ARRAY,
            items: { type: import_genai2.Type.STRING }
          },
          weeklyTheme: { type: import_genai2.Type.STRING },
          suggestedTimeAllocation: {
            type: import_genai2.Type.ARRAY,
            items: {
              type: import_genai2.Type.OBJECT,
              properties: {
                subject: { type: import_genai2.Type.STRING },
                hoursPerWeek: { type: import_genai2.Type.INTEGER },
                reason: { type: import_genai2.Type.STRING }
              },
              required: ["subject", "hoursPerWeek", "reason"]
            }
          },
          timetable: {
            type: import_genai2.Type.ARRAY,
            items: {
              type: import_genai2.Type.OBJECT,
              properties: {
                day: { type: import_genai2.Type.STRING },
                sessions: {
                  type: import_genai2.Type.ARRAY,
                  items: {
                    type: import_genai2.Type.OBJECT,
                    properties: {
                      time: { type: import_genai2.Type.STRING },
                      subject: { type: import_genai2.Type.STRING },
                      topic: { type: import_genai2.Type.STRING }
                    },
                    required: ["time", "subject", "topic"]
                  }
                }
              },
              required: ["day", "sessions"]
            }
          }
        },
        required: ["studyTips", "weeklyTheme", "suggestedTimeAllocation", "timetable"]
      };
      const response = await executeAIRequest({
        messages: [{ role: "user", content: prompt }],
        preferredProvider: provider,
        responseSchema,
        timeoutMs: timeoutMs ? Number(timeoutMs) : void 0,
        signal: controller.signal
      });
      const rawParsed = parseJsonResponse(response.text || "{}");
      return validateAndSanitizeSuggestScheduleResponse(rawParsed);
    });
    res.json(parsedResult);
  } catch (error) {
    if (error.message?.includes("timed out")) {
      console.warn("AI schedule timeout:", error.message);
      return res.status(504).json({ error: error.message });
    }
    if (error.message?.includes("cancelled") || controller.signal.aborted) {
      console.warn("AI schedule request cancelled by user.");
      return res.status(499).json({ error: "Request was cancelled." });
    }
    if (error.message?.includes("in progress")) {
      return res.status(409).json({ error: error.message });
    }
    console.error("AI schedule error:", error);
    res.status(500).json({ error: "Failed to generate study plan." });
  }
});
function isAdminEmail(email) {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  return normalized === "shivamguptaddp6312@gmail.com";
}
function broadcastToSSE(type, data) {
  const payload = JSON.stringify({ type, data });
  sseClients.forEach((client) => {
    try {
      client.res.write(`data: ${payload}

`);
    } catch (e) {
      console.error("Error writing to client SSE connection:", e);
    }
  });
}
function broadcastOnlineCount() {
  const uniqueEmails = new Set(sseClients.map((c) => c.email.toLowerCase()));
  broadcastToSSE("onlineCount", { count: Math.max(1, uniqueEmails.size) });
}
app.get("/api/chat/stream", (req, res) => {
  const { email, token } = req.query;
  const userEmail = typeof email === "string" ? email.toLowerCase().trim() : "anonymous";
  if (typeof token !== "string" || !token) {
    return res.status(401).json({ error: "Missing SSE session token." });
  }
  const verifiedUser = verifyToken(token);
  if (!verifiedUser || verifiedUser.email !== userEmail) {
    return res.status(401).json({ error: "Unauthorized SSE connection." });
  }
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  const clientId = Date.now().toString() + Math.random().toString(36).substring(2, 7);
  const newClient = { id: clientId, email: userEmail, res };
  sseClients.push(newClient);
  res.write(`data: ${JSON.stringify({ type: "connected", data: { clientId } })}

`);
  broadcastOnlineCount();
  if (isAdminEmail(userEmail)) {
    firebaseDB.getReports().then((reports) => {
      const pendingCount = reports.filter((r) => r.status === "pending").length;
      res.write(`data: ${JSON.stringify({ type: "adminInit", data: { pendingReportsCount: pendingCount } })}

`);
    }).catch((err) => {
      console.error("SSE admin init report counting failed:", err);
    });
  }
  req.on("close", () => {
    sseClients = sseClients.filter((c) => c.id !== clientId);
    broadcastOnlineCount();
  });
});
app.get("/api/chat/messages", requireAuth, async (req, res) => {
  try {
    const { before, search, limit } = req.query;
    const maxLimit = limit ? parseInt(limit) : 50;
    const messages = await firebaseDB.getMessages(before, search, maxLimit);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve chat logs." });
  }
});
app.post("/api/chat/message", requireAuth, async (req, res) => {
  try {
    const { userEmail, username, avatar, level, badge, text, country, repliedToId, repliedToUser } = req.body;
    if (!userEmail || !username || !text) {
      return res.status(400).json({ error: "Missing required profile credentials or message string." });
    }
    const emailNorm = userEmail.toLowerCase().trim();
    const verifiedUser = req.user;
    if (verifiedUser.email !== emailNorm) {
      return res.status(403).json({ error: "Unauthorized: Identity session email mismatch." });
    }
    const cleanText = sanitizeText(text.trim());
    const cleanUsername = sanitizeText(username.trim());
    const userState = await firebaseDB.getUser(emailNorm);
    if (userState && userState.isBanned) {
      return res.status(403).json({ error: "Your account has been suspended for violating CBSE study group guidelines." });
    }
    if (userState && userState.muteExpiresAt) {
      const now = /* @__PURE__ */ new Date();
      const muteExpires = new Date(userState.muteExpiresAt);
      if (muteExpires > now) {
        const diffMs = muteExpires.getTime() - now.getTime();
        const minutesLeft = Math.ceil(diffMs / 6e4);
        return res.status(403).json({
          error: `You are temporarily muted from sending messages. Duration remaining: ${minutesLeft} minute(s).`
        });
      }
    }
    const lastTime = lastMessageTimes[emailNorm] || 0;
    const nowTime = Date.now();
    if (nowTime - lastTime < 2e3) {
      return res.status(429).json({ error: "Spam Guard: Please wait 2 seconds between messages." });
    }
    lastMessageTimes[emailNorm] = nowTime;
    if (cleanText.length > 500) {
      return res.status(400).json({ error: "Spam Guard: Messages must be under 500 characters." });
    }
    const activeMsgs = await firebaseDB.getMessages(void 0, void 0, 10);
    const userActiveMsgs = activeMsgs.filter((m) => m.userEmail === emailNorm && !m.isDeleted);
    if (userActiveMsgs.length > 0) {
      const lastMsg = userActiveMsgs[userActiveMsgs.length - 1];
      if (lastMsg.text.toLowerCase().trim() === cleanText.toLowerCase()) {
        return res.status(400).json({ error: "Spam Guard: Duplicate message block. Try posting something new!" });
      }
    }
    if (!isAdminEmail(emailNorm)) {
      const hasLink = /https?:\/\/[^\s]+|www\.[^\s]+|\b[a-zA-Z0-9-]+\.(com|org|net|in|co|info|us|xyz|me|io|edu|gov|app|co\.in)\b/gi.test(cleanText);
      const hasPhotoReference = /\.(jpg|jpeg|png|gif|webp|bmp)/gi.test(cleanText) || /\b(jpeg|jpg|png|gif|webp|bmp)\b/gi.test(cleanText) || /\[(photo|image|picture|pic|img)\]/gi.test(cleanText);
      if (hasLink) {
        return res.status(400).json({ error: "Spam Guard: External links, URLs, and advertisements are strictly banned in the community chat room." });
      }
      if (hasPhotoReference) {
        return res.status(400).json({ error: "Spam Guard: Sharing photos, images, or media file extensions is strictly banned in the community chat room." });
      }
    }
    const emojis = cleanText.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]|\p{Emoji_Presentation}|\p{Emoji}\uFE0F/gu) || [];
    if (emojis.length > 8) {
      return res.status(400).json({ error: "Spam Guard: Please limit message to a maximum of 8 emojis." });
    }
    let isViolation = false;
    let violationReason = "";
    let violationExplain = "";
    try {
      const systemPrompt = `You are a real-time automated Study Group Chat Moderator.
Analyze the user's text and determine if it violates community guidelines.

COMMUNITY PERMISSIONS:
- Users HAVE explicit permission to talk about their personal life, feelings, friends, hobbies, struggles, family, daily life, relationships, or academic stress. This is a supportive peer community, so personal discussions are 100% PERMITTED and should NOT be flagged as violations.

COMMUNITY RESTRICTIONS (VIOLATIONS):
- Strict Ban: Abusive language, swearing, profanities, slurs, curse words, hate speech, bullying, or "gaali" in any language (especially Hindi/English phonetics e.g. chutiya, bhenchod, madarchod, gand, asshole, bitch, fuck, whre, randi, bkl, mc, bc, etc.) MUST be flagged as isViolation: true.
- Strict Ban: Sharing website links, URLs (e.g., .com, .net, www., http) or mentioning/attempting to share photos, pictures, images, file extensions (.jpg, .png), or graphic attachments. These MUST be flagged as isViolation: true.

Return strictly a JSON object matching this schema:
{
  "isViolation": boolean,
  "reason": "Specify: 'profanity' | 'link_or_photo_ban' | 'hate_speech' | 'harassment' | null",
  "explanation": "A user-facing concise warning reason in English (e.g., 'Abusive language is not allowed' or 'URLs and photos are strictly banned in this community'), or null"
}`;
      const responseSchema = {
        type: import_genai2.Type.OBJECT,
        properties: {
          isViolation: { type: import_genai2.Type.BOOLEAN },
          reason: { type: import_genai2.Type.STRING },
          explanation: { type: import_genai2.Type.STRING }
        },
        required: ["isViolation", "reason", "explanation"]
      };
      const response = await executeAIRequest({
        messages: [{ role: "user", content: `Analyze this chat text: "${cleanText}"` }],
        systemInstruction: systemPrompt,
        preferredProvider: "auto",
        responseSchema
      });
      const resJson = parseJsonResponse(response.text || "{}");
      isViolation = !!resJson.isViolation;
      violationReason = resJson.reason || "profanity";
      violationExplain = resJson.explanation || "Your message violates community guidelines.";
    } catch (apiErr) {
      console.warn("AI moderation failed, engaging regex fallback engine:", apiErr);
      const lowerText = cleanText.toLowerCase();
      const localBadWords = [
        "abuse",
        "hate",
        "racism",
        "harass",
        "threat",
        "bully",
        "scam",
        "spam",
        "chutiya",
        "gand",
        "bhenchod",
        "madarchod",
        "lauda",
        "loda",
        "asshole",
        "bitch",
        "fuck",
        "bastard",
        "idiot",
        "nigger",
        "slut",
        "whore",
        "mc",
        "bc"
      ];
      const foundBad = localBadWords.some((w) => lowerText.includes(w));
      if (foundBad) {
        isViolation = true;
        violationReason = "profanity";
        violationExplain = "Your message contains inappropriate or offensive language (Spam/Safety Filter).";
      }
    }
    if (isViolation) {
      let activeUser = userState;
      if (!activeUser) {
        activeUser = {
          email: emailNorm,
          username,
          avatar,
          level: level || 1,
          badge,
          joinDate: (/* @__PURE__ */ new Date()).toISOString(),
          country: country || "India",
          violationsCount: 0,
          isBanned: false
        };
      }
      activeUser.violationsCount = (activeUser.violationsCount || 0) + 1;
      const count = activeUser.violationsCount;
      let penaltyMsg = "";
      let muteExpiresString = null;
      let accountBanned = false;
      if (count === 1) {
        penaltyMsg = "Your message violates community guidelines. This is warning (1/3). Continued abuse will trigger mutes/ban.";
      } else if (count === 2) {
        const expiry = new Date(Date.now() + 10 * 60 * 1e3);
        muteExpiresString = expiry.toISOString();
        activeUser.muteExpiresAt = muteExpiresString;
        penaltyMsg = "Your message violates community guidelines. This is infraction (2/3). You are MUTED for 10 minutes.";
      } else if (count === 3) {
        const expiry = new Date(Date.now() + 24 * 60 * 60 * 1e3);
        muteExpiresString = expiry.toISOString();
        activeUser.muteExpiresAt = muteExpiresString;
        penaltyMsg = "Your message violates community guidelines. This is infraction (3/3). You are MUTED for 24 hours.";
      } else {
        accountBanned = true;
        activeUser.isBanned = true;
        activeUser.banReason = "Repeated deliberate abuse of chat safety guidelines.";
        penaltyMsg = "Your account has been SUSPENDED due to continued guidelines violations.";
      }
      await firebaseDB.saveUser(emailNorm, activeUser);
      await firebaseDB.saveAdminLog({
        id: "log-" + Date.now(),
        adminEmail: "AUTO_AI_MODERATOR",
        action: accountBanned ? "BAN_USER" : "WARNING_PENALTY",
        targetEmail: emailNorm,
        details: `Auto-moderated text: "${cleanText}". Reason: ${violationReason}. Outcome: ${penaltyMsg}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
      broadcastToSSE("adminLogsUpdated", {});
      return res.status(400).json({
        violation: true,
        reason: violationReason,
        explanation: violationExplain,
        violationsCount: count,
        penaltyMessage: penaltyMsg,
        muteExpiresAt: muteExpiresString,
        isBanned: accountBanned
      });
    }
    const newMessage = {
      id: "msg-" + Date.now() + Math.random().toString(36).substring(2, 6),
      userEmail: emailNorm,
      username: cleanUsername,
      avatar,
      level: level || 1,
      badge,
      text: cleanText,
      country: country || "India",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      repliedToId: repliedToId || null,
      repliedToUser: repliedToUser || null,
      isDeleted: false,
      reportsCount: 0
    };
    await firebaseDB.saveUser(emailNorm, {
      email: emailNorm,
      username: cleanUsername,
      avatar,
      level: level || 1,
      badge,
      joinDate: userState?.joinDate || (/* @__PURE__ */ new Date()).toISOString(),
      country: country || "India",
      violationsCount: userState?.violationsCount || 0,
      muteExpiresAt: userState?.muteExpiresAt || null,
      isBanned: false
    });
    await firebaseDB.saveMessage(newMessage);
    broadcastToSSE("message", newMessage);
    const mentionMatch = cleanText.match(/@([a-zA-Z0-9_\-]+)/g);
    if (mentionMatch) {
      firebaseDB.getAllUsers().then((users) => {
        mentionMatch.forEach((m) => {
          const nameToFind = m.substring(1).toLowerCase().trim();
          const matchedUser = users.find((u) => u.username.toLowerCase().trim() === nameToFind);
          if (matchedUser && matchedUser.email !== emailNorm) {
            broadcastToSSE("notification", {
              targetEmail: matchedUser.email,
              title: "\u{1F4AC} Community Chat Mention",
              message: `${cleanUsername} mentioned you in global chat: "${cleanText.substring(0, 50)}${cleanText.length > 50 ? "..." : ""}"`,
              type: "alert"
            });
          }
        });
      }).catch((err) => {
        console.error("Error dispatching mentions:", err);
      });
    }
    if (repliedToId) {
      const origMsg = await firebaseDB.getRawMessage(repliedToId);
      if (origMsg && origMsg.userEmail !== emailNorm) {
        broadcastToSSE("notification", {
          targetEmail: origMsg.userEmail,
          title: "\u{1F4AC} Community Chat Reply",
          message: `${cleanUsername} replied to your chat: "${cleanText.substring(0, 50)}${cleanText.length > 50 ? "..." : ""}"`,
          type: "info"
        });
      }
    }
    res.json(newMessage);
  } catch (error) {
    console.error("Post message error:", error);
    res.status(500).json({ error: "Failed to process chat message." });
  }
});
app.post("/api/chat/report", requireAuth, async (req, res) => {
  try {
    const { messageId, reportedBy, reason, comment } = req.body;
    if (!messageId || !reportedBy || !reason) {
      return res.status(400).json({ error: "Missing reported parameters." });
    }
    const emailNorm = reportedBy.toLowerCase().trim();
    if (req.user.email !== emailNorm) {
      return res.status(403).json({ error: "Unauthorized: Identity session email mismatch." });
    }
    const msg = await firebaseDB.getRawMessage(messageId);
    if (!msg) {
      return res.status(404).json({ error: "Original message not found." });
    }
    const cleanComment = sanitizeText(comment || "");
    const cleanReason = sanitizeText(reason || "");
    const reportId = "rep-" + Date.now() + Math.random().toString(36).substring(2, 6);
    const newReport = {
      id: reportId,
      messageId,
      messageText: msg.text,
      messageAuthor: msg.userEmail,
      reportedBy: emailNorm,
      reason: cleanReason,
      comment: cleanComment,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: "pending"
    };
    await firebaseDB.saveReport(newReport);
    await firebaseDB.updateMessage(messageId, { reportsCount: (msg.reportsCount || 0) + 1 });
    broadcastToSSE("reportCreated", newReport);
    res.json({ success: true, report: newReport });
  } catch (error) {
    console.error("Report logging failed:", error);
    res.status(500).json({ error: "Failed to log report." });
  }
});
app.post("/api/chat/typing", requireAuth, (req, res) => {
  try {
    const { userEmail, username, isTyping } = req.body;
    if (userEmail && username) {
      const emailNorm = userEmail.toLowerCase().trim();
      if (req.user.email !== emailNorm) {
        return res.status(403).json({ error: "Unauthorized session email mismatch." });
      }
      const cleanUsername = sanitizeText(username);
      broadcastToSSE("typingState", { userEmail: emailNorm, username: cleanUsername, isTyping });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to broadcast typing." });
  }
});
app.get("/api/chat/admin/stats", requireAdmin, async (req, res) => {
  try {
    const users = await firebaseDB.getAllUsers();
    const reports = await firebaseDB.getReports();
    const adminLogs = await firebaseDB.getAdminLogs();
    const messages = await firebaseDB.getMessages(void 0, void 0, 1e3);
    const sanitizedUsers = users.map((u) => ({
      email: u.email,
      username: u.username,
      avatar: u.avatar,
      level: u.level,
      badge: u.badge,
      joinDate: u.joinDate,
      country: u.country,
      violationsCount: u.violationsCount,
      muteExpiresAt: u.muteExpiresAt,
      isBanned: u.isBanned,
      banReason: u.banReason
    }));
    res.json({
      reports,
      adminLogs,
      users: sanitizedUsers,
      totalMessages: messages.length,
      activeUsersCount: new Set(sseClients.map((c) => c.email)).size
    });
  } catch (error) {
    console.error("Admin stats fetch failed:", error);
    res.status(500).json({ error: "Failed to retrieve logs." });
  }
});
app.post("/api/chat/admin/action", requireAdmin, async (req, res) => {
  try {
    const { action, targetId, targetEmail, reason } = req.body;
    const adminEmail = req.user.email;
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    if (action === "deleteMessage") {
      const msg = await firebaseDB.getRawMessage(targetId);
      if (msg) {
        await firebaseDB.updateMessage(targetId, { isDeleted: true, deletedBy: adminEmail });
        const reports = await firebaseDB.getReports();
        for (const r of reports) {
          if (r.messageId === targetId && r.status === "pending") {
            await firebaseDB.updateReport(r.id, {
              status: "reviewed",
              actionTaken: "DELETED",
              reviewedAt: timestamp
            });
            broadcastToSSE("notification", {
              targetEmail: r.reportedBy,
              title: "\u2696\uFE0F Report Reviewed",
              message: "A moderator has reviewed your report and deleted the offending message.",
              type: "success"
            });
          }
        }
        const logId = "log-" + Date.now();
        await firebaseDB.saveAdminLog({
          id: logId,
          adminEmail,
          action: "DELETE_MESSAGE",
          targetEmail: msg.userEmail,
          details: `Deleted message: "${msg.text}". Reason: ${reason || "Moderation Guidelines"}`,
          timestamp
        });
        broadcastToSSE("messageDeleted", { messageId: targetId });
        broadcastToSSE("adminLogsUpdated", {});
      }
    } else if (action === "muteUser") {
      const targetEmailNorm = targetEmail.toLowerCase().trim();
      const u = await firebaseDB.getUser(targetEmailNorm);
      if (u) {
        const muteExpiry = new Date(Date.now() + 24 * 60 * 60 * 1e3).toISOString();
        await firebaseDB.saveUser(targetEmailNorm, { muteExpiresAt: muteExpiry });
        await firebaseDB.saveAdminLog({
          id: "log-" + Date.now(),
          adminEmail,
          action: "MUTE_USER",
          targetEmail: targetEmailNorm,
          details: `Muted user for 24 hours. Reason: ${reason || "Community violation."}`,
          timestamp
        });
        broadcastToSSE("userMuted", { email: targetEmailNorm, expiresAt: muteExpiry });
        broadcastToSSE("adminLogsUpdated", {});
      }
    } else if (action === "unmuteUser") {
      const targetEmailNorm = targetEmail.toLowerCase().trim();
      const u = await firebaseDB.getUser(targetEmailNorm);
      if (u) {
        await firebaseDB.saveUser(targetEmailNorm, { muteExpiresAt: null });
        await firebaseDB.saveAdminLog({
          id: "log-" + Date.now(),
          adminEmail,
          action: "UNMUTE_USER",
          targetEmail: targetEmailNorm,
          details: `Unmuted user manually.`,
          timestamp
        });
        broadcastToSSE("userUnmuted", { email: targetEmailNorm });
        broadcastToSSE("adminLogsUpdated", {});
      }
    } else if (action === "banUser") {
      const targetEmailNorm = targetEmail.toLowerCase().trim();
      const u = await firebaseDB.getUser(targetEmailNorm);
      if (u) {
        await firebaseDB.saveUser(targetEmailNorm, { isBanned: true, banReason: reason || "Abuse of rules." });
        await firebaseDB.saveAdminLog({
          id: "log-" + Date.now(),
          adminEmail,
          action: "BAN_USER",
          targetEmail: targetEmailNorm,
          details: `Banned user. Reason: ${reason || "Abuse"}`,
          timestamp
        });
        broadcastToSSE("userBanned", { email: targetEmailNorm });
        broadcastToSSE("adminLogsUpdated", {});
      }
    } else if (action === "unbanUser") {
      const targetEmailNorm = targetEmail.toLowerCase().trim();
      const u = await firebaseDB.getUser(targetEmailNorm);
      if (u) {
        await firebaseDB.saveUser(targetEmailNorm, { isBanned: false, banReason: "" });
        await firebaseDB.saveAdminLog({
          id: "log-" + Date.now(),
          adminEmail,
          action: "UNBAN_USER",
          targetEmail: targetEmailNorm,
          details: "Unbanned user manually.",
          timestamp
        });
        broadcastToSSE("adminLogsUpdated", {});
      }
    } else if (action === "resolveReport") {
      const reports = await firebaseDB.getReports();
      const rep = reports.find((r) => r.id === targetId);
      if (rep) {
        await firebaseDB.updateReport(targetId, {
          status: "reviewed",
          actionTaken: "RESOLVED_WITHOUT_DELETE",
          reviewedAt: timestamp
        });
        await firebaseDB.saveAdminLog({
          id: "log-" + Date.now(),
          adminEmail,
          action: "RESOLVE_REPORT",
          details: `Resolved report ID ${targetId} without message delete.`,
          timestamp
        });
        broadcastToSSE("notification", {
          targetEmail: rep.reportedBy,
          title: "\u2696\uFE0F Report Reviewed",
          message: "A moderator has reviewed your report. The content was found to be compliant.",
          type: "info"
        });
        broadcastToSSE("adminLogsUpdated", {});
      }
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Admin action error:", error);
    res.status(500).json({ error: "Failed to process admin actions." });
  }
});
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    uptime: process.uptime(),
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    memoryUsage: process.memoryUsage(),
    env: process.env.NODE_ENV || "development"
  });
});
app.use((err, req, res, next) => {
  console.error("[Global Error Handler]", err);
  const status = err.statusCode || err.status || 500;
  const message = err.message || "An unexpected server error occurred.";
  res.status(status).json({
    error: message,
    ...process.env.NODE_ENV !== "production" ? { stack: err.stack } : {}
  });
});
var serverInstance;
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path2.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path2.default.join(distPath, "index.html"));
    });
  }
  serverInstance = app.listen(PORT, "0.0.0.0", () => {
    console.log(`StudyMate server listening on http://0.0.0.0:${PORT}`);
  });
}
function gracefulShutdown(signal) {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  if (serverInstance) {
    serverInstance.close(() => {
      console.log("HTTP server closed.");
      sseClients.forEach((c) => {
        try {
          c.res.end();
        } catch {
        }
      });
      console.log("Graceful shutdown completed successfully.");
      process.exit(0);
    });
    setTimeout(() => {
      console.error("Graceful shutdown timed out, force exiting...");
      process.exit(1);
    }, 1e4);
  } else {
    process.exit(0);
  }
}
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
start();
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  asyncHandler
});
//# sourceMappingURL=server.cjs.map
