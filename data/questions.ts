import { geographyQuestions } from "./geography-questions";
import { historyQuestions } from "./history-questions";
import { mathQuestions } from "./math-questions";
import { Question } from "./questions-interface";

export const seedQuestions: Question[] = [
  ...mathQuestions,
  ...historyQuestions,
  ...geographyQuestions,
];
