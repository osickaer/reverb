import { supabase } from "@/lib/supabase";
import { Tables } from "@/types/database.types";
import { fetchFriendshipsSnapshot } from "./friendships";
import {
  fetchCurrentUserProfile,
  getCurrentUserId,
  Profile,
} from "./profiles";

type DailyPackRow = Pick<Tables<"daily_packs">, "id" | "day_key" | "title">;
type DailyPackQuestionRow = Pick<
  Tables<"daily_pack_questions">,
  "position" | "question_id"
>;
type DailyResultRow = Pick<
  Tables<"daily_results">,
  "id" | "user_id" | "score" | "total_questions" | "completed_at"
>;
type WeeklyResultRow = Pick<
  Tables<"daily_results">,
  "user_id" | "daily_pack_id" | "score" | "total_questions" | "completed_at"
>;
type DailyAnswerRow = Pick<
  Tables<"daily_answers">,
  "daily_result_id" | "position" | "is_correct"
>;
type StreakResultRow = Pick<
  Tables<"daily_results">,
  "user_id" | "daily_pack_id"
>;
type QuestionDomainRow = Pick<Tables<"questions">, "id" | "domain">;

export type LeaderboardAnswerStatus = "correct" | "incorrect";

export type LeaderboardQuestionResult = {
  position: number;
  domain: string;
  status: LeaderboardAnswerStatus | null;
};

export type LeaderboardPlayer = {
  userId: string;
  displayName: string;
  username: string | null;
  initials: string;
  isCurrentUser: boolean;
  streak: number | null;
  result: {
    score: number;
    total: number;
    completedAt: string;
    questions: LeaderboardQuestionResult[];
  } | null;
};

export type LeaderboardWeeklyPlayer = {
  userId: string;
  displayName: string;
  username: string | null;
  initials: string;
  isCurrentUser: boolean;
  streak: number;
  score: number;
  total: number;
  percent: number | null;
  completedPacks: number;
};

export type LeaderboardWeekSnapshot = {
  startDateKey: string;
  endDateKey: string;
  players: LeaderboardWeeklyPlayer[];
};

export type LeaderboardSnapshot = {
  dateKey: string;
  dailyPackTitle: string;
  hasDailyPack: boolean;
  currentUser: LeaderboardPlayer;
  friends: LeaderboardPlayer[];
  week: LeaderboardWeekSnapshot;
};

const resultSelect = "id, user_id, score, total_questions, completed_at";
const answerSelect = "daily_result_id, position, is_correct";
const dailyPackSelect = "id, day_key, title";
const packQuestionSelect = "position, question_id";

export const toLocalDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const getTodayDateKey = () => toLocalDateKey(new Date());

export const addDaysToDateKey = (dateKey: string, days: number): string => {
  const date = new Date(`${dateKey}T12:00:00`);
  date.setDate(date.getDate() + days);

  return toLocalDateKey(date);
};

const getWeekRangeForDateKey = (dateKey: string) => {
  const startDate = new Date(`${dateKey}T12:00:00`);
  const daysSinceMonday = (startDate.getDay() + 6) % 7;
  startDate.setDate(startDate.getDate() - daysSinceMonday);

  const startDateKey = toLocalDateKey(startDate);
  const endDateKey = addDaysToDateKey(startDateKey, 6);

  return { startDateKey, endDateKey };
};

const getInitials = (name: string): string => {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "?";
  }

  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
};

const getDisplayName = (profile: Profile | null, fallback: string) =>
  profile?.display_name?.trim() || profile?.username || fallback;

const makePlayerBase = ({
  userId,
  profile,
  isCurrentUser,
}: {
  userId: string;
  profile: Profile | null;
  isCurrentUser: boolean;
}) => {
  const displayName = getDisplayName(profile, isCurrentUser ? "You" : "Friend");

  return {
    userId,
    displayName,
    username: profile?.username ?? null,
    initials: getInitials(displayName),
    isCurrentUser,
  };
};

const fetchDailyPack = async (dateKey: string): Promise<DailyPackRow | null> => {
  const { data, error } = await supabase
    .from("daily_packs")
    .select(dailyPackSelect)
    .eq("day_key", dateKey)
    .maybeSingle<DailyPackRow>();

  if (error) {
    throw new Error(`Unable to load daily pack: ${error.message}`);
  }

  return data;
};

const fetchResultsForPack = async ({
  dailyPackId,
  userIds,
}: {
  dailyPackId: string;
  userIds: string[];
}): Promise<DailyResultRow[]> => {
  if (userIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("daily_results")
    .select(resultSelect)
    .eq("daily_pack_id", dailyPackId)
    .in("user_id", userIds)
    .order("completed_at", { ascending: true })
    .returns<DailyResultRow[]>();

  if (error) {
    throw new Error(`Unable to load leaderboard results: ${error.message}`);
  }

  return data ?? [];
};

const fetchQuestionResultsForPack = async (
  dailyPackId: string,
): Promise<LeaderboardQuestionResult[]> => {
  const { data: packQuestions, error: packQuestionsError } = await supabase
    .from("daily_pack_questions")
    .select(packQuestionSelect)
    .eq("daily_pack_id", dailyPackId)
    .order("position", { ascending: true })
    .returns<DailyPackQuestionRow[]>();

  if (packQuestionsError) {
    throw new Error(
      `Unable to load leaderboard question order: ${packQuestionsError.message}`,
    );
  }

  const questionIds = (packQuestions ?? []).map((question) => question.question_id);

  if (questionIds.length === 0) {
    return [];
  }

  const { data: questions, error: questionsError } = await supabase
    .from("questions")
    .select("id, domain")
    .in("id", questionIds)
    .returns<QuestionDomainRow[]>();

  if (questionsError) {
    throw new Error(
      `Unable to load leaderboard question categories: ${questionsError.message}`,
    );
  }

  const domainByQuestionId = new Map(
    (questions ?? []).map((question) => [question.id, question.domain]),
  );

  return (packQuestions ?? []).map((question) => ({
    position: question.position,
    domain: domainByQuestionId.get(question.question_id) ?? "General",
    status: null,
  }));
};

const fetchAnswersForResults = async (
  resultIds: string[],
): Promise<Map<string, Map<number, LeaderboardAnswerStatus>>> => {
  if (resultIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("daily_answers")
    .select(answerSelect)
    .in("daily_result_id", resultIds)
    .order("position", { ascending: true })
    .returns<DailyAnswerRow[]>();

  if (error) {
    throw new Error(`Unable to load leaderboard answers: ${error.message}`);
  }

  const answersByResultId = new Map<string, Map<number, LeaderboardAnswerStatus>>();

  for (const answer of data ?? []) {
    const answers = answersByResultId.get(answer.daily_result_id) ?? new Map();
    answers.set(answer.position, answer.is_correct ? "correct" : "incorrect");
    answersByResultId.set(answer.daily_result_id, answers);
  }

  return answersByResultId;
};

const fetchRecentPacksThroughDate = async (
  dateKey: string,
): Promise<DailyPackRow[]> => {
  const { data, error } = await supabase
    .from("daily_packs")
    .select(dailyPackSelect)
    .lte("day_key", dateKey)
    .order("day_key", { ascending: false })
    .limit(370)
    .returns<DailyPackRow[]>();

  if (error) {
    throw new Error(`Unable to load daily pack history: ${error.message}`);
  }

  return data ?? [];
};

const fetchDailyPacksInRange = async ({
  startDateKey,
  endDateKey,
}: {
  startDateKey: string;
  endDateKey: string;
}): Promise<DailyPackRow[]> => {
  const { data, error } = await supabase
    .from("daily_packs")
    .select(dailyPackSelect)
    .gte("day_key", startDateKey)
    .lte("day_key", endDateKey)
    .order("day_key", { ascending: true })
    .returns<DailyPackRow[]>();

  if (error) {
    throw new Error(`Unable to load weekly pack history: ${error.message}`);
  }

  return data ?? [];
};

const fetchWeeklyResultsForPacks = async ({
  dailyPackIds,
  userIds,
}: {
  dailyPackIds: string[];
  userIds: string[];
}): Promise<WeeklyResultRow[]> => {
  if (dailyPackIds.length === 0 || userIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("daily_results")
    .select("user_id, daily_pack_id, score, total_questions, completed_at")
    .in("daily_pack_id", dailyPackIds)
    .in("user_id", userIds)
    .order("completed_at", { ascending: true })
    .returns<WeeklyResultRow[]>();

  if (error) {
    throw new Error(`Unable to load weekly leaderboard results: ${error.message}`);
  }

  return data ?? [];
};

const fetchStreakResultRows = async ({
  dailyPackIds,
  userIds,
}: {
  dailyPackIds: string[];
  userIds: string[];
}): Promise<StreakResultRow[]> => {
  if (dailyPackIds.length === 0 || userIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("daily_results")
    .select("user_id, daily_pack_id")
    .in("daily_pack_id", dailyPackIds)
    .in("user_id", userIds)
    .returns<StreakResultRow[]>();

  if (error) {
    throw new Error(`Unable to load streak history: ${error.message}`);
  }

  return data ?? [];
};

const calculateStreaks = async ({
  dateKey,
  userIds,
}: {
  dateKey: string;
  userIds: string[];
}): Promise<Map<string, number>> => {
  const packs = await fetchRecentPacksThroughDate(dateKey);
  const packIds = packs.map((pack) => pack.id);
  const dayKeyByPackId = new Map(packs.map((pack) => [pack.id, pack.day_key]));
  const resultRows = await fetchStreakResultRows({ dailyPackIds: packIds, userIds });
  const completedDaysByUserId = new Map<string, Set<string>>();

  for (const row of resultRows) {
    const dayKey = dayKeyByPackId.get(row.daily_pack_id);

    if (!dayKey) {
      continue;
    }

    const completedDays = completedDaysByUserId.get(row.user_id) ?? new Set();
    completedDays.add(dayKey);
    completedDaysByUserId.set(row.user_id, completedDays);
  }

  const streaks = new Map<string, number>();

  for (const userId of userIds) {
    const completedDays = completedDaysByUserId.get(userId) ?? new Set();
    let streak = 0;
    let cursor =
      dateKey === getTodayDateKey() && !completedDays.has(dateKey)
        ? addDaysToDateKey(dateKey, -1)
        : dateKey;

    while (completedDays.has(cursor)) {
      streak += 1;
      cursor = addDaysToDateKey(cursor, -1);
    }

    streaks.set(userId, streak);
  }

  return streaks;
};

const calculateWeeklySnapshot = async ({
  dateKey,
  playerBases,
  userIds,
}: {
  dateKey: string;
  playerBases: ReturnType<typeof makePlayerBase>[];
  userIds: string[];
}): Promise<LeaderboardWeekSnapshot> => {
  const { startDateKey, endDateKey } = getWeekRangeForDateKey(dateKey);
  const [weeklyPacks, streaks] = await Promise.all([
    fetchDailyPacksInRange({ startDateKey, endDateKey }),
    calculateStreaks({ dateKey, userIds }),
  ]);
  const weeklyResults = await fetchWeeklyResultsForPacks({
    dailyPackIds: weeklyPacks.map((pack) => pack.id),
    userIds,
  });
  const totalsByUserId = new Map<
    string,
    { score: number; total: number; completedPacks: number }
  >();

  for (const result of weeklyResults) {
    const totals = totalsByUserId.get(result.user_id) ?? {
      score: 0,
      total: 0,
      completedPacks: 0,
    };

    totals.score += result.score;
    totals.total += result.total_questions;
    totals.completedPacks += 1;
    totalsByUserId.set(result.user_id, totals);
  }

  const players = playerBases.map((player) => {
    const totals = totalsByUserId.get(player.userId) ?? {
      score: 0,
      total: 0,
      completedPacks: 0,
    };

    return {
      ...player,
      streak: streaks.get(player.userId) ?? 0,
      score: totals.score,
      total: totals.total,
      percent:
        totals.total > 0 ? Math.round((totals.score / totals.total) * 100) : null,
      completedPacks: totals.completedPacks,
    };
  });
  const [currentUser, ...friends] = players;
  const sortedFriends = friends.sort((first, second) => {
    const firstPercent = first.percent ?? -1;
    const secondPercent = second.percent ?? -1;

    if (secondPercent !== firstPercent) {
      return secondPercent - firstPercent;
    }

    if (second.score !== first.score) {
      return second.score - first.score;
    }

    if (second.total !== first.total) {
      return second.total - first.total;
    }

    return first.displayName.localeCompare(second.displayName);
  });

  return {
    startDateKey,
    endDateKey,
    players: [currentUser, ...sortedFriends],
  };
};

export const fetchLeaderboardSnapshot = async (
  dateKey: string,
): Promise<LeaderboardSnapshot> => {
  const [currentUserId, currentProfile, friendshipsSnapshot, dailyPack] =
    await Promise.all([
      getCurrentUserId(),
      fetchCurrentUserProfile(),
      fetchFriendshipsSnapshot(),
      fetchDailyPack(dateKey),
    ]);

  const playerBases = [
    makePlayerBase({
      userId: currentUserId,
      profile: currentProfile,
      isCurrentUser: true,
    }),
    ...friendshipsSnapshot.friends.map((friendship) =>
      makePlayerBase({
        userId: friendship.profile.id,
        profile: friendship.profile,
        isCurrentUser: false,
      }),
    ),
  ];
  const userIds = playerBases.map((player) => player.userId);
  const [results, orderedQuestions, streaks, week] = await Promise.all([
    dailyPack
      ? fetchResultsForPack({ dailyPackId: dailyPack.id, userIds })
      : Promise.resolve([]),
    dailyPack ? fetchQuestionResultsForPack(dailyPack.id) : Promise.resolve([]),
    calculateStreaks({ dateKey, userIds }),
    calculateWeeklySnapshot({
      dateKey: getTodayDateKey(),
      playerBases,
      userIds,
    }),
  ]);
  const answersByResultId = await fetchAnswersForResults(
    results.map((result) => result.id),
  );
  const resultByUserId = new Map(results.map((result) => [result.user_id, result]));
  const players: LeaderboardPlayer[] = playerBases.map((player) => {
    const result = resultByUserId.get(player.userId);
    const answersByPosition = result
      ? answersByResultId.get(result.id) ?? new Map()
      : new Map<number, LeaderboardAnswerStatus>();

    return {
      ...player,
      streak: result ? (streaks.get(player.userId) ?? 0) : null,
      result: result
        ? {
            score: result.score,
            total: result.total_questions,
            completedAt: result.completed_at,
            questions: orderedQuestions.map((question) => ({
              ...question,
              status: answersByPosition.get(question.position) ?? null,
            })),
          }
        : null,
    };
  });

  return {
    dateKey,
    dailyPackTitle: dailyPack?.title ?? "Daily 5",
    hasDailyPack: Boolean(dailyPack),
    currentUser: players[0],
    friends: players.slice(1),
    week,
  };
};
