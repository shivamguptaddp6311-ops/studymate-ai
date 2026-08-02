import { WorkspaceMemory } from "../../types";

const STORAGE_KEY_WORKSPACES = "studymate_workspace_memories_v1";

export class WorkspaceMemoryService {
  private memories: Map<string, WorkspaceMemory> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_WORKSPACES);
      if (saved) {
        const list: WorkspaceMemory[] = JSON.parse(saved);
        list.forEach((m) => this.memories.set(m.workspaceId, m));
      }
    } catch (e) {
      console.warn("Failed to load workspace memory from storage:", e);
    }
  }

  private saveToStorage() {
    try {
      const list = Array.from(this.memories.values());
      localStorage.setItem(STORAGE_KEY_WORKSPACES, JSON.stringify(list));
    } catch (e) {
      console.warn("Failed to save workspace memory to storage:", e);
    }
  }

  public getMemory(workspaceId: string, workspaceName = "General Workspace"): WorkspaceMemory {
    if (!this.memories.has(workspaceId)) {
      const newMemory: WorkspaceMemory = {
        workspaceId,
        workspaceName,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        extractedConcepts: [],
        weakTopics: [],
        summaryContext: "",
        attachedFileCount: 0,
        chatTurnCount: 0,
        pinnedNotes: [],
        metadata: {}
      };
      this.memories.set(workspaceId, newMemory);
      this.saveToStorage();
    }
    return this.memories.get(workspaceId)!;
  }

  public updateMemory(workspaceId: string, updates: Partial<WorkspaceMemory>): WorkspaceMemory {
    const current = this.getMemory(workspaceId);
    const updated: WorkspaceMemory = {
      ...current,
      ...updates,
      updatedAt: Date.now()
    };
    this.memories.set(workspaceId, updated);
    this.saveToStorage();
    return updated;
  }

  public recordConcept(workspaceId: string, concept: string, isWeak = false) {
    const memory = this.getMemory(workspaceId);
    const concepts = new Set(memory.extractedConcepts);
    concepts.add(concept);

    let weakTopics = [...memory.weakTopics];
    if (isWeak && !weakTopics.includes(concept)) {
      weakTopics.push(concept);
    }

    this.updateMemory(workspaceId, {
      extractedConcepts: Array.from(concepts),
      weakTopics
    });
  }

  public searchMemory(query: string): { workspaceId: string; workspaceName: string; matchedConcepts: string[] }[] {
    const results: { workspaceId: string; workspaceName: string; matchedConcepts: string[] }[] = [];
    const lower = query.toLowerCase();

    this.memories.forEach((memory) => {
      const matched = memory.extractedConcepts.filter((c) => c.toLowerCase().includes(lower));
      if (matched.length > 0 || memory.workspaceName.toLowerCase().includes(lower)) {
        results.push({
          workspaceId: memory.workspaceId,
          workspaceName: memory.workspaceName,
          matchedConcepts: matched
        });
      }
    });

    return results;
  }

  public getAllMemories(): WorkspaceMemory[] {
    return Array.from(this.memories.values());
  }

  public clearWorkspaceMemory(workspaceId: string) {
    this.memories.delete(workspaceId);
    this.saveToStorage();
  }
}

export const workspaceMemoryService = new WorkspaceMemoryService();
