"use client";

import { useState, useEffect } from "react";
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { KanbanColumn } from "./kanban-column";
import { EmailThreadCard } from "./email-thread-card";
import { FiltersPanel, type EmailFilters } from "./filters-panel";
import { DashboardLayout } from "./dashboard-layout";
import { useAuth } from "./auth-provider";
import { useLanguage } from "./language-provider";
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
import { Database, AlertOctagon, Trash2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function KanbanBoard() {
  const { accessToken, account, isLoading: authLoading } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();

  const DEFAULT_COLUMNS = [
    {
      id: "inbox",
      title: t("col_inbox"),
      color: "bg-blue-100 text-blue-800",
      icon: "📥",
    },
  ];

  const [emails, setEmails] = useState<Email[]>([]);
  const [threads, setThreads] = useState<EmailThread[]>([]);
  const [filteredThreads, setFilteredThreads] = useState<EmailThread[]>([]);
  const [emailsMetadata, setEmailsMetadata] = useState<Record<string, EmailMetadata>>({});
  const [customColumns, setCustomColumns] = useState<CustomColumn[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeThread, setActiveThread] = useState<EmailThread | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);
  const [collapsedColumns, setCollapsedColumns] = useState<string[]>([]);

  const [activeView, setActiveView] = useState("kanban");
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const [emailLimit, setEmailLimit] = useState(50);

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
    if (!isSupabaseAvailable()) setSupabaseError(t("supabase_error"));
  }, [t]);

  useEffect(() => {
    if (account?.homeAccountId && isSupabaseAvailable()) {
      loadCustomColumns();
    }
  }, [account?.homeAccountId]);

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
      }, null);
      setIsInitialLoad(false);
    };

    loadCollapsedCols();
  }, [account?.homeAccountId]);

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
      }, null);
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
    } catch (error) {}
  };

  const loadEmails = async (isBackground = false, currentLimit = emailLimit) => {
  if (!accessToken || !account) return;

  if (!isBackground) {
    setIsLoading(true);
  }

  try {
    const graphService = new GraphService(accessToken);
    
    const fetchedEmailsPromise = graphService.getAllEmails(currentLimit);

    let metadataPromise = Promise.resolve(null as any);
    if (isSupabaseAvailable()) {
      metadataPromise = safeSupabaseOperation(async () => {
        const { data, error } = await supabase!
          .from("email_metadata")
          .select("*")
          .eq("user_id", account.homeAccountId);
        if (error) throw error;
        return data;
      }, []);
    }

    const [fetchedEmails, metadata] = await Promise.all([
      fetchedEmailsPromise,
      metadataPromise
    ]);

    const metadataMap: Record<string, EmailMetadata> = {};
    const allTags = new Set<string>();

    if (metadata) {
      metadata.forEach((meta: any) => {
        metadataMap[meta.email_id] = meta;
        meta.tags?.forEach((tag: string) => allTags.add(tag));
      });
      setAvailableTags(Array.from(allTags));
    }

    const fetchedEmailIds = new Set(fetchedEmails.map((email) => email.id));

    const missingMetadataEmails =
      metadata?.filter((meta: EmailMetadata) => {
        if (fetchedEmailIds.has(meta.email_id)) return false;

        const hasUsefulMetadata =
          meta.column_id ||
          meta.snoozed_until ||
          meta.due_date ||
          (meta.tags && meta.tags.length > 0) ||
          (meta.subtasks && meta.subtasks.length > 0) ||
          meta.priority;

        return hasUsefulMetadata;
      }) || [];

    const missingEmails = await Promise.all(
      missingMetadataEmails.map(async (meta: EmailMetadata) => {
        try {
          return await graphService.getEmailById(meta.email_id);
        } catch (error) {
          console.warn("Não foi possível carregar email antigo:", meta.email_id);
          return null;
        }
      })
    );

    const extraEmails = missingEmails.filter(Boolean) as Email[];

    const allEmailsMap = new Map<string, Email>();

    [...fetchedEmails, ...extraEmails].forEach((email) => {
      allEmailsMap.set(email.id, email);
    });

    const allEmails = Array.from(allEmailsMap.values());

    const emailThreads = graphService.groupEmailsIntoThreads(allEmails);

    setEmails(allEmails);
    setThreads(emailThreads);
    setEmailsMetadata(metadataMap);

  } catch (e) {
    if (!isBackground) setError("Erro ao carregar");
  } finally {
    if (!isBackground) {
      setIsLoading(false);
    }
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
            column_id: currentColumnId,
            tags: [],
            ...updates,
          });
        }
      }, null);

      setEmailsMetadata((prev) => ({
        ...prev,
        [emailId]: { ...prev[emailId], ...updates } as EmailMetadata,
      }));
    } catch (error) {}
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
    } catch (e) {}
  };

  const getThreadsByColumn = (columnId: string) => {
    return filteredThreads.filter((t) => {
      let threadColumn = "inbox";
      
      for (const e of t.emails) {
        const meta = emailsMetadata[e.id];
        if (meta?.column_id && !["archive", "spam", "deleted"].includes(meta.column_id)) {
          threadColumn = meta.column_id;
          break; 
        }
      }
      
      return threadColumn === columnId;
    });
  };

  useEffect(() => {
    let filtered = [...threads];

    if (activeView === "kanban") {
      filtered = filtered.filter((t) => {
        const isArchivedSpamOrDeleted = t.emails.some((e) => {
          const isFolderArchived = ["archive", "spam", "deleted", "junkemail", "deleteditems"].includes(e.folderType || "");
          const isMetadataArchived = ["archive", "spam", "deleted"].includes(emailsMetadata[e.id]?.column_id || "");
          return isFolderArchived || isMetadataArchived;
        });
        
        if (isArchivedSpamOrDeleted) return false;

        const isOnlyFromMe = t.emails.every((e) => e.isFromMe);
        const hasColumn = t.emails.some(
          (e) => emailsMetadata[e.id]?.column_id && !["archive", "spam", "deleted"].includes(emailsMetadata[e.id]?.column_id || ""),
        );
        return !(isOnlyFromMe && !hasColumn);
      });
    }

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

    if (filters.tags.length > 0) {
      filtered = filtered.filter((t) =>
        t.emails.some((e) =>
          emailsMetadata[e.id]?.tags?.some((tag) => filters.tags.includes(tag)),
        ),
      );
    }

    if (filters.priority.length > 0) {
      filtered = filtered.filter((t) =>
        t.emails.some((e) => {
          const emailPriority = emailsMetadata[e.id]?.priority;
          if (!emailPriority) return false; 
          return filters.priority.includes(emailPriority);
        }),
      );
    }

    if (filters.hasAttachments !== null) {
      filtered = filtered.filter((t) => {
        const hasAttach = t.emails.some((e) => e.hasAttachments);
        return filters.hasAttachments ? hasAttach : !hasAttach;
      });
    }

    if (filters.isRead !== null) {
      filtered = filtered.filter((t) => {
        return filters.isRead ? !t.hasUnread : t.hasUnread;
      });
    }

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
          toDate.setHours(23, 59, 59, 999);
          if (threadDate > toDate.getTime()) isValid = false;
        }

        return isValid;
      });
    }

    setFilteredThreads(filtered);
  }, [threads, filters, emailsMetadata, activeView]);

  useEffect(() => {
    if (accessToken && account && !authLoading) {
      loadEmails(false, emailLimit);

      const pollingInterval = setInterval(() => {
        loadEmails(true, emailLimit);
      }, 15000);

      return () => clearInterval(pollingInterval);
    }
  }, [accessToken, account, authLoading, emailLimit]);

  useEffect(() => {
    if (accessToken && account && !authLoading && !isInitialLoad) {
      loadEmails(true, emailLimit); 
    }
  }, [activeView]);

  if (authLoading)
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        {t("loading")}
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

  const renderMainContent = () => {
    if (activeView === "kanban") {
      return (
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
                  onEmailSent={() => loadEmails(true)}
                  isCollapsed={collapsedColumns.includes(column.id)}
                  onToggleCollapse={() => handleToggleCollapse(column.id)}
                  onLoadMore={() => setEmailLimit((prev) => prev + 50)}
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
                  onEmailSent={() => loadEmails(true)}
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      );
    }

    if (activeView.startsWith("col_")) {
      const colId = activeView.replace("col_", "");
      const column = allColumns.find((c) => c.id === colId);
      const colThreads = getThreadsByColumn(colId);

      return (
        <div className="max-w-3xl mx-auto py-4 pt-8">
          <div className="flex items-center gap-4 mb-8 bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-slate-200/50">
            <div className="h-14 w-14 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-2xl">
              {column?.icon || "📁"}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
                {column?.title || t("col_unknown")}
              </h2>
            </div>
            <Badge
              variant="secondary"
              className="ml-auto text-sm px-3 py-1 bg-white border border-slate-200 shadow-sm"
            >
              {colThreads.length} {t("emails_count")}
            </Badge>
          </div>

          <div className="space-y-4">
            {colThreads.length === 0 ? (
              <div className="text-center py-16 text-slate-400 bg-white/80 backdrop-blur-md rounded-3xl border border-dashed border-slate-200 shadow-sm">
                {t("empty_col")}
              </div>
            ) : (
              colThreads.map((thread) => (
                <div
                  key={thread.id}
                  className="animate-in fade-in slide-in-from-bottom-2 duration-300"
                >
                  <EmailThreadCard
                    thread={thread}
                    emailsMetadata={emailsMetadata}
                    onUpdateMetadata={updateEmailMetadata}
                    onThreadUpdated={handleThreadUpdated}
                    onEmailSent={() => loadEmails(true)}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      );
    }

    if (activeView === "snoozed") {
      const now = new Date().getTime();
      const snoozedThreads = threads.filter((t) =>
        t.emails.some((e) => {
          const snoozeDate = emailsMetadata[e.id]?.snoozed_until;
          return snoozeDate && new Date(snoozeDate).getTime() > now;
        }),
      );

      return (
        <div className="max-w-3xl mx-auto py-4 pt-8">
          <div className="flex items-center gap-4 mb-8 bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-slate-200/50">
            <div className="h-14 w-14 bg-indigo-50 rounded-xl shadow-sm border border-indigo-100 flex items-center justify-center text-2xl text-indigo-500">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
                {t("title_snoozed")}
              </h2>
            </div>
            <Badge
              variant="secondary"
              className="ml-auto text-sm px-3 py-1 bg-white border border-slate-200 shadow-sm text-indigo-600"
            >
              {snoozedThreads.length} {t("emails_count")}
            </Badge>
          </div>

          <div className="space-y-4">
            {snoozedThreads.length === 0 ? (
              <div className="text-center py-16 text-slate-400 bg-white/80 backdrop-blur-md rounded-3xl border border-dashed border-slate-200 shadow-sm">
                {t("empty_snoozed")}
              </div>
            ) : (
              snoozedThreads.map((thread) => (
                <div
                  key={thread.id}
                  className="animate-in fade-in slide-in-from-bottom-2 duration-300"
                >
                  <EmailThreadCard
                    thread={thread}
                    emailsMetadata={emailsMetadata}
                    onUpdateMetadata={updateEmailMetadata}
                    onThreadUpdated={handleThreadUpdated}
                    onEmailSent={() => loadEmails(true)}
                    isSnoozedView={true}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      );
    }

    if (activeView === "archived") {
      const archivedThreads = threads.filter((t) =>
        t.emails.some((e) => e.folderType === "archive" || emailsMetadata[e.id]?.column_id === "archive"),
      );

      return (
        <div className="max-w-3xl mx-auto py-4 pt-8">
          <div className="flex items-center gap-4 mb-8 bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-slate-200/50">
            <div className="h-14 w-14 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-2xl">
              📦
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
                {t("title_archived")}
              </h2>
            </div>
            <Badge
              variant="secondary"
              className="ml-auto text-sm px-3 py-1 bg-white border border-slate-200 shadow-sm"
            >
              {archivedThreads.length} {t("emails_count")}
            </Badge>
          </div>

          <div className="space-y-4">
            {archivedThreads.length === 0 ? (
              <div className="text-center py-16 text-slate-400 bg-white/80 backdrop-blur-md rounded-3xl border border-dashed border-slate-200 shadow-sm">
                {t("empty_archived")}
              </div>
            ) : (
              archivedThreads.map((thread) => (
                <div
                  key={thread.id}
                  className="animate-in fade-in slide-in-from-bottom-2 duration-300"
                >
                  <EmailThreadCard
                    thread={thread}
                    emailsMetadata={emailsMetadata}
                    onUpdateMetadata={updateEmailMetadata}
                    onThreadUpdated={handleThreadUpdated}
                    onEmailSent={() => loadEmails(true)}
                    isArchivedView={true}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      );
    }

    if (activeView === "sent") {
      const sentThreads = threads.filter((t) =>
        t.emails.some((e) => e.folderType === "sent"),
      );

      return (
        <div className="max-w-3xl mx-auto py-4 pt-8">
          <div className="flex items-center gap-4 mb-8 bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-slate-200/50">
            <div className="h-14 w-14 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-2xl">
              📤
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
                {t("title_sent")}
              </h2>
            </div>
            <Badge
              variant="secondary"
              className="ml-auto text-sm px-3 py-1 bg-white border border-slate-200 shadow-sm"
            >
              {sentThreads.length} {t("conversations_count")}
            </Badge>
          </div>

          <div className="space-y-4">
            {sentThreads.length === 0 ? (
              <div className="text-center py-16 text-slate-400 bg-white/80 backdrop-blur-md rounded-3xl border border-dashed border-slate-200 shadow-sm">
                {t("empty_sent")}
              </div>
            ) : (
              sentThreads.map((thread) => (
                <div
                  key={thread.id}
                  className="animate-in fade-in slide-in-from-bottom-2 duration-300"
                >
                  <EmailThreadCard
                    thread={thread}
                    emailsMetadata={emailsMetadata}
                    onUpdateMetadata={updateEmailMetadata}
                    onThreadUpdated={handleThreadUpdated}
                    onEmailSent={() => loadEmails(true)}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      );
    }

    if (activeView === "deleted") {
      const deletedThreads = threads.filter((t) =>
        t.emails.some((e) => e.folderType === "deleted" || emailsMetadata[e.id]?.column_id === "deleted"),
      );

      return (
        <div className="max-w-3xl mx-auto py-4 pt-8">
          <div className="flex items-center gap-4 mb-8 bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-slate-200/50">
            <div className="h-14 w-14 bg-red-50 rounded-xl shadow-sm border border-red-100 flex items-center justify-center text-2xl text-red-500">
              <Trash2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
                {t("title_deleted")}
              </h2>
            </div>
            <Badge
              variant="secondary"
              className="ml-auto text-sm px-3 py-1 bg-white border border-slate-200 shadow-sm text-red-600"
            >
              {deletedThreads.length} {t("emails_count")}
            </Badge>
          </div>

          <div className="space-y-4">
            {deletedThreads.length === 0 ? (
              <div className="text-center py-16 text-slate-400 bg-white/80 backdrop-blur-md rounded-3xl border border-dashed border-slate-200 shadow-sm">
                {t("empty_deleted")}
              </div>
            ) : (
              deletedThreads.map((thread) => (
                <div
                  key={thread.id}
                  className="animate-in fade-in slide-in-from-bottom-2 duration-300"
                >
                  <EmailThreadCard
                    thread={thread}
                    emailsMetadata={emailsMetadata}
                    onUpdateMetadata={updateEmailMetadata}
                    onThreadUpdated={handleThreadUpdated}
                    onEmailSent={() => loadEmails(true)}
                    isDeletedView={true}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      );
    }

    if (activeView === "spam") {
      const spamThreads = threads.filter((t) =>
        t.emails.some((e) => e.folderType === "spam" || emailsMetadata[e.id]?.column_id === "spam"),
      );

      return (
        <div className="max-w-3xl mx-auto py-4 pt-8">
          <div className="flex items-center gap-4 mb-8 bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-slate-200/50">
            <div className="h-14 w-14 bg-amber-50 rounded-xl shadow-sm border border-amber-100 flex items-center justify-center text-2xl text-amber-500">
              <AlertOctagon className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
                {t("title_spam")}
              </h2>
            </div>
            <Badge
              variant="secondary"
              className="ml-auto text-sm px-3 py-1 bg-white border border-slate-200 shadow-sm text-amber-600"
            >
              {spamThreads.length} {t("emails_count")}
            </Badge>
          </div>

          <div className="space-y-4">
            {spamThreads.length === 0 ? (
              <div className="text-center py-16 text-slate-400 bg-white/80 backdrop-blur-md rounded-3xl border border-dashed border-slate-200 shadow-sm">
                {t("empty_spam")}
              </div>
            ) : (
              spamThreads.map((thread) => (
                <div
                  key={thread.id}
                  className="animate-in fade-in slide-in-from-bottom-2 duration-300"
                >
                  <EmailThreadCard
                    thread={thread}
                    emailsMetadata={emailsMetadata}
                    onUpdateMetadata={updateEmailMetadata}
                    onThreadUpdated={handleThreadUpdated}
                    onEmailSent={() => loadEmails(true)}
                    isSpamView={true}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-slate-400 space-y-4 bg-white/50 backdrop-blur-sm rounded-3xl m-8">
        <Clock className="h-12 w-12 text-slate-300" />
        <p className="font-medium text-lg">
          {t("view_construction_1")} <b>{activeView}</b> {t("view_construction_2")}
        </p>
      </div>
    );
  };

  return (
    <DashboardLayout
      isLoading={isLoading}
      onRefresh={() => loadEmails(false)}
      isFiltersVisible={isFiltersVisible}
      onToggleFilters={() => setIsFiltersVisible(!isFiltersVisible)}
      customColumns={customColumns}
      onColumnsChange={loadCustomColumns}
      activeView={activeView}
      onViewChange={setActiveView}
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
        <Alert className="bg-white/90 border-amber-200 rounded-2xl mb-6 shadow-sm">
          <Database className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-900 font-medium">
            {supabaseError}
          </AlertDescription>
        </Alert>
      )}

      {renderMainContent()}
    </DashboardLayout>
  );
}