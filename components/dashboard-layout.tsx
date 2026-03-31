"use client";

import { ReactNode, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  RefreshCw,
  Loader2,
  Filter,
  Palette,
  LayoutGrid,
  Plus,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { ColumnManager } from "./column-manager";
import { EmailComposer } from "./email-composer";
import { UserAvatar } from "./user-avatar";
import { useAuth } from "./auth-provider";
import { GraphService } from "@/lib/microsoft-graph";
import {
  supabase,
  isSupabaseAvailable,
  safeSupabaseOperation,
} from "@/lib/supabase";

export const BACKGROUNDS = [
  { id: "slate", name: "Padrão", class: "bg-[#f8fafc]", type: "color" },
  { id: "blue", name: "Azul Noite", class: "bg-slate-900", type: "color" },
  {
    id: "mountains",
    name: "Montanhas",
    url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1920&q=80",
    type: "image",
  },
  {
    id: "ocean",
    name: "Oceano",
    url: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?auto=format&fit=crop&w=1920&q=80",
    type: "image",
  },
  {
    id: "forest",
    name: "Floresta",
    url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1920&q=80",
    type: "image",
  },
];

interface DashboardLayoutProps {
  children: ReactNode;
  isLoading: boolean;
  onRefresh: () => void;
  isFiltersVisible: boolean;
  onToggleFilters: () => void;
  customColumns: any[];
  onColumnsChange: () => void;
}

export function DashboardLayout({
  children,
  isLoading,
  onRefresh,
  isFiltersVisible,
  onToggleFilters,
  customColumns,
  onColumnsChange,
}: DashboardLayoutProps) {
  const { account, accessToken, logout } = useAuth();
  const [currentBg, setCurrentBg] = useState(BACKGROUNDS[0]);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Estado para evitar guardar preferências enquanto elas ainda não carregaram da DB
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Carregar foto
  useEffect(() => {
    if (!accessToken || !account?.username) return;
    const fetchPhoto = async () => {
      try {
        const graph = new GraphService(accessToken);
        const url = await graph.getProfilePhoto(account.username);
        if (url) setAvatarUrl(url);
      } catch (e) {}
    };
    fetchPhoto();
  }, [accessToken, account?.username]);

  // CARREGAR PREFERÊNCIAS
  useEffect(() => {
    if (!account?.homeAccountId || !isSupabaseAvailable()) {
      setIsInitialLoad(false);
      return;
    }

    const loadPrefs = async () => {
      await safeSupabaseOperation(async () => {
        const { data, error } = await supabase!
          .from("user_preferences")
          .select("*")
          .eq("user_id", account.homeAccountId)
          .single();

        if (data) {
          const savedBg = BACKGROUNDS.find((b) => b.id === data.background_id);
          if (savedBg) setCurrentBg(savedBg);
          setIsSidebarCollapsed(data.is_sidebar_collapsed);
        }
      });
      setIsInitialLoad(false);
    };

    loadPrefs();
  }, [account?.homeAccountId]);

  // FUNÇÃO PARA GUARDAR PREFERÊNCIAS NA BD
  const savePreference = async (updates: any) => {
    if (!account?.homeAccountId || isInitialLoad || !isSupabaseAvailable())
      return;

    await safeSupabaseOperation(async () => {
      await supabase!.from("user_preferences").upsert({
        user_id: account.homeAccountId,
        ...updates,
        updated_at: new Date().toISOString(),
      });
    });
  };

  const handleBgChange = (val: string) => {
    const bg = BACKGROUNDS.find((b) => b.id === val) || BACKGROUNDS[0];
    setCurrentBg(bg);
    savePreference({ background_id: val });
  };

  const toggleSidebar = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    savePreference({ is_sidebar_collapsed: newState });
  };

  const handleEmailSent = () => {
    setIsComposerOpen(false);
    onRefresh();
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      sessionStorage.clear();
      localStorage.clear();
      window.location.href = window.location.origin;
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden m-0 p-0">
      {/* SIDEBAR COM LARGURA DINÂMICA */}
      <aside
        className={`bg-white border-r border-slate-200 flex flex-col z-20 shadow-xl transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? "w-20" : "w-72"
        }`}
      >
        {/* CABEÇALHO DA SIDEBAR */}
        <div
          className={`p-4 border-b border-slate-50 bg-slate-50/50 flex items-center ${isSidebarCollapsed ? "justify-center" : "justify-between"}`}
        >
          {!isSidebarCollapsed && (
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="bg-blue-600 p-2 rounded-xl shadow-lg shrink-0">
                <LayoutDashboard className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-slate-900 leading-none tracking-tight truncate">
                  Gestor de Emails
                </h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 truncate">
                  Kanban Dashboard
                </p>
              </div>
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="shrink-0 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50"
            title={isSidebarCollapsed ? "Expandir menu" : "Recolher menu"}
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* CORPO DA SIDEBAR */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-8 custom-scrollbar">
          {/* Botão Novo Email (MUDADO PARA AZUL LIMPO) */}
          <div className="space-y-1.5 px-1">
            <Button
              onClick={() => setIsComposerOpen(true)}
              title="Novo E-mail"
              className={`w-full bg-blue-600 hover:bg-blue-700 text-white h-11 rounded-xl shadow-md transition-all active:scale-95 ${
                isSidebarCollapsed
                  ? "justify-center px-0"
                  : "justify-start gap-3 px-4"
              }`}
            >
              <Plus className="h-5 w-5 shrink-0" />
              {!isSidebarCollapsed && (
                <span className="font-bold text-xs truncate">Novo E-mail</span>
              )}
            </Button>
          </div>

          {/* Comandos */}
          <div className="space-y-1.5 px-1">
            {!isSidebarCollapsed && (
              <p className="text-[10px] font-bold text-slate-400 uppercase px-1 mb-2 truncate">
                Comandos
              </p>
            )}

            {/* Botão Atualizar (MUDADO PARA OUTLINE SUAVE) */}
            <Button
              onClick={onRefresh}
              disabled={isLoading}
              title="Atualizar"
              className={`w-full border border-slate-200 bg-white text-slate-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 h-11 rounded-xl shadow-sm transition-all active:scale-95 ${
                isSidebarCollapsed
                  ? "justify-center px-0"
                  : "justify-start gap-3 px-4"
              }`}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              ) : (
                <RefreshCw className="h-4 w-4 shrink-0" />
              )}
              {!isSidebarCollapsed && (
                <span className="font-semibold text-xs truncate">
                  Atualizar
                </span>
              )}
            </Button>

            {/* Botão Filtros */}
            <Button
              variant="ghost"
              onClick={onToggleFilters}
              title="Filtros"
              className={`w-full h-11 rounded-xl transition-all ${
                isFiltersVisible
                  ? "bg-blue-50 text-blue-600"
                  : "text-slate-600 hover:bg-slate-50"
              } ${isSidebarCollapsed ? "justify-center px-0" : "justify-start gap-3 px-4"}`}
            >
              <Filter className="h-4 w-4 shrink-0" />
              {!isSidebarCollapsed && (
                <span className="font-semibold text-xs truncate">
                  {isFiltersVisible ? "Ocultar Filtros" : "Mostrar Filtros"}
                </span>
              )}
            </Button>
          </div>

          {/* Personalização */}
          <div className="space-y-3 px-1">
            {!isSidebarCollapsed && (
              <p className="text-[10px] font-bold text-slate-400 uppercase px-1 truncate">
                Personalização
              </p>
            )}
            <div
              className={
                isSidebarCollapsed
                  ? "flex flex-col items-center gap-4 pt-4 border-t border-slate-100"
                  : "bg-slate-50 rounded-2xl p-3 border border-slate-100 space-y-4"
              }
            >
              {/* Opção: Plano de Fundo */}
              <div
                className={
                  isSidebarCollapsed
                    ? "flex justify-center w-full"
                    : "space-y-2 w-full"
                }
              >
                {!isSidebarCollapsed && (
                  <div className="flex items-center gap-2 px-1 text-slate-500">
                    <Palette className="h-3.5 w-3.5 shrink-0" />
                    <span className="text-[11px] font-bold uppercase truncate">
                      Plano de Fundo
                    </span>
                  </div>
                )}
                <Select onValueChange={handleBgChange} value={currentBg.id}>
                  {isSidebarCollapsed ? (
                    <SelectTrigger
                      title="Mudar Plano de Fundo"
                      className="mx-auto w-10 h-10 p-0 flex justify-center items-center bg-transparent border-none shadow-none text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors [&>svg:last-child]:hidden [&>span:last-child]:hidden"
                    >
                      <Palette className="h-5 w-5 shrink-0" />
                    </SelectTrigger>
                  ) : (
                    <SelectTrigger className="w-full h-10 bg-white border-slate-200 rounded-xl text-xs font-medium">
                      <div className="flex items-center gap-2 truncate">
                        <div
                          className={`w-3 h-3 rounded-full shrink-0 ${currentBg.type === "color" ? currentBg.class : "bg-slate-300"}`}
                          style={
                            currentBg.type === "image"
                              ? {
                                  backgroundImage: `url(${currentBg.url})`,
                                  backgroundSize: "cover",
                                }
                              : {}
                          }
                        />
                        <span className="truncate">{currentBg.name}</span>
                      </div>
                    </SelectTrigger>
                  )}
                  <SelectContent>
                    {BACKGROUNDS.map((bg) => (
                      <SelectItem key={bg.id} value={bg.id} className="text-xs">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-3 h-3 rounded-full shrink-0 ${bg.type === "color" ? bg.class : "bg-slate-300"}`}
                            style={
                              bg.type === "image"
                                ? {
                                    backgroundImage: `url(${bg.url})`,
                                    backgroundSize: "cover",
                                  }
                                : {}
                            }
                          />
                          {bg.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!isSidebarCollapsed && (
                <div className="h-px bg-slate-200/60 w-full" />
              )}

              {/* Opção: Estrutura (Gerir Colunas) */}
              <div
                className={
                  isSidebarCollapsed
                    ? "flex justify-center w-full"
                    : "space-y-2 w-full"
                }
              >
                {!isSidebarCollapsed && (
                  <div className="flex items-center gap-2 px-1 text-slate-500">
                    <LayoutGrid className="h-3.5 w-3.5 shrink-0" />
                    <span className="text-[11px] font-bold uppercase truncate">
                      Estrutura
                    </span>
                  </div>
                )}
                {isSupabaseAvailable() && (
                  <div
                    title="Gerir Colunas"
                    className={
                      isSidebarCollapsed
                        ? "[&_button]:w-10 [&_button]:h-10 [&_button]:p-0 [&_button]:flex [&_button]:justify-center [&_button]:items-center [&_button]:bg-transparent [&_button]:border-none [&_button]:shadow-none [&_button]:text-[0px] [&_button]:text-transparent [&_button_svg]:text-slate-400 hover:[&_button]:text-blue-600 hover:[&_button]:bg-slate-100 [&_button_span]:hidden [&_button_svg]:!m-0 [&_button_svg]:w-5 [&_button_svg]:h-5 transition-colors rounded-xl"
                        : ""
                    }
                  >
                    <ColumnManager
                      columns={customColumns}
                      onColumnsChange={onColumnsChange}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RODAPÉ: PERFIL E SAIR */}
        <div className="mt-auto p-4 border-t border-slate-100 bg-white">
          <div
            className={`flex ${isSidebarCollapsed ? "flex-col py-3" : "items-center justify-between p-2"} gap-3 bg-slate-50 rounded-2xl border border-slate-100`}
          >
            <div
              className={`flex items-center gap-2 ${isSidebarCollapsed ? "justify-center" : "min-w-0"}`}
            >
              <UserAvatar
                name={account?.name}
                email={account?.username || ""}
                imageUrl={avatarUrl}
                className="h-8 w-8 shrink-0"
              />
              {!isSidebarCollapsed && (
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-900 truncate leading-tight">
                    {account?.name || "Utilizador"}
                  </p>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              title="Terminar Sessão"
              className={`h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors ${isSidebarCollapsed ? "mx-auto" : ""}`}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* MODAL DO NOVO EMAIL */}
      <EmailComposer
        isOpen={isComposerOpen}
        onClose={() => setIsComposerOpen(false)}
        mode="new"
        onEmailSent={handleEmailSent}
      />

      {/* CONTEÚDO PRINCIPAL (ESTICA TUDO) */}
      <main
        className={`flex-1 flex flex-col transition-all duration-700 ease-in-out relative h-full min-w-0 ${currentBg.type === "color" ? currentBg.class : ""}`}
        style={
          currentBg.type === "image"
            ? {
                backgroundImage: `linear-gradient(rgba(0,0,0,0.05), rgba(0,0,0,0.05)), url(${currentBg.url})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundAttachment: "fixed",
              }
            : {}
        }
      >
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-10 custom-scrollbar relative h-full min-w-0">
          {children}
        </div>
      </main>
    </div>
  );
}
