import { supabase } from "@/lib/supabase";
import { Tables } from "@/types/database.types";

type DailyPackRow = Tables<"daily_packs">;
type DailyPackQuestionRow = Tables<"daily_pack_questions">;
type DailyPackSelectRow = Pick<DailyPackRow, "id" | "day_key" | "title">;
type DailyPackQuestionSelectRow = Pick<
  DailyPackQuestionRow,
  "question_id" | "position"
>;

export interface DailyPack {
  id: string;
  dayKey: string;
  title: string;
  questionIds: string[];
}

const packCache = new Map<string, DailyPack>();

export const fetchDailyPack = async (dayKey: string): Promise<DailyPack> => {
  const cachedPack = packCache.get(dayKey);
  if (cachedPack) {
    return cachedPack;
  }

  const { data: pack, error: packError } = await supabase
    .from("daily_packs")
    .select("id, day_key, title")
    .eq("day_key", dayKey)
    .maybeSingle<DailyPackSelectRow>();

  if (packError) {
    throw new Error(`Unable to load daily pack for ${dayKey}: ${packError.message}`);
  }

  if (!pack) {
    throw new Error(`No daily pack is available for ${dayKey}.`);
  }

  const { data: packQuestions, error: questionsError } = await supabase
    .from("daily_pack_questions")
    .select("question_id, position")
    .eq("daily_pack_id", pack.id)
    .order("position", { ascending: true })
    .returns<DailyPackQuestionSelectRow[]>();

  if (questionsError) {
    throw new Error(
      `Unable to load daily pack questions for ${dayKey}: ${questionsError.message}`,
    );
  }

  const questionIds = (packQuestions ?? [])
    .sort((a, b) => a.position - b.position)
    .map((row) => row.question_id);

  if (questionIds.length === 0) {
    throw new Error(`Daily pack ${dayKey} has no questions.`);
  }

  const dailyPack: DailyPack = {
    id: pack.id,
    dayKey: pack.day_key,
    title: pack.title,
    questionIds,
  };

  packCache.set(dayKey, dailyPack);
  return dailyPack;
};

export const refreshDailyPack = async (dayKey: string): Promise<DailyPack> => {
  packCache.delete(dayKey);
  return fetchDailyPack(dayKey);
};
