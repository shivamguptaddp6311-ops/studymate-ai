import { ActivityEvent, Task, UserProfile } from "../../types";

export class AnalyticsAggregator {
  /**
   * Incrementally computes dashboard metrics without running duplicate queries.
   */
  public aggregateDashboardMetrics(
    profile: UserProfile,
    events: ActivityEvent[],
    tasks: Task[],
    studyHoursToday: number
  ) {
    const todayStr = new Date().toISOString().slice(0, 10);

    // Compute study seconds from events today
    const todayEvents = events.filter((e) => {
      const eDate = new Date(e.timestamp).toISOString().slice(0, 10);
      return eDate === todayStr;
    });

    const eventStudySeconds = todayEvents.reduce((acc, curr) => acc + (curr.duration || 0), 0);
    const calculatedHours = Math.max(studyHoursToday, parseFloat((eventStudySeconds / 3600).toFixed(1)));

    // Level progress calculation
    const currentXP = profile.xp || 0;
    const currentLevel = profile.level || 1;
    const nextLevelXP = currentLevel * 500;
    const prevLevelXP = (currentLevel - 1) * 500;
    const xpInCurrentLevel = Math.max(0, currentXP - prevLevelXP);
    const xpSpan = Math.max(1, nextLevelXP - prevLevelXP);
    const percentToNextLevel = Math.min(100, Math.round((xpInCurrentLevel / xpSpan) * 100));

    // Weekly progress map (last 7 days)
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const weeklyProgressMap: { [key: string]: { hours: number; tasks: number } } = {};

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayLabel = days[d.getDay()];
      const dateIso = d.toISOString().slice(0, 10);

      // Tasks completed on this day
      const completedTasksOnDay = tasks.filter(
        (t) => t.completed && t.completedDate === dateIso
      ).length;

      // Activity duration on this day
      const dayEvents = events.filter(
        (e) => new Date(e.timestamp).toISOString().slice(0, 10) === dateIso
      );
      const dayHours = parseFloat(
        (dayEvents.reduce((sum, e) => sum + (e.duration || 0), 0) / 3600).toFixed(1)
      );

      weeklyProgressMap[dayLabel] = {
        hours: dateIso === todayStr ? Math.max(dayHours, calculatedHours) : dayHours,
        tasks: completedTasksOnDay
      };
    }

    const weeklyProgress = Object.keys(weeklyProgressMap).map((day) => ({
      day,
      hours: weeklyProgressMap[day].hours,
      completedTasks: weeklyProgressMap[day].tasks
    }));

    return {
      todayStudyHours: calculatedHours,
      currentStreak: profile.streakCounter || 1,
      levelProgress: {
        currentLevel,
        currentXP,
        nextLevelXP,
        percentToNextLevel
      },
      weeklyProgress
    };
  }
}

export const analyticsAggregator = new AnalyticsAggregator();
