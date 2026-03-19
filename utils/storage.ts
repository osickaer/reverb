import AsyncStorage from "@react-native-async-storage/async-storage";
import { Question, seedQuestions } from "../data/questions";

const SESSION_KEY = "@reverb_daily_session";
const STATS_KEY = "@reverb_user_stats";

export interface DailySession {
  date: string; // YYYY-MM-DD
  status: "available" | "in-progress" | "completed";
  questionIds: string[];
  currentIndex: number;
  score: number;
}

export interface UserStats {
  history: Record<string, { score: number; total: number }>;
  missedQuestions: string[];
  correctQuestions: string[];
  recentlySeen: string[]; // Keep last N questions
}

export const getTodayString = () => {
  const date = new Date("2026-03-9");
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
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

export const loadStats = async (): Promise<UserStats> => {
  try {
    const json = await AsyncStorage.getItem(STATS_KEY);
    return json
      ? JSON.parse(json)
      : {
          history: {},
          missedQuestions: [],
          correctQuestions: [],
          recentlySeen: [],
        };
  } catch (e) {
    return {
      history: {},
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

  const recentlySeenSet = new Set(stats.recentlySeen || []);
  const missedSet = new Set(stats.missedQuestions || []);
  const correctSet = new Set(stats.correctQuestions || []);

  const selected: string[] = [];

  const pickRandom = (arr: Question[], n: number): Question[] => {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, n);
  };

  // 1. Confidence check: 1 previously answered correctly
  let confidenceCandidates = seedQuestions.filter(
    (q) => correctSet.has(q.id) && !recentlySeenSet.has(q.id),
  );
  if (confidenceCandidates.length === 0) {
    confidenceCandidates = seedQuestions.filter((q) => correctSet.has(q.id)); // fallback: include recently seen correct
  }
  const confidenceCheck = pickRandom(confidenceCandidates, 1)[0];
  if (confidenceCheck) {
    selected.push(confidenceCheck.id);
  }

  // 2. Resurfaced weak-spot question (1 question)
  const weakSubdomains = new Map<string, number>();
  for (const id of missedSet) {
    const q = seedQuestions.find((s) => s.id === id);
    if (q && q.subdomain) {
      weakSubdomains.set(
        q.subdomain,
        (weakSubdomains.get(q.subdomain) || 0) + 1,
      );
    }
  }

  const getWeakCandidates = (avoidRecentlySeen: boolean) => {
    return seedQuestions
      .filter(
        (q) =>
          !selected.includes(q.id) &&
          (avoidRecentlySeen ? !recentlySeenSet.has(q.id) : true),
      )
      .map((q) => {
        let score = 0;
        if (missedSet.has(q.id)) score += 2; // Direct miss
        if (q.subdomain) {
          score += weakSubdomains.get(q.subdomain) || 0; // Missed in same subdomain
        }
        return { q, score };
      })
      .filter((c) => c.score > 0);
  };

  let weakCandidates = getWeakCandidates(true);
  if (weakCandidates.length === 0) {
    weakCandidates = getWeakCandidates(false);
  }

  // Sort pseudo-randomly for ties, then by score descending
  weakCandidates.sort(() => 0.5 - Math.random());
  weakCandidates.sort((a, b) => b.score - a.score);

  const weakSpot = weakCandidates.length > 0 ? weakCandidates[0].q : null;
  if (weakSpot) {
    selected.push(weakSpot.id);
  }

  // 3. New questions (Targeting 3, but simply filling the rest)
  const targetTotal = 5;
  const needCount = targetTotal - selected.length;

  let newCandidates = seedQuestions.filter(
    (q) =>
      !selected.includes(q.id) &&
      !recentlySeenSet.has(q.id) &&
      !missedSet.has(q.id) &&
      !correctSet.has(q.id),
  );

  const newPicks = pickRandom(newCandidates, needCount);
  selected.push(...newPicks.map((q) => q.id));

  // 4. Fallback: if we still don't have 5, fill with any unused questions
  if (selected.length < targetTotal) {
    const remainingNeed = targetTotal - selected.length;
    const fallbackCandidates = seedQuestions.filter(
      (q) => !selected.includes(q.id),
    );
    const fallbackPicks = pickRandom(fallbackCandidates, remainingNeed);
    selected.push(...fallbackPicks.map((q) => q.id));
  }

  // Shuffle final selection so the user doesn't know the order of new vs weak vs confidence
  const finalSelected = [...selected].sort(() => 0.5 - Math.random());

  const newSession: DailySession = {
    date: today,
    status: "available",
    questionIds: finalSelected,
    currentIndex: 0,
    score: 0,
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

  const stats = await loadStats();
  stats.history[session.date] = {
    score: session.score,
    total: session.questionIds.length,
  };
  await saveStats(stats);
};
