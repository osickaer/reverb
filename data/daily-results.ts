import { supabase } from "@/lib/supabase";
import { Tables, TablesInsert } from "@/types/database.types";
import type { DailySession } from "@/utils/storage";

type DailyResultRow = Tables<"daily_results">;
type DailyPackQuestionRow = Tables<"daily_pack_questions">;
type DailyResultInsert = TablesInsert<"daily_results">;
type DailyAnswerInsert = TablesInsert<"daily_answers">;

type DailyResultIdRow = Pick<DailyResultRow, "id">;
type DailyPackQuestionSelectRow = Pick<
  DailyPackQuestionRow,
  "id" | "question_id" | "position"
>;

const makeUuid = () => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const value = Math.floor(Math.random() * 16);
    const nibble = char === "x" ? value : (value & 0x3) | 0x8;
    return nibble.toString(16);
  });
};

const getPackQuestionRows = async (
  dailyPackId: string,
): Promise<DailyPackQuestionSelectRow[]> => {
  const { data, error } = await supabase
    .from("daily_pack_questions")
    .select("id, question_id, position")
    .eq("daily_pack_id", dailyPackId)
    .order("position", { ascending: true })
    .returns<DailyPackQuestionSelectRow[]>();

  if (error) {
    throw new Error(`Unable to load daily pack answer mapping: ${error.message}`);
  }

  return data ?? [];
};

const saveDailyResult = async (
  userId: string,
  session: DailySession,
  completedAt: string,
): Promise<string> => {
  if (!session.dailyPackId) {
    throw new Error("Cannot save daily result without a daily pack id.");
  }

  const { data: existingResult, error: selectError } = await supabase
    .from("daily_results")
    .select("id")
    .eq("user_id", userId)
    .eq("daily_pack_id", session.dailyPackId)
    .maybeSingle<DailyResultIdRow>();

  if (selectError) {
    throw new Error(`Unable to check existing daily result: ${selectError.message}`);
  }

  if (existingResult) {
    const { error } = await supabase
      .from("daily_results")
      .update({
        score: session.score,
        total_questions: session.questionIds.length,
        completed_at: completedAt,
      })
      .eq("id", existingResult.id);

    if (error) {
      throw new Error(`Unable to update daily result: ${error.message}`);
    }

    return existingResult.id;
  }

  const result: DailyResultInsert = {
    id: makeUuid(),
    user_id: userId,
    daily_pack_id: session.dailyPackId,
    score: session.score,
    total_questions: session.questionIds.length,
    completed_at: completedAt,
  };

  const { error } = await supabase.from("daily_results").insert(result);

  if (error) {
    throw new Error(`Unable to insert daily result: ${error.message}`);
  }

  return result.id;
};

export const saveDailySessionResult = async (
  session: DailySession,
  completedAt: string,
) => {
  if (session.mode === "freeplay" || session.retryMode) {
    return;
  }

  if (!session.dailyPackId) {
    throw new Error("Cannot save a daily session result without a daily pack id.");
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(`Unable to load signed-in user: ${userError.message}`);
  }

  if (!user) {
    throw new Error("Cannot save daily result without a signed-in user.");
  }

  const dailyResultId = await saveDailyResult(user.id, session, completedAt);
  const packQuestionRows = await getPackQuestionRows(session.dailyPackId);
  const packQuestionByQuestionId = new Map(
    packQuestionRows.map((row) => [row.question_id, row]),
  );

  const answers: DailyAnswerInsert[] = session.questionIds.map(
    (questionId, index) => {
      const packQuestion = packQuestionByQuestionId.get(questionId);
      const selectedIndex = session.selectedAnswerIndices?.[index];
      const result = session.results?.[index];

      if (!packQuestion) {
        throw new Error(`Daily pack question not found for ${questionId}.`);
      }

      if (selectedIndex === null || selectedIndex === undefined) {
        throw new Error(`Selected answer missing for ${questionId}.`);
      }

      if (!result) {
        throw new Error(`Answer result missing for ${questionId}.`);
      }

      return {
        id: makeUuid(),
        daily_result_id: dailyResultId,
        user_id: user.id,
        daily_pack_question_id: packQuestion.id,
        question_id: questionId,
        position: packQuestion.position,
        selected_index: selectedIndex,
        is_correct: result === "correct",
        answered_at: completedAt,
      };
    },
  );

  const { error: answersError } = await supabase
    .from("daily_answers")
    .upsert(answers, {
      onConflict: "daily_result_id,daily_pack_question_id",
    });

  if (answersError) {
    throw new Error(`Unable to save daily answers: ${answersError.message}`);
  }
};
