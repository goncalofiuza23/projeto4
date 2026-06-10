"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useDroppable, useDndContext } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SortableThreadCard } from "./sortable-thread-card";
import type { EmailThread } from "@/lib/microsoft-graph";
import type { EmailMetadata } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Inbox,
  Clock,
  ChevronDown,
  Loader2,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface KanbanColumnProps {
  id: string;
  title: string;
  threads: EmailThread[];
  emailsMetadata: Record<string, EmailMetadata>;
  onUpdateMetadata: (emailId: string, updates: Partial<EmailMetadata>) => void;
  onThreadUpdated?: (thread: EmailThread) => void;
  color: string;
  icon: string;
  onEmailSent?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onLoadMore?: () => void;
}

export function KanbanColumn({
  id,
  title,
  threads,
  emailsMetadata,
  onUpdateMetadata,
  onThreadUpdated,
  color,
  icon,
  onEmailSent,
  isCollapsed,
  onToggleCollapse,
  onLoadMore,
}: KanbanColumnProps) {
  const { over } = useDndContext();
  const { setNodeRef, isOver } = useDroppable({ id });

  const [isSnoozedOpen, setIsSnoozedOpen] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const isOverCardInColumn = threads.some((t) => t.id === over?.id);
  const isDropTarget = isOver || isOverCardInColumn || over?.id === id;

  const getBorderColorClass = (colorStr: string) => {
    if (!colorStr) return "border-t-slate-300";
    if (colorStr.includes("blue")) return "border-t-blue-500";
    if (colorStr.includes("red")) return "border-t-red-500";
    if (colorStr.includes("green")) return "border-t-green-500";
    if (colorStr.includes("yellow")) return "border-t-yellow-400";
    if (colorStr.includes("orange")) return "border-t-orange-500";
    if (colorStr.includes("purple")) return "border-t-purple-500";
    if (colorStr.includes("indigo")) return "border-t-indigo-500";
    if (colorStr.includes("pink")) return "border-t-pink-500";
    if (colorStr.includes("rose")) return "border-t-rose-500";
    if (colorStr.includes("teal")) return "border-t-teal-500";
    return "border-t-slate-300";
  };

  const topBorderClass = getBorderColorClass(color);

  const { activeThreads, snoozedThreads } = useMemo(() => {
    const now = new Date().getTime();
    const active: EmailThread[] = [];
    const snoozed: EmailThread[] = [];

    threads.forEach((thread) => {
      const isSnoozed = thread.emails.some((e) => {
        const snoozeDate = emailsMetadata[e.id]?.snoozed_until;
        return snoozeDate && new Date(snoozeDate).getTime() > now;
      });

      if (isSnoozed) {
        snoozed.push(thread);
      } else {
        active.push(thread);
      }
    });

    return { activeThreads: active, snoozedThreads: snoozed };
  }, [threads, emailsMetadata]);

  // 👇 Calcula quantos e-mails estão por ler na coluna 👇
  const unreadCount = useMemo(() => {
    return activeThreads.filter(t => t.hasUnread).length;
  }, [activeThreads]);

  const groupedThreads = useMemo(() => {
    const sortedThreads = [...activeThreads].sort((a, b) => {
      return (
        new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
      );
    });

    const getTimeGroup = (dateString: string) => {
      const date = new Date(dateString);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const lastWeek = new Date(today);
      lastWeek.setDate(lastWeek.getDate() - 7);
      const lastMonth = new Date(today);
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      if (date >= today) return "Hoje";
      if (date >= yesterday) return "Ontem";
      if (date >= lastWeek) return "Última Semana";
      if (date >= lastMonth) return "Último Mês";
      return "Mais Antigos";
    };

    const groups: Record<string, EmailThread[]> = {
      Hoje: [],
      Ontem: [],
      "Última Semana": [],
      "Último Mês": [],
      "Mais Antigos": [],
    };

    sortedThreads.forEach((thread) => {
      const groupName = getTimeGroup(thread.lastActivity);
      groups[groupName].push(thread);
    });

    return groups;
  }, [activeThreads]);

  const activeGroups = Object.entries(groupedThreads).filter(
    ([_, groupThreads]) => groupThreads.length > 0,
  );

  useEffect(() => {
    // Só ativa o infinite scroll se houver mais de 20 e-mails na coluna
    if (!onLoadMore || activeThreads.length < 20) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingMore) {
          setIsFetchingMore(true);
          onLoadMore();
          
          setTimeout(() => setIsFetchingMore(false), 2000);
        }
      },
      { rootMargin: "100px" }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [onLoadMore, activeThreads.length, isFetchingMore]);

  if (isCollapsed) {
    return (
      <div
        className={`w-12 h-[calc(100vh-180px)] bg-slate-100/80 border border-slate-200 rounded-lg flex flex-col items-center py-2 transition-all duration-300 hover:bg-slate-200/80 cursor-pointer group border-t-4 ${topBorderClass}`}
        onClick={onToggleCollapse}
      >
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 mb-4 text-slate-400 group-hover:text-primary"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </Button>
        <div className="flex flex-col items-center gap-4 flex-1">
          <span className="text-lg">{icon}</span>
          <h3 className="font-bold text-slate-500 uppercase tracking-widest text-[11px] [writing-mode:vertical-rl] rotate-180">
            {title}
          </h3>
        </div>
        <Badge variant="secondary" className={`${color} text-[10px] px-1 mb-2 relative`}>
          {activeThreads.length}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
          )}
        </Badge>
      </div>
    );
  }

  return (
    <Card
      className={`shrink-0 w-[400px] bg-slate-50/50 flex flex-col h-[calc(100vh-180px)] transition-all duration-300 border-x border-b border-t-4 border-x-slate-200 border-b-slate-200 ${topBorderClass}`}
    >
      <CardHeader className="pb-2 pt-3 sticky top-0 z-10 bg-slate-50/95 backdrop-blur rounded-t-lg border-b border-transparent">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <span className="text-base">{icon}</span>
            <span className="font-bold tracking-tight">{title}</span>
            
            <Badge
              variant="secondary"
              className={`${color} ml-2 text-[11px] h-5 px-2 font-semibold`}
            >
              {activeThreads.length} {unreadCount > 0 ? <span className="ml-1 opacity-80">({unreadCount} por ler)</span> : ""}
            </Badge>
          </CardTitle>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-slate-400 hover:text-primary hover:bg-white"
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse?.();
            }}
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0 flex-1 overflow-y-auto custom-scrollbar">
        <div
          ref={setNodeRef}
          data-column-id={id}
          className={`flex-1 min-h-[70vh] rounded-xl transition-all duration-300 ${isDropTarget ? "bg-blue-50/50 ring-2 ring-blue-400/20 ring-offset-2 bg-opacity-40" : ""}`}
        >
          {snoozedThreads.length > 0 && (
            <Collapsible
              open={isSnoozedOpen}
              onOpenChange={setIsSnoozedOpen}
              className="mb-2"
            >
              <CollapsibleTrigger asChild>
                <div className="w-full bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 transition-colors rounded-xl py-1.5 px-3 flex items-center justify-between cursor-pointer group mt-2 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-indigo-500" />
                    <span className="text-[11px] font-semibold text-indigo-700">
                      {snoozedThreads.length}{" "}
                      {snoozedThreads.length === 1
                        ? "Adiado"
                        : "Adiados"}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 text-indigo-400 group-hover:text-indigo-700 bg-transparent hover:bg-transparent"
                  >
                    {isSnoozedOpen ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2 pb-1 space-y-2">
                <SortableContext
                  items={snoozedThreads.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {snoozedThreads.map((thread) => (
                    <SortableThreadCard
                      key={thread.id}
                      thread={thread}
                      columnId={id}
                      emailsMetadata={emailsMetadata}
                      onUpdateMetadata={onUpdateMetadata}
                      onThreadUpdated={onThreadUpdated}
                      onEmailSent={onEmailSent}
                    />
                  ))}
                </SortableContext>
              </CollapsibleContent>
            </Collapsible>
          )}

          <SortableContext
            items={activeThreads.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            {activeThreads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 border-2 border-dashed border-slate-200/50 rounded-2xl bg-slate-50/30 mt-2 transition-colors">
                <div className="bg-white p-2 rounded-full shadow-sm mb-2 ring-4 ring-slate-50">
                  <Inbox className="h-5 w-5 text-slate-300" />
                </div>
                <p className="text-xs font-medium text-slate-400">
                  Tudo em dia!
                </p>
              </div>
            ) : (
              <>
                {activeGroups.map(([groupName, groupThreads]) => (
                  <div key={groupName} className="mb-4 last:mb-0">
                    
                    <div className="sticky top-0 z-20 bg-slate-50/80 backdrop-blur-sm py-1 mb-2 mt-2 first:mt-1">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 pl-1">
                        {groupName}
                        <span className="h-px bg-slate-200 flex-1"></span>
                      </h4>
                    </div>

                    <div className="space-y-2">
                      {groupThreads.map((thread) => (
                        <SortableThreadCard
                          key={thread.id}
                          thread={thread}
                          columnId={id}
                          emailsMetadata={emailsMetadata}
                          onUpdateMetadata={onUpdateMetadata}
                          onThreadUpdated={onThreadUpdated}
                          onEmailSent={onEmailSent}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                
                {/* 👇 Scroll infinito só aparece se houver + de 20 emails 👇 */}
                {activeThreads.length >= 20 && (
                  <div ref={loadMoreRef} className="py-2 flex justify-center pb-4">
                    {isFetchingMore && (
                      <div className="flex items-center gap-2 text-slate-400 bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-100">
                        <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                        <span className="text-[10px] font-medium">A carregar...</span>
                      </div>
                    )}
                  </div>
                )}
                
                {/* 👇 Botão manual ocultado para colunas com menos de 10 emails 👇 */}
                {activeThreads.length >= 10 && activeThreads.length < 20 && (
                  <div className="py-2 flex justify-center pb-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (onLoadMore && !isFetchingMore) {
                          setIsFetchingMore(true);
                          onLoadMore();
                          setTimeout(() => setIsFetchingMore(false), 2000);
                        }
                      }}
                      disabled={isFetchingMore}
                      className="h-7 text-slate-400 bg-white shadow-sm rounded-full text-[10px] px-3 hover:text-blue-600 hover:bg-blue-50 transition-colors border-slate-200"
                    >
                      {isFetchingMore ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin mr-1.5 text-blue-500" />
                          A procurar...
                        </>
                      ) : (
                        "Procurar mais antigos"
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </SortableContext>
        </div>
      </CardContent>
    </Card>
  );
}