import { createClient } from "@supabase/supabase-js";

// Verificar se as variáveis de ambiente estão definidas
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

// Criar cliente Supabase apenas se as variáveis estiverem definidas
const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

// Função helper para verificar se Supabase está disponível
export const isSupabaseAvailable = () => {
  return supabase !== null;
};

// Função helper para operações seguras com Supabase
export const safeSupabaseOperation = async (operation, fallback) => {
  if (!isSupabaseAvailable()) {
    console.warn("⚠️ Supabase não está disponível. Operação ignorada.");
    return fallback || null;
  }

  try {
    return await operation();
  } catch (error) {
    console.error("❌ Erro na operação Supabase:", error);
    return fallback || null;
  }
};

export { supabase };

export interface EmailMetadata {
  id?: string;
  email_id: string;
  user_id: string;
  column_id: string | null;
  priority: "baixa" | "media" | "alta" | "urgente";
  tags: string[];
  snoozed_until?: string | null;
  subtasks?: Subtask[];
  created_at?: string;
  updated_at?: string;
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
