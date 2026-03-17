import AsyncStorage from '@react-native-async-storage/async-storage';
import { seedQuestions, Question } from '../data/questions';

const SESSION_KEY = '@reverb_daily_session';
const STATS_KEY = '@reverb_user_stats';

export interface DailySession {
  date: string; // YYYY-MM-DD
  status: 'available' | 'in-progress' | 'completed';
  questionIds: string[];
  currentIndex: number;
  score: number;
}

export interface UserStats {
  history: Record<string, { score: number; total: number }>;
  missedQuestions: string[];
  recentlySeen: string[]; // Keep last N questions
}

export const getTodayString = () => {
  const date = new Date();
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
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
    return json ? JSON.parse(json) : { history: {}, missedQuestions: [], recentlySeen: [] };
  } catch (e) {
    return { history: {}, missedQuestions: [], recentlySeen: [] };
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
  
  // Exclude last 15 seen if possible
  const recentlySeenSet = new Set(stats.recentlySeen);
  let available = seedQuestions.filter(q => !recentlySeenSet.has(q.id));
  
  if (available.length < 5) {
    available = [...seedQuestions];
  }
  
  // Shuffle
  available.sort(() => 0.5 - Math.random());
  
  const selected = available.slice(0, 5).map(q => q.id);
  
  const newSession: DailySession = {
    date: today,
    status: 'available',
    questionIds: selected,
    currentIndex: 0,
    score: 0,
  };
  
  await saveSession(newSession);
  return newSession;
};

export const updateMissedQuestions = async (questionId: string, missed: boolean) => {
  const stats = await loadStats();
  const missedSet = new Set(stats.missedQuestions);
  if (missed) {
    missedSet.add(questionId);
  } else {
    missedSet.delete(questionId);
  }
  
  // Update recently seen (keep last 30)
  const recent = [questionId, ...stats.recentlySeen.filter(id => id !== questionId)].slice(0, 30);
  
  stats.missedQuestions = Array.from(missedSet);
  stats.recentlySeen = recent;
  
  await saveStats(stats);
};

export const completeSession = async (session: DailySession) => {
  session.status = 'completed';
  await saveSession(session);
  
  const stats = await loadStats();
  stats.history[session.date] = { score: session.score, total: session.questionIds.length };
  await saveStats(stats);
};
