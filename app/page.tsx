"use client";

import { useState } from "react";
import { AuthProvider, useAuth } from "@/components/auth-provider";
import { KanbanBoard } from "@/components/kanban-board";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  LayoutDashboard,
  ArrowRight,
  FileText,
  Shield,
  Columns3,
  Clock,
  CheckCircle2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function HomeContent() {
  const { account, accessToken, login, isLoading, isAuthenticating } =
    useAuth();

  const [isLegalOpen, setIsLegalOpen] = useState(false);
  const [legalView, setLegalView] = useState<"terms" | "privacy">("privacy");

  const openLegal = (view: "terms" | "privacy") => {
    setLegalView(view);
    setIsLegalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#F8FAFC] text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
        <p className="font-medium text-sm">A carregar...</p>
      </div>
    );
  }

  if (!account || !accessToken) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans selection:bg-blue-100">
        <header className="w-full bg-white border-b border-slate-200 py-4 px-6 md:px-12 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800 font-semibold text-lg">
            <LayoutDashboard className="h-5 w-5 text-blue-600" />
            Outlook Kanban
          </div>
        </header>

        <main className="flex-1 flex flex-col md:flex-row items-center justify-center max-w-7xl mx-auto w-full px-6 py-12 gap-12 lg:gap-20">
          <div className="flex-1 max-w-xl">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight tracking-tight mb-6">
              Os seus e-mails,
              <br />
              <span className="text-blue-600">organizados no quadro.</span>
            </h1>

            <p className="text-slate-600 text-lg leading-relaxed mb-10">
              Uma interface visual ligada diretamente ao seu Outlook. Ideal para
              estudantes e profissionais que precisam de gerir mensagens como
              tarefas reais.
            </p>

            <div className="space-y-5 mb-12">
              <div className="flex items-center gap-4 text-slate-700 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <Columns3 className="h-6 w-6 text-blue-500 shrink-0" />
                <span className="font-medium">
                  Colunas personalizadas para triagem rápida.
                </span>
              </div>
              <div className="flex items-center gap-4 text-slate-700 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <Clock className="h-6 w-6 text-indigo-500 shrink-0" />
                <span className="font-medium">
                  Função Snooze para adiar conversas para mais tarde.
                </span>
              </div>
              <div className="flex items-center gap-4 text-slate-700 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0" />
                <span className="font-medium">
                  Privacidade total: não guardamos os seus e-mails.
                </span>
              </div>
            </div>

            <Button
              onClick={login}
              disabled={isAuthenticating}
              className="h-14 px-8 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium text-base transition-colors flex items-center gap-2 shadow-md w-full sm:w-auto"
            >
              {isAuthenticating ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Entrar com a Microsoft
                  <ArrowRight className="h-5 w-5 ml-1" />
                </>
              )}
            </Button>
          </div>

          <div className="hidden lg:flex flex-1 justify-center w-full">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-100 px-4 py-3 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                </div>
              </div>

              <div className="p-6 bg-slate-100/50 flex gap-4 h-[400px]">
                <div className="flex-1 bg-slate-50 rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                      📥 Inbox
                    </span>
                    <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-bold">
                      2
                    </span>
                  </div>

                  <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-200 ring-1 ring-blue-50 mb-3">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-700">
                        PF
                      </div>
                      <div className="h-3 w-24 bg-slate-200 rounded"></div>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded mb-2"></div>
                    <div className="h-2 w-2/3 bg-slate-100 rounded mb-3"></div>
                    <div className="flex gap-2">
                      <div className="h-4 w-12 bg-indigo-50 rounded-md border border-indigo-100"></div>
                      <div className="h-4 w-16 bg-emerald-50 rounded-md border border-emerald-100"></div>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 opacity-70">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-[10px] font-bold text-amber-700">
                        RH
                      </div>
                      <div className="h-3 w-20 bg-slate-200 rounded"></div>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded mb-2"></div>
                    <div className="h-2 w-1/2 bg-slate-100 rounded"></div>
                  </div>
                </div>

                <div className="flex-1 bg-slate-50 rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col opacity-50">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                      🔥 Urgent
                    </span>
                    <span className="bg-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded-full font-bold">
                      0
                    </span>
                  </div>
                  <div className="flex-1 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center">
                    <span className="text-xs text-slate-400 font-medium">
                      Arraste para aqui
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer className="w-full border-t border-slate-200 bg-white py-6">
          <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
            <p>Projeto de Gestão de E-mails.</p>
            <div className="flex items-center gap-6">
              <button
                onClick={() => openLegal("terms")}
                className="hover:text-slate-800 transition-colors"
              >
                Termos e Condições
              </button>
              <button
                onClick={() => openLegal("privacy")}
                className="hover:text-slate-800 transition-colors"
              >
                Privacidade
              </button>
            </div>
          </div>
        </footer>

        <Dialog open={isLegalOpen} onOpenChange={setIsLegalOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto rounded-xl">
            <DialogHeader className="mb-4">
              <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-800">
                {legalView === "terms" ? (
                  <>
                    <FileText className="h-5 w-5 text-blue-600" /> Termos de Uso
                  </>
                ) : (
                  <>
                    <Shield className="h-5 w-5 text-emerald-600" /> Como gerimos
                    os seus dados
                  </>
                )}
              </DialogTitle>
            </DialogHeader>
            <div className="text-slate-600 space-y-5 text-sm leading-relaxed">
              {legalView === "terms" ? (
                <>
                  <div>
                    <h3 className="font-semibold text-slate-900 text-base mb-1">
                      1. Sobre o Projeto
                    </h3>
                    <p>
                      O Gestor Kanban é uma ferramenta desenvolvida em contexto
                      académico.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 text-base mb-1">
                      2. Permissões da Microsoft
                    </h3>
                    <p>
                      Para funcionar, a aplicação pede permissão para ler,
                      modificar e enviar e-mails em seu nome através da API
                      oficial da Microsoft Graph. O login é gerido pela
                      Microsoft, nós nunca vemos a sua password.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 text-base mb-1">
                      3. Responsabilidade
                    </h3>
                    <p>
                      Mover ou eliminar e-mails no Kanban afeta a sua conta
                      Outlook real. O utilizador é responsável pelas ações
                      realizadas através desta interface.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <h3 className="font-semibold text-slate-900 text-base mb-1">
                      1. Nós não lemos os seus e-mails
                    </h3>
                    <p>
                      A arquitetura desta aplicação foi pensada para a
                      privacidade.{" "}
                      <strong>
                        O corpo dos seus e-mails, os remetentes e os anexos
                        nunca são guardados na nossa base de dados.
                      </strong>{" "}
                      Eles vão diretamente da Microsoft para o seu ecrã.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 text-base mb-1">
                      2. O que fica guardado no nosso servidor?
                    </h3>
                    <p>
                      Apenas "etiquetas" (metadados). Guardamos o ID técnico do
                      e-mail, em que coluna do Kanban o colocou, as tags criadas
                      e as configurações de Snooze.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 text-base mb-1">
                      3. Controlo Total
                    </h3>
                    <p>
                      Pode revogar o acesso da aplicação a qualquer momento nas
                      definições de segurança da sua conta da Microsoft.
                    </p>
                  </div>
                </>
              )}
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <Button variant="outline" onClick={() => setIsLegalOpen(false)}>
                Fechar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

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
