export interface Question {
  id: string;
  domain: string; // History, Geography, Finance, Economics, etc.
  subdomain?: string;
  difficulty?: "easy" | "medium" | "hard";
  conceptId: string;
  prompt: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
  learnMoreQueries?: string[];
  tags?: string[];
  importance: 1 | 2 | 3 | 4 | 5;
}
