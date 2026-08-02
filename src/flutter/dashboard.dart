// Production-ready Flutter Dashboard & Activity Intelligence Engine Architecture
// Import this file into your Flutter app: lib/dashboard.dart

import 'package:flutter/material.dart';

// --- MODELS ---

enum ActivityType {
  aiChat,
  pdfAnalysis,
  pdfReading,
  notes,
  quiz,
  flashcards,
  focusSession,
  scanner,
  homework,
  timetable,
  calendar,
  game,
  workspace,
}

class ActivityEvent {
  final String eventId;
  final String userId;
  final ActivityType activityType;
  final String workspaceId;
  final String title;
  final String description;
  final DateTime timestamp;
  final int durationSeconds;
  final int completionPercent;
  final int priority;
  final Map<String, dynamic> metadata;

  ActivityEvent({
    required this.eventId,
    required this.userId,
    required this.activityType,
    required this.workspaceId,
    required this.title,
    required this.description,
    required this.timestamp,
    required this.durationSeconds,
    required this.completionPercent,
    required this.priority,
    required this.metadata,
  });
}

class HeroActivity {
  final ActivityEvent event;
  final String priorityCategory;
  final String reasonText;
  final String actionLabel;

  HeroActivity({
    required this.event,
    required this.priorityCategory,
    required this.reasonText,
    required this.actionLabel,
  });
}

// --- FLUTTER DASHBOARD SCREEN ---

class StudyMateDashboardScreen extends StatefulWidget {
  final String studentName;
  final String classGrade;
  final String targetExam;
  final int daysToExam;
  final double studyHoursToday;
  final double dailyGoalHours;
  final int streakDays;
  final int userXP;
  final int userLevel;
  final Function(String route) onNavigate;

  const StudyMateDashboardScreen({
    Key? key,
    required this.studentName,
    required this.classGrade,
    required this.targetExam,
    required this.daysToExam,
    required this.studyHoursToday,
    required this.dailyGoalHours,
    required this.streakDays,
    required this.userXP,
    required this.userLevel,
    required this.onNavigate,
  }) : super(key: key);

  @override书
  State<StudyMateDashboardScreen> createState() => _StudyMateDashboardScreenState();
}

class _StudyMateDashboardScreenState extends State<StudyMateDashboardScreen> {
  String _selectedSearchFilter = "All";

  final List<String> _searchFilters = ["All", "PDFs", "Quizzes", "Notes", "Chats", "Formulas"];

  // Sample dynamic hero event powered by Activity Intelligence Engine
  late HeroActivity _currentHeroActivity;

  @override
  void initState() {
    super.initState();
    _currentHeroActivity = HeroActivity(
      event: ActivityEvent(
        eventId: "act_001",
        userId: "user_1",
        activityType: ActivityType.pdfAnalysis,
        workspaceId: "ws_physics",
        title: "NCERT Physics: Chapter 4 Checkpoint",
        description: "Moving Charges & Magnetism - 3 PYQ conceptual questions pending",
        timestamp: DateTime.now().subtract(const Duration(minutes: 24)),
        durationSeconds: 1200,
        completionPercent: 68,
        priority: 1,
        metadata: {},
      ),
      priorityCategory: "unfinished_pdf",
      reasonText: "Continue Last Session",
      actionLabel: "Resume Analysis",
    );
  }

  String _getSalutation() {
    final hour = DateTime.now().hour;
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(64),
        child: Container(
          color: Colors.white.withOpacity(0.9),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: SafeArea(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                IconButton(
                  icon: const Icon(Icons.menu_rounded, color: Color(0xFF1E293B)),
                  onPressed: () => widget.onNavigate("menu"),
                ),
                Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text(
                      "StudyMate AI",
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    Text(
                      "${_getSalutation()}, ${widget.studentName}",
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                        color: Colors.grey.shade600,
                      ),
                    ),
                  ],
                ),
                Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.search_rounded, color: Color(0xFF1E293B)),
                      onPressed: () => widget.onNavigate("search"),
                    ),
                    IconButton(
                      icon: const Icon(Icons.notifications_none_rounded, color: Color(0xFF1E293B)),
                      onPressed: () => widget.onNavigate("alarms"),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. HERO CARD
            _buildHeroCard(),

            const SizedBox(height: 20),

            // 2. AI WORKSPACE DEDICATED CARD
            _buildAIWorkspaceCard(),

            const SizedBox(height: 20),

            // 3. UNIVERSAL SEARCH BAR
            _buildUniversalSearchBar(),

            const SizedBox(height: 20),

            // 4. QUICK ACTIONS GRID (2x3)
            _buildQuickActionsGrid(),

            const SizedBox(height: 20),

            // 5. AI INSIGHT CARD
            _buildAIInsightCard(),

            const SizedBox(height: 20),

            // 6. WEEKLY PROGRESS CHART
            _buildWeeklyProgressChart(),

            const SizedBox(height: 20),

            // 7. RECENT ACTIVITY LIST
            _buildRecentActivityList(),

            const SizedBox(height: 80), // Padding for bottom nav
          ],
        ),
      ),
      bottomNavigationBar: _buildBottomNavigationBar(),
    );
  }

  Widget _buildHeroCard() {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(26),
        gradient: const LinearGradient(
          colors: [Color(0xFF4C1D95), Color(0xFF312E81), Color(0xFF0F172A)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF4C1D95).withOpacity(0.25),
            blurRadius: 20,
            offset: const Offset(0, 10),
          )
        ],
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Stat chips row (Zero duplication)
          Row(
            children: [
              _buildMiniStatChip("${widget.daysToExam}d", "Exam"),
              const SizedBox(width: 8),
              _buildMiniStatChip("${widget.studyHoursToday}h", "Today"),
              const SizedBox(width: 8),
              _buildMiniStatChip("${widget.streakDays}d", "Streak"),
              const SizedBox(width: 8),
              _buildMiniStatChip("Lvl ${widget.userLevel}", "${widget.userXP} XP"),
            ],
          ),

          const SizedBox(height: 16),

          // Dynamic Continue Your Last Session Card
          Container(
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.12),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.white.withOpacity(0.2)),
            ),
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.purple.shade400.withOpacity(0.3),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        _currentHeroActivity.reasonText,
                        style: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w900,
                          color: Colors.purpleAccent,
                        ),
                      ),
                    ),
                    Text(
                      "${_currentHeroActivity.event.completionPercent}% complete",
                      style: const TextStyle(fontSize: 10, color: Colors.white70),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  _currentHeroActivity.event.title,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _currentHeroActivity.event.description,
                  style: const TextStyle(fontSize: 12, color: Colors.white70),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: const Color(0xFF312E81),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    onPressed: () => widget.onNavigate("ai_chat"),
                    child: Text(
                      _currentHeroActivity.actionLabel,
                      style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13),
                    ),
                  ),
                )
              ],
            ),
          )
        ],
      ),
    );
  }

  Widget _buildMiniStatChip(String value, String label) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 6),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.1),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(
          children: [
            Text(
              value,
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
            ),
            Text(
              label,
              style: const TextStyle(fontSize: 9, color: Colors.white70),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAIWorkspaceCard() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 10, offset: const Offset(0, 4))
        ],
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text("AI Workspace", style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                  Text("Multimodal study assistant & notes summarizer", style: TextStyle(fontSize: 11, color: Colors.grey)),
                ],
              ),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF7C3AED),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: () => widget.onNavigate("ai_chat"),
                child: const Text("Open", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
              )
            ],
          ),
          const SizedBox(height: 12),
          const Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _ModeChip(icon: Icons.chat_bubble_outline_rounded, label: "Chat"),
              _ModeChip(icon: Icons.mic_none_rounded, label: "Voice"),
              _ModeChip(icon: Icons.picture_as_pdf_rounded, label: "PDF"),
              _ModeChip(icon: Icons.image_outlined, label: "Image"),
              _ModeChip(icon: Icons.videocam_outlined, label: "Video"),
            ],
          )
        ],
      ),
    );
  }

  Widget _buildUniversalSearchBar() {
    return Column(
      children: [
        TextField(
          decoration: InputDecoration(
            hintText: "Search notes, PDFs, formulas, quizzes, chats...",
            hintStyle: const TextStyle(fontSize: 12, color: Colors.grey),
            prefixIcon: const Icon(Icons.search_rounded, color: Color(0xFF7C3AED)),
            filled: true,
            fillColor: Colors.white,
            contentPadding: const EdgeInsets.symmetric(vertical: 14),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(20),
              borderSide: BorderSide.none,
            ),
          ),
        ),
        const SizedBox(height: 8),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: _searchFilters.map((f) {
              final isSelected = f == _selectedSearchFilter;
              return Padding(
                padding: const EdgeInsets.only(right: 8),
                child: ChoiceChip(
                  label: Text(f),
                  selected: isSelected,
                  selectedColor: const Color(0xFF7C3AED),
                  labelStyle: TextStyle(
                    color: isSelected ? Colors.white : Colors.black87,
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                  ),
                  onSelected: (val) => setState(() => _selectedSearchFilter = f),
                ),
              );
            }).toList(),
          ),
        )
      ],
    );
  }

  Widget _buildQuickActionsGrid() {
    final actions = [
      {"label": "Homework", "icon": Icons.assignment_outlined, "route": "tasks"},
      {"label": "Scanner", "icon": Icons.camera_alt_outlined, "route": "assistant"},
      {"label": "Timetable", "icon": Icons.calendar_today_outlined, "route": "planner"},
      {"label": "Focus Sprint", "icon": Icons.timer_outlined, "route": "pomodoro"},
      {"label": "Calendar", "icon": Icons.event_note_outlined, "route": "calendar"},
      {"label": "Flashcards", "icon": Icons.style_outlined, "route": "ai_chat"},
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text("Quick Actions", style: TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: Colors.grey)),
        const SizedBox(height: 8),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 3,
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
            childAspectRatio: 1.1,
          ),
          itemCount: actions.length,
          itemBuilder: (context, index) {
            final item = actions[index];
            return InkWell(
              onTap: () => widget.onNavigate(item["route"] as String),
              borderRadius: BorderRadius.circular(20),
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 8)
                  ],
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(item["icon"] as IconData, color: const Color(0xFF7C3AED)),
                    const SizedBox(height: 6),
                    Text(
                      item["label"] as String,
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ],
    );
  }

  Widget _buildAIInsightCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF3E8FF),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFDDD6FE)),
      ),
      child: const Row(
        children: [
          Icon(Icons.lightbulb_outline_rounded, color: Color(0xFF7C3AED)),
          SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text("AI Personal Insight", style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: Color(0xFF6B21A8))),
                SizedBox(height: 2),
                Text(
                  "Your retention in Physics Chapter 4 is high. Dedicate 15 mins to Mathematics PYQs next.",
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: Color(0xFF3B0764)),
                ),
              ],
            ),
          )
        ],
      ),
    );
  }

  Widget _buildWeeklyProgressChart() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text("Weekly Activity Progress", style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [1.5, 2.0, 3.2, 1.8, 2.5, 4.0, 2.8].map((h) {
              return Column(
                children: [
                  Container(
                    width: 24,
                    height: h * 18,
                    decoration: BoxDecoration(
                      color: const Color(0xFF7C3AED),
                      borderRadius: BorderRadius.circular(6),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text("${h}h", style: const TextStyle(fontSize: 9, color: Colors.grey)),
                ],
              );
            }).toList(),
          )
        ],
      ),
    );
  }

  Widget _buildRecentActivityList() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text("Recent Activity", style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        SizedBox(
          height: 100,
          child: ListView(
            scrollDirection: Axis.horizontal,
            children: const [
              _ActivityCard(title: "Physics PDF", timeAgo: "10m ago"),
              _ActivityCard(title: "Math PYQ Quiz", timeAgo: "1h ago"),
              _ActivityCard(title: "Organic Chem Flashcards", timeAgo: "2h ago"),
            ],
          ),
        )
      ],
    );
  }

  Widget _buildBottomNavigationBar() {
    return BottomNavigationBar(
      type: BottomNavigationBarType.fixed,
      selectedItemColor: const Color(0xFF7C3AED),
      unselectedItemColor: Colors.grey,
      currentIndex: 0,
      onTap: (idx) {
        if (idx == 0) widget.onNavigate("dashboard");
        if (idx == 1) widget.onNavigate("tools");
        if (idx == 2) widget.onNavigate("ai_chat");
        if (idx == 3) widget.onNavigate("community");
        if (idx == 4) widget.onNavigate("profile");
      },
      items: const [
        BottomNavigationBarItem(icon: Icon(Icons.home_rounded), label: "Home"),
        BottomNavigationBarItem(icon: Icon(Icons.grid_view_rounded), label: "Tools"),
        BottomNavigationBarItem(icon: Icon(Icons.auto_awesome_rounded), label: "AI"),
        BottomNavigationBarItem(icon: Icon(Icons.chat_bubble_outline_rounded), label: "Chats"),
        BottomNavigationBarItem(icon: Icon(Icons.person_outline_rounded), label: "Profile"),
      ],
    );
  }
}

class _ModeChip extends StatelessWidget {
  final IconData icon;
  final String label;
  const _ModeChip({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        CircleAvatar(
          backgroundColor: const Color(0xFFF3E8FF),
          radius: 18,
          child: Icon(icon, size: 18, color: const Color(0xFF7C3AED)),
        ),
        const SizedBox(height: 4),
        Text(label, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
      ],
    );
  }
}

class _ActivityCard extends StatelessWidget {
  final String title;
  final String timeAgo;
  const _ActivityCard({required this.title, required this.timeAgo});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 140,
      margin: const EdgeInsets.only(right: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(timeAgo, style: const TextStyle(fontSize: 9, color: Colors.grey)),
          Text(title, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
          const Text("Resume →", style: TextStyle(fontSize: 10, color: Color(0xFF7C3AED), fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}
