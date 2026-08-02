import { ActivityEvent, ActivityType } from "../../types";

const STORAGE_KEY_EVENTS = "studymate_activity_events_v2";
const STORAGE_KEY_QUEUE = "studymate_activity_queue_v2";

export class ActivityService {
  private events: ActivityEvent[] = [];
  private eventQueue: ActivityEvent[] = [];
  private isSyncing = false;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const savedEvents = localStorage.getItem(STORAGE_KEY_EVENTS);
      if (savedEvents) {
        this.events = JSON.parse(savedEvents);
      }
      const savedQueue = localStorage.getItem(STORAGE_KEY_QUEUE);
      if (savedQueue) {
        this.eventQueue = JSON.parse(savedQueue);
      }
    } catch (e) {
      console.warn("Failed to load activity events from storage:", e);
    }
  }

  private saveToStorage() {
    try {
      // Keep last 200 events locally for caching and fast dashboard calculation
      const recentEvents = this.events.slice(0, 200);
      localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(recentEvents));
      localStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(this.eventQueue));
    } catch (e) {
      console.warn("Failed to save activity events to storage:", e);
    }
  }

  /**
   * Log a new activity event.
   */
  public logEvent(
    userId: string,
    activityType: ActivityType,
    title: string,
    description: string,
    workspaceId = "default_workspace",
    options: {
      duration?: number;
      completionPercent?: number;
      priority?: number;
      metadata?: Record<string, any>;
    } = {}
  ): ActivityEvent {
    const event: ActivityEvent = {
      eventId: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: userId || "guest_student",
      activityType,
      workspaceId,
      title,
      description,
      timestamp: Date.now(),
      duration: options.duration || 0,
      completionPercent: options.completionPercent ?? 100,
      priority: options.priority ?? this.getDefaultPriority(activityType),
      metadata: options.metadata || {}
    };

    // Unshift to top of events
    this.events.unshift(event);
    this.eventQueue.push(event);

    this.saveToStorage();
    this.triggerBackgroundSync();

    return event;
  }

  private getDefaultPriority(type: ActivityType): number {
    switch (type) {
      case "workspace": return 1;
      case "quiz": return 2;
      case "pdf_analysis":
      case "pdf_reading": return 3;
      case "flashcards": return 4;
      case "focus_session": return 5;
      case "ai_chat": return 6;
      case "game": return 7;
      default: return 8;
    }
  }

  public getRecentEvents(limit = 20): ActivityEvent[] {
    return this.events.slice(0, limit);
  }

  public getEventsByWorkspace(workspaceId: string): ActivityEvent[] {
    return this.events.filter((e) => e.workspaceId === workspaceId);
  }

  public getUnfinishedEvents(): ActivityEvent[] {
    return this.events.filter((e) => e.completionPercent < 100);
  }

  private async triggerBackgroundSync() {
    if (this.isSyncing || this.eventQueue.length === 0) return;
    this.isSyncing = true;

    try {
      // Simulate/execute background sync queue batch
      const batch = [...this.eventQueue];
      // In production, batch is sent via fetchWithRetry or cloud sync API
      // On success:
      this.eventQueue = this.eventQueue.filter((q) => !batch.includes(q));
      this.saveToStorage();
    } catch (err) {
      console.warn("Background activity sync deferred:", err);
    } finally {
      this.isSyncing = false;
    }
  }

  public clearAll() {
    this.events = [];
    this.eventQueue = [];
    localStorage.removeItem(STORAGE_KEY_EVENTS);
    localStorage.removeItem(STORAGE_KEY_QUEUE);
  }
}

export const activityService = new ActivityService();
