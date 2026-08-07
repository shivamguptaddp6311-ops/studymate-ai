import { z } from "zod";
import { validateFileUpload } from "../utils/fileValidator";

// --- Shared Helper Schemas ---

/**
 * Validates base64 data URLs, PDFs, or standard image URLs for attachment validation.
 * Verifies MIME type, magic numbers, size limits (25MB), page count (50 max), dimensions, and malicious code injection.
 */
export const base64ImageAttachmentSchema = z.string()
  .optional()
  .superRefine((val, ctx) => {
    if (!val) return;
    const result = validateFileUpload(val, {
      maxSizeBytes: 25 * 1024 * 1024,
      maxPdfPages: 50,
      minImageWidth: 10,
      maxImageWidth: 10000,
      minImageHeight: 10,
      maxImageHeight: 10000
    });
    if (!result.valid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: result.error || "Invalid file upload or payload corruption detected."
      });
    }
  });

/**
 * Chat file attachment schema validating ID, name, mime type, URL/Data, file size, signature, and dimensions.
 */
export const chatAttachmentSchema = z.object({
  id: z.string().optional(),
  name: z.string().max(255, "Attachment filename exceeds 255 characters").optional(),
  type: z.string().max(100, "Attachment type exceeds 100 characters").optional(),
  url: z.string().max(25 * 1024 * 1024, "Attachment URL/payload exceeds 25MB limit").optional(),
  size: z.number().max(50 * 1024 * 1024, "Attachment file size exceeds 50MB limit").optional()
})
.nullable()
.optional()
.superRefine((attachment, ctx) => {
  if (!attachment || !attachment.url) return;
  const result = validateFileUpload(attachment.url, {
    maxSizeBytes: 25 * 1024 * 1024,
    maxPdfPages: 50,
    minImageWidth: 10,
    maxImageWidth: 10000,
    minImageHeight: 10,
    maxImageHeight: 10000
  });
  if (!result.valid) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["url"],
      message: result.error || "Invalid or malicious file attachment payload"
    });
  }
});

// --- Auth Endpoints Schemas ---

export const guestTokenSchema = {
  body: z.object({
    email: z.string().email("Invalid email address format").max(255).optional().or(z.literal(""))
  }).optional(),
  query: z.object({
    email: z.string().email("Invalid email address format").max(255).optional().or(z.literal(""))
  }).optional()
};

export const loginSchema = {
  body: z.object({
    email: z.string().email("Google account email must be a valid email address").max(255),
    idToken: z.string().min(1, "Authentication idToken is required")
  })
};

export const refreshTokenSchema = {
  body: z.object({
    refreshToken: z.string().min(1, "Refresh token must be a non-empty string").optional()
  }).optional()
};

export const checkEmailSchema = {
  query: z.object({
    email: z.string().email("Invalid email address format").max(255)
  })
};

// --- Sync Endpoint Schema ---

export const syncPushSchema = {
  body: z.object({
    profile: z.record(z.string(), z.any()).optional(),
    tasks: z.array(z.any()).optional(),
    alarms: z.array(z.any()).optional(),
    timetable: z.array(z.any()).optional(),
    habits: z.array(z.any()).optional(),
    badges: z.array(z.any()).optional(),
    activityLog: z.array(z.any()).optional(),
    notifications: z.array(z.any()).optional(),
    updatedAt: z.string().optional()
  })
};

// --- Quiz Assessment Schema ---

export const quizQuestionsSchema = {
  body: z.object({
    classGrade: z.string().min(1, "classGrade filter is required"),
    subject: z.string().min(1, "subject filter is required"),
    chapter: z.string().min(1, "chapter filter is required"),
    difficulty: z.enum(["Easy", "Medium", "Hard", "Expert"], {
      message: "difficulty must be one of: Easy, Medium, Hard, Expert"
    }),
    excludeIds: z.array(z.string()).optional().default([]),
    count: z.union([z.number(), z.string().regex(/^\d+$/)])
      .transform(val => Number(val))
      .pipe(z.number().min(1, "Count must be at least 1").max(50, "Count cannot exceed 50"))
      .optional()
      .default(5)
  })
};

// --- AI & Gemini Endpoints Schemas ---

export const geminiSolveSchema = {
  body: z.object({
    prompt: z.string().max(50000, "Prompt exceeds maximum limit of 50,000 characters").optional(),
    image: base64ImageAttachmentSchema,
    subject: z.string().max(255).optional(),
    grade: z.string().max(100).optional(),
    favSubjects: z.array(z.string()).optional(),
    weakSubjects: z.array(z.string()).optional(),
    explainBriefly: z.boolean().optional(),
    provider: z.string().max(50).optional(),
    timeoutMs: z.union([z.number(), z.string().regex(/^\d+$/)])
      .transform(val => Number(val))
      .pipe(z.number().positive())
      .optional()
  })
};

export const ocrPdfPageSchema = {
  body: z.object({
    image: z.string()
      .min(1, "A valid base64 page image Data URL is required")
      .superRefine((val, ctx) => {
        const result = validateFileUpload(val, {
          maxSizeBytes: 25 * 1024 * 1024,
          maxPdfPages: 50,
          minImageWidth: 10,
          maxImageWidth: 10000,
          minImageHeight: 10,
          maxImageHeight: 10000
        });
        if (!result.valid) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: result.error || "Invalid base64 page image payload."
          });
        }
      }),
    pageNumber: z.union([z.number(), z.string().regex(/^\d+$/)])
      .transform(val => Number(val))
      .pipe(z.number().min(1))
      .optional()
      .default(1),
    provider: z.string().max(50).optional(),
    timeoutMs: z.union([z.number(), z.string().regex(/^\d+$/)])
      .transform(val => Number(val))
      .pipe(z.number().positive())
      .optional()
  })
};

export const aiRouteSchema = {
  body: z.object({
    taskType: z.string().max(100).optional(),
    prompt: z.string().max(50000).optional(),
    messages: z.array(z.any()).optional(),
    systemInstruction: z.string().max(50000).optional(),
    image: base64ImageAttachmentSchema,
    category: z.string().optional(),
    aspectRatio: z.string().optional(),
    quality: z.string().optional(),
    preferredProvider: z.string().optional(),
    responseSchema: z.any().optional(),
    temperature: z.number().min(0).max(2).optional(),
    timeoutMs: z.number().positive().optional(),
    metadata: z.any().optional()
  })
};

export const generateImageSchema = {
  body: z.object({
    prompt: z.string()
      .min(1, "A valid non-empty prompt string is required")
      .max(2000, "Prompt exceeds maximum allowed character limit of 2,000"),
    category: z.string().max(100).optional(),
    aspectRatio: z.string().max(20).optional().default("1:1"),
    quality: z.string().max(20).optional().default("standard"),
    provider: z.string().max(50).optional(),
    preferredProvider: z.string().max(50).optional(),
    negativePrompt: z.string().max(2000).optional(),
    negative_prompt: z.string().max(2000).optional(),
    model: z.string().max(200).optional(),
    width: z.number().positive().optional(),
    height: z.number().positive().optional(),
    steps: z.number().positive().optional(),
    guidanceScale: z.number().optional(),
    guidance_scale: z.number().optional(),
    guidance: z.number().optional(),
    seed: z.number().optional(),
    numImages: z.number().min(1).max(4).optional(),
    n: z.number().min(1).max(4).optional(),
    timeoutMs: z.union([z.number(), z.string().regex(/^\d+$/)])
      .transform(val => Number(val))
      .pipe(z.number().positive())
      .optional()
  })
};

export const geminiChatSchema = {
  body: z.object({
    message: z.string().max(15000, "Message exceeds maximum allowed character limit of 15,000").optional(),
    history: z.array(
      z.object({
        role: z.enum(["user", "model", "assistant"]),
        content: z.string()
      })
    ).optional(),
    image: base64ImageAttachmentSchema,
    provider: z.string().max(50).optional(),
    preferredProvider: z.string().max(50).optional(),
    model: z.string().max(100).optional(),
    timeoutMs: z.union([z.number(), z.string().regex(/^\d+$/)])
      .transform(val => Number(val))
      .pipe(z.number().positive())
      .optional()
  })
};

export const aiMemoryPostSchema = {
  body: z.object({
    fact: z.string().max(1000, "Fact text exceeds 1,000 character limit").optional(),
    goal: z.string().max(1000, "Goal text exceeds 1,000 character limit").optional()
  })
};

export const aiMemoryDeleteSchema = {
  body: z.object({
    fact: z.string().max(1000).optional()
  }).optional()
};

export const chapterMaterialsSchema = {
  body: z.object({
    grade: z.union([z.string(), z.number()]).transform(v => String(v)).pipe(z.string().min(1, "grade is required")),
    subject: z.string().min(1, "subject is required"),
    chapterNumber: z.union([z.string(), z.number()]).transform(v => String(v)).pipe(z.string().min(1, "chapterNumber is required")),
    chapterTitle: z.string().min(1, "chapterTitle is required"),
    provider: z.string().max(50).optional(),
    timeoutMs: z.union([z.number(), z.string().regex(/^\d+$/)])
      .transform(val => Number(val))
      .pipe(z.number().positive())
      .optional()
  })
};

export const suggestScheduleSchema = {
  body: z.object({
    name: z.string().min(1, "name is required").max(100),
    grade: z.union([z.string(), z.number()]).transform(v => String(v)).pipe(z.string().min(1, "grade is required")),
    targetExam: z.string().min(1, "targetExam is required"),
    dailyGoalHours: z.union([z.number(), z.string()]).transform(v => Number(v)).pipe(z.number().min(0, "dailyGoalHours cannot be negative").max(24, "dailyGoalHours cannot exceed 24")),
    preferredTime: z.string().optional(),
    favSubjects: z.union([z.array(z.string()), z.string()]).optional(),
    weakSubjects: z.union([z.array(z.string()), z.string()]).optional(),
    customFocus: z.string().max(1000).optional(),
    provider: z.string().max(50).optional(),
    timeoutMs: z.union([z.number(), z.string().regex(/^\d+$/)])
      .transform(val => Number(val))
      .pipe(z.number().positive())
      .optional()
  })
};

// --- Community Chat Endpoints Schemas ---

export const chatStreamSchema = {
  query: z.object({
    email: z.string().email("Invalid email format for SSE stream"),
    token: z.string().min(1, "Missing SSE session token")
  })
};

export const chatMessagesQuerySchema = {
  query: z.object({
    before: z.string().optional(),
    search: z.string().optional(),
    limit: z.union([z.number(), z.string().regex(/^\d+$/)])
      .transform(v => Number(v))
      .pipe(z.number().min(1).max(200))
      .optional()
  })
};

export const chatPostMessageSchema = {
  body: z.object({
    userEmail: z.string().email("Invalid userEmail format"),
    username: z.string().min(1, "username is required").max(100, "username cannot exceed 100 characters"),
    avatar: z.string().max(50).optional(),
    level: z.union([z.number(), z.string()]).transform(v => Number(v)).optional(),
    badge: z.string().max(100).optional(),
    text: z.string().min(1, "Message text cannot be empty").max(500, "Message text cannot exceed 500 characters"),
    country: z.string().max(100).optional(),
    repliedToId: z.string().nullable().optional(),
    repliedToUser: z.string().nullable().optional(),
    attachment: chatAttachmentSchema
  })
};

export const chatReportSchema = {
  body: z.object({
    messageId: z.string().min(1, "messageId is required"),
    reportedBy: z.string().email("Invalid reportedBy email format"),
    reason: z.string().min(1, "reason is required"),
    comment: z.string().max(1000).optional()
  })
};

export const chatTypingSchema = {
  body: z.object({
    userEmail: z.string().email("Invalid userEmail format"),
    username: z.string().min(1, "username is required"),
    isTyping: z.boolean()
  })
};

export const chatAdminActionSchema = {
  body: z.object({
    action: z.enum(["deleteMessage", "muteUser", "unmuteUser", "banUser", "unbanUser", "resolveReport"], {
      message: "action must be one of: deleteMessage, muteUser, unmuteUser, banUser, unbanUser, resolveReport"
    }),
    targetId: z.string().optional(),
    targetEmail: z.string().optional(),
    reason: z.string().max(500).optional()
  })
};

// --- System & Admin Schemas ---

export const clientLogsSchema = {
  body: z.union([
    z.object({
      level: z.string().optional(),
      tag: z.string().optional(),
      message: z.string().min(1, "message is required"),
      error: z.any().optional(),
      metadata: z.any().optional(),
      userAgent: z.string().optional()
    }),
    z.array(
      z.object({
        level: z.string().optional(),
        tag: z.string().optional(),
        message: z.string().min(1, "message is required"),
        error: z.any().optional(),
        metadata: z.any().optional(),
        userAgent: z.string().optional()
      })
    )
  ])
};

export const circuitBreakerResetSchema = {
  body: z.object({
    provider: z.string().optional()
  }).optional()
};
