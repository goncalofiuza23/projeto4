"use client";

import { useMemo } from "react";
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
} from "lucide-react";

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
}

const priorityWeights: Record<string, number> = {
  urgente: 4,
  alta: 3,
  media: 2,
  baixa: 1,
};

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
}: KanbanColumnProps) {
  const { over } = useDndContext();
  const { setNodeRef, isOver } = useDroppable({ id });

  const isOverCardInColumn = threads.some((t) => t.id === over?.id);
  const isDropTarget = isOver || isOverCardInColumn || over?.id === id;

  // NOVA FUNÇÃO: Deteta a cor base da coluna para aplicar na borda do topo
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
    return "border-t-slate-300"; // Cor por defeito
  };

  const topBorderClass = getBorderColorClass(color);

  const groupedThreads = useMemo(() => {
    const getThreadHighestPriority = (thread: EmailThread) => {
      let highest = 1;
      thread.emails.forEach((email) => {
        const priority = emailsMetadata[email.id]?.priority;
        if (priority && priorityWeights[priority] > highest) {
          highest = priorityWeights[priority];
        }
      });
      return highest;
    };

    const sortedThreads = [...threads].sort((a, b) => {
      const weightA = getThreadHighestPriority(a);
      const weightB = getThreadHighestPriority(b);
      if (weightA !== weightB) return weightB - weightA;
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
  }, [threads, emailsMetadata]);

  const activeGroups = Object.entries(groupedThreads).filter(
    ([_, groupThreads]) => groupThreads.length > 0,
  );

  // --- DESIGN PARA COLUNA COLAPSADA (ESTREITA) ---
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
        <Badge variant="secondary" className={`${color} text-[10px] px-1 mb-2`}>
          {threads.length}
        </Badge>
      </div>
    );
  }

  // --- DESIGN PARA COLUNA NORMAL ---
  return (
    <Card
      className={`shrink-0 w-[400px] bg-slate-50/50 flex flex-col h-[calc(100vh-180px)] transition-all duration-300 border-x border-b border-t-4 border-x-slate-200 border-b-slate-200 ${topBorderClass}`}
    >
      <CardHeader className="pb-3 sticky top-0 z-10 bg-slate-50/95 backdrop-blur rounded-t-lg">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <span className="text-base">{icon}</span>
            <span className="font-bold tracking-tight">{title}</span>
            <Badge
              variant="secondary"
              className={`${color} ml-2 text-[10px] h-5`}
            >
              {threads.length}
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
          className={`flex-1 min-h-[70vh] pb-32 rounded-xl transition-all duration-300 ${isDropTarget ? "bg-blue-50/50 ring-2 ring-blue-400/20 ring-offset-2 bg-opacity-40" : ""}`}
        >
          <SortableContext
            items={threads.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            {threads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-slate-200/50 rounded-2xl bg-slate-50/30 mt-2 transition-colors">
                <div className="bg-white p-3 rounded-full shadow-sm mb-3 ring-4 ring-slate-50">
                  <Inbox className="h-6 w-6 text-slate-300" />
                </div>
                <p className="text-sm font-medium text-slate-400">
                  Tudo em dia!
                </p>
                <p className="text-[11px] text-slate-400/80 text-center">
                  Nenhuma conversa nesta coluna no momento.
                </p>
              </div>
            ) : (
              activeGroups.map(([groupName, groupThreads]) => (
                <div key={groupName} className="mb-6 last:mb-0">
                  <div className="sticky top-0 z-20 bg-slate-50/50 backdrop-blur-sm py-2 mb-3 mt-4 first:mt-0 border-b border-slate-100">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      {groupName}
                      <span className="h-px bg-slate-200 flex-1"></span>
                    </h4>
                  </div>

                  <div className="space-y-3">
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
              ))
            )}
          </SortableContext>
        </div>
      </CardContent>
    </Card>
  );
}
