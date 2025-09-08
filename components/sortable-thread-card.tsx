"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { EmailThreadCard } from "./email-thread-card"
import type { EmailThread } from "@/lib/microsoft-graph"
import type { EmailMetadata } from "@/lib/supabase"

interface SortableThreadCardProps {
  thread: EmailThread
  emailsMetadata: Record<string, EmailMetadata>
  onUpdateMetadata: (emailId: string, updates: Partial<EmailMetadata>) => void
  onEmailSent?: () => void
}

export function SortableThreadCard({ thread, emailsMetadata, onUpdateMetadata, onEmailSent }: SortableThreadCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: thread.id,
    data: {
      type: "thread",
      thread,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    scale: isDragging ? 1.05 : 1,
    zIndex: isDragging ? 1000 : 1,
    cursor: isDragging ? "grabbing" : "grab",
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      data-thread-id={thread.id}
      className={`transition-all duration-200 ${isDragging ? "rotate-2 shadow-2xl" : ""}`}
    >
      <EmailThreadCard
        thread={thread}
        emailsMetadata={emailsMetadata}
        onUpdateMetadata={onUpdateMetadata}
        onEmailSent={onEmailSent}
      />
    </div>
  )
}
