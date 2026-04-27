export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      questions: {
        Row: {
          id: string;
          domain: string;
          subdomain: string | null;
          difficulty: string;
          concept_key: string;
          prompt: string;
          choices: string[];
          correct_index: number;
          explanation: string;
          learn_more_queries: string[] | null;
          tags: string[] | null;
          importance: number;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          domain: string;
          subdomain?: string | null;
          difficulty: string;
          concept_key: string;
          prompt: string;
          choices: string[];
          correct_index: number;
          explanation: string;
          learn_more_queries?: string[] | null;
          tags?: string[] | null;
          importance: number;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          domain?: string;
          subdomain?: string | null;
          difficulty?: string;
          concept_key?: string;
          prompt?: string;
          choices?: string[];
          correct_index?: number;
          explanation?: string;
          learn_more_queries?: string[] | null;
          tags?: string[] | null;
          importance?: number;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<
  TableName extends keyof Database["public"]["Tables"],
> = Database["public"]["Tables"][TableName]["Row"];
