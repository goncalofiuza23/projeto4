"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { EmailCard } from "./email-card"
import type { Email } from "@/lib/microsoft-graph"
import type { EmailMetadata } from "@/lib/supabase"

interface SortableEmailCardProps {
  email: Email
  metadata?: EmailMetadata
  onUpdateMetadata: (emailId: string, updates: Partial<EmailMetadata>) => void
}

export function SortableEmailCard({ email, metadata, onUpdateMetadata }: SortableEmailCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: email.id,
    data: {
      type: "email",
      email,
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
      data-email-id={email.id}
      className={`transition-all duration-200 ${isDragging ? "rotate-2 shadow-2xl" : ""}`}
    >
      <EmailCard email={email} metadata={metadata} onUpdateMetadata={onUpdateMetadata} />
    </div>
  )
}
