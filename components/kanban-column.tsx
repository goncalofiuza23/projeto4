"use client"

import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SortableThreadCard } from "./sortable-thread-card"
import type { EmailThread } from "@/lib/microsoft-graph"
import type { EmailMetadata } from "@/lib/supabase"

interface KanbanColumnProps {
  id: string
  title: string
  threads: EmailThread[]
  emailsMetadata: Record<string, EmailMetadata>
  onUpdateMetadata: (emailId: string, updates: Partial<EmailMetadata>) => void
  color: string
  icon: string
  onEmailSent?: () => void
}

export function KanbanColumn({
  id,
  title,
  threads,
  emailsMetadata,
  onUpdateMetadata,
  color,
  icon,
  onEmailSent,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  })

  console.log(`📋 Coluna ${id} (${title}):`, {
    threadCount: threads.length,
    isOver,
    threads: threads.map((t) => t.id),
  })

  return (
    <Card className="flex-1 min-w-80">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span>{icon}</span>
            {title}
          </div>
          <Badge variant="secondary" className={color}>
            {threads.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div
          ref={setNodeRef}
          data-column-id={id}
          className={`min-h-96 space-y-2 p-2 rounded-lg transition-all duration-200 ${
            isOver ? "bg-blue-50 border-2 border-dashed border-blue-300 scale-[1.02]" : "border-2 border-transparent"
          }`}
        >
          <SortableContext items={threads.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            {threads.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                {isOver ? "✨ Solte a conversa aqui" : "Nenhuma conversa nesta coluna"}
              </div>
            ) : (
              threads.map((thread) => (
                <SortableThreadCard
                  key={thread.id}
                  thread={thread}
                  emailsMetadata={emailsMetadata}
                  onUpdateMetadata={onUpdateMetadata}
                  onEmailSent={onEmailSent}
                />
              ))
            )}
          </SortableContext>
        </div>
      </CardContent>
    </Card>
  )
}
