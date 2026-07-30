import dotenv from "dotenv";
import { serverLogger } from "./logger";

dotenv.config();

export type AIQueueCategory =
  | "pdf_parsing"
  | "ocr"
  | "image_generation"
  | "web_search"
  | "general_ai";

export interface QueueTaskOptions {
  category: AIQueueCategory;
  taskName?: string;
  payloadSize?: number; // Estimated byte size of input data
  timeoutMs?: number;   // Max time task can sit in queue before timing out
  signal?: AbortSignal; // Client cancellation signal
}

export interface CategoryMetrics {
  maxConcurrent: number;
  activeCount: number;
  queuedCount: number;
  completedCount: number;
  failedCount: number;
  rejectedCount: number;
  totalWaitTimeMs: number;
  totalExecutionTimeMs: number;
  avgWaitTimeMs: number;
  avgExecutionTimeMs: number;
}

export interface SystemQueueMetrics {
  timestamp: string;
  maxQueueCapacity: number;
  categories: Record<AIQueueCategory, CategoryMetrics>;
  totalActive: number;
  totalQueued: number;
  totalCompleted: number;
  totalFailed: number;
  totalRejected: number;
}

interface QueuedItem<T> {
  id: string;
  category: AIQueueCategory;
  taskName: string;
  fn: () => Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
  enqueuedAt: number;
  timeoutId?: NodeJS.Timeout;
  signal?: AbortSignal;
  onAbort?: () => void;
}

class ConcurrencyQueueManager {
  private limits: Record<AIQueueCategory, number>;
  private maxQueueCapacity: number;
  private defaultQueueTimeoutMs: number;
  private maxPayloadSizeBytes: number;

  private queues: Record<AIQueueCategory, QueuedItem<any>[]> = {
    pdf_parsing: [],
    ocr: [],
    image_generation: [],
    web_search: [],
    general_ai: []
  };

  private activeCounts: Record<AIQueueCategory, number> = {
    pdf_parsing: 0,
    ocr: 0,
    image_generation: 0,
    web_search: 0,
    general_ai: 0
  };

  private stats: Record<AIQueueCategory, {
    completed: number;
    failed: number;
    rejected: number;
    totalWaitTimeMs: number;
    totalExecutionTimeMs: number;
  }> = {
    pdf_parsing: { completed: 0, failed: 0, rejected: 0, totalWaitTimeMs: 0, totalExecutionTimeMs: 0 },
    ocr: { completed: 0, failed: 0, rejected: 0, totalWaitTimeMs: 0, totalExecutionTimeMs: 0 },
    image_generation: { completed: 0, failed: 0, rejected: 0, totalWaitTimeMs: 0, totalExecutionTimeMs: 0 },
    web_search: { completed: 0, failed: 0, rejected: 0, totalWaitTimeMs: 0, totalExecutionTimeMs: 0 },
    general_ai: { completed: 0, failed: 0, rejected: 0, totalWaitTimeMs: 0, totalExecutionTimeMs: 0 }
  };

  constructor() {
    // Configurable concurrency limits from Environment Variables or defaults
    this.limits = {
      pdf_parsing: parseInt(process.env.MAX_CONCURRENT_PDF_PARSING || "2", 10),
      ocr: parseInt(process.env.MAX_CONCURRENT_OCR || "2", 10),
      image_generation: parseInt(process.env.MAX_CONCURRENT_IMAGE_GEN || "3", 10),
      web_search: parseInt(process.env.MAX_CONCURRENT_WEB_SEARCH || "3", 10),
      general_ai: parseInt(process.env.MAX_CONCURRENT_GENERAL_AI || "5", 10)
    };

    this.maxQueueCapacity = parseInt(process.env.MAX_QUEUE_SIZE || "50", 10);
    this.defaultQueueTimeoutMs = parseInt(process.env.QUEUE_TIMEOUT_MS || "30000", 10);
    this.maxPayloadSizeBytes = parseInt(process.env.MAX_PAYLOAD_SIZE_BYTES || "20971520", 10); // 20 MB default

    serverLogger.info("ConcurrencyQueue", "Initialized AI Concurrency Queue Manager", {
      limits: this.limits,
      maxQueueCapacity: this.maxQueueCapacity,
      defaultQueueTimeoutMs: this.defaultQueueTimeoutMs,
      maxPayloadSizeBytes: this.maxPayloadSizeBytes
    });
  }

  /**
   * Enqueue an expensive task for execution with concurrency control, timeout, and memory protections.
   */
  public enqueue<T>(options: QueueTaskOptions, taskFn: () => Promise<T>): Promise<T> {
    const category = options.category || "general_ai";
    const taskName = options.taskName || category;

    // 1. Memory Spike Protection: Validate payload size
    if (options.payloadSize && options.payloadSize > this.maxPayloadSizeBytes) {
      this.stats[category].rejected++;
      const payloadMB = (options.payloadSize / (1024 * 1024)).toFixed(2);
      const limitMB = (this.maxPayloadSizeBytes / (1024 * 1024)).toFixed(2);
      const errorMsg = `Payload size (${payloadMB} MB) exceeds maximum allowed limit (${limitMB} MB) to prevent server memory spikes.`;
      serverLogger.warn("ConcurrencyQueue", `Task [${taskName}] rejected: ${errorMsg}`);
      return Promise.reject(new Error(errorMsg));
    }

    // 2. Queue Overflow Protection
    const currentQueued = this.queues[category].length;
    if (currentQueued >= this.maxQueueCapacity) {
      this.stats[category].rejected++;
      const errorMsg = `Server busy: Queue capacity (${this.maxQueueCapacity}) reached for category [${category}]. Please try again shortly.`;
      serverLogger.warn("ConcurrencyQueue", `Task [${taskName}] rejected: ${errorMsg}`);
      return Promise.reject(new Error(errorMsg));
    }

    // 3. Early Abort Check
    if (options.signal?.aborted) {
      this.stats[category].rejected++;
      return Promise.reject(new Error("Request was cancelled before entering queue."));
    }

    return new Promise<T>((resolve, reject) => {
      const id = `${category}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const timeoutMs = options.timeoutMs || this.defaultQueueTimeoutMs;

      const queuedItem: QueuedItem<T> = {
        id,
        category,
        taskName,
        fn: taskFn,
        resolve,
        reject,
        enqueuedAt: Date.now(),
        signal: options.signal
      };

      // Set Queue Wait Timeout (Graceful timeout while sitting in queue)
      queuedItem.timeoutId = setTimeout(() => {
        this.removeFromQueue(category, id);
        this.stats[category].rejected++;
        const queueWaitTime = Date.now() - queuedItem.enqueuedAt;
        const err = new Error(`Queue wait timeout exceeded (${Math.round(queueWaitTime)}ms) for task [${taskName}].`);
        serverLogger.warn("ConcurrencyQueue", `Task [${taskName}] (${id}) timed out in queue after ${queueWaitTime}ms`);
        reject(err);
      }, timeoutMs);

      // Handle Client Cancellation (AbortSignal)
      if (options.signal) {
        const onAbort = () => {
          if (queuedItem.timeoutId) clearTimeout(queuedItem.timeoutId);
          this.removeFromQueue(category, id);
          this.stats[category].rejected++;
          serverLogger.info("ConcurrencyQueue", `Task [${taskName}] (${id}) cancelled in queue by client abort signal.`);
          reject(new Error("Request was cancelled while waiting in queue."));
        };
        options.signal.addEventListener("abort", onAbort, { once: true });
        queuedItem.onAbort = onAbort;
      }

      this.queues[category].push(queuedItem);
      serverLogger.info("ConcurrencyQueue", `Enqueued task [${taskName}] (${id}) in category [${category}]. Queue position: ${this.queues[category].length}`);

      // Attempt to process queue immediately
      this.processQueue(category);
    });
  }

  /**
   * Process pending items in queue for a category if worker slots are available.
   */
  private processQueue(category: AIQueueCategory): void {
    const limit = this.limits[category] || 2;
    while (this.activeCounts[category] < limit && this.queues[category].length > 0) {
      const item = this.queues[category].shift();
      if (!item) break;

      // Clean up queue timeout timer
      if (item.timeoutId) {
        clearTimeout(item.timeoutId);
      }

      // Clean up abort listener
      if (item.signal && item.onAbort) {
        item.signal.removeEventListener("abort", item.onAbort);
      }

      // Check Timeout Cascade Prevention: Skip if client already aborted or signal triggered
      if (item.signal?.aborted) {
        this.stats[category].rejected++;
        item.reject(new Error("Request was cancelled prior to worker execution."));
        continue;
      }

      // Mark as active worker
      this.activeCounts[category]++;
      const waitTimeMs = Date.now() - item.enqueuedAt;
      this.stats[category].totalWaitTimeMs += waitTimeMs;

      serverLogger.info("ConcurrencyQueue", `Worker started executing task [${item.taskName}] (${item.id}) in category [${category}]. Wait time: ${waitTimeMs}ms. Active workers: ${this.activeCounts[category]}/${limit}`);

      const execStartTime = Date.now();

      // Execute task safely
      item.fn()
        .then((result) => {
          const execTimeMs = Date.now() - execStartTime;
          this.stats[category].completed++;
          this.stats[category].totalExecutionTimeMs += execTimeMs;
          serverLogger.info("ConcurrencyQueue", `Task [${item.taskName}] (${item.id}) completed successfully in ${execTimeMs}ms.`);
          item.resolve(result);
        })
        .catch((err) => {
          const execTimeMs = Date.now() - execStartTime;
          this.stats[category].failed++;
          this.stats[category].totalExecutionTimeMs += execTimeMs;
          serverLogger.error("ConcurrencyQueue", `Task [${item.taskName}] (${item.id}) failed after ${execTimeMs}ms:`, err);
          item.reject(err);
        })
        .finally(() => {
          this.activeCounts[category]--;
          // Trigger processing for next waiting item in category
          this.processQueue(category);
        });
    }
  }

  private removeFromQueue(category: AIQueueCategory, id: string): void {
    this.queues[category] = this.queues[category].filter((item) => item.id !== id);
  }

  /**
   * Helper to classify task type string or options to an AIQueueCategory
   */
  public determineCategory(taskType?: string, hasPdf?: boolean, hasImage?: boolean, isWebSearch?: boolean): AIQueueCategory {
    if (taskType === "pdf_chat" || hasPdf) {
      return "pdf_parsing";
    }
    if (taskType === "ocr") {
      return "ocr";
    }
    if (taskType === "image_generation" || taskType === "image_editing") {
      return "image_generation";
    }
    if (taskType === "web_search" || isWebSearch) {
      return "web_search";
    }
    if (hasImage) {
      return "ocr";
    }
    return "general_ai";
  }

  /**
   * Expose detailed queue & concurrency metrics.
   */
  public getMetrics(): SystemQueueMetrics {
    const categories = {} as Record<AIQueueCategory, CategoryMetrics>;
    let totalActive = 0;
    let totalQueued = 0;
    let totalCompleted = 0;
    let totalFailed = 0;
    let totalRejected = 0;

    const allCategories: AIQueueCategory[] = ["pdf_parsing", "ocr", "image_generation", "web_search", "general_ai"];

    for (const cat of allCategories) {
      const active = this.activeCounts[cat] || 0;
      const queued = this.queues[cat].length;
      const stat = this.stats[cat];
      const maxConcurrent = this.limits[cat];

      totalActive += active;
      totalQueued += queued;
      totalCompleted += stat.completed;
      totalFailed += stat.failed;
      totalRejected += stat.rejected;

      const totalProcessed = stat.completed + stat.failed;
      const avgWaitTimeMs = totalProcessed > 0 ? Math.round(stat.totalWaitTimeMs / totalProcessed) : 0;
      const avgExecutionTimeMs = totalProcessed > 0 ? Math.round(stat.totalExecutionTimeMs / totalProcessed) : 0;

      categories[cat] = {
        maxConcurrent,
        activeCount: active,
        queuedCount: queued,
        completedCount: stat.completed,
        failedCount: stat.failed,
        rejectedCount: stat.rejected,
        totalWaitTimeMs: stat.totalWaitTimeMs,
        totalExecutionTimeMs: stat.totalExecutionTimeMs,
        avgWaitTimeMs,
        avgExecutionTimeMs
      };
    }

    return {
      timestamp: new Date().toISOString(),
      maxQueueCapacity: this.maxQueueCapacity,
      categories,
      totalActive,
      totalQueued,
      totalCompleted,
      totalFailed,
      totalRejected
    };
  }
}

export const concurrencyQueue = new ConcurrencyQueueManager();
