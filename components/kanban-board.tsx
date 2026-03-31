"use client";

import { useState, useEffect } from "react";
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { KanbanColumn } from "./kanban-column";
import { EmailThreadCard } from "./email-thread-card";
import { FiltersPanel, type EmailFilters } from "./filters-panel";
import { DashboardLayout } from "./dashboard-layout";
import { useAuth } from "./auth-provider";
import {
  GraphService,
  type Email,
  type EmailThread,
} from "@/lib/microsoft-graph";
import {
  supabase,
  isSupabaseAvailable,
  safeSupabaseOperation,
  type EmailMetadata,
  type CustomColumn,
} from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Database } from "lucide-react";

const DEFAULT_COLUMNS = [
  {
    id: "inbox",
    title: "Caixa de Entrada",
    color: "bg-blue-100 text-blue-800",
    icon: "📥",
  },
];

export function KanbanBoard() {
  const { accessToken, account, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [emails, setEmails] = useState<Email[]>([]);
  const [threads, setThreads] = useState<EmailThread[]>([]);
  const [filteredThreads, setFilteredThreads] = useState<EmailThread[]>([]);
  const [emailsMetadata, setEmailsMetadata] = useState<
    Record<string, EmailMetadata>
  >({});
  const [customColumns, setCustomColumns] = useState<CustomColumn[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeThread, setActiveThread] = useState<EmailThread | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);
  const [collapsedColumns, setCollapsedColumns] = useState<string[]>([]);

  // Estado para garantir que não subscrevemos os dados antes do load
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const [filters, setFilters] = useState<EmailFilters>({
    search: "",
    sender: "",
    subject: "",
    tags: [],
    priority: [],
    hasAttachments: null,
    isRead: null,
    dateRange: { from: "", to: "" },
  });
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  useEffect(() => {
    if (!isSupabaseAvailable()) setSupabaseError("Supabase não configurado.");
  }, []);

  // CARREGAR COLUNAS COLAPSADAS
  useEffect(() => {
    if (!account?.homeAccountId || !isSupabaseAvailable()) {
      setIsInitialLoad(false);
      return;
    }

    const loadCollapsedCols = async () => {
      await safeSupabaseOperation(async () => {
        const { data } = await supabase!
          .from("user_preferences")
          .select("collapsed_columns")
          .eq("user_id", account.homeAccountId)
          .single();

        if (data?.collapsed_columns) {
          setCollapsedColumns(data.collapsed_columns);
        }
      });
      setIsInitialLoad(false);
    };

    loadCollapsedCols();
  }, [account?.homeAccountId]);

  // FUNÇÃO PARA LIDAR COM O CLIQUE E GUARDAR
  const handleToggleCollapse = async (columnId: string) => {
    const newState = collapsedColumns.includes(columnId)
      ? collapsedColumns.filter((i) => i !== columnId)
      : [...collapsedColumns, columnId];

    setCollapsedColumns(newState);

    if (account?.homeAccountId && !isInitialLoad && isSupabaseAvailable()) {
      await safeSupabaseOperation(async () => {
        await supabase!.from("user_preferences").upsert({
          user_id: account.homeAccountId,
          collapsed_columns: newState,
          updated_at: new Date().toISOString(),
        });
      });
    }
  };

  const loadCustomColumns = async () => {
    if (!account || !isSupabaseAvailable()) return;
    try {
      const result = await safeSupabaseOperation(async () => {
        const { data, error } = await supabase!
          .from("custom_columns")
          .select("*")
          .eq("user_id", account.homeAccountId)
          .order("position");
        if (error) throw error;
        return data || [];
      }, []);
      setCustomColumns(result || []);
    } catch (error) {
      console.error(error);
    }
  };

  const loadEmails = async () => {
    if (!accessToken || !account) return;
    setIsLoading(true);
    try {
      const graphService = new GraphService(accessToken);
      const fetchedEmails = await graphService.getAllEmails(100);
      setEmails(fetchedEmails);
      const emailThreads = graphService.groupEmailsIntoThreads(fetchedEmails);
      setThreads(emailThreads);

      if (isSupabaseAvailable()) {
        const metadata = await safeSupabaseOperation(async () => {
          const { data, error } = await supabase!
            .from("email_metadata")
            .select("*")
            .eq("user_id", account.homeAccountId);
          if (error) throw error;
          return data;
        }, []);
        const metadataMap: Record<string, EmailMetadata> = {};
        metadata?.forEach((meta) => {
          metadataMap[meta.email_id] = meta;
        });
        setEmailsMetadata(metadataMap);
        const allTags = new Set<string>();
        metadata?.forEach((meta) => {
          meta.tags.forEach((tag: string) => allTags.add(tag));
        });
        setAvailableTags(Array.from(allTags));
      }
      toast({ title: "Emails carregados" });
    } catch (e) {
      setError("Erro ao carregar");
    } finally {
      setIsLoading(false);
    }
  };

  const updateEmailMetadata = async (
    emailId: string,
    updates: Partial<EmailMetadata>,
  ) => {
    if (!account || !isSupabaseAvailable()) return;
    try {
      const existingMetadata = emailsMetadata[emailId];

      const currentColumnId =
        updates.column_id !== undefined
          ? updates.column_id
          : existingMetadata?.column_id || null;

      await safeSupabaseOperation(async () => {
        if (existingMetadata) {
          await supabase!
            .from("email_metadata")
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq("email_id", emailId);
        } else {
          await supabase!.from("email_metadata").insert({
            email_id: emailId,
            user_id: account.homeAccountId,
            priority: "media",
            column_id: currentColumnId,
            tags: [],
            ...updates,
          });
        }
      });

      setEmailsMetadata((prev) => ({
        ...prev,
        [emailId]: { ...prev[emailId], ...updates } as EmailMetadata,
      }));
    } catch (error) {
      console.error(error);
    }
  };

  const handleThreadUpdated = (updatedThread: EmailThread) => {
    setThreads((prevThreads) =>
      prevThreads.map((t) =>
        t.id === updatedThread.id ? { ...updatedThread } : t,
      ),
    );
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveThread(null);
    if (!over) return;

    const threadId = active.id as string;
    const activeData = active.data.current;
    const overData = over.data.current;

    let targetColId = over.id as string;

    if (overData?.type === "thread") {
      targetColId = overData.columnId;
    }

    if (activeData?.columnId === targetColId) return;

    const thread = threads.find((t) => t.id === threadId);
    if (!thread) return;

    try {
      const updates = {
        column_id: targetColId === "inbox" ? null : targetColId,
      };
      await Promise.all(
        thread.emails.map((e) => updateEmailMetadata(e.id, updates)),
      );
    } catch (e) {
      console.error(e);
    }
  };

  const getThreadsByColumn = (columnId: string) => {
    return filteredThreads.filter((t) =>
      t.emails.some((e) => {
        const meta = emailsMetadata[e.id];
        return columnId === "inbox"
          ? !meta?.column_id
          : meta?.column_id === columnId;
      }),
    );
  };

  useEffect(() => {
    let filtered = [...threads];

    // 1. Busca Geral (Texto - Procura no Assunto e Corpo)
    if (filters.search) {
      const s = filters.search.toLowerCase();
      filtered = filtered.filter((t) =>
        t.emails.some(
          (e) =>
            e.subject?.toLowerCase().includes(s) ||
            e.bodyPreview?.toLowerCase().includes(s),
        ),
      );
    }

    // 2. Remetente
    if (filters.sender) {
      const s = filters.sender.toLowerCase();
      filtered = filtered.filter((t) =>
        t.emails.some(
          (e) =>
            e.from?.emailAddress?.address?.toLowerCase().includes(s) ||
            e.from?.emailAddress?.name?.toLowerCase().includes(s),
        ),
      );
    }

    // 3. Tags
    if (filters.tags.length > 0) {
      filtered = filtered.filter((t) =>
        t.emails.some((e) =>
          emailsMetadata[e.id]?.tags?.some((tag) => filters.tags.includes(tag)),
        ),
      );
    }

    // 4. Prioridade
    if (filters.priority.length > 0) {
      filtered = filtered.filter((t) =>
        t.emails.some((e) => {
          const emailPriority = emailsMetadata[e.id]?.priority || "baixa";
          return filters.priority.includes(emailPriority);
        }),
      );
    }

    // 5. Anexos
    if (filters.hasAttachments !== null) {
      filtered = filtered.filter((t) => {
        const hasAttach = t.emails.some((e) => e.hasAttachments);
        return filters.hasAttachments ? hasAttach : !hasAttach;
      });
    }

    // 6. Status de Leitura
    if (filters.isRead !== null) {
      filtered = filtered.filter((t) => {
        return filters.isRead ? !t.hasUnread : t.hasUnread;
      });
    }

    // 7. Período / Datas
    if (filters.dateRange.from || filters.dateRange.to) {
      filtered = filtered.filter((t) => {
        const threadDate = new Date(t.lastActivity).getTime();
        let isValid = true;

        if (filters.dateRange.from) {
          const fromDate = new Date(filters.dateRange.from).getTime();
          if (threadDate < fromDate) isValid = false;
        }

        if (filters.dateRange.to) {
          const toDate = new Date(filters.dateRange.to);
          toDate.setHours(23, 59, 59, 999); // Inclui emails do próprio dia
          if (threadDate > toDate.getTime()) isValid = false;
        }

        return isValid;
      });
    }

    setFilteredThreads(filtered);
  }, [threads, filters, emailsMetadata]);

  useEffect(() => {
    if (accessToken && account && !authLoading) {
      loadEmails();
      loadCustomColumns();
    }
  }, [accessToken, account, authLoading]);

  if (authLoading)
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        Loading...
      </div>
    );

  const allColumns = [
    ...DEFAULT_COLUMNS,
    ...customColumns.map((col) => ({
      id: col.id,
      title: col.name,
      color: col.color,
      icon: col.icon,
    })),
  ];

  return (
    <DashboardLayout
      isLoading={isLoading}
      onRefresh={loadEmails}
      isFiltersVisible={isFiltersVisible}
      onToggleFilters={() => setIsFiltersVisible(!isFiltersVisible)}
      customColumns={customColumns}
      onColumnsChange={loadCustomColumns}
    >
      {isFiltersVisible && (
        <FiltersPanel
          filters={filters}
          onFiltersChange={setFilters}
          availableTags={availableTags}
          isVisible={isFiltersVisible}
          onToggleVisibility={() => setIsFiltersVisible(!isFiltersVisible)}
        />
      )}

      {supabaseError && (
        <Alert className="bg-white/90 border-amber-200 rounded-2xl mb-6">
          <Database className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-900 font-medium">
            {supabaseError}
          </AlertDescription>
        </Alert>
      )}

      <DndContext
        sensors={sensors}
        onDragStart={(e) =>
          setActiveThread(threads.find((t) => t.id === e.active.id) || null)
        }
        onDragEnd={handleDragEnd}
      >
        <div className="w-full overflow-x-auto overflow-y-hidden pb-8 custom-scrollbar">
          <div className="flex flex-nowrap gap-6 items-start w-max min-w-full">
            {allColumns.map((column) => (
              <KanbanColumn
                key={column.id}
                id={column.id}
                title={column.title}
                threads={getThreadsByColumn(column.id)}
                emailsMetadata={emailsMetadata}
                onUpdateMetadata={updateEmailMetadata}
                onThreadUpdated={handleThreadUpdated}
                color={column.color}
                icon={column.icon}
                onEmailSent={loadEmails}
                isCollapsed={collapsedColumns.includes(column.id)}
                onToggleCollapse={() => handleToggleCollapse(column.id)}
              />
            ))}
            <div className="shrink-0 w-4 h-full opacity-0 pointer-events-none" />
          </div>
        </div>

        <DragOverlay>
          {activeThread && (
            <div className="rotate-3 scale-105 shadow-2xl transition-transform">
              <EmailThreadCard
                thread={activeThread}
                emailsMetadata={emailsMetadata}
                onUpdateMetadata={updateEmailMetadata}
                onEmailSent={loadEmails}
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </DashboardLayout>
  );
}
