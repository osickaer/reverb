import { supabase } from "@/lib/supabase";
import { TablesInsert } from "@/types/database.types";

type QuestionFeedbackInsert = TablesInsert<"question_feedback">;

export const QUESTION_FEEDBACK_RATINGS = {
  up: "thumbs_up",
  down: "thumbs_down",
} as const;

export type QuestionFeedbackRating =
  (typeof QUESTION_FEEDBACK_RATINGS)[keyof typeof QUESTION_FEEDBACK_RATINGS];

export const QUESTION_FEEDBACK_REASON_OPTIONS = [
  { code: "wrong_answer", label: "Answer seems wrong" },
  { code: "confusing", label: "Confusing wording" },
  { code: "typo", label: "Typo or grammar issue" },
  { code: "too_easy", label: "Too easy" },
  { code: "too_hard", label: "Too hard" },
  { code: "bad_explanation", label: "Explanation did not help" },
  { code: "not_interesting", label: "Not interesting" },
  { code: "not_relevant_to_me", label: "Not relevant to me" },
  { code: "other", label: "Other" },
] as const;

export type QuestionFeedbackReasonCode =
  (typeof QUESTION_FEEDBACK_REASON_OPTIONS)[number]["code"];

export const saveQuestionFeedback = async ({
  questionId,
  rating,
  reasonCodes,
}: {
  questionId: string;
  rating: QuestionFeedbackRating;
  reasonCodes: QuestionFeedbackReasonCode[];
}) => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(`Unable to load signed-in user: ${userError.message}`);
  }

  if (!user) {
    throw new Error("Cannot save question feedback without a signed-in user.");
  }

  const feedback: QuestionFeedbackInsert = {
    user_id: user.id,
    question_id: questionId,
    rating,
    reason_codes: reasonCodes,
  };

  const { error } = await supabase.from("question_feedback").upsert(feedback, {
    onConflict: "user_id,question_id",
  });

  if (error) {
    throw new Error(`Unable to save question feedback: ${error.message}`);
  }
};
