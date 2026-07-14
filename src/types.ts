export interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  dueDate: string;
  subject: string;
  studyTime: number; // in minutes
  createdAt: string;
}

export interface Card {
  id: string;
  front: string;
  back: string;
  mastered: boolean;
}

export interface Deck {
  id: string;
  name: string;
  description: string;
  cards: Card[];
  createdAt: string;
}

export interface StudySession {
  id: string;
  subject: string;
  duration: number; // in seconds
  notes: string;
  createdAt: string;
}

export interface SubjectStats {
  subject: string;
  studyTime: number; // in minutes
  tasksCompleted: number;
}
