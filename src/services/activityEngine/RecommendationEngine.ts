import { AIRecommendationItem, ActivityEvent, UserProfile, WorkspaceMemory } from "../../types";

export class RecommendationEngine {
  /**
   * Generates actionable study recommendations.
   */
  public generateRecommendations(
    profile: UserProfile,
    events: ActivityEvent[],
    workspaces: WorkspaceMemory[],
    todayHours: number
  ): AIRecommendationItem[] {
    const recommendations: AIRecommendationItem[] = [];

    // 1. Weak Topics Recommendation
    const weakSubjects = profile.weakSubjects || [];
    const workspaceWeakTopics = workspaces.flatMap((w) => w.weakTopics || []);
    const allWeakTopics = Array.from(new Set([...weakSubjects, ...workspaceWeakTopics]));

    if (allWeakTopics.length > 0) {
      const topWeak = allWeakTopics[0];
      recommendations.push({
        id: `rec_weak_${topWeak}`,
        title: `Targeted Practice: ${topWeak}`,
        description: `Your activity logs show room for improvement in ${topWeak}. Let's run a 5-minute active recall session.`,
        type: "weak_topic",
        actionRoute: "ai_chat",
        actionText: `Practice ${topWeak}`,
        urgency: "high"
      });
    }

    // 2. Quiz Accuracy Recommendation
    const quizEvents = events.filter((e) => e.activityType === "quiz");
    if (quizEvents.length > 0) {
      const recentQuiz = quizEvents[0];
      const accuracy = recentQuiz.metadata.quizAccuracy ?? 70;
      if (accuracy < 75) {
        recommendations.push({
          id: `rec_quiz_${recentQuiz.eventId}`,
          title: `Quiz Review: ${recentQuiz.title}`,
          description: `You scored ${accuracy}% on your recent quiz. Review explanation points to solidify retention.`,
          type: "quiz_accuracy",
          actionRoute: "games",
          actionText: "Review Quiz Errors",
          urgency: "high"
        });
      }
    }

    // 3. Study Consistency & Daily Goal
    const dailyGoal = profile.dailyStudyGoal || 2;
    if (todayHours < dailyGoal) {
      const remainingMinutes = Math.round((dailyGoal - todayHours) * 60);
      recommendations.push({
        id: "rec_consistency_goal",
        title: `Complete Daily Study Goal`,
        description: `You are ${remainingMinutes} minutes away from reaching your ${dailyGoal}h study goal today. Maintain your streak!`,
        type: "consistency",
        actionRoute: "pomodoro",
        actionText: "Start Focus Sprint",
        urgency: "medium"
      });
    }

    // 4. Revision Schedule / Spaced Repetition
    const olderEvents = events.filter((e) => {
      const daysOld = (Date.now() - e.timestamp) / (1000 * 3600 * 24);
      return daysOld >= 2 && daysOld <= 5 && (e.activityType === "pdf_reading" || e.activityType === "notes");
    });

    if (olderEvents.length > 0) {
      const revTarget = olderEvents[0];
      recommendations.push({
        id: `rec_rev_${revTarget.eventId}`,
        title: `Spaced Revision: ${revTarget.title}`,
        description: `You studied "${revTarget.title}" 3 days ago. Re-testing now doubles long-term retention.`,
        type: "revision",
        actionRoute: "flashcards",
        actionText: "Quick Flashcard Review",
        urgency: "medium"
      });
    }

    // 5. Exam Preparation
    if (profile.targetExam) {
      recommendations.push({
        id: "rec_exam_prep",
        title: `${profile.targetExam} Practice Set`,
        description: `Simulate high-yield questions tailored for ${profile.targetExam} Class ${profile.classGrade}.`,
        type: "exam_prep",
        actionRoute: "syllabus_quest",
        actionText: "Take Practice Challenge",
        urgency: "low"
      });
    }

    return recommendations;
  }
}

export const recommendationEngine = new RecommendationEngine();
