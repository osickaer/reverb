import { supabase } from "@/lib/supabase";
import { Tables } from "@/types/database.types";
import { Question } from "./questions-interface";

type QuestionRow = Tables<"questions">;
type QuestionSelectRow = Omit<QuestionRow, "created_at" | "updated_at">;

let questionCache: Question[] | null = null;

const isDifficulty = (
  value: string,
): value is Question["difficulty"] => {
  return value === "easy" || value === "medium" || value === "hard";
};

const mapQuestionRow = (row: QuestionSelectRow): Question => {
  if (!isDifficulty(row.difficulty)) {
    throw new Error(`Question ${row.id} has invalid difficulty ${row.difficulty}.`);
  }

  if (
    row.importance !== 1 &&
    row.importance !== 2 &&
    row.importance !== 3 &&
    row.importance !== 4 &&
    row.importance !== 5
  ) {
    throw new Error(`Question ${row.id} has invalid importance ${row.importance}.`);
  }

  return {
    id: row.id,
    domain: row.domain,
    subdomain: row.subdomain ?? undefined,
    difficulty: row.difficulty,
    conceptId: row.concept_key,
    prompt: row.prompt,
    choices: row.choices,
    correctIndex: row.correct_index,
    explanation: row.explanation,
    learnMoreQueries: row.learn_more_queries ?? undefined,
    tags: row.tags ?? undefined,
    importance: row.importance,
  };
};

export const fetchQuestions = async (): Promise<Question[]> => {
  if (questionCache) {
    return questionCache;
  }

  const { data, error } = await supabase
    .from("questions")
    .select(
      "id, domain, subdomain, difficulty, concept_key, prompt, choices, correct_index, explanation, learn_more_queries, tags, importance, status",
    )
    .eq("status", "active")
    .order("domain", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw new Error(`Unable to load question bank: ${error.message}`);
  }

  questionCache = (data ?? []).map(mapQuestionRow);
  return questionCache;
};

export const refreshQuestions = async (): Promise<Question[]> => {
  questionCache = null;
  return fetchQuestions();
};

export const getQuestionsById = async (): Promise<Map<string, Question>> => {
  const questions = await fetchQuestions();
  return new Map(questions.map((question) => [question.id, question]));
};

export const getQuestionById = async (
  questionId: string,
): Promise<Question | undefined> => {
  const questionsById = await getQuestionsById();
  return questionsById.get(questionId);
};

export const getQuestionCount = async (): Promise<number> => {
  const questions = await fetchQuestions();
  return questions.length;
};
