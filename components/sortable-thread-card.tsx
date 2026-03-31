"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { EmailThreadCard } from "./email-thread-card";
import type { EmailThread } from "@/lib/microsoft-graph";
import type { EmailMetadata } from "@/lib/supabase";

interface SortableThreadCardProps {
  thread: EmailThread;
  columnId: string; // <-- ADICIONADO NA INTERFACE
  emailsMetadata: Record<string, EmailMetadata>;
  onUpdateMetadata: (emailId: string, updates: Partial<EmailMetadata>) => void;
  onThreadUpdated?: (thread: EmailThread) => void;
  onEmailSent?: () => void;
}

export function SortableThreadCard({
  thread,
  columnId, // <-- RECEBIDO AQUI
  emailsMetadata,
  onUpdateMetadata,
  onThreadUpdated,
  onEmailSent,
}: SortableThreadCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: thread.id,
    // ADICIONADO COLUMN ID AQUI EM BAIXO PARA O DRAG SABER ONDE ESTÁ
    data: { type: "thread", thread, columnId },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="outline-none"
    >
      <EmailThreadCard
        thread={thread}
        emailsMetadata={emailsMetadata}
        onUpdateMetadata={onUpdateMetadata}
        onThreadUpdated={onThreadUpdated}
        onEmailSent={onEmailSent}
      />
    </div>
  );
}
