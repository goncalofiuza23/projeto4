import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error(
    "❌ NEXT_PUBLIC_SUPABASE_URL não está definida nas variáveis de ambiente",
  );
}

if (!supabaseAnonKey) {
  console.error(
    "❌ NEXT_PUBLIC_SUPABASE_ANON_KEY não está definida nas variáveis de ambiente",
  );
}

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export const isSupabaseAvailable = () => {
  return supabase !== null;
};

export const safeSupabaseOperation = async <T,>(
  operation: () => Promise<T>, 
  fallback: T
): Promise<T> => {
  if (!isSupabaseAvailable()) {
    console.warn("⚠️ Supabase não está disponível. Operação ignorada.");
    return fallback;
  }

  try {
    return await operation();
  } catch (error) {
    console.error("❌ Erro na operação Supabase:", error);
    return fallback;
  }
};

export { supabase };

export interface Subtask {
  id: string;
  text: string;
  completed: boolean;
}

export interface EmailMetadata {
  id?: string;
  email_id: string;
  user_id: string;
  column_id: string | null;
  priority: "baixa" | "media" | "alta" | "urgente" | undefined;
  tags: string[];
  snoozed_until?: string | null;
  subtasks?: Subtask[];
  created_at?: string;
  updated_at?: string;
  due_date?: string | null;
}

export type CustomColumn = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon: string;
  position: number;
  created_at: string;
  updated_at: string;
};