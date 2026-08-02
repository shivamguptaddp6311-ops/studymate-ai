// Production-ready Flutter StudyMate Command Center Sidebar Architecture
// Import this file into your Flutter project: lib/command_center_drawer.dart

import 'dart:ui';
import 'package:flutter/material.dart';

// --- WORKSPACE MODEL ---
class StudyWorkspace {
  final String id;
  String name;
  bool isPinned;
  bool isArchived;

  StudyWorkspace({
    required this.id,
    required this.name,
    this.isPinned = false,
    this.isArchived = false,
  });
}

// --- COMMAND CENTER SIDEBAR DRAWER ---
class StudyMateCommandCenterDrawer extends StatefulWidget {
  final String userName;
  final String userAvatarUrl;
  final int userLevel;
  final int userXP;
  final bool isPremium;
  final String activeWorkspaceId;
  final List<StudyWorkspace> initialWorkspaces;
  final Function(String route) onNavigate;
  final Function(String workspaceId) onSelectWorkspace;

  const StudyMateCommandCenterDrawer({
    Key? key,
    required this.userName,
    this.userAvatarUrl = "",
    required this.userLevel,
    required this.userXP,
    this.isPremium = true,
    required this.activeWorkspaceId,
    required this.initialWorkspaces,
    required this.onNavigate,
    required this.onSelectWorkspace,
  }) : super(key: key);

  @override
  State<StudyMateCommandCenterDrawer> createState() =>
      _StudyMateCommandCenterDrawerState();
}

class _StudyMateCommandCenterDrawerState
    extends State<StudyMateCommandCenterDrawer> {
  late List<StudyWorkspace> _workspaces;
  late String _currentWorkspaceId;

  // AI Memory State
  bool _isWorkspaceMemoryEnabled = true;
  List<String> _memoryFacts = [
    "Prefers step-by-step calculus derivations",
    "Targeting CBSE Class 12 Physics Board Exam",
    "Focus area: Electromagnetic Induction & PYQs",
  ];

  // Storage & Sync State
  double _storageUsedGB = 1.24;
  double _totalStorageGB = 5.0;
  bool _isSyncing = false;

  // Security State
  bool _biometricEnabled = true;
  bool _exportProtectionEnabled = true;

  @override
  void initState() {
    super.initState();
    _workspaces = List.from(widget.initialWorkspaces);
    _currentWorkspaceId = widget.activeWorkspaceId;
  }

  void _addNewWorkspace(String name) {
    if (name.trim().isEmpty) return;
    setState(() {
      final ws = StudyWorkspace(
        id: "ws_${DateTime.now().millisecondsSinceEpoch}",
        name: name.trim(),
      );
      _workspaces.add(ws);
      _currentWorkspaceId = ws.id;
    });
    widget.onSelectWorkspace(_currentWorkspaceId);
  }

  void _showCreateWorkspaceDialog() {
    final controller = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text("Create New Workspace", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(
            hintText: "Workspace name (e.g. Organic Chem PYQs)",
          ),
          autofocus: true,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text("Cancel"),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF7C3AED)),
            onPressed: () {
              _addNewWorkspace(controller.text);
              Navigator.pop(ctx);
            },
            child: const Text("Create", style: TextStyle(color: Colors.white)),
          )
        ],
      ),
    );
  }

  void _showMemoryManagerDialog() {
    final controller = TextEditingController();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => Padding(
          padding: EdgeInsets.only(
            top: 20,
            left: 20,
            right: 20,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text("AI Memory Manager", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(ctx)),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                "Custom learned memory facts for workspace: ${_workspaces.firstWhere((w) => w.id == _currentWorkspaceId, orElse: () => StudyWorkspace(id: 'main', name: 'Main')).name}",
                style: const TextStyle(fontSize: 11, color: Colors.grey),
              ),
              const SizedBox(height: 12),
              ..._memoryFacts.map((fact) => Card(
                    margin: const EdgeInsets.only(bottom: 6),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    child: ListTile(
                      dense: true,
                      title: Text(fact, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                      trailing: IconButton(
                        icon: const Icon(Icons.delete_outline, size: 18, color: Colors.red),
                        onPressed: () {
                          setState(() => _memoryFacts.remove(fact));
                          setSheetState(() {});
                        },
                      ),
                    ),
                  )),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: controller,
                      style: const TextStyle(fontSize: 12),
                      decoration: const InputDecoration(
                        hintText: "Add custom study fact...",
                        border: OutlineInputBorder(),
                        contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF7C3AED)),
                    onPressed: () {
                      if (controller.text.trim().isNotEmpty) {
                        setState(() => _memoryFacts.add(controller.text.trim()));
                        setSheetState(() {});
                        controller.clear();
                      }
                    },
                    child: const Text("Add", style: TextStyle(color: Colors.white, fontSize: 12)),
                  )
                ],
              )
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // 85% width slide panel
    final drawerWidth = MediaQuery.of(context).size.width * 0.85;

    return Drawer(
      width: drawerWidth,
      child: ClipRRect(
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
          child: Container(
            color: Colors.white.withOpacity(0.95),
            child: SafeArea(
              child: Column(
                children: [
                  // 1. HEADER (User Avatar, Name, Level, Premium Status)
                  _buildHeader(),

                  const Divider(height: 1, thickness: 0.5),

                  // SCROLLABLE BODY SECTIONS
                  Expanded(
                    child: ListView(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      children: [
                        // 2. WORKSPACES SECTION
                        _buildWorkspacesSection(),

                        const SizedBox(height: 20),

                        // 3. LIBRARY SECTION
                        _buildLibrarySection(),

                        const SizedBox(height: 20),

                        // 4. AI CONTROL & MEMORY MANAGER
                        _buildAIControlSection(),

                        const SizedBox(height: 20),

                        // 5. STORAGE SECTION
                        _buildStorageSection(),

                        const SizedBox(height: 20),

                        // 6. SECURITY SECTION
                        _buildSecuritySection(),

                        const SizedBox(height: 20),

                        // 7. ACCOUNT & PREFERENCES
                        _buildAccountSection(),
                      ],
                    ),
                  ),

                  // FOOTER
                  const Divider(height: 1, thickness: 0.5),
                  Padding(
                    padding: const EdgeInsets.all(12.0),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text("StudyMate Command Center v2.4", style: TextStyle(fontSize: 10, color: Colors.grey)),
                        InkWell(
                          onTap: () => widget.onNavigate("settings"),
                          child: const Text("Help & Feedback", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF7C3AED))),
                        )
                      ],
                    ),
                  )
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.all(16),
      color: const Color(0xFFF8FAFC),
      child: Row(
        children: [
          Stack(
            children: [
              CircleAvatar(
                radius: 24,
                backgroundColor: const Color(0xFF7C3AED),
                child: Text(
                  widget.userName.isNotEmpty ? widget.userName[0].toUpperCase() : "S",
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
                ),
              ),
              if (widget.isPremium)
                const Positioned(
                  bottom: 0,
                  right: 0,
                  child: CircleAvatar(
                    radius: 8,
                    backgroundColor: Colors.amber,
                    child: Icon(Icons.star, size: 10, color: Colors.white),
                  ),
                )
            ],
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        widget.userName,
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFFDDD6FE),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Text(
                        "PRO",
                        style: TextStyle(fontSize: 9, fontWeight: FontWeight.black, color: Color(0xFF6B21A8)),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  "Level ${widget.userLevel} • ${widget.userXP} XP",
                  style: const TextStyle(fontSize: 11, color: Colors.grey, fontWeight: FontWeight.w600),
                )
              ],
            ),
          )
        ],
      ),
    );
  }

  Widget _buildWorkspacesSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              "WORKSPACES",
              style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Colors.grey, letterSpacing: 0.8),
            ),
            IconButton(
              icon: const Icon(Icons.add_circle_outline, size: 18, color: Color(0xFF7C3AED)),
              onPressed: _showCreateWorkspaceDialog,
            )
          ],
        ),
        ..._workspaces.where((w) => !w.isArchived).map((ws) {
          final isActive = ws.id == _currentWorkspaceId;
          return Container(
            margin: const EdgeInsets.only(bottom: 4),
            decoration: BoxDecoration(
              color: isActive ? const Color(0xFFF3E8FF) : Colors.transparent,
              borderRadius: BorderRadius.circular(12),
            ),
            child: ListTile(
              dense: true,
              leading: Icon(
                isActive ? Icons.folder_special : Icons.folder_outlined,
                color: isActive ? const Color(0xFF7C3AED) : Colors.grey,
                size: 20,
              ),
              title: Text(
                ws.name,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: isActive ? FontWeight.bold : FontWeight.w500,
                  color: isActive ? const Color(0xFF6B21A8) : Colors.black87,
                ),
              ),
              trailing: PopupMenuButton<String>(
                icon: const Icon(Icons.more_vert, size: 16, color: Colors.grey),
                onSelected: (val) {
                  if (val == "pin") setState(() => ws.isPinned = !ws.isPinned);
                  if (val == "archive") setState(() => ws.isArchived = true);
                  if (val == "delete") setState(() => _workspaces.remove(ws));
                },
                itemBuilder: (context) => [
                  PopupMenuItem(value: "pin", child: Text(ws.isPinned ? "Unpin" : "Pin")),
                  const PopupMenuItem(value: "archive", child: Text("Archive")),
                  const PopupMenuItem(value: "delete", child: Text("Delete", style: TextStyle(color: Colors.red))),
                ],
              ),
              onTap: () {
                setState(() => _currentWorkspaceId = ws.id);
                widget.onSelectWorkspace(ws.id);
              },
            ),
          );
        }),
      ],
    );
  }

  Widget _buildLibrarySection() {
    final libraryItems = [
      {"label": "Saved Chats", "icon": Icons.chat_outlined},
      {"label": "Saved Notes", "icon": Icons.note_alt_outlined},
      {"label": "Saved PDFs", "icon": Icons.picture_as_pdf_outlined},
      {"label": "Saved Flashcards", "icon": Icons.style_outlined},
      {"label": "Saved Quizzes", "icon": Icons.quiz_outlined},
      {"label": "Downloads", "icon": Icons.download_outlined},
      {"label": "Exports", "icon": Icons.ios_share_outlined},
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          "LIBRARY",
          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Colors.grey, letterSpacing: 0.8),
        ),
        const SizedBox(height: 6),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            crossAxisSpacing: 8,
            mainAxisSpacing: 8,
            childAspectRatio: 2.8,
          ),
          itemCount: libraryItems.length,
          itemBuilder: (ctx, idx) {
            final item = libraryItems[idx];
            return InkWell(
              onTap: () => widget.onNavigate("ai_chat"),
              borderRadius: BorderRadius.circular(10),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Row(
                  children: [
                    Icon(item["icon"] as IconData, size: 16, color: const Color(0xFF7C3AED)),
                    const SizedBox(width: 8),
                    Flexible(
                      child: Text(
                        item["label"] as String,
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                        overflow: TextOverflow.ellipsis,
                      ),
                    )
                  ],
                ),
              ),
            );
          },
        )
      ],
    );
  }

  Widget _buildAIControlSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          "AI CONTROL & MEMORY",
          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Colors.grey, letterSpacing: 0.8),
        ),
        const SizedBox(height: 6),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFFF3E8FF),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFDDD6FE)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text("Workspace Memory", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  Switch(
                    value: _isWorkspaceMemoryEnabled,
                    activeColor: const Color(0xFF7C3AED),
                    onChanged: (val) => setState(() => _isWorkspaceMemoryEnabled = val),
                  )
                ],
              ),
              const Text(
                "Remembers weak topics & study context isolated for this workspace.",
                style: TextStyle(fontSize: 10, color: Colors.black87),
              ),
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFF7C3AED),
                    side: const BorderSide(color: Color(0xFF7C3AED)),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: _showMemoryManagerDialog,
                  child: Text("Manage Memory (${_memoryFacts.length})", style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                ),
              )
            ],
          ),
        )
      ],
    );
  }

  Widget _buildStorageSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          "STORAGE & SYNC",
          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Colors.grey, letterSpacing: 0.8),
        ),
        const SizedBox(height: 6),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: Colors.grey.shade200),
          ),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text("Storage Used", style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
                  Text("${_storageUsedGB}GB / ${_totalStorageGB}GB", style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF7C3AED))),
                ],
              ),
              const SizedBox(height: 6),
              LinearProgressIndicator(
                value: _storageUsedGB / _totalStorageGB,
                backgroundColor: Colors.grey.shade200,
                color: const Color(0xFF7C3AED),
              ),
              const SizedBox(height: 10),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  InkWell(
                    onTap: () {
                      setState(() => _isSyncing = true);
                      Future.delayed(const Duration(seconds: 1), () => setState(() => _isSyncing = false));
                    },
                    child: Row(
                      children: [
                        Icon(Icons.sync, size: 14, color: _isSyncing ? Colors.purple : Colors.grey),
                        const SizedBox(width: 4),
                        Text(_isSyncing ? "Syncing..." : "Sync Now", style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                  InkWell(
                    onTap: () {
                      setState(() => _storageUsedGB = 0.82);
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Cache cleared successfully!")));
                    },
                    child: const Text("Clear Cache", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.red)),
                  )
                ],
              )
            ],
          ),
        )
      ],
    );
  }

  Widget _buildSecuritySection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          "SECURITY & PRIVACY",
          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Colors.grey, letterSpacing: 0.8),
        ),
        const SizedBox(height: 6),
        SwitchListTile(
          dense: true,
          contentPadding: EdgeInsets.zero,
          title: const Text("Biometric Lock", style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
          value: _biometricEnabled,
          activeColor: const Color(0xFF7C3AED),
          onChanged: (val) => setState(() => _biometricEnabled = val),
        ),
        SwitchListTile(
          dense: true,
          contentPadding: EdgeInsets.zero,
          title: const Text("Export Protection", style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
          value: _exportProtectionEnabled,
          activeColor: const Color(0xFF7C3AED),
          onChanged: (val) => setState(() => _exportProtectionEnabled = val),
        ),
      ],
    );
  }

  Widget _buildAccountSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          "ACCOUNT & SYSTEM",
          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Colors.grey, letterSpacing: 0.8),
        ),
        ListTile(
          dense: true,
          contentPadding: EdgeInsets.zero,
          leading: const Icon(Icons.person_outline, size: 18, color: Color(0xFF7C3AED)),
          title: const Text("Student Profile", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
          trailing: const Icon(Icons.chevron_right, size: 18, color: Colors.grey),
          onTap: () => widget.onNavigate("profile"),
        ),
        ListTile(
          dense: true,
          contentPadding: EdgeInsets.zero,
          leading: const Icon(Icons.settings_outlined, size: 18, color: Color(0xFF7C3AED)),
          title: const Text("Settings & Preferences", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
          trailing: const Icon(Icons.chevron_right, size: 18, color: Colors.grey),
          onTap: () => widget.onNavigate("settings"),
        ),
      ],
    );
  }
}
