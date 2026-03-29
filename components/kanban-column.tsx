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
} from "lucide-react";

interface KanbanColumnProps {
  id: string;
  title: string;
  threads: EmailThread[];
  emailsMetadata: Record<string, EmailMetadata>;
  onUpdateMetadata: (emailId: string, updates: Partial<EmailMetadata>) => void;
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
        className="w-12 h-[calc(100vh-180px)] bg-slate-100/80 border rounded-lg flex flex-col items-center py-2 transition-all duration-300 hover:bg-slate-200/80 cursor-pointer group"
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
    <Card className="flex-1 min-w-[400px] max-w-[500px] bg-slate-50/50 flex flex-col h-[calc(100vh-180px)] transition-all duration-300 border-t-4 border-t-slate-200">
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

          {/* BOTÃO MOVIDO PARA O CANTO DIREITO */}
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
          className={`flex-1 min-h-[70vh] pb-32 rounded-lg transition-all duration-200 ${
            isDropTarget
              ? "bg-blue-50/80 border-2 border-dashed border-blue-300 scale-[1.005]"
              : "border-2 border-transparent"
          }`}
        >
          <SortableContext
            items={threads.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            {threads.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm border-2 border-dashed border-slate-200 rounded-lg mt-2 text-center px-4">
                {isDropTarget
                  ? "✨ Largar aqui"
                  : "Nenhuma conversa nesta coluna"}
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
                        emailsMetadata={emailsMetadata}
                        onUpdateMetadata={onUpdateMetadata}
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
