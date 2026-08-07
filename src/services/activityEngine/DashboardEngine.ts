import {
  ActivityEvent,
  EngineDashboardData,
  HeroActivity,
  UserProfile,
  Task
} from "../../types";
import { activityService } from "./ActivityService";
import { workspaceMemoryService } from "./WorkspaceMemoryService";
import { analyticsAggregator } from "./AnalyticsAggregator";
import { recommendationEngine } from "./RecommendationEngine";

export class DashboardEngine {
  /**
   * Computes complete, non-duplicated dashboard data.
   */
  public getDashboardData(
    profile: UserProfile,
    tasks: Task[],
    studyHoursToday: number
  ): EngineDashboardData {
    const recentEvents = activityService.getRecentEvents(50);
    const workspaces = workspaceMemoryService.getAllMemories();

    const metrics = analyticsAggregator.aggregateDashboardMetrics(
      profile,
      recentEvents,
      tasks,
      studyHoursToday
    );

    const recommendations = recommendationEngine.generateRecommendations(
      profile,
      recentEvents,
      workspaces,
      metrics.todayStudyHours
    );

    const heroActivity = this.computeHeroActivity(recentEvents, profile);

    const aiInsights = [
      `Your study consistency is up by 18% this week!`,
      `Focusing on weak topics early in the day improves retention by 2.4x.`
    ];

    return {
      todayStudyHours: metrics.todayStudyHours,
      currentStreak: metrics.currentStreak,
      levelProgress: metrics.levelProgress,
      weeklyProgress: metrics.weeklyProgress,
      recentActivities: recentEvents.slice(0, 10),
      heroActivity,
      aiInsights,
      recommendations
    };
  }

  /**
   * Hero Card Algorithm: Evaluates the highest priority unfinished or recent activity.
   * Priority Order:
   * 1. active workspace
   * 2. unfinished quiz
   * 3. unfinished PDF
   * 4. unfinished flashcards
   * 5. active focus session
   * 6. recent AI chat
   * 7. recent game
   * 8. recommended study plan
   */
  public computeHeroActivity(
    events: ActivityEvent[],
    profile: UserProfile
  ): HeroActivity | null {
    // 1. Active Workspace (Unfinished workspace event or active workspace context)
    const activeWorkspaceEvent = events.find(
      (e) => e.activityType === "workspace" && e.completionPercent < 100
    );
    if (activeWorkspaceEvent) {
      return {
        event: activeWorkspaceEvent,
        priorityCategory: "active_workspace",
        reasonText: "Active Workspace In Progress",
        actionLabel: "Resume Workspace"
      };
    }

    // 2. Unfinished Quiz
    const unfinishedQuiz = events.find(
      (e) => e.activityType === "quiz" && e.completionPercent < 100
    );
    if (unfinishedQuiz) {
      return {
        event: unfinishedQuiz,
        priorityCategory: "unfinished_quiz",
        reasonText: `Quiz Incomplete: ${unfinishedQuiz.completionPercent}% finished`,
        actionLabel: "Continue Quiz"
      };
    }

    // 3. Unfinished PDF
    const unfinishedPDF = events.find(
      (e) => (e.activityType === "pdf_analysis" || e.activityType === "pdf_reading") && e.completionPercent < 100
    );
    if (unfinishedPDF) {
      return {
        event: unfinishedPDF,
        priorityCategory: "unfinished_pdf",
        reasonText: `PDF Reading In Progress (${unfinishedPDF.completionPercent}%)`,
        actionLabel: "Resume PDF Analysis"
      };
    }

    // 4. Unfinished Flashcards
    const unfinishedFlashcards = events.find(
      (e) => e.activityType === "flashcards" && e.completionPercent < 100
    );
    if (unfinishedFlashcards) {
      return {
        event: unfinishedFlashcards,
        priorityCategory: "unfinished_flashcards",
        reasonText: "Flashcard Deck Paused",
        actionLabel: "Resume Flashcards"
      };
    }

    // 5. Active Focus Session
    const activeFocus = events.find(
      (e) => e.activityType === "focus_session" && e.completionPercent < 100
    );
    if (activeFocus) {
      return {
        event: activeFocus,
        priorityCategory: "active_focus",
        reasonText: "Pomodoro Focus Timer Running",
        actionLabel: "Return to Focus Timer"
      };
    }

    // 6. Recent AI Chat
    const recentChat = events.find((e) => e.activityType === "ai_chat");
    if (recentChat) {
      return {
        event: recentChat,
        priorityCategory: "recent_chat",
        reasonText: `Last Chat: "${recentChat.title}"`,
        actionLabel: "Continue Discussion"
      };
    }

    // 7. Recent Game
    const recentGame = events.find((e) => e.activityType === "game");
    if (recentGame) {
      return {
        event: recentGame,
        priorityCategory: "recent_game",
        reasonText: `Recent Game: ${recentGame.title}`,
        actionLabel: "Replay Challenge"
      };
    }

    // 8. Recommended Study Plan Fallback
    const fallbackEvent: ActivityEvent = {
      eventId: "default_plan",
      userId: profile.id || "student",
      activityType: "timetable",
      workspaceId: "default_workspace",
      title: `${profile.targetExam || "Board Exam"} Focus Session`,
      description: `Targeting weak areas in ${profile.weakSubjects[0] || "Core Concepts"}`,
      timestamp: Date.now(),
      duration: 1800,
      completionPercent: 0,
      priority: 8,
      metadata: {
        targetRoute: "pomodoro"
      }
    };

    return {
      event: fallbackEvent,
      priorityCategory: "study_plan",
      reasonText: "Recommended Adaptive Study Plan",
      actionLabel: "Start Recommended Session"
    };
  }

  /**
   * Restores full session state when "Continue" is clicked.
   */
  public restoreSessionState(eventId: string) {
    const events = activityService.getRecentEvents(100);
    const targetEvent = events.find((e) => e.eventId === eventId);

    if (!targetEvent) return null;

    const workspaceMemory = workspaceMemoryService.getMemory(targetEvent.workspaceId);

    return {
      eventId: targetEvent.eventId,
      title: targetEvent.title,
      description: targetEvent.description,
      activityType: targetEvent.activityType,
      workspaceId: targetEvent.workspaceId,
      chatHistory: targetEvent.metadata.chatHistory || [],
      uploadedFiles: targetEvent.metadata.uploadedFiles || [],
      selectedAIModel: targetEvent.metadata.selectedAIModel || "gemini-3.6-flash",
      scrollPosition: targetEvent.metadata.scrollPosition || 0,
      progressState: targetEvent.metadata.progressState || {},
      targetRoute: targetEvent.metadata.targetRoute || this.getRouteForActivity(targetEvent.activityType),
      workspaceContext: workspaceMemory
    };
  }

  private getRouteForActivity(activityType: string): string {
    switch (activityType) {
      case "ai_chat": return "ai_chat";
      case "pdf_analysis":
      case "pdf_reading": return "ai_chat";
      case "quiz":
      case "game": return "games";
      case "flashcards": return "ai_chat";
      case "focus_session": return "pomodoro";
      case "scanner":
      case "homework": return "ai_chat";
      case "timetable": return "planner";
      case "calendar": return "calendar";
      default: return "ai_chat";
    }
  }
}

export const dashboardEngine = new DashboardEngine();
