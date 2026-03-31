"use client";

import { AuthProvider, useAuth } from "@/components/auth-provider";
import { KanbanBoard } from "@/components/kanban-board";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  LayoutDashboard,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

function HomeContent() {
  const { account, accessToken, login, isLoading, isAuthenticating } =
    useAuth();

  // 1. Estado de carregamento inicial
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 text-slate-500">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
        <p className="font-medium animate-pulse">A validar sessão...</p>
      </div>
    );
  }

  // 2. TELA DE LOGIN (Clean, Profissional e "Humana")
  if (!account || !accessToken) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-[#F8FAFC] p-4 font-sans">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
          <div className="p-8 sm:p-10 flex flex-col items-center text-center">
            {/* Ícone limpo e direto */}
            <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-blue-100">
              <LayoutDashboard className="h-8 w-8" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3 tracking-tight">
              Outlook Kanban
            </h1>

            <p className="text-slate-500 mb-8 text-sm sm:text-base leading-relaxed max-w-[280px]">
              Organize os seus e-mails de forma visual e produtiva.
            </p>

            {/* Botão sólido e familiar */}
            <Button
              onClick={login}
              disabled={isAuthenticating}
              className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium text-base transition-colors flex items-center justify-center gap-2"
            >
              {isAuthenticating ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Entrar com Microsoft
                  <ArrowRight className="h-4 w-4 ml-1 opacity-70" />
                </>
              )}
            </Button>

            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="h-4 w-4 text-slate-400" />
              <span>Autenticação segura via Microsoft Graph</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. Tudo OK? Mostra o tabuleiro em ecrã total
  return (
    <main className="w-full h-screen overflow-hidden">
      <KanbanBoard />
    </main>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <HomeContent />
      <Toaster />
    </AuthProvider>
  );
}
