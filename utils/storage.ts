import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchQuestions } from "../data/questions";
import { Question } from "../data/questions-interface";
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
  const questions = await fetchQuestions();
  const questionById = new Map(questions.map((question) => [question.id, question]));

  const recentlySeenSet = new Set(stats.recentlySeen || []);
  const missedSet = new Set(stats.missedQuestions || []);
  const correctSet = new Set(stats.correctQuestions || []);

  const selectedIds: string[] = [];
  const questionTypes: Record<string, "new" | "missed" | "resurfaced"> = {};

  const pickRandom = <T>(arr: T[], n: number): T[] => {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, n);
  };

  const getDomainCount = (domain: string) => {
    return selectedIds.reduce((count, id) => {
      const question = questionById.get(id);
      return question?.domain === domain ? count + 1 : count;
    }, 0);
  };

  const pickBalancedQuestion = <T extends { q: Question }>(
    candidates: T[],
    scoreCandidate?: (candidate: T) => number,
  ): T | null => {
    if (candidates.length === 0) return null;

    const shuffled = [...candidates].sort(() => 0.5 - Math.random());

    shuffled.sort((a, b) => {
      const scoreDiff = (scoreCandidate?.(b) ?? 0) - (scoreCandidate?.(a) ?? 0);
      if (scoreDiff !== 0) return scoreDiff;

      const domainDiff =
        getDomainCount(a.q.domain) - getDomainCount(b.q.domain);
      if (domainDiff !== 0) return domainDiff;

      return 0;
    });

    return shuffled[0];
  };

  const addQuestion = (
    question: Question,
    type: "new" | "missed" | "resurfaced",
  ) => {
    selectedIds.push(question.id);
    questionTypes[question.id] = type;
  };

  // 1. 3 New questions
  const newCandidates = questions.filter(
    (q) =>
      !recentlySeenSet.has(q.id) &&
      !missedSet.has(q.id) &&
      !correctSet.has(q.id),
  );

  const remainingNewCandidates = [...newCandidates];
  for (let i = 0; i < 3; i++) {
    const nextPick = pickBalancedQuestion(
      remainingNewCandidates.map((q) => ({ q })),
    )?.q;
    if (!nextPick) break;

    addQuestion(nextPick, "new");

    const nextIndex = remainingNewCandidates.findIndex(
      (candidate) => candidate.id === nextPick.id,
    );
    if (nextIndex >= 0) {
      remainingNewCandidates.splice(nextIndex, 1);
    }
  }

  // 2. 1 Previously missed question
  const weakSubdomains = new Map<string, number>();
  for (const id of missedSet) {
    const q = questionById.get(id);
    if (q && q.subdomain) {
      weakSubdomains.set(
        q.subdomain,
        (weakSubdomains.get(q.subdomain) || 0) + 1,
      );
    }
  }

  const getWeakCandidates = (avoidRecentlySeen: boolean) => {
    return questions
      .filter(
        (q) =>
          !selectedIds.includes(q.id) &&
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

  weakCandidates.sort(() => 0.5 - Math.random());
  const weakSpot = pickBalancedQuestion(
    weakCandidates,
    (candidate) => candidate.score,
  )?.q;
  if (weakSpot) {
    addQuestion(weakSpot, "missed");
  }

  // 3. 1 Wildcard (Resurfaced, New, or Missed)
  let wildcardCandidates: {
    q: Question;
    type: "new" | "missed" | "resurfaced";
  }[] = [];

  const resurfacedPool = questions.filter(
    (q) =>
      correctSet.has(q.id) &&
      !recentlySeenSet.has(q.id) &&
      !selectedIds.includes(q.id),
  );
  wildcardCandidates.push(
    ...resurfacedPool.map((q) => ({ q, type: "resurfaced" as const })),
  );

  const extraNewPool = questions.filter(
    (q) =>
      !recentlySeenSet.has(q.id) &&
      !missedSet.has(q.id) &&
      !correctSet.has(q.id) &&
      !selectedIds.includes(q.id),
  );
  wildcardCandidates.push(
    ...extraNewPool.map((q) => ({ q, type: "new" as const })),
  );

  const extraMissedPool = questions.filter(
    (q) => missedSet.has(q.id) && !selectedIds.includes(q.id),
  );
  wildcardCandidates.push(
    ...extraMissedPool.map((q) => ({ q, type: "missed" as const })),
  );

  if (wildcardCandidates.length > 0) {
    const pickedWildcard = pickBalancedQuestion(wildcardCandidates);
    if (pickedWildcard) {
      addQuestion(pickedWildcard.q, pickedWildcard.type);
    }
  }

  // 4. Fallback: fill to 5 questions
  const targetTotal = 5;
  if (selectedIds.length < targetTotal) {
    const fallbackCandidates = questions.filter(
      (q) => !selectedIds.includes(q.id),
    );
    const remainingFallbackCandidates = [...fallbackCandidates];

    while (
      selectedIds.length < targetTotal &&
      remainingFallbackCandidates.length > 0
    ) {
      const nextPick = pickBalancedQuestion(
        remainingFallbackCandidates.map((q) => ({ q })),
      )?.q;
      if (!nextPick) break;

      addQuestion(
        nextPick,
        missedSet.has(nextPick.id)
          ? "missed"
          : correctSet.has(nextPick.id)
            ? "resurfaced"
            : "new",
      );

      const nextIndex = remainingFallbackCandidates.findIndex(
        (candidate) => candidate.id === nextPick.id,
      );
      if (nextIndex >= 0) {
        remainingFallbackCandidates.splice(nextIndex, 1);
      }
    }
  }

  const finalSelected = [...selectedIds].sort(() => 0.5 - Math.random());

  const newSession: DailySession = {
    date: today,
    mode: "daily",
    status: "available",
    questionIds: finalSelected,
    questionTypes,
    currentIndex: 0,
    score: 0,
    selectedAnswerIndices: new Array(finalSelected.length).fill(null),
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
