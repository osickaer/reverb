import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchDailyPack } from "../data/daily-packs";
import { fetchQuestions } from "../data/questions";
import { cancelDailySessionReminder } from "./notifications";

const SESSION_KEY = "@reverb_daily_session";
const FREEPLAY_SESSION_KEY = "@reverb_freeplay_session";
const STATS_KEY = "@reverb_user_stats";

export interface DailySession {
  date: string; // YYYY-MM-DD
  mode?: "daily" | "freeplay";
  status: "available" | "in-progress" | "completed";
  questionIds: string[];
  questionTypes?: Record<string, "new" | "missed" | "resurfaced">;
  currentIndex: number;
  score: number;
  results?: ("correct" | "incorrect" | null)[];
  selectedAnswerIndices?: (number | null)[];
  // Retry mode fields
  retryMode?: boolean;
  retryQuestionIds?: string[];
  retryResults?: ("correct" | "incorrect" | null)[];
  originalQuestionIds?: string[];
  originalResults?: ("correct" | "incorrect" | null)[];
  originalScore?: number;
  originalSelectedAnswerIndices?: (number | null)[];
}

export interface CompletedSessionSnapshot {
  date: string;
  completedAt: string;
  score: number;
  total: number;
  questionIds: string[];
  questionTypes?: Record<string, "new" | "missed" | "resurfaced">;
  results: ("correct" | "incorrect" | null)[];
  selectedAnswerIndices: (number | null)[];
}

export interface UserStats {
  history: Record<string, { score: number; total: number }>;
  sessionHistory: Record<string, CompletedSessionSnapshot>;
  missedQuestions: string[];
  correctQuestions: string[];
  recentlySeen: string[]; // Keep last N questions
}

export const getTodayString = () => {
  // const date = new Date("2026-04-01");
  const date = new Date();
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
};

export const getDateStringForOffset = (daysAgo: number) => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
};

export const calculateCurrentStreak = (
  history: UserStats["history"],
): number => {
  const todayKey = getDateStringForOffset(0);
  const startOffset = history[todayKey] ? 0 : 1;
  let streak = 0;

  for (let offset = startOffset; offset < 366; offset++) {
    const dateKey = getDateStringForOffset(offset);
    if (!history[dateKey]) break;
    streak += 1;
  }

  return streak;
};

export const loadSession = async (): Promise<DailySession | null> => {
  try {
    const json = await AsyncStorage.getItem(SESSION_KEY);
    return json ? JSON.parse(json) : null;
  } catch (e) {
    console.error(e);
    return null;
  }
};

export const saveSession = async (session: DailySession) => {
  try {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (e) {
    console.error(e);
  }
};

export const loadFreeplaySession = async (): Promise<DailySession | null> => {
  try {
    const json = await AsyncStorage.getItem(FREEPLAY_SESSION_KEY);
    return json ? JSON.parse(json) : null;
  } catch (e) {
    console.error(e);
    return null;
  }
};

export const saveFreeplaySession = async (session: DailySession) => {
  try {
    await AsyncStorage.setItem(FREEPLAY_SESSION_KEY, JSON.stringify(session));
  } catch (e) {
    console.error(e);
  }
};

export const buildShuffledQuestionIds = async (): Promise<string[]> => {
  const questions = await fetchQuestions();
  return [...questions]
    .sort(() => 0.5 - Math.random())
    .map((question) => question.id);
};

export const startFreeplaySession = async (): Promise<DailySession> => {
  const questionIds = await buildShuffledQuestionIds();
  const freeplaySession: DailySession = {
    date: new Date().toISOString(),
    mode: "freeplay",
    status: "in-progress",
    questionIds,
    currentIndex: 0,
    score: 0,
    results: new Array(questionIds.length).fill(null),
    selectedAnswerIndices: new Array(questionIds.length).fill(null),
  };

  await saveFreeplaySession(freeplaySession);
  return freeplaySession;
};

export const loadStats = async (): Promise<UserStats> => {
  try {
    const json = await AsyncStorage.getItem(STATS_KEY);
    if (json) {
      const parsed = JSON.parse(json);
      return {
        history: parsed.history ?? {},
        sessionHistory: parsed.sessionHistory ?? {},
        missedQuestions: parsed.missedQuestions ?? [],
        correctQuestions: parsed.correctQuestions ?? [],
        recentlySeen: parsed.recentlySeen ?? [],
      };
    }

    return {
      history: {},
      sessionHistory: {},
      missedQuestions: [],
      correctQuestions: [],
      recentlySeen: [],
    };
  } catch (e) {
    return {
      history: {},
      sessionHistory: {},
      missedQuestions: [],
      correctQuestions: [],
      recentlySeen: [],
    };
  }
};

export const saveStats = async (stats: UserStats) => {
  try {
    await AsyncStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (e) {
    console.error(e);
  }
};

export const initDailySessionIfNeeded = async (): Promise<DailySession> => {
  const session = await loadSession();
  const today = getTodayString();

  if (session && session.date === today) {
    return session;
  }

  const stats = await loadStats();
  const dailyPack = await fetchDailyPack(today);
  const questionIds = dailyPack.questionIds;
  const questionTypes = Object.fromEntries(
    questionIds.map((questionId) => {
      if (stats.missedQuestions.includes(questionId)) {
        return [questionId, "missed" as const];
      }

      if (stats.correctQuestions.includes(questionId)) {
        return [questionId, "resurfaced" as const];
      }

      return [questionId, "new" as const];
    }),
  );

  const newSession: DailySession = {
    date: today,
    mode: "daily",
    status: "available",
    questionIds,
    questionTypes,
    currentIndex: 0,
    score: 0,
    selectedAnswerIndices: new Array(questionIds.length).fill(null),
  };

  await saveSession(newSession);
  return newSession;
};

export const updateQuestionStats = async (
  questionId: string,
  isCorrect: boolean,
) => {
  const stats = await loadStats();

  const missedSet = new Set(stats.missedQuestions || []);
  const correctSet = new Set(stats.correctQuestions || []);

  if (isCorrect) {
    correctSet.add(questionId);
    missedSet.delete(questionId);
  } else {
    missedSet.add(questionId);
    correctSet.delete(questionId);
  }

  // Update recently seen (keep last 30)
  const recent = [
    questionId,
    ...(stats.recentlySeen || []).filter((id) => id !== questionId),
  ].slice(0, 30);

  stats.missedQuestions = Array.from(missedSet);
  stats.correctQuestions = Array.from(correctSet);
  stats.recentlySeen = recent;

  await saveStats(stats);
};

export const completeSession = async (session: DailySession) => {
  session.status = "completed";
  await saveSession(session);
  await cancelDailySessionReminder(session.date);

  const stats = await loadStats();
  stats.history[session.date] = {
    score: session.score,
    total: session.questionIds.length,
  };
  stats.sessionHistory[session.date] = {
    date: session.date,
    completedAt: new Date().toISOString(),
    score: session.score,
    total: session.questionIds.length,
    questionIds: session.questionIds,
    questionTypes: session.questionTypes,
    results:
      session.results ?? new Array(session.questionIds.length).fill(null),
    selectedAnswerIndices:
      session.selectedAnswerIndices ??
      new Array(session.questionIds.length).fill(null),
  };
  await saveStats(stats);
};
