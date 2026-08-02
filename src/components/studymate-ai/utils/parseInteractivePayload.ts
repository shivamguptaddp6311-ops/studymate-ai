import { QuizData, FlashcardDeckData } from "../types";

export interface ParsedInteractiveContent {
  quizData?: QuizData;
  flashcardsData?: FlashcardDeckData;
  cleanText?: string;
}

export function parseInteractivePayload(text: string): ParsedInteractiveContent {
  if (!text || typeof text !== "string") return {};

  const trimmed = text.trim();

  // 1. Try direct JSON parsing if text starts with {
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object") {
        if (parsed.type === "quiz" && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
          return { quizData: sanitizeQuizData(parsed) };
        }
        if ((parsed.type === "flashcards" || parsed.type === "flashcard_deck") && Array.isArray(parsed.cards) && parsed.cards.length > 0) {
          return { flashcardsData: sanitizeFlashcardDeckData(parsed) };
        }
      }
    } catch (e) {
      // ignore
    }
  }

  // 2. Extract ```json ... ``` codeblocks
  const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/gi;
  let match;

  while ((match = jsonBlockRegex.exec(text)) !== null) {
    const rawJson = match[1]?.trim();
    if (!rawJson) continue;

    try {
      const parsed = JSON.parse(rawJson);
      if (parsed && typeof parsed === "object") {
        if (parsed.type === "quiz" && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
          const cleanText = text.replace(match[0], "").trim();
          return {
            quizData: sanitizeQuizData(parsed),
            cleanText: cleanText.length > 0 ? cleanText : undefined
          };
        }

        if ((parsed.type === "flashcards" || parsed.type === "flashcard_deck") && Array.isArray(parsed.cards) && parsed.cards.length > 0) {
          const cleanText = text.replace(match[0], "").trim();
          return {
            flashcardsData: sanitizeFlashcardDeckData(parsed),
            cleanText: cleanText.length > 0 ? cleanText : undefined
          };
        }
      }
    } catch (e) {
      // continue loop
    }
  }

  // 3. Fallback regex search for embedded JSON object with "type": "quiz" or "type": "flashcards"
  const rawObjRegex = /\{[\s\S]*?"type"\s*:\s*"(quiz|flashcards|flashcard_deck)"[\s\S]*?\}/g;
  const rawMatch = rawObjRegex.exec(text);
  if (rawMatch) {
    try {
      const parsed = JSON.parse(rawMatch[0]);
      if (parsed && typeof parsed === "object") {
        if (parsed.type === "quiz" && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
          return { quizData: sanitizeQuizData(parsed) };
        }
        if ((parsed.type === "flashcards" || parsed.type === "flashcard_deck") && Array.isArray(parsed.cards) && parsed.cards.length > 0) {
          return { flashcardsData: sanitizeFlashcardDeckData(parsed) };
        }
      }
    } catch (e) {
      // ignore
    }
  }

  return {};
}

function sanitizeQuizData(raw: any): QuizData {
  return {
    type: "quiz",
    id: String(raw.id || `quiz-${Date.now()}`),
    title: String(raw.title || "Interactive Practice Quiz"),
    subject: String(raw.subject || "General Academic"),
    chapter: typeof raw.chapter === "string" ? raw.chapter : undefined,
    difficulty: raw.difficulty || "Medium",
    estimatedTime: raw.estimatedTime || `${Math.max(2, Math.round((raw.questions?.length || 5) * 0.8))} mins`,
    questions: Array.isArray(raw.questions)
      ? raw.questions.map((q: any, idx: number) => ({
          id: String(q.id || `q-${idx + 1}`),
          questionNumber: typeof q.questionNumber === "number" ? q.questionNumber : idx + 1,
          question: String(q.question || `Question ${idx + 1}`),
          options: Array.isArray(q.options) && q.options.length >= 2
            ? q.options.map(String)
            : ["Option A", "Option B", "Option C", "Option D"],
          correctOption: typeof q.correctOption === "number" && q.correctOption >= 0 && q.correctOption < (q.options?.length || 4)
            ? q.correctOption
            : 0,
          explanation: String(q.explanation || "Correct choice explanation."),
          topic: typeof q.topic === "string" ? q.topic : undefined
        }))
      : []
  };
}

function sanitizeFlashcardDeckData(raw: any): FlashcardDeckData {
  return {
    type: "flashcards",
    id: String(raw.id || `fc-deck-${Date.now()}`),
    title: String(raw.title || "High-Yield Flashcards Deck"),
    subject: String(raw.subject || "General Academic"),
    chapter: typeof raw.chapter === "string" ? raw.chapter : undefined,
    cards: Array.isArray(raw.cards)
      ? raw.cards.map((c: any, idx: number) => ({
          id: String(c.id || `card-${idx + 1}`),
          question: String(c.question || c.concept || `Concept ${idx + 1}`),
          concept: typeof c.concept === "string" ? c.concept : undefined,
          difficulty: c.difficulty || "Medium",
          answer: String(c.answer || "Answer details."),
          explanation: typeof c.explanation === "string" ? c.explanation : undefined,
          memoryTip: typeof c.memoryTip === "string" ? c.memoryTip : undefined,
          isBookmarked: Boolean(c.isBookmarked),
          isDifficult: Boolean(c.isDifficult)
        }))
      : []
  };
}
