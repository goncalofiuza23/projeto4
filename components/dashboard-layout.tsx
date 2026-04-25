"use client";

import { ReactNode, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  RefreshCw,
  Loader2,
  Filter,
  LayoutGrid,
  Plus,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Archive,
  Trash2,
  Clock,
  AlertOctagon,
  Settings,
  Send,
} from "lucide-react";
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
import { SettingsModal } from "./settings-modal";

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
  activeView: string;
  onViewChange: (view: string) => void;
}

export function DashboardLayout({
  children,
  isLoading,
  onRefresh,
  isFiltersVisible,
  onToggleFilters,
  customColumns,
  onColumnsChange,
  activeView,
  onViewChange,
}: DashboardLayoutProps) {
  const { account, accessToken, logout } = useAuth();
  const [currentBg, setCurrentBg] = useState(BACKGROUNDS[0]);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

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

  useEffect(() => {
    if (!account?.homeAccountId || !isSupabaseAvailable()) {
      setIsInitialLoad(false);
      return;
    }

    const loadPrefs = async () => {
      await safeSupabaseOperation(async () => {
        const { data } = await supabase!
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

  const renderMenuItem = (
    id: string,
    IconOrEmoji: any,
    label: string,
    isEmoji: boolean = false,
    onClick?: () => void,
  ) => {
    const isActive = activeView === id;
    return (
      <Button
        key={id}
        variant="ghost"
        onClick={() => {
          onViewChange(id);
          if (onClick) onClick();
        }}
        title={label}
        className={`w-full h-10 rounded-xl transition-all ${
          isActive
            ? "bg-blue-50 text-blue-700 font-semibold shadow-sm border border-blue-100/50"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        } ${isSidebarCollapsed ? "justify-center px-0" : "justify-start gap-3 px-3"}`}
      >
        {isEmoji ? (
          <span
            className={`h-4 w-4 shrink-0 flex items-center justify-center text-[14px] leading-none ${isActive ? "opacity-100" : "opacity-70 grayscale-[50%]"}`}
          >
            {IconOrEmoji}
          </span>
        ) : (
          <IconOrEmoji
            className={`h-4 w-4 shrink-0 ${isActive ? "text-blue-600" : "text-slate-400"}`}
          />
        )}
        {!isSidebarCollapsed && (
          <span className="text-xs truncate">{label}</span>
        )}
      </Button>
    );
  };

  return (
    <div className="flex h-screen w-full overflow-hidden m-0 p-0">
      <aside
        className={`bg-white border-r border-slate-200 flex flex-col z-20 shadow-xl transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? "w-20" : "w-72"
        }`}
      >
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

        <div className="flex-1 overflow-y-auto overflow-x-hidden py-5 space-y-6 custom-scrollbar">
          <div className="px-3">
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

          <div className="space-y-0.5 px-2">
            {!isSidebarCollapsed && (
              <p className="text-[10px] font-bold text-slate-400 uppercase px-2 mb-2 truncate">
                Caixa de Entrada
              </p>
            )}
            {renderMenuItem("kanban", LayoutDashboard, "O meu Kanban")}
            {renderMenuItem("sent", Send, "Enviados")}
            {renderMenuItem("snoozed", Clock, "Adiados (Snooze)")}
            {renderMenuItem("archived", Archive, "Arquivados")}
            {renderMenuItem("spam", AlertOctagon, "Spam")}
            {renderMenuItem("deleted", Trash2, "Eliminados")}
          </div>

          <div className="space-y-0.5 px-2">
            {!isSidebarCollapsed && (
              <p className="text-[10px] font-bold text-slate-400 uppercase px-2 mb-2 truncate">
                As Minhas Colunas
              </p>
            )}
            <div className="max-h-[128px] overflow-y-auto custom-scrollbar pr-1 space-y-0.5">
              {renderMenuItem("col_inbox", "📥", "Caixa de Entrada", true)}
              {customColumns.map((col) =>
                renderMenuItem(
                  `col_${col.id}`,
                  col.icon || "📁",
                  col.name,
                  true,
                ),
              )}
            </div>

            {isSupabaseAvailable() && (
              <div
                className={`pt-2 ${isSidebarCollapsed ? "flex justify-center" : ""}`}
              >
                <div
                  title="Gerir Colunas"
                  className={
                    isSidebarCollapsed
                      ? "[&_button]:w-10 [&_button]:h-10 [&_button]:p-0 [&_button]:flex [&_button]:justify-center [&_button]:items-center [&_button]:bg-transparent [&_button]:border-none [&_button]:shadow-none [&_button]:text-[0px] [&_button]:text-transparent [&_button_svg]:text-slate-400 hover:[&_button]:text-blue-600 hover:[&_button]:bg-slate-100 [&_button_span]:hidden [&_button_svg]:!m-0 [&_button_svg]:w-5 [&_button_svg]:h-5 transition-colors rounded-xl"
                      : "[&_button]:w-full [&_button]:h-8 [&_button]:justify-start [&_button]:gap-3 [&_button]:px-3 [&_button]:text-xs [&_button]:font-medium [&_button]:text-slate-500 [&_button]:bg-transparent hover:[&_button]:bg-slate-100 hover:[&_button]:text-slate-900 transition-colors rounded-lg [&_button_svg]:h-4 [&_button_svg]:w-4"
                  }
                >
                  <ColumnManager
                    columns={customColumns}
                    onColumnsChange={onColumnsChange}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-0.5 px-2">
            {!isSidebarCollapsed && (
              <p className="text-[10px] font-bold text-slate-400 uppercase px-2 mb-2 truncate">
                Ferramentas
              </p>
            )}

            <Button
              variant="ghost"
              onClick={onToggleFilters}
              title="Filtros"
              className={`w-full h-10 rounded-xl transition-all ${
                isFiltersVisible
                  ? "bg-blue-50 text-blue-700 font-semibold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              } ${isSidebarCollapsed ? "justify-center px-0" : "justify-start gap-3 px-3"}`}
            >
              <Filter
                className={`h-4 w-4 shrink-0 ${isFiltersVisible ? "text-blue-600" : "text-slate-400"}`}
              />
              {!isSidebarCollapsed && (
                <span className="text-xs truncate">
                  {isFiltersVisible ? "Ocultar Filtros" : "Mostrar Filtros"}
                </span>
              )}
            </Button>
          </div>
        </div>

        <div className="mt-auto p-4 border-t border-slate-100 bg-white shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.05)]">
          <div
            className={`flex ${isSidebarCollapsed ? "flex-col py-3" : "items-center justify-between p-2"} gap-3 bg-slate-50 rounded-2xl border border-slate-100`}
          >
            <div
              className={`flex items-center gap-2 ${isSidebarCollapsed ? "justify-center" : "min-w-0"} flex-1 cursor-pointer hover:opacity-80 transition-opacity`}
              onClick={() => setIsSettingsModalOpen(true)}
              title="Abrir Definições"
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
                  <p className="text-[9px] text-slate-500 font-medium truncate flex items-center gap-1 mt-0.5">
                    <Settings className="h-3 w-3" /> Definições
                  </p>
                </div>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              title="Terminar Sessão"
              className={`h-8 w-8 shrink-0 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors ${isSidebarCollapsed ? "mx-auto" : ""}`}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={setIsSettingsModalOpen}
        account={account}
        avatarUrl={avatarUrl}
        currentBgId={currentBg.id}
        onBgChange={handleBgChange}
      />

      <EmailComposer
        isOpen={isComposerOpen}
        onClose={() => setIsComposerOpen(false)}
        mode="new"
        onEmailSent={handleEmailSent}
      />

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
