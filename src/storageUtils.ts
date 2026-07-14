import { db, isFirebaseAvailable } from './firebase';
import { collection, getDocs, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { Task, Deck, StudySession } from './types';

const getLocal = <T>(key: string, defaultValue: T): T => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : defaultValue;
};

const setLocal = <T>(key: string, data: T): void => {
  localStorage.setItem(key, JSON.stringify(data));
};

export const loadTasks = async (): Promise<Task[]> => {
  if (isFirebaseAvailable && db) {
    try {
      const q = await getDocs(collection(db, 'tasks'));
      const tasks: Task[] = [];
      q.forEach((docSnap) => {
        tasks.push({ id: docSnap.id, ...docSnap.data() } as Task);
      });
      return tasks;
    } catch (e) {
      console.error("Firebase loadTasks error, falling back:", e);
    }
  }
  return getLocal<Task[]>('tasks', []);
};

export const saveTask = async (task: Task): Promise<void> => {
  const local = await loadTasks();
  const index = local.findIndex(t => t.id === task.id);
  if (index >= 0) {
    local[index] = task;
  } else {
    local.push(task);
  }
  setLocal('tasks', local);

  if (isFirebaseAvailable && db) {
    try {
      await setDoc(doc(db, 'tasks', task.id), task);
    } catch (e) {
      console.error("Firebase saveTask error:", e);
    }
  }
};

export const removeTask = async (id: string): Promise<void> => {
  const local = await loadTasks();
  const updated = local.filter(t => t.id !== id);
  setLocal('tasks', updated);

  if (isFirebaseAvailable && db) {
    try {
      await deleteDoc(doc(db, 'tasks', id));
    } catch (e) {
      console.error("Firebase removeTask error:", e);
    }
  }
};

export const loadDecks = async (): Promise<Deck[]> => {
  if (isFirebaseAvailable && db) {
    try {
      const q = await getDocs(collection(db, 'decks'));
      const decks: Deck[] = [];
      q.forEach((docSnap) => {
        decks.push({ id: docSnap.id, ...docSnap.data() } as Deck);
      });
      return decks;
    } catch (e) {
      console.error("Firebase loadDecks error:", e);
    }
  }
  return getLocal<Deck[]>('decks', []);
};

export const saveDeck = async (deck: Deck): Promise<void> => {
  const local = await loadDecks();
  const index = local.findIndex(d => d.id === deck.id);
  if (index >= 0) {
    local[index] = deck;
  } else {
    local.push(deck);
  }
  setLocal('decks', local);

  if (isFirebaseAvailable && db) {
    try {
      await setDoc(doc(db, 'decks', deck.id), deck);
    } catch (e) {
      console.error("Firebase saveDeck error:", e);
    }
  }
};

export const removeDeck = async (id: string): Promise<void> => {
  const local = await loadDecks();
  const updated = local.filter(d => d.id !== id);
  setLocal('decks', updated);

  if (isFirebaseAvailable && db) {
    try {
      await deleteDoc(doc(db, 'decks', id));
    } catch (e) {
      console.error("Firebase removeDeck error:", e);
    }
  }
};

export const loadSessions = async (): Promise<StudySession[]> => {
  if (isFirebaseAvailable && db) {
    try {
      const q = await getDocs(collection(db, 'sessions'));
      const sessions: StudySession[] = [];
      q.forEach((docSnap) => {
        sessions.push({ id: docSnap.id, ...docSnap.data() } as StudySession);
      });
      return sessions;
    } catch (e) {
      console.error("Firebase loadSessions error:", e);
    }
  }
  return getLocal<StudySession[]>('sessions', []);
};

export const saveSession = async (session: StudySession): Promise<void> => {
  const local = await loadSessions();
  local.push(session);
  setLocal('sessions', local);

  if (isFirebaseAvailable && db) {
    try {
      await setDoc(doc(db, 'sessions', session.id), session);
    } catch (e) {
      console.error("Firebase saveSession error:", e);
    }
  }
};
