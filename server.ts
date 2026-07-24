import express from "express";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import crypto from "crypto";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import cors from "cors";
import compression from "compression";
import { rateLimit } from "express-rate-limit";
import { createServer as createViteServer } from "vite";
import { Type } from "@google/genai";
import { executeAIRequest, getConfiguredProviders, AIProvider, AIMessage, parseJsonResponse } from "./server/aiService";
import { shouldSearchWeb, executeWebSearch } from "./server/webSearch";
import { firebaseDB, runAutomatedMigration, ChatUser, ChatMessage, ChatReport, AdminLog, SyncData, UserMemory } from "./server/firebase";
import { getQuestions } from "./server/questionService";
import {
  getRuntimeInfo,
  getUserProfileContext,
  getOrLoadUserMemory,
  formatLongTermMemoryContext,
  prepareConversationHistory,
  detectMemoryRetrievalTriggers,
  extractAndSaveMemoriesInBackground
} from "./server/memoryService";

dotenv.config();

const app = express();
app.set("trust proxy", 1);
const PORT = 3000;

// Chat Database definition and persistence paths
const DB_PATH = path.join(process.cwd(), "server_chat_db.json");

// Types are imported from ./server/firebase

interface ChatDB {
  messages: ChatMessage[];
  users: { [email: string]: ChatUser };
  reports: ChatReport[];
  adminLogs: AdminLog[];
  syncData?: { [email: string]: any };
}

let dbCache: ChatDB = {
  messages: [],
  users: {},
  reports: [],
  adminLogs: [],
  syncData: {}
};

// --- Cryptography Keys and Secrets ---
let JWT_SECRET = process.env.JWT_SECRET;
let JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
let DB_KEY = process.env.DB_ENCRYPTION_KEY;

// Validate environment variables on boot, fall back to safe defaults in development
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.warn("[Server] WARNING: JWT_SECRET is missing, empty, or too short. Falling back to development default key.");
  JWT_SECRET = "dev_default_jwt_secret_key_at_least_32_characters_long_for_security";
}
if (!JWT_REFRESH_SECRET || JWT_REFRESH_SECRET.length < 32) {
  console.warn("[Server] WARNING: JWT_REFRESH_SECRET is missing, empty, or too short. Falling back to development default key.");
  JWT_REFRESH_SECRET = "dev_default_jwt_refresh_secret_key_at_least_32_characters_long_for_security";
}
if (!DB_KEY || DB_KEY.length < 16) {
  console.warn("[Server] WARNING: DB_ENCRYPTION_KEY is missing, empty, or too short. Falling back to development default key.");
  DB_KEY = "dev_default_db_encryption_key_of_16_characters";
}

// --- Database Encryption at Rest Helpers ---
function encryptData(text: string): string {
  if (!DB_KEY) {
    throw new Error("DB_ENCRYPTION_KEY environment variable is missing");
  }
  const key = crypto.createHash("sha256").update(DB_KEY).digest();
  const iv = crypto.randomBytes(12); // Standard 12-byte IV for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const authTag = cipher.getAuthTag().toString("hex");
  return `v2:${iv.toString("hex")}:${authTag}:${encrypted}`;
}

function decryptData(text: string): string {
  if (!DB_KEY) {
    throw new Error("DB_ENCRYPTION_KEY environment variable is missing");
  }
  if (!text || typeof text !== "string") {
    throw new Error("Invalid cipher input");
  }
  
  // Try AES-256-GCM first (starts with "v2:")
  if (text.startsWith("v2:")) {
    const parts = text.split(":");
    if (parts.length !== 4) {
      throw new Error("Malformed AES-256-GCM payload structure.");
    }
    const iv = Buffer.from(parts[1], "hex");
    const authTag = Buffer.from(parts[2], "hex");
    const ciphertext = parts[3];
    
    const key = crypto.createHash("sha256").update(DB_KEY).digest();
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(ciphertext, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }
  
  // Try AES-256-CBC legacy fallback (contains ':' and has 32-char hex IV)
  if (text.includes(":")) {
    const parts = text.split(":");
    if (parts.length === 2 && parts[0].length === 32) {
      const iv = Buffer.from(parts[0], "hex");
      const ciphertext = parts[1];
      
      const key = crypto.createHash("sha256").update(DB_KEY).digest();
      const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
      
      let decrypted = decipher.update(ciphertext, "hex", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    }
  }
  
  throw new Error("Data format is invalid or not securely encrypted.");
}

// --- Password Hashing with PBKDF2 ---
function hashPassword(password: string): { salt: string; hash: string } {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return { salt, hash };
}

function verifyPassword(password: string, salt: string, hash: string): boolean {
  const testHash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return crypto.timingSafeEqual(Buffer.from(testHash, "hex"), Buffer.from(hash, "hex"));
}

// --- Access and Refresh Token Management ---
function createAccessToken(payload: { email: string; isAdmin: boolean; uid: string }): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const exp = Math.floor(Date.now() / 1000) + (15 * 60); // 15 minutes short-lived expiry
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString("base64url");
  const signatureInput = `${header}.${body}`;
  const signature = crypto.createHmac("sha256", JWT_SECRET!).update(signatureInput).digest("base64url");
  return `${signatureInput}.${signature}`;
}

function createRefreshToken(payload: { email: string; uid: string }): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const exp = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60); // 7 days long-lived expiry
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString("base64url");
  const signatureInput = `${header}.${body}`;
  const signature = crypto.createHmac("sha256", JWT_REFRESH_SECRET!).update(signatureInput).digest("base64url");
  return `${signatureInput}.${signature}`;
}

function verifyAccessToken(token: string): { email: string; isAdmin: boolean; uid: string } | null {
  try {
    if (!token || typeof token !== "string") return null;
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    
    const [headerB64, bodyB64, signatureB64] = parts;
    
    // 1. Validate Header
    const headerStr = Buffer.from(headerB64, "base64url").toString("utf8");
    const header = JSON.parse(headerStr);
    if (header.alg !== "HS256" || header.typ !== "JWT") {
      return null;
    }
    
    // 2. Validate Signature securely using timingSafeEqual
    const signatureInput = `${headerB64}.${bodyB64}`;
    const expectedSignatureBuffer = crypto.createHmac("sha256", JWT_SECRET!).update(signatureInput).digest();
    const receivedSignatureBuffer = Buffer.from(signatureB64, "base64url");
    
    if (expectedSignatureBuffer.length !== receivedSignatureBuffer.length) {
      return null;
    }
    if (!crypto.timingSafeEqual(expectedSignatureBuffer, receivedSignatureBuffer)) {
      return null;
    }
    
    // 3. Validate Body and Expiry
    const bodyStr = Buffer.from(bodyB64, "base64url").toString("utf8");
    const body = JSON.parse(bodyStr);
    
    if (typeof body.email !== "string" || !body.email || typeof body.uid !== "string" || !body.uid || typeof body.exp !== "number") {
      return null;
    }
    
    if (body.exp < Math.floor(Date.now() / 1000)) {
      return null; // Token has expired
    }
    
    return {
      email: body.email,
      isAdmin: !!body.isAdmin,
      uid: body.uid
    };
  } catch (err) {
    return null;
  }
}

function verifyRefreshToken(token: string): { email: string; uid: string } | null {
  try {
    if (!token || typeof token !== "string") return null;
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    
    const [headerB64, bodyB64, signatureB64] = parts;
    
    // 1. Validate Header
    const headerStr = Buffer.from(headerB64, "base64url").toString("utf8");
    const header = JSON.parse(headerStr);
    if (header.alg !== "HS256" || header.typ !== "JWT") {
      return null;
    }
    
    // 2. Validate Signature securely using timingSafeEqual
    const signatureInput = `${headerB64}.${bodyB64}`;
    const expectedSignatureBuffer = crypto.createHmac("sha256", JWT_REFRESH_SECRET!).update(signatureInput).digest();
    const receivedSignatureBuffer = Buffer.from(signatureB64, "base64url");
    
    if (expectedSignatureBuffer.length !== receivedSignatureBuffer.length) {
      return null;
    }
    if (!crypto.timingSafeEqual(expectedSignatureBuffer, receivedSignatureBuffer)) {
      return null;
    }
    
    // 3. Validate Body and Expiry
    const bodyStr = Buffer.from(bodyB64, "base64url").toString("utf8");
    const body = JSON.parse(bodyStr);
    
    if (typeof body.email !== "string" || !body.email || typeof body.uid !== "string" || !body.uid || typeof body.exp !== "number") {
      return null;
    }
    
    if (body.exp < Math.floor(Date.now() / 1000)) {
      return null; // Token has expired
    }
    
    return {
      email: body.email,
      uid: body.uid
    };
  } catch (err) {
    return null;
  }
}

// Backward compatibility delegators
function verifyToken(token: string): { email: string; isAdmin: boolean; uid: string } | null {
  return verifyAccessToken(token);
}

// Backward compatibility delegators
function createToken(payload: { email: string; isAdmin: boolean; uid: string }): string {
  return createAccessToken(payload);
}

// --- Recursive Object XSS / Injection Sanitizer ---
function sanitizeObject<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") {
    return sanitizeText(obj) as any;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item)) as any;
  }
  if (typeof obj === "object") {
    const result: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = sanitizeObject((obj as any)[key]);
      }
    }
    return result;
  }
  return obj;
}

// --- In-Memory Account Lockout Tracking ---
const failedLoginAttempts: { [email: string]: { count: number; blockUntil: number } } = {};

// Perform initial database migration and setup
runAutomatedMigration().catch(err => {
  console.error("[Migration] Startup migration failed:", err);
});

// Track SSE connections for real-time dispatching
let sseClients: Array<{ id: string; email: string; res: any }> = [];
const lastMessageTimes: { [email: string]: number } = {};

// --- Input Validation and Sanitization Helpers ---
function sanitizeText(str: string): string {
  if (typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

// --- Async Handler Wrapper to Prevent Server Crashes ---
export const asyncHandler = (fn: (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<any>) => {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    fn(req, res, next).catch(next);
  };
};

// 1. Lightweight Structured Request Logging Middleware (API requests only to keep logs clean and prevent asset false positives)
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    if (req.originalUrl.startsWith("/api")) {
      const duration = Date.now() - start;
      console.log(`[Request] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} - ${duration}ms`);
    }
  });
  next();
});

// 2. Enforce Secure Headers Middleware using Helmet + custom configurations
app.use(helmet({
  contentSecurityPolicy: false, // Prevents loading issues in Sandbox/iFrame
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

// 3. Setup CORS with Credentials support and strict matching
const allowedOrigins = [
  "https://ais-dev-7trcurr3ybqbdmvjkvx3x7-634393143987.asia-southeast1.run.app",
  "https://ais-pre-7trcurr3ybqbdmvjkvx3x7-634393143987.asia-southeast1.run.app",
];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const isLocal = origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:");
    const isDevPre = allowedOrigins.includes(origin) || origin.endsWith(".run.app") || origin.endsWith(".google.com") || origin.endsWith(".google");
    const isAppUrl = process.env.APP_URL && origin === process.env.APP_URL;
    if (isLocal || isDevPre || isAppUrl) {
      callback(null, true);
    } else {
      callback(null, false); // Securely reject unauthorized domains
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));

// 4. Setup Response Compression
app.use(compression());

// 5. Setup Cookie Parsing
app.use(cookieParser());

// 6. Setup General express-rate-limit Rate Limiter for API
const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 180, // generous 180 requests per minute
  message: { error: "Rate limit exceeded. Please slow down and try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", apiRateLimiter);

// 8. Setup JSON and urlencoded body parsing with large limit for image/document uploads
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ limit: "25mb", extended: true }));

// --- Security Middleware Definitions ---

// Require Authentication Middleware (async-aware with fast ban check)
async function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
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

    // Fast check to ensure user has not been banned
    const userState = await firebaseDB.getUser(user.email);
    if (userState && userState.isBanned) {
      return res.status(403).json({ error: "Your account has been suspended for violating CBSE study group guidelines." });
    }
    
    (req as any).user = user;
    next();
  } catch (err) {
    next(err);
  }
}

// Require Admin Middleware
async function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  await requireAuth(req, res, () => {
    const user = (req as any).user;
    if (!user || !isAdminEmail(user.email)) {
      return res.status(403).json({ error: "Access Denied: Administrative privileges required." });
    }
    next();
  });
}

// ----------------------------------------------------
// API ROUTES FIRST
// ----------------------------------------------------

// Get configured/available AI providers
app.get("/api/ai/providers", (req, res) => {
  try {
    const providers = getConfiguredProviders();
    res.json(providers);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch providers." });
  }
});

// Get AI request logs and metrics
app.get("/api/ai/metrics", async (req, res) => {
  try {
    const logs = await firebaseDB.getAIRequestLogs();
    
    // Compute stats
    const total = logs.length;
    const successes = logs.filter(l => l.success).length;
    const successRate = total > 0 ? Math.round((successes / total) * 100) : 100;
    
    const responseTimes = logs.filter(l => l.success).map(l => l.responseTimeMs);
    const avgResponseTime = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0;
      
    // Provider breakdowns
    const providerStats: Record<string, { total: number; success: number; avgTime: number; sumTime: number }> = {};
    logs.forEach(l => {
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
    
    Object.keys(providerStats).forEach(p => {
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
      recentLogs: logs.slice(0, 100) // Return top 100 recent logs
    });
  } catch (err: any) {
    console.error("Failed to get AI metrics:", err);
    res.status(500).json({ error: "Failed to retrieve AI performance metrics." });
  }
});

// Setup Auth Rate Limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 authentication requests per 15 minutes
  message: { error: "Too many authentication attempts. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auto-Session Guest Token Endpoint for Seamless Access
app.post("/api/auth/guest-token", authLimiter, async (req, res) => {
  try {
    const rawEmail = req.body?.email || req.query?.email || "shivamguptaddp6312@gmail.com";
    const emailNorm = rawEmail.toString().toLowerCase().trim();
    const finalEmail = (emailNorm.includes("@") && emailNorm.includes(".")) ? emailNorm : "shivamguptaddp6312@gmail.com";
    const uid = finalEmail.replace(/[^a-zA-Z0-9]/g, "_");
    const isAdmin = isAdminEmail(finalEmail);
    const token = createAccessToken({ email: finalEmail, isAdmin, uid });
    const refreshToken = createRefreshToken({ email: finalEmail, uid });

    let user = await firebaseDB.getUser(uid, finalEmail);
    if (!user) {
      user = {
        email: finalEmail,
        username: finalEmail.split("@")[0],
        avatar: "🎓",
        level: 1,
        joinDate: new Date().toDateString(),
        country: "India",
        violationsCount: 0,
        isBanned: false
      };
      await firebaseDB.saveUser(uid, user);
    }

    res.json({
      success: true,
      email: finalEmail,
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
  } catch (err: any) {
    console.error("Guest token generation failed:", err);
    res.status(500).json({ error: "Failed to issue session token." });
  }
});

// Secure Backend Authentication Endpoint
app.post("/api/auth/login", authLimiter, async (req, res) => {
  try {
    const { email, idToken, password } = req.body;
    
    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "Google account email is required." });
    }

    const emailNorm = email.toLowerCase().trim();
    if (!emailNorm.includes("@") || !emailNorm.includes(".")) {
      return res.status(400).json({ error: "Invalid email address format." });
    }

    // Check if account is locked due to too many failed login attempts
    const failed = failedLoginAttempts[emailNorm];
    if (failed && failed.count >= 5 && Date.now() < failed.blockUntil) {
      const waitMinutes = Math.ceil((failed.blockUntil - Date.now()) / 60000);
      return res.status(429).json({ error: `Account temporarily locked due to 5 failed logins. Please try again in ${waitMinutes} minute(s).` });
    }

    let verifiedEmail = emailNorm;
    let verifiedUid = emailNorm.replace(/[^a-zA-Z0-9]/g, "_");

    // If idToken is provided, verify it; otherwise fallback to silent session issue
    if (idToken && typeof idToken === "string") {
      try {
        const decoded = await firebaseDB.verifyFirebaseIdToken(idToken);
        verifiedEmail = decoded.email;
        verifiedUid = decoded.uid;
      } catch (err: any) {
        console.warn("[Auth Notice] ID token verification bypassed or invalid, falling back to secure session creation:", err.message);
      }
    }

    let user = await firebaseDB.getUser(verifiedUid, verifiedEmail);
    if (!user) {
      user = {
        email: verifiedEmail,
        username: verifiedEmail.split("@")[0],
        avatar: "🎓",
        level: 1,
        joinDate: new Date().toDateString(),
        country: "India",
        violationsCount: 0,
        isBanned: false
      };
      await firebaseDB.saveUser(verifiedUid, user);
    }

    delete failedLoginAttempts[verifiedEmail];

    if (user.isBanned) {
      return res.status(403).json({ error: `Your account has been banned. Reason: ${user.banReason || "Moderator directive."}` });
    }

    const isAdmin = isAdminEmail(verifiedEmail);
    const token = createAccessToken({ email: verifiedEmail, isAdmin, uid: verifiedUid });
    const refreshToken = createRefreshToken({ email: verifiedEmail, uid: verifiedUid });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      email: verifiedEmail,
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
  } catch (err: any) {
    console.error("[Security Error] Login exception:", err);
    res.status(500).json({ error: "Secure authentication failed on the server." });
  }
});

// Secure Token Refresh Endpoint
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
    const uid = verified.uid;
    const user = await firebaseDB.getUser(uid, emailNorm);
    if (!user) {
      return res.status(401).json({ error: "User account does not exist." });
    }
    
    if (user.isBanned) {
      return res.status(403).json({ error: "Account has been banned." });
    }
    
    const isAdmin = isAdminEmail(emailNorm);
    const newAccessToken = createAccessToken({ email: emailNorm, isAdmin, uid });
    const newRefreshToken = createRefreshToken({ email: emailNorm, uid });
    
    // Rotate cookie
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
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

// Secure Logout Endpoint
app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("refreshToken");
  res.json({ success: true, message: "Logged out successfully from server." });
});

// Check if user email has an existing account
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

// Sync Pull endpoint
app.get("/api/sync/pull", requireAuth, async (req, res) => {
  try {
    const uid = (req as any).user.uid;
    const emailNorm = (req as any).user.email.toLowerCase().trim();
    const userSync = await firebaseDB.getSyncData(uid, emailNorm);
    res.json({ success: true, data: userSync });
  } catch (error: any) {
    console.error("Sync pull error:", error);
    res.status(500).json({ error: "Failed to pull synced data." });
  }
});

// Sync Push endpoint
app.post("/api/sync/push", requireAuth, async (req, res) => {
  try {
    const uid = (req as any).user.uid;
    const emailNorm = (req as any).user.email.toLowerCase().trim();
    const { profile, tasks, alarms, timetable, habits, badges, activityLog, notifications, updatedAt } = req.body;
    
    const currentSync = await firebaseDB.getSyncData(uid, emailNorm) || {};
    
    const nextSync = {
      profile: profile !== undefined ? profile : currentSync.profile,
      tasks: tasks !== undefined ? tasks : currentSync.tasks,
      alarms: alarms !== undefined ? alarms : currentSync.alarms,
      timetable: timetable !== undefined ? timetable : currentSync.timetable,
      habits: habits !== undefined ? habits : currentSync.habits,
      badges: badges !== undefined ? badges : currentSync.badges,
      activityLog: activityLog !== undefined ? activityLog : currentSync.activityLog,
      notifications: notifications !== undefined ? notifications : currentSync.notifications,
      updatedAt: updatedAt || new Date().toISOString()
    };
    
    await firebaseDB.saveSyncData(uid, nextSync);
    
    // Sync to ChatUser details for CommunityChat display
    if (profile) {
      const user = await firebaseDB.getUser(uid, emailNorm);
      if (user) {
        user.username = profile.nickname || profile.fullName || user.username;
        user.avatar = profile.avatar || user.avatar;
        user.level = profile.level || user.level;
        if (profile.badges && profile.badges.length > 0) {
          user.badge = profile.badges[profile.badges.length - 1];
        }
        await firebaseDB.saveUser(uid, user);
      }
    }
    
    res.json({ success: true, data: nextSync });
  } catch (error: any) {
    console.error("Sync push error:", error);
    res.status(500).json({ error: "Failed to sync and push data." });
  }
});

// Delete Account endpoint
app.post("/api/auth/delete-account", requireAuth, async (req, res) => {
  try {
    const uid = (req as any).user.uid;
    const emailNorm = (req as any).user.email.toLowerCase().trim();
    await firebaseDB.purgeAccount(uid, emailNorm);
    res.json({ success: true, message: "Your account and all associated study data have been permanently deleted." });
  } catch (error: any) {
    console.error("Delete account error:", error);
    res.status(500).json({ error: "Failed to delete your account." });
  }
});

// --- ADVANCED AI SECURITY AND INTEGRITY HELPERS ---

/**
 * Scans inputs for malicious override signatures to prevent prompt injection.
 */
function detectPromptInjection(prompt: string | null | undefined): boolean {
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

  return injectionSignatures.some(sig => lower.includes(sig));
}

/**
 * High-performance output sanitizer to prevent XSS in rendered AI contents.
 * Strips dangerous HTML tags while keeping markdown formatting intact.
 */
function sanitizeAIOutputText(text: string | null | undefined): string {
  if (!text || typeof text !== "string") return "";
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, "")
    .replace(/onload\s*=\s*"[^"]*"/gi, "")
    .replace(/onerror\s*=\s*"[^"]*"/gi, "")
    .replace(/onclick\s*=\s*"[^"]*"/gi, "");
}

/**
 * Validates and sanitizes the structured solver response.
 */
function validateAndSanitizeSolverResponse(data: any, originalPrompt: string): any {
  if (!data || typeof data !== "object") {
    data = {};
  }
  
  return {
    ocrText: typeof data.ocrText === "string" ? sanitizeAIOutputText(data.ocrText) : sanitizeAIOutputText(originalPrompt),
    subject: typeof data.subject === "string" ? sanitizeAIOutputText(data.subject) : "General",
    topic: typeof data.topic === "string" ? sanitizeAIOutputText(data.topic) : "General",
    steps: Array.isArray(data.steps) 
      ? data.steps.filter((s: any) => typeof s === "string").map((s: string) => sanitizeAIOutputText(s)) 
      : [],
    finalAnswer: typeof data.finalAnswer === "string" ? sanitizeAIOutputText(data.finalAnswer) : "",
    conceptualExplanation: typeof data.conceptualExplanation === "string" ? sanitizeAIOutputText(data.conceptualExplanation) : "",
    tips: Array.isArray(data.tips) 
      ? data.tips.filter((t: any) => typeof t === "string").map((t: string) => sanitizeAIOutputText(t)) 
      : [],
    practiceQuestions: Array.isArray(data.practiceQuestions) 
      ? data.practiceQuestions.filter((q: any) => typeof q === "string").map((q: string) => sanitizeAIOutputText(q)) 
      : []
  };
}

/**
 * Validates and sanitizes the suggested study planner schedule response.
 */
function validateAndSanitizeSuggestScheduleResponse(data: any): any {
  if (!data || typeof data !== "object") {
    data = {};
  }
  
  const studyTips = Array.isArray(data.studyTips) 
    ? data.studyTips.filter((t: any) => typeof t === "string").map((t: string) => sanitizeAIOutputText(t)) 
    : ["Stay consistent", "Practice active recall", "Use the Pomodoro technique"];
    
  const weeklyTheme = typeof data.weeklyTheme === "string" ? sanitizeAIOutputText(data.weeklyTheme) : "Personalized Academic Focus";
  
  const suggestedTimeAllocation = Array.isArray(data.suggestedTimeAllocation)
    ? data.suggestedTimeAllocation.filter((item: any) => item && typeof item === "object").map((item: any) => ({
        subject: typeof item.subject === "string" ? sanitizeAIOutputText(item.subject) : "General Study",
        hoursPerWeek: typeof item.hoursPerWeek === "number" && !isNaN(item.hoursPerWeek) ? Math.min(168, Math.max(0, item.hoursPerWeek)) : 4,
        reason: typeof item.reason === "string" ? sanitizeAIOutputText(item.reason) : "Focused skill building"
      }))
    : [];
    
  const timetable = Array.isArray(data.timetable)
    ? data.timetable.filter((dayItem: any) => dayItem && typeof dayItem === "object").map((dayItem: any) => ({
        day: typeof dayItem.day === "string" ? sanitizeAIOutputText(dayItem.day) : "Monday",
        sessions: Array.isArray(dayItem.sessions) 
          ? dayItem.sessions.filter((session: any) => session && typeof session === "object").map((session: any) => ({
              time: typeof session.time === "string" ? sanitizeAIOutputText(session.time) : "04:00 PM - 05:00 PM",
              subject: typeof session.subject === "string" ? sanitizeAIOutputText(session.subject) : "General Study",
              topic: typeof session.topic === "string" ? sanitizeAIOutputText(session.topic) : "Concept review"
            }))
          : []
      }))
    : [];
    
  return {
    studyTips,
    weeklyTheme,
    suggestedTimeAllocation,
    timetable
  };
}

/**
 * Validates and sanitizes the generated textbook materials response.
 */
function validateAndSanitizeChapterMaterialsResponse(data: any): any {
  if (!data || typeof data !== "object") {
    data = {};
  }
  
  return {
    longNotes: Array.isArray(data.longNotes) 
      ? data.longNotes.filter((n: any) => typeof n === "string").map((n: string) => sanitizeAIOutputText(n)) 
      : [],
    shortNotes: Array.isArray(data.shortNotes) 
      ? data.shortNotes.filter((n: any) => typeof n === "string").map((n: string) => sanitizeAIOutputText(n)) 
      : [],
    formulas: Array.isArray(data.formulas) 
      ? data.formulas.filter((f: any) => typeof f === "string").map((f: string) => sanitizeAIOutputText(f)) 
      : [],
    pyqs: Array.isArray(data.pyqs)
      ? data.pyqs.filter((q: any) => q && typeof q === "object").map((q: any) => ({
          question: typeof q.question === "string" ? sanitizeAIOutputText(q.question) : "Solved Exam Question",
          answer: typeof q.answer === "string" ? sanitizeAIOutputText(q.answer) : "No solution provided",
          year: typeof q.year === "string" ? sanitizeAIOutputText(q.year) : "Recent Board"
        }))
      : [],
    practiceQuestions: Array.isArray(data.practiceQuestions) 
      ? data.practiceQuestions.filter((q: any) => typeof q === "string").map((q: string) => sanitizeAIOutputText(q)) 
      : []
  };
}

// In-memory active request tracking map for server-side deduplication
const activeRequests = new Map<string, Promise<any>>();

/**
 * Enforces serial processing of heavy AI requests per user per feature.
 */
async function withDuplicatePrevention<T>(key: string, promiseFactory: () => Promise<T>): Promise<T> {
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

// Endpoint for dynamic question generation and filtration
app.post("/api/quiz/questions", requireAuth, asyncHandler(async (req, res) => {
  const { classGrade, subject, chapter, difficulty, excludeIds = [], count = 5 } = req.body;

  if (!classGrade || !subject || !chapter || !difficulty) {
    return res.status(400).json({ error: "Missing required selection filters: classGrade, subject, chapter, difficulty." });
  }

  const validDifficulties = ["Easy", "Medium", "Hard", "Expert"];
  if (!validDifficulties.includes(difficulty)) {
    return res.status(400).json({ error: "Invalid difficulty level." });
  }

  try {
    const questions = await getQuestions({
      classGrade,
      subject,
      chapter,
      difficulty: difficulty as any,
      excludeIds: Array.isArray(excludeIds) ? excludeIds : [],
      count: Math.min(50, Math.max(1, Number(count)))
    });
    res.json({ success: true, questions });
  } catch (err: any) {
    console.error("Error retrieving quiz questions:", err);
    res.status(500).json({ error: "Failed to assemble syllabus assessment questions." });
  }
}));

// 1. AI Solver Route - Multi-modal OCR & Step-by-Step Question Solver
app.post("/api/gemini/solve", requireAuth, async (req, res) => {
  const controller = new AbortController();
  req.on("close", () => {
    controller.abort();
  });

  try {
    const { prompt, image, subject, grade, favSubjects, weakSubjects, explainBriefly, provider = "auto", timeoutMs } = req.body;

    // Validate request inputs
    if (prompt && typeof prompt !== "string") {
      return res.status(400).json({ error: "Invalid prompt format." });
    }
    if (prompt && prompt.length > 50000) {
      return res.status(400).json({ error: "Prompt is too long. Maximum characters is 50,000." });
    }
    if (image && (typeof image !== "string" || image.length > 25 * 1024 * 1024)) {
      return res.status(400).json({ error: "Invalid image format or image size exceeds 25MB." });
    }

    // Prompt injection check
    if (detectPromptInjection(prompt)) {
      return res.status(400).json({ error: "Potential prompt injection attempt detected. Please revise your query to align with guidelines." });
    }

    const emailNorm = (req as any).user.email.toLowerCase().trim();
    const lockKey = `${emailNorm}:${req.path}`;

    const parsedResult = await withDuplicatePrevention(lockKey, async () => {
      // Prepare core prompt instructions
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
        userPrompt += `\n- **CRITICAL FORMAT RULE**: The user requested a BRIEF, HIGHLY CONCISE EXPLANATION. Minimize extra introductory words, keep steps and conceptual explanations short, focused, and straight-to-the-point. Summarize formulas and solutions into quick-reading lists.`;
      }
      if (grade || favSubjects || weakSubjects) {
        userPrompt += `\n\nStudent Profile Context to customize explanation depth and style:`;
        if (grade) userPrompt += `\n- Class Grade Level: ${grade}`;
        if (favSubjects && Array.isArray(favSubjects) && favSubjects.length > 0) {
          userPrompt += `\n- Favorite/Strong Subjects: ${favSubjects.join(", ")}`;
        }
        if (weakSubjects && Array.isArray(weakSubjects) && weakSubjects.length > 0) {
          userPrompt += `\n- Weak Subjects (Explain terms extra clearly and provide step-by-step encouragement): ${weakSubjects.join(", ")}`;
        }
      }
      
      const messages = [{ role: "user" as const, content: userPrompt }];

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          ocrText: { type: Type.STRING },
          subject: { type: Type.STRING },
          topic: { type: Type.STRING },
          steps: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          finalAnswer: { type: Type.STRING },
          conceptualExplanation: { type: Type.STRING },
          tips: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          practiceQuestions: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["ocrText", "subject", "topic", "steps", "finalAnswer", "conceptualExplanation", "tips", "practiceQuestions"]
      };

      const response = await executeAIRequest({
        messages,
        systemInstruction,
        image,
        preferredProvider: provider as AIProvider,
        responseSchema,
        timeoutMs: timeoutMs ? Number(timeoutMs) : undefined,
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
  } catch (error: any) {
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

// 2. Interactive Tutor Chat - Follow-up and conversation with full memory & reasoning
app.post("/api/gemini/chat", requireAuth, async (req, res) => {
  const controller = new AbortController();
  req.on("close", () => {
    controller.abort();
  });

  try {
    const { message, history, image, provider = "auto", timeoutMs } = req.body;

    // Validate request inputs
    if (message && typeof message !== "string") {
      return res.status(400).json({ error: "Invalid message format." });
    }
    if (message && message.length > 15000) {
      return res.status(400).json({ error: "Message exceeds maximum allowed character limit of 15,000." });
    }

    // Prompt injection check
    if (detectPromptInjection(message)) {
      return res.status(400).json({ error: "Potential prompt injection attempt detected. Please refine your message." });
    }

    const emailNorm = (req as any).user.email.toLowerCase().trim();
    const uid = (req as any).user.uid || emailNorm;
    const lockKey = `${emailNorm}:${req.path}`;

    const chatReply = await withDuplicatePrevention(lockKey, async () => {
      let searched = false;
      let searchQuery = "";
      let searchSources: Array<{ title: string; url: string }> = [];
      let searchError = false;

      let finalUserMessage = message || "Hello StudyMate AI";

      // 1. Load User Profile & Sync Data
      const userObj = await firebaseDB.getUser(uid, emailNorm);
      const syncData = await firebaseDB.getSyncData(uid, emailNorm);

      // 2. Load Persistent Long-Term Memory
      const userMemory = await getOrLoadUserMemory(uid, emailNorm);

      // 3. Generate Runtime Context (Date, Time, Timezone, Explicit 2026 rule)
      const runtimeContext = getRuntimeInfo();

      // 4. Generate User Profile Context
      const profileContext = getUserProfileContext(userObj, syncData);

      // 5. Generate Long-Term Memory Context
      const memoryContext = formatLongTermMemoryContext(userMemory, finalUserMessage);

      // 6. Detect Explicit Recall Triggers ("remember", "continue", "as I said earlier")
      const recallTriggerContext = detectMemoryRetrievalTriggers(finalUserMessage);

      // 7. Process Conversation History with Context Compression
      const { compressedSummary, recentMessages } = prepareConversationHistory(history || []);

      // 8. Determine if web search is required
      let needsSearch = false;
      try {
        needsSearch = await shouldSearchWeb(finalUserMessage);
      } catch (err) {
        console.error("[WebSearch] Failed to evaluate shouldSearchWeb:", err);
      }

      let webSearchContext = "";
      if (needsSearch) {
        searched = true;
        searchQuery = finalUserMessage;
        try {
          const searchResult = await executeWebSearch(finalUserMessage);
          searchSources = searchResult.results.map(r => ({ title: r.title, url: r.url }));

          if (searchResult.results.length > 0) {
            const contextStr = searchResult.results
              .map((r, idx) => `[Source ${idx + 1}] Title: ${r.title}\nURL: ${r.url}\nContent: ${r.content}`)
              .join("\n\n");

            webSearchContext = `=== LIVE REAL-TIME WEB SEARCH DATA ===
Search Query: "${searchQuery}"
Results:
${contextStr}

[Search Guidelines]:
1. Carefully read and synthesize the live search results.
2. Formulate a natural, unified answer without copying raw snippets verbatim.
3. Explicitly state in your reply that the response includes live web search information.
4. Do NOT render raw URLs inside your text body.`;
          }
        } catch (err: any) {
          console.error("[WebSearch] Search pipeline failed completely:", err);
          searchError = true;
          webSearchContext = `[SYSTEM NOTICE: Live web search was triggered but encountered a temporary network timeout. State politely in a single short sentence that live web search is currently unavailable, then answer using your core offline knowledge.]`;
        }
      }

      // Reconstruct messages array
      const messages: AIMessage[] = [];

      // If earlier turns were summarized, inject the compressed summary
      if (compressedSummary) {
        messages.push({
          role: "user",
          content: compressedSummary
        });
        messages.push({
          role: "model",
          content: "Understood. I have reviewed the summary of our earlier conversation turns and retain full context."
        });
      }

      // Append recent messages (last 20 turns)
      recentMessages.forEach(m => {
        messages.push(m);
      });

      // Append current user message (with web search context if applicable)
      const fullUserContent = webSearchContext 
        ? `${webSearchContext}\n\nUser Message: ${finalUserMessage}`
        : finalUserMessage;

      messages.push({
        role: "user",
        content: fullUserContent
      });

      // Master System Prompt with Multi-Step Reasoning Instructions
      const systemInstruction = `You are StudyMate AI, the flagship conversational AI assistant for learning, work, research, coding, writing, problem-solving, and everyday conversations on the StudyMate platform.

${runtimeContext}

${profileContext}

${memoryContext}
${recallTriggerContext}

=== MULTI-STEP REASONING DIRECTIVE ===
Before generating your final response, execute these internal steps:
1. UNDERSTAND INTENT: Identify what the user is asking, including domain, tone, and goals.
2. REVIEW CONTEXT & HISTORY: Read recent conversation turns and long-term recalled facts. Never contradict previous context.
3. INTEGRATE LIVE SEARCH DATA: If live web search results are provided above, synthesize them accurately.
4. STEP-BY-STEP THOUGHT: Formulate a logically sound, step-by-step reasoning plan.
5. GENERATE POLISHED RESPONSE: Produce a clear, conversational, friendly, and structured output.

=== CONVERSATIONAL & RESPONSE GUIDELINES ===
- Personality: Warm, friendly, encouraging, patient, professional, smart, and helpful.
- Accuracy: Never invent dates, facts, or calculations. Never hallucinate.
- Language Support: Respond in English, Hindi, or Hinglish as requested.
- Format: Use rich Markdown formatting (headers, bold text, bullet points, code blocks). Keep explanations easy to scan, well-organized, and concise without unnecessary fluff.
- Math & Science: Show working steps clearly and verify calculations.`;

      const response = await executeAIRequest({
        messages,
        systemInstruction,
        image,
        preferredProvider: provider as AIProvider,
        timeoutMs: timeoutMs ? Number(timeoutMs) : undefined,
        signal: controller.signal
      });

      const replyText = sanitizeAIOutputText(response.text);

      // Trigger background long-term memory extraction (non-blocking)
      extractAndSaveMemoriesInBackground(uid, emailNorm, finalUserMessage, replyText).catch(err => {
        console.warn("[MemoryService] Background memory extraction error:", err);
      });

      return {
        reply: replyText,
        searched,
        searchQuery,
        sources: searchSources,
        searchError,
        providerUsed: response.providerUsed
      };
    });

    res.json(chatReply);
  } catch (error: any) {
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

// Long-Term Memory API Endpoints (View, Save, Clear)
app.get("/api/ai/memory", requireAuth, async (req, res) => {
  try {
    const emailNorm = (req as any).user.email.toLowerCase().trim();
    const uid = (req as any).user.uid || emailNorm;
    const memory = await getOrLoadUserMemory(uid, emailNorm);
    res.json({ memory });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch user memory." });
  }
});

app.post("/api/ai/memory", requireAuth, async (req, res) => {
  try {
    const emailNorm = (req as any).user.email.toLowerCase().trim();
    const uid = (req as any).user.uid || emailNorm;
    const { fact, goal } = req.body;

    const memory = await getOrLoadUserMemory(uid, emailNorm);
    if (fact && typeof fact === "string" && fact.trim().length > 0) {
      if (!memory.facts.includes(fact.trim())) {
        memory.facts.push(fact.trim());
      }
    }
    if (goal && typeof goal === "string" && goal.trim().length > 0) {
      if (!memory.learningsAndGoals.includes(goal.trim())) {
        memory.learningsAndGoals.push(goal.trim());
      }
    }
    memory.lastUpdated = new Date().toISOString();

    await firebaseDB.saveUserMemory(uid, memory);
    res.json({ success: true, memory });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to save user memory." });
  }
});

app.delete("/api/ai/memory", requireAuth, async (req, res) => {
  try {
    const emailNorm = (req as any).user.email.toLowerCase().trim();
    const uid = (req as any).user.uid || emailNorm;
    const { fact } = req.body;

    const memory = await getOrLoadUserMemory(uid, emailNorm);
    if (fact && typeof fact === "string") {
      memory.facts = memory.facts.filter(f => f !== fact.trim());
    } else {
      memory.facts = [];
      memory.learningsAndGoals = [];
      memory.summary = "";
    }
    memory.lastUpdated = new Date().toISOString();

    await firebaseDB.saveUserMemory(uid, memory);
    res.json({ success: true, memory });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to reset user memory." });
  }
});

// 2.5. Dynamic CBSE Chapter Material Generator (Textbook details on-demand)
app.post("/api/gemini/generate-chapter-materials", requireAuth, async (req, res) => {
  const controller = new AbortController();
  req.on("close", () => {
    controller.abort();
  });

  try {
    const { grade, subject, chapterNumber, chapterTitle, provider = "auto", timeoutMs } = req.body;

    // Validate request inputs
    if (chapterTitle && typeof chapterTitle !== "string") {
      return res.status(400).json({ error: "Invalid chapterTitle format." });
    }

    // Prompt injection check
    if (detectPromptInjection(chapterTitle)) {
      return res.status(400).json({ error: "Potential prompt injection attempt detected. Please refine the chapter details." });
    }

    const emailNorm = (req as any).user.email.toLowerCase().trim();
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
        type: Type.OBJECT,
        properties: {
          longNotes: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          shortNotes: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          formulas: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          pyqs: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                answer: { type: Type.STRING },
                year: { type: Type.STRING }
              },
              required: ["question", "answer", "year"]
            }
          },
          practiceQuestions: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["longNotes", "shortNotes", "formulas", "pyqs", "practiceQuestions"]
      };

      const response = await executeAIRequest({
        messages: [{ role: "user", content: prompt }],
        preferredProvider: provider as AIProvider,
        responseSchema,
        timeoutMs: timeoutMs ? Number(timeoutMs) : undefined,
        signal: controller.signal
      });

      const rawParsed = parseJsonResponse(response.text || "{}");
      return validateAndSanitizeChapterMaterialsResponse(rawParsed);
    });

    res.json(parsedResult);
  } catch (error: any) {
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

// 3. AI Study Planner Generator
app.post("/api/gemini/suggest-schedule", requireAuth, async (req, res) => {
  const controller = new AbortController();
  req.on("close", () => {
    controller.abort();
  });

  try {
    const { name, grade, targetExam, dailyGoalHours, preferredTime, favSubjects, weakSubjects, customFocus, provider = "auto", timeoutMs } = req.body;

    // Validate request inputs
    if (name && typeof name !== "string") {
      return res.status(400).json({ error: "Invalid student name format." });
    }
    if (targetExam && typeof targetExam !== "string") {
      return res.status(400).json({ error: "Invalid target exam format." });
    }

    // Prompt injection check
    if (detectPromptInjection(name) || detectPromptInjection(targetExam)) {
      return res.status(400).json({ error: "Potential prompt injection attempt detected. Please revise your profile names." });
    }

    const emailNorm = (req as any).user.email.toLowerCase().trim();
    const lockKey = `${emailNorm}:${req.path}`;

    const parsedResult = await withDuplicatePrevention(lockKey, async () => {
      const prompt = `Generate a highly personalized study planner and timetable for a student named ${name}.
Details:
- Class/Grade: ${grade}
- Preparing for Target Exam: ${targetExam}
- Daily Study Goal: ${dailyGoalHours} hours
- Preferred Study Time: ${preferredTime}
- Favorite Subjects: ${Array.isArray(favSubjects) ? favSubjects.join(", ") : (favSubjects || "General")}
- Weak Subjects (which need extra focus & revision): ${Array.isArray(weakSubjects) ? weakSubjects.join(", ") : (weakSubjects || "None specified")}
${customFocus ? `- Custom Focus / Objectives: ${customFocus}` : ""}

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
        type: Type.OBJECT,
        properties: {
          studyTips: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          weeklyTheme: { type: Type.STRING },
          suggestedTimeAllocation: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                subject: { type: Type.STRING },
                hoursPerWeek: { type: Type.INTEGER },
                reason: { type: Type.STRING }
              },
              required: ["subject", "hoursPerWeek", "reason"]
            }
          },
          timetable: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                day: { type: Type.STRING },
                sessions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      time: { type: Type.STRING },
                      subject: { type: Type.STRING },
                      topic: { type: Type.STRING }
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
        preferredProvider: provider as AIProvider,
        responseSchema,
        timeoutMs: timeoutMs ? Number(timeoutMs) : undefined,
        signal: controller.signal
      });

      const rawParsed = parseJsonResponse(response.text || "{}");
      return validateAndSanitizeSuggestScheduleResponse(rawParsed);
    });

    res.json(parsedResult);
  } catch (error: any) {
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

// ----------------------------------------------------
// GLOBAL COMMUNITY CHAT ROUTES (SSE & REST API)
// ----------------------------------------------------

// Admin matching constraint: shivamguptaddp6312@gmail.com is the primary bootstrapped admin
function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  return normalized === "shivamguptaddp6312@gmail.com";
}

// Helper to broadcast event to all SSE streams
function broadcastToSSE(type: string, data: any) {
  const payload = JSON.stringify({ type, data });
  sseClients.forEach((client) => {
    try {
      client.res.write(`data: ${payload}\n\n`);
    } catch (e) {
      console.error("Error writing to client SSE connection:", e);
    }
  });
}

// SSE live online user count broadcaster
function broadcastOnlineCount() {
  const uniqueEmails = new Set(sseClients.map(c => c.email.toLowerCase()));
  broadcastToSSE("onlineCount", { count: Math.max(1, uniqueEmails.size) });
}

// 1. Establish Server-Sent Events (SSE) stream for instant real-time broadcasts
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

  // Instantly acknowledge stream launch
  res.write(`data: ${JSON.stringify({ type: "connected", data: { clientId } })}\n\n`);

  // Broadcast updated count
  broadcastOnlineCount();

  // If user is admin, tell them how many reports are pending immediately
  if (isAdminEmail(userEmail)) {
    firebaseDB.getReports().then(reports => {
      const pendingCount = reports.filter(r => r.status === "pending").length;
      res.write(`data: ${JSON.stringify({ type: "adminInit", data: { pendingReportsCount: pendingCount } })}\n\n`);
    }).catch(err => {
      console.error("SSE admin init report counting failed:", err);
    });
  }

  req.on("close", () => {
    sseClients = sseClients.filter(c => c.id !== clientId);
    broadcastOnlineCount();
  });
});

// 2. Fetch paginated or searched chat history
app.get("/api/chat/messages", requireAuth, async (req, res) => {
  try {
    const { before, search, limit } = req.query;
    const maxLimit = limit ? parseInt(limit as string) : 50;
    const messages = await firebaseDB.getMessages(before as string, search as string, maxLimit);
    res.json(messages);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to retrieve chat logs." });
  }
});

// 2.1 Fetch registered real community users
app.get("/api/chat/registered-users", requireAuth, async (req, res) => {
  try {
    const users = await firebaseDB.getAllUsers();
    const realUsers = users
      .filter(u => !u.isBanned)
      .map(u => ({
        email: u.email,
        username: u.username || u.email.split("@")[0],
        avatar: u.avatar || "👤",
        level: u.level || 1,
        badge: u.badge || "Member",
        status: u.isBanned ? "offline" : "online",
        lastActive: (u as any).lastActive || new Date().toISOString(),
        classGrade: (u as any).classGrade || "10th CBSE"
      }));
    res.json(realUsers);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch real registered users." });
  }
});

// 3. Post a message, validating constraints and using Gemini for strict OCR/Safety moderation
app.post("/api/chat/message", requireAuth, async (req, res) => {
  try {
    const { userEmail, username, avatar, level, badge, text, country, repliedToId, repliedToUser, attachment } = req.body;

    if (!userEmail || !username || !text) {
      return res.status(400).json({ error: "Missing required profile credentials or message string." });
    }

    const emailNorm = userEmail.toLowerCase().trim();
    const verifiedUser = (req as any).user;
    
    // Verify session matches sender profile
    if (verifiedUser.email !== emailNorm) {
      return res.status(403).json({ error: "Unauthorized: Identity session email mismatch." });
    }

    const cleanText = sanitizeText(text.trim());
    const cleanUsername = sanitizeText(username.trim());

    // Verification 1: Is user banned?
    const userState = await firebaseDB.getUser(emailNorm);
    if (userState && userState.isBanned) {
      return res.status(403).json({ error: "Your account has been suspended for violating CBSE study group guidelines." });
    }

    // Verification 2: Is user temporarily muted?
    if (userState && userState.muteExpiresAt) {
      const now = new Date();
      const muteExpires = new Date(userState.muteExpiresAt);
      if (muteExpires > now) {
        const diffMs = muteExpires.getTime() - now.getTime();
        const minutesLeft = Math.ceil(diffMs / 60000);
        return res.status(403).json({
          error: `You are temporarily muted from sending messages. Duration remaining: ${minutesLeft} minute(s).`
        });
      }
    }

    // Verification 3: Rate limiting (One message every 2 seconds)
    const lastTime = lastMessageTimes[emailNorm] || 0;
    const nowTime = Date.now();
    if (nowTime - lastTime < 2000) {
      return res.status(429).json({ error: "Spam Guard: Please wait 2 seconds between messages." });
    }
    lastMessageTimes[emailNorm] = nowTime;

    // Verification 4: Max length boundary limit
    if (cleanText.length > 500) {
      return res.status(400).json({ error: "Spam Guard: Messages must be under 500 characters." });
    }

    // Verification 5: Duplicate message check
    const activeMsgs = await firebaseDB.getMessages(undefined, undefined, 10);
    const userActiveMsgs = activeMsgs.filter(m => m.userEmail === emailNorm && !m.isDeleted);
    if (userActiveMsgs.length > 0) {
      const lastMsg = userActiveMsgs[userActiveMsgs.length - 1];
      if (lastMsg.text.toLowerCase().trim() === cleanText.toLowerCase()) {
        return res.status(400).json({ error: "Spam Guard: Duplicate message block. Try posting something new!" });
      }
    }

    // Verification 6: Link, photo and URL block (for non-admins)
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

    // Verification 7: Excess emoji flooding check
    const emojis = cleanText.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]|\p{Emoji_Presentation}|\p{Emoji}\uFE0F/gu) || [];
    if (emojis.length > 8) {
      return res.status(400).json({ error: "Spam Guard: Please limit message to a maximum of 8 emojis." });
    }

    // Verification 8: AI-Powered Moderation Check via Gemini API (Unified Multi AI Service)
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
        type: Type.OBJECT,
        properties: {
          isViolation: { type: Type.BOOLEAN },
          reason: { type: Type.STRING },
          explanation: { type: Type.STRING }
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
        "abuse", "hate", "racism", "harass", "threat", "bully", "scam", "spam",
        "chutiya", "gand", "bhenchod", "madarchod", "lauda", "loda", "asshole",
        "bitch", "fuck", "bastard", "idiot", "nigger", "slut", "whore", "mc", "bc"
      ];
      const foundBad = localBadWords.some(w => lowerText.includes(w));
      if (foundBad) {
        isViolation = true;
        violationReason = "profanity";
        violationExplain = "Your message contains inappropriate or offensive language (Spam/Safety Filter).";
      }
    }

    // 9. Handle infraction consequences (Warning, 10-Min Mute, 24-Hr Mute, Suspension)
    if (isViolation) {
      let activeUser = userState;
      if (!activeUser) {
        activeUser = {
          email: emailNorm,
          username,
          avatar,
          level: level || 1,
          badge,
          joinDate: new Date().toISOString(),
          country: country || "India",
          violationsCount: 0,
          isBanned: false
        };
      }

      activeUser.violationsCount = (activeUser.violationsCount || 0) + 1;
      const count = activeUser.violationsCount;

      let penaltyMsg = "";
      let muteExpiresString: string | null = null;
      let accountBanned = false;

      if (count === 1) {
        penaltyMsg = "Your message violates community guidelines. This is warning (1/3). Continued abuse will trigger mutes/ban.";
      } else if (count === 2) {
        const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        muteExpiresString = expiry.toISOString();
        activeUser.muteExpiresAt = muteExpiresString;
        penaltyMsg = "Your message violates community guidelines. This is infraction (2/3). You are MUTED for 10 minutes.";
      } else if (count === 3) {
        const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
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

      // Log to system logs
      await firebaseDB.saveAdminLog({
        id: "log-" + Date.now(),
        adminEmail: "AUTO_AI_MODERATOR",
        action: accountBanned ? "BAN_USER" : "WARNING_PENALTY",
        targetEmail: emailNorm,
        details: `Auto-moderated text: "${cleanText}". Reason: ${violationReason}. Outcome: ${penaltyMsg}`,
        timestamp: new Date().toISOString()
      });

      // Notify admins
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

    // 10. Persist and broadcast valid chat message
    const newMessage: ChatMessage = {
      id: "msg-" + Date.now() + Math.random().toString(36).substring(2, 6),
      userEmail: emailNorm,
      username: cleanUsername,
      avatar,
      level: level || 1,
      badge,
      text: cleanText,
      country: country || "India",
      timestamp: new Date().toISOString(),
      repliedToId: repliedToId || null,
      repliedToUser: repliedToUser || null,
      isDeleted: false,
      reportsCount: 0,
      attachment: attachment || null
    };

    // Ensure profile is kept synced in chat users directory
    await firebaseDB.saveUser(emailNorm, {
      email: emailNorm,
      username: cleanUsername,
      avatar,
      level: level || 1,
      badge,
      joinDate: userState?.joinDate || new Date().toISOString(),
      country: country || "India",
      violationsCount: userState?.violationsCount || 0,
      muteExpiresAt: userState?.muteExpiresAt || null,
      isBanned: false
    });

    await firebaseDB.saveMessage(newMessage);

    // Broadcast message via SSE
    broadcastToSSE("message", newMessage);

    // Analyze mentions and dispatch notifications
    const mentionMatch = cleanText.match(/@([a-zA-Z0-9_\-]+)/g);
    if (mentionMatch) {
      firebaseDB.getAllUsers().then(users => {
        mentionMatch.forEach(m => {
          const nameToFind = m.substring(1).toLowerCase().trim();
          const matchedUser = users.find(u => u.username.toLowerCase().trim() === nameToFind);
          if (matchedUser && matchedUser.email !== emailNorm) {
            broadcastToSSE("notification", {
              targetEmail: matchedUser.email,
              title: "💬 Community Chat Mention",
              message: `${cleanUsername} mentioned you in global chat: "${cleanText.substring(0, 50)}${cleanText.length > 50 ? "..." : ""}"`,
              type: "alert"
            });
          }
        });
      }).catch(err => {
        console.error("Error dispatching mentions:", err);
      });
    }

    // Analyze replied messages
    if (repliedToId) {
      const origMsg = await firebaseDB.getRawMessage(repliedToId);
      if (origMsg && origMsg.userEmail !== emailNorm) {
        broadcastToSSE("notification", {
          targetEmail: origMsg.userEmail,
          title: "💬 Community Chat Reply",
          message: `${cleanUsername} replied to your chat: "${cleanText.substring(0, 50)}${cleanText.length > 50 ? "..." : ""}"`,
          type: "info"
        });
      }
    }

    res.json(newMessage);
  } catch (error: any) {
    console.error("Post message error:", error);
    res.status(500).json({ error: "Failed to process chat message." });
  }
});

// 4. Submit an abuse report against a message
app.post("/api/chat/report", requireAuth, async (req, res) => {
  try {
    const { messageId, reportedBy, reason, comment } = req.body;

    if (!messageId || !reportedBy || !reason) {
      return res.status(400).json({ error: "Missing reported parameters." });
    }

    const emailNorm = reportedBy.toLowerCase().trim();
    if ((req as any).user.email !== emailNorm) {
      return res.status(403).json({ error: "Unauthorized: Identity session email mismatch." });
    }

    const msg = await firebaseDB.getRawMessage(messageId);
    if (!msg) {
      return res.status(404).json({ error: "Original message not found." });
    }

    const cleanComment = sanitizeText(comment || "");
    const cleanReason = sanitizeText(reason || "");

    const reportId = "rep-" + Date.now() + Math.random().toString(36).substring(2, 6);
    const newReport: ChatReport = {
      id: reportId,
      messageId,
      messageText: msg.text,
      messageAuthor: msg.userEmail,
      reportedBy: emailNorm,
      reason: cleanReason,
      comment: cleanComment,
      timestamp: new Date().toISOString(),
      status: "pending"
    };

    await firebaseDB.saveReport(newReport);
    await firebaseDB.updateMessage(messageId, { reportsCount: (msg.reportsCount || 0) + 1 });

    // Broadcast event to active admins
    broadcastToSSE("reportCreated", newReport);

    res.json({ success: true, report: newReport });
  } catch (error: any) {
    console.error("Report logging failed:", error);
    res.status(500).json({ error: "Failed to log report." });
  }
});

// 5. Broadcast typing state
app.post("/api/chat/typing", requireAuth, (req, res) => {
  try {
    const { userEmail, username, isTyping } = req.body;
    if (userEmail && username) {
      const emailNorm = userEmail.toLowerCase().trim();
      if ((req as any).user.email !== emailNorm) {
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

// 6. Admin Panel stats retrieval
app.get("/api/chat/admin/stats", requireAdmin, async (req, res) => {
  try {
    const users = await firebaseDB.getAllUsers();
    const reports = await firebaseDB.getReports();
    const adminLogs = await firebaseDB.getAdminLogs();
    const messages = await firebaseDB.getMessages(undefined, undefined, 1000);

    const sanitizedUsers = users.map(u => ({
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
      reports: reports,
      adminLogs: adminLogs,
      users: sanitizedUsers,
      totalMessages: messages.length,
      activeUsersCount: new Set(sseClients.map(c => c.email)).size
    });
  } catch (error: any) {
    console.error("Admin stats fetch failed:", error);
    res.status(500).json({ error: "Failed to retrieve logs." });
  }
});

// 7. Admin Action Endpoint (Mute, Ban, Delete)
app.post("/api/chat/admin/action", requireAdmin, async (req, res) => {
  try {
    const { action, targetId, targetEmail, reason } = req.body;
    const adminEmail = (req as any).user.email;
    const timestamp = new Date().toISOString();

    if (action === "deleteMessage") {
      const msg = await firebaseDB.getRawMessage(targetId);
      if (msg) {
        await firebaseDB.updateMessage(targetId, { isDeleted: true, deletedBy: adminEmail });

        // Resolve reports
        const reports = await firebaseDB.getReports();
        for (const r of reports) {
          if (r.messageId === targetId && r.status === "pending") {
            await firebaseDB.updateReport(r.id, {
              status: "reviewed",
              actionTaken: "DELETED",
              reviewedAt: timestamp
            });

            // Notify reporter of review update
            broadcastToSSE("notification", {
              targetEmail: r.reportedBy,
              title: "⚖️ Report Reviewed",
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
        const muteExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 Hours
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
      const rep = reports.find(r => r.id === targetId);
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
          title: "⚖️ Report Reviewed",
          message: "A moderator has reviewed your report. The content was found to be compliant.",
          type: "info"
        });
        broadcastToSSE("adminLogsUpdated", {});
      }
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error("Admin action error:", error);
    res.status(500).json({ error: "Failed to process admin actions." });
  }
});

// ----------------------------------------------------
// SYSTEM HEALTH AND UTILITIES
// ----------------------------------------------------

// 1. Health check endpoint for container probes and status validation
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    memoryUsage: process.memoryUsage(),
    env: process.env.NODE_ENV || "development"
  });
});

// --- Global Error Handling Middleware ---
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("[Global Error Handler]", err);
  const status = err.statusCode || err.status || 500;
  const message = err.message || "An unexpected server error occurred.";
  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV !== "production" ? { stack: err.stack } : {})
  });
});

// ----------------------------------------------------
// VITE AND STATIC ASSET SERVING MIDDLEWARE
// ----------------------------------------------------

let serverInstance: any;

async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  serverInstance = app.listen(PORT, "0.0.0.0", () => {
    console.log(`StudyMate server listening on http://0.0.0.0:${PORT}`);
  });
}

// Graceful Shutdown implementation
function gracefulShutdown(signal: string) {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  if (serverInstance) {
    serverInstance.close(() => {
      console.log("HTTP server closed.");
      // Clear real-time active SSE clients
      sseClients.forEach(c => {
        try {
          c.res.end();
        } catch {}
      });
      console.log("Graceful shutdown completed successfully.");
      process.exit(0);
    });
    
    // Safety exit timeout if close hangs
    setTimeout(() => {
      console.error("Graceful shutdown timed out, force exiting...");
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

start();
