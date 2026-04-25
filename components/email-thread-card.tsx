"use client";

import { useState, useEffect, memo } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock,
  Paperclip,
  ChevronDown,
  ChevronRight,
  Settings,
  Archive,
  Trash2,
  BellRing,
  AlertOctagon,
  MoreHorizontal,
  Inbox,
  Sunrise,
  Sunset,
  Calendar,
  AlertTriangle,
  CheckSquare2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { EmailThread } from "@/lib/microsoft-graph";
import type { EmailMetadata, Subtask } from "@/lib/supabase";
import { EmailViewer } from "./email-viewer";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserAvatar } from "./user-avatar";
import { useAuth } from "./auth-provider";
import { GraphService } from "@/lib/microsoft-graph";
import { useToast } from "@/hooks/use-toast";

interface EmailThreadCardProps {
  thread: EmailThread;
  emailsMetadata: Record<string, EmailMetadata>;
  onUpdateMetadata: (emailId: string, updates: Partial<EmailMetadata>) => void;
  onEmailSent?: () => void;
  onThreadUpdated?: (thread: EmailThread) => void;
  isArchivedView?: boolean;
  isSpamView?: boolean;
  isDeletedView?: boolean;
  isSnoozedView?: boolean;
}

const priorityIcons = {
  baixa: { icon: "🟢", label: "Baixa", color: "text-green-600 bg-green-50" },
  media: { icon: "🟡", label: "Média", color: "text-yellow-600 bg-yellow-50" },
  alta: { icon: "🟠", label: "Alta", color: "text-orange-600 bg-orange-50" },
  urgente: { icon: "🔴", label: "Urgente", color: "text-red-600 bg-red-50" },
};

export const EmailThreadCard = memo(function EmailThreadCard({
  thread,
  emailsMetadata,
  onUpdateMetadata,
  onEmailSent,
  onThreadUpdated,
  isArchivedView = false,
  isSpamView = false,
  isDeletedView = false,
  isSnoozedView = false,
}: EmailThreadCardProps) {
  const { accessToken } = useAuth();
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSnoozeModalOpen, setIsSnoozeModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [customSnoozeDate, setCustomSnoozeDate] = useState("");

  const [newTag, setNewTag] = useState("");
  const [priority, setPriority] = useState("media");
  const [tags, setTags] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [isVisuallyHidden, setIsVisuallyHidden] = useState(false);

  const formatDateShort = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString("pt-PT", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return date.toLocaleDateString("pt-PT", { day: "numeric", month: "short" });
  };

  const getParticipantsDisplay = () => {
    if (thread.participants.length <= 2) {
      return thread.participants.join(", ");
    }
    return `${thread.participants[0]} +${thread.participants.length - 1}`;
  };

  const latestEmail = thread.emails[thread.emails.length - 1];
  const hasAttachments = thread.emails.some((e) => e.hasAttachments);
  const isUnread = thread.hasUnread;

  const priorities = ["urgente", "alta", "media", "baixa"];
  let highestPriority = "baixa";
  let snoozedUntilDate: string | null = null;
  let subtasks: Subtask[] = [];

  thread.emails.forEach((e) => {
    const metadata = emailsMetadata[e.id];
    if (metadata?.priority) {
      const currentIndex = priorities.indexOf(metadata.priority);
      const highestIndex = priorities.indexOf(highestPriority);
      if (currentIndex < highestIndex) {
        highestPriority = metadata.priority;
      }
    }
    if (metadata?.snoozed_until) {
      snoozedUntilDate = metadata.snoozed_until;
    }
    if (metadata?.subtasks && metadata.subtasks.length > 0) {
      subtasks = metadata.subtasks;
    }
  });

  const isSnoozedActive = snoozedUntilDate
    ? new Date(snoozedUntilDate).getTime() > new Date().getTime()
    : false;

  const selectedEmailData = selectedEmail
    ? thread.emails.find((e) => e.id === selectedEmail)
    : null;

  const completedTasksCount = subtasks.filter((t) => t.completed).length;
  const totalTasks = subtasks.length;
  const isAllTasksCompleted =
    totalTasks > 0 && completedTasksCount === totalTasks;

  useEffect(() => {
    const firstEmailMetadata = emailsMetadata[thread.emails[0]?.id];
    if (firstEmailMetadata) {
      setPriority(firstEmailMetadata.priority || "media");
      setTags(firstEmailMetadata.tags || []);
    }
  }, [emailsMetadata, thread.emails]);

  useEffect(() => {
    let isMounted = true;
    const fetchSenderPhoto = async () => {
      const senderEmail = latestEmail.from?.emailAddress?.address;
      if (!accessToken || !senderEmail) return;
      try {
        const graphService = new GraphService(accessToken);
        const photoUrl = await graphService.getProfilePhoto(senderEmail);
        if (isMounted && photoUrl) {
          setAvatarUrl(photoUrl);
        }
      } catch (error) {}
    };
    fetchSenderPhoto();
    return () => {
      isMounted = false;
    };
  }, [accessToken, latestEmail.from?.emailAddress?.address]);

  const handleMarkAsRead = async (emailId: string) => {
    if (!accessToken) return;
    try {
      const graphService = new GraphService(accessToken);
      await graphService.markAsRead(emailId);

      const updatedEmails = thread.emails.map((e) =>
        e.id === emailId ? { ...e, isRead: true } : e,
      );

      const updatedThread = {
        ...thread,
        emails: updatedEmails,
        hasUnread: updatedEmails.some((e) => !e.isRead),
      };

      if (onThreadUpdated) {
        onThreadUpdated(updatedThread);
      }
    } catch (error) {}
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      const updatedTags = [...tags, newTag.trim()];
      setTags(updatedTags);
      thread.emails.forEach((e) => {
        onUpdateMetadata(e.id, { tags: updatedTags });
      });
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updatedTags = tags.filter((tag) => tag !== tagToRemove);
    setTags(updatedTags);
    thread.emails.forEach((e) => {
      onUpdateMetadata(e.id, { tags: updatedTags });
    });
  };

  const handlePriorityChange = (newPriority: string) => {
    setPriority(newPriority as EmailMetadata["priority"]);
    thread.emails.forEach((e) => {
      onUpdateMetadata(e.id, {
        priority: newPriority as EmailMetadata["priority"],
      });
    });
  };

  const applySnooze = (date: Date) => {
    setIsVisuallyHidden(true);
    thread.emails.forEach((e) => {
      onUpdateMetadata(e.id, { snoozed_until: date.toISOString() });
    });
    setIsSnoozeModalOpen(false);
    toast({
      title: "E-mail Adiado (Snoozed)",
      description: `A mensagem reaparecerá no dia ${date.toLocaleDateString("pt-PT", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}.`,
    });
  };

  const snoozeOptions = {
    laterToday: () => {
      const d = new Date();
      d.setHours(d.getHours() + 4);
      applySnooze(d);
    },
    tomorrow: () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(8, 0, 0, 0);
      applySnooze(d);
    },
    nextWeek: () => {
      const d = new Date();
      const diff = (7 - d.getDay() + 1) % 7 || 7;
      d.setDate(d.getDate() + diff);
      d.setHours(8, 0, 0, 0);
      applySnooze(d);
    },
    custom: () => {
      if (customSnoozeDate) {
        applySnooze(new Date(customSnoozeDate));
      }
    },
  };

  const cancelSnooze = () => {
    setIsVisuallyHidden(true);
    thread.emails.forEach((e) => {
      onUpdateMetadata(e.id, { snoozed_until: null });
    });
    toast({
      title: "Snooze Cancelado",
      description: "O e-mail voltou a estar ativo no Kanban.",
    });
  };

  const actionArchive = async () => {
    if (!accessToken) return;
    setIsMoving(true);
    setIsVisuallyHidden(true);
    try {
      const graphService = new GraphService(accessToken);
      await Promise.all(
        thread.emails.map((e) => graphService.moveToFolder(e.id, "archive")),
      );
      thread.emails.forEach((e) => onUpdateMetadata(e.id, { column_id: null }));
      toast({
        title: "Conversa Arquivada",
        description: "Movida para a pasta de Arquivo do Outlook.",
      });
      setTimeout(() => {
        if (onEmailSent) onEmailSent();
      }, 1500);
    } catch (e) {
      setIsVisuallyHidden(false);
      toast({
        title: "Erro",
        description: "Falha ao arquivar e-mail",
        variant: "destructive",
      });
    } finally {
      setIsMoving(false);
    }
  };

  const actionRestoreToInbox = async () => {
    if (!accessToken) return;
    setIsMoving(true);
    setIsVisuallyHidden(true);
    try {
      const graphService = new GraphService(accessToken);
      await Promise.all(
        thread.emails.map((e) => graphService.moveToFolder(e.id, "inbox")),
      );
      toast({
        title: "Restaurado",
        description: "Conversa movida para a Caixa de Entrada.",
      });
      setTimeout(() => {
        if (onEmailSent) onEmailSent();
      }, 1500);
    } catch (e) {
      setIsVisuallyHidden(false);
      toast({
        title: "Erro",
        description: "Falha ao restaurar e-mail",
        variant: "destructive",
      });
    } finally {
      setIsMoving(false);
    }
  };

  const actionSpam = async () => {
    if (!accessToken) return;
    setIsMoving(true);
    setIsVisuallyHidden(true);
    try {
      const graphService = new GraphService(accessToken);
      await Promise.all(
        thread.emails.map((e) => graphService.moveToFolder(e.id, "junkemail")),
      );
      thread.emails.forEach((e) => onUpdateMetadata(e.id, { column_id: null }));
      toast({
        title: "Spam",
        description: "Conversa movida para Lixo Eletrónico.",
      });
      setTimeout(() => {
        if (onEmailSent) onEmailSent();
      }, 1500);
    } catch (e) {
      setIsVisuallyHidden(false);
      toast({
        title: "Erro",
        description: "Falha ao marcar como Spam",
        variant: "destructive",
      });
    } finally {
      setIsMoving(false);
    }
  };

  const confirmDelete = () => {
    setIsDeleteDialogOpen(true);
  };

  const executeDelete = async () => {
    setIsDeleteDialogOpen(false);
    if (!accessToken) return;
    setIsMoving(true);
    setIsVisuallyHidden(true);
    try {
      const graphService = new GraphService(accessToken);
      if (isDeletedView) {
        await Promise.all(
          thread.emails.map((e) => graphService.deleteMessage(e.id)),
        );
        toast({
          title: "Eliminado Definitivamente",
          description: "A conversa foi removida permanentemente.",
        });
      } else {
        await Promise.all(
          thread.emails.map((e) =>
            graphService.moveToFolder(e.id, "deleteditems"),
          ),
        );
        thread.emails.forEach((e) =>
          onUpdateMetadata(e.id, { column_id: null }),
        );
        toast({
          title: "Eliminado",
          description: "Conversa movida para os Itens Eliminados.",
        });
      }
      setTimeout(() => {
        if (onEmailSent) onEmailSent();
      }, 1500);
    } catch (e) {
      setIsVisuallyHidden(false);
      toast({
        title: "Erro",
        description: isDeletedView
          ? "Falha ao eliminar definitivamente"
          : "Falha ao eliminar e-mail",
        variant: "destructive",
      });
    } finally {
      setIsMoving(false);
    }
  };

  if (isVisuallyHidden) return null;

  return (
    <>
      <Card
        className={`mb-3 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 border-l-4 group relative flex flex-col ${
          isUnread
            ? "border-l-blue-600 ring-1 ring-blue-100"
            : "hover:border-l-blue-400 border-l-transparent border border-slate-200"
        } ${isMoving ? "opacity-50 pointer-events-none" : ""}`}
      >
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CardHeader
            className="p-4 pb-3 cursor-pointer relative flex flex-col"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedEmail(latestEmail.id);
              if (!latestEmail.isRead) handleMarkAsRead(latestEmail.id);
            }}
          >
            <div
              className="absolute top-3 right-3 z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-slate-800 hover:bg-slate-100/80 rounded-lg transition-colors"
                  >
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 rounded-xl shadow-lg border-slate-100"
                >
                  {isArchivedView ||
                  isSpamView ||
                  isDeletedView ||
                  isSnoozedActive ? (
                    <>
                      {isSnoozedView || isSnoozedActive ? (
                        <DropdownMenuItem
                          onClick={cancelSnooze}
                          className="cursor-pointer py-2 rounded-lg font-medium text-indigo-600 focus:text-indigo-700 focus:bg-indigo-50"
                        >
                          <BellRing className="mr-2 h-4 w-4" />
                          Despertar Agora
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={actionRestoreToInbox}
                          className="cursor-pointer py-2 rounded-lg font-medium text-blue-600 focus:text-blue-700 focus:bg-blue-50"
                        >
                          <Inbox className="mr-2 h-4 w-4" />
                          {isSpamView
                            ? "Não é Spam"
                            : "Mover para Caixa de Entrada"}
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuSeparator className="bg-slate-100" />
                      <DropdownMenuItem
                        onClick={confirmDelete}
                        className="cursor-pointer py-2 rounded-lg font-medium text-red-600 focus:text-red-700 focus:bg-red-50"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {isDeletedView ? "Eliminar para Sempre" : "Eliminar"}
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem
                        onClick={() => setIsSettingsOpen(true)}
                        className="cursor-pointer py-2 rounded-lg font-medium"
                      >
                        <Settings className="mr-2 h-4 w-4 text-slate-500" />
                        Gerir Tags e Prioridade
                      </DropdownMenuItem>

                      <DropdownMenuSeparator className="bg-slate-100" />

                      <DropdownMenuItem
                        onClick={() => setIsSnoozeModalOpen(true)}
                        className="cursor-pointer py-2 rounded-lg font-medium"
                      >
                        <BellRing className="mr-2 h-4 w-4 text-slate-500" />
                        Snooze (Adiar)
                      </DropdownMenuItem>

                      <DropdownMenuSeparator className="bg-slate-100" />

                      <DropdownMenuItem
                        onClick={actionArchive}
                        className="cursor-pointer py-2 rounded-lg font-medium"
                      >
                        <Archive className="mr-2 h-4 w-4 text-slate-500" />
                        Arquivar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={actionSpam}
                        className="cursor-pointer py-2 rounded-lg text-amber-600 focus:text-amber-700 focus:bg-amber-50"
                      >
                        <AlertOctagon className="mr-2 h-4 w-4" />
                        Marcar como Spam
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={confirmDelete}
                        className="cursor-pointer py-2 rounded-lg text-red-600 focus:text-red-700 focus:bg-red-50"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex gap-3 pr-8 w-full">
              <div className="flex flex-col items-center gap-2 mt-1">
                <UserAvatar
                  name={latestEmail.from?.emailAddress?.name}
                  email={latestEmail.from?.emailAddress?.address || ""}
                  imageUrl={avatarUrl}
                  className="h-10 w-10 flex-shrink-0 shadow-sm"
                />
                <span className="text-xs">
                  {
                    priorityIcons[highestPriority as keyof typeof priorityIcons]
                      .icon
                  }
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs truncate pr-2 ${isUnread ? "font-bold text-slate-900" : "font-medium text-slate-600"}`}
                  >
                    {getParticipantsDisplay()}
                  </span>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium whitespace-nowrap">
                    {hasAttachments && <Paperclip className="h-3 w-3" />}
                    {formatDateShort(thread.lastActivity)}
                  </div>
                </div>

                <h3
                  className={`text-sm leading-tight mb-1.5 line-clamp-2 pr-2 transition-colors ${
                    isUnread
                      ? "font-bold text-slate-900"
                      : "font-semibold text-slate-700"
                  }`}
                >
                  {thread.subject}
                  {thread.totalEmails > 1 && (
                    <Badge
                      variant="secondary"
                      className="ml-2 text-[10px] px-1.5 py-0 h-4 bg-slate-100 text-slate-500 align-middle"
                    >
                      {thread.totalEmails} msg
                    </Badge>
                  )}
                </h3>

                <p className="text-xs line-clamp-2 text-slate-500 leading-relaxed pr-2">
                  {latestEmail.bodyPreview}
                </p>
              </div>
            </div>
          </CardHeader>

          <div className="px-4 pb-3 flex items-center justify-between mt-auto">
            <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
              {/* Checklist Badge Summary */}
              {totalTasks > 0 && (
                <div
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors ${
                    isAllTasksCompleted
                      ? "bg-[#658835] text-white border-[#658835]"
                      : "bg-slate-100 text-slate-600 border-slate-200"
                  }`}
                >
                  <CheckSquare2 className="h-3.5 w-3.5" />
                  <span>
                    {completedTasksCount}/{totalTasks}
                  </span>
                </div>
              )}

              {isSnoozedActive && snoozedUntilDate && (
                <div className="w-full bg-indigo-50 border border-indigo-100 rounded-xl py-2 px-3 flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <BellRing className="h-4 w-4 text-indigo-500" />
                    <span className="text-[11px] font-bold text-indigo-700">
                      Acorda a:{" "}
                      {new Date(snoozedUntilDate).toLocaleDateString("pt-PT", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                </div>
              )}

              {tags.slice(0, 2).map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-[9px] px-1.5 py-0 h-4 font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 truncate max-w-[60px]"
                >
                  {tag}
                </Badge>
              ))}
            </div>

            <div className="flex items-center shrink-0 ml-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <CollapsibleContent className="space-y-0 px-2 pb-2">
            <div className="bg-slate-50 rounded-xl p-2 border border-slate-100 mt-2">
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                {thread.emails.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-start gap-2 p-2 rounded-lg transition-colors cursor-pointer border ${
                      !item.isRead
                        ? "bg-white border-blue-100 shadow-sm"
                        : "bg-transparent border-transparent hover:bg-slate-200/50"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEmail(item.id);
                      if (!item.isRead) handleMarkAsRead(item.id);
                    }}
                  >
                    <UserAvatar
                      name={item.from?.emailAddress?.name}
                      email={item.from?.emailAddress?.address || ""}
                      imageUrl={
                        item.from?.emailAddress?.address ===
                        latestEmail.from?.emailAddress?.address
                          ? avatarUrl
                          : undefined
                      }
                      className="h-5 w-5 mt-0.5 flex-shrink-0 shadow-sm border border-slate-100"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-[11px] truncate ${!item.isRead ? "font-bold text-slate-700" : "font-medium text-slate-500"}`}
                        >
                          {item.isFromMe
                            ? "Você"
                            : item.from?.emailAddress?.name}
                        </span>
                        <span className="text-[9px] text-slate-400 whitespace-nowrap">
                          {formatDateShort(item.receivedDateTime)}
                        </span>
                      </div>
                      <p className="text-[10px] truncate text-slate-400 mt-0.5">
                        {item.bodyPreview}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Gerir Prioridade e Tags</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label
                htmlFor="priority"
                className="text-xs font-bold text-slate-500 uppercase"
              >
                Prioridade
              </Label>
              <Select value={priority} onValueChange={handlePriorityChange}>
                <SelectTrigger className="h-10 rounded-xl bg-slate-50 border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="baixa">🟢 Baixa</SelectItem>
                  <SelectItem value="media">🟡 Média</SelectItem>
                  <SelectItem value="alta">🟠 Alta</SelectItem>
                  <SelectItem value="urgente">🔴 Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="tags"
                className="text-xs font-bold text-slate-500 uppercase"
              >
                Adicionar Tags
              </Label>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  className="h-10 rounded-xl bg-slate-50 border-slate-200"
                  onKeyPress={(e) => e.key === "Enter" && handleAddTag()}
                />
                <Button
                  onClick={handleAddTag}
                  className="h-10 rounded-xl px-6 bg-slate-900 text-white hover:bg-slate-800"
                >
                  Adicionar
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="px-3 py-1 text-xs cursor-pointer hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors group flex items-center gap-1 border border-slate-200 bg-white"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    {tag}{" "}
                    <Trash2 className="h-3 w-3 opacity-40 group-hover:opacity-100" />
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isSnoozeModalOpen} onOpenChange={setIsSnoozeModalOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800">
              <BellRing className="h-5 w-5 text-indigo-600" /> Adiar E-mail
              (Snooze)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="grid grid-cols-1 gap-2">
              <Button
                variant="outline"
                className="justify-start h-12 rounded-xl text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-all"
                onClick={snoozeOptions.laterToday}
              >
                <Sunset className="mr-3 h-5 w-5 opacity-70" /> Mais logo (Daqui
                a 4h)
              </Button>
              <Button
                variant="outline"
                className="justify-start h-12 rounded-xl text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-all"
                onClick={snoozeOptions.tomorrow}
              >
                <Sunrise className="mr-3 h-5 w-5 opacity-70" /> Amanhã de Manhã
              </Button>
              <Button
                variant="outline"
                className="justify-start h-12 rounded-xl text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-all"
                onClick={snoozeOptions.nextWeek}
              >
                <Calendar className="mr-3 h-5 w-5 opacity-70" /> Próxima Semana
              </Button>
            </div>
            <div className="pt-4 mt-2 border-t border-slate-100 space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase">
                Escolher Data Específica
              </Label>
              <div className="flex gap-2">
                <Input
                  type="datetime-local"
                  className="h-11 rounded-xl bg-slate-50 border-slate-200"
                  value={customSnoozeDate}
                  onChange={(e) => setCustomSnoozeDate(e.target.value)}
                />
                <Button
                  onClick={snoozeOptions.custom}
                  disabled={!customSnoozeDate}
                  className="h-11 rounded-xl px-4 bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Confirmar
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" /> Eliminar E-mail
            </DialogTitle>
            <DialogDescription className="text-slate-500 pt-2">
              {isDeletedView
                ? "Esta ação irá apagar a conversa permanentemente. Não poderá ser recuperada."
                : "Tem a certeza de que pretende eliminar esta conversa? Esta ação moverá os e-mails para a pasta de Itens Eliminados."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="rounded-xl h-10 px-6"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={executeDelete}
              className="rounded-xl h-10 px-6"
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedEmailData && (
        <EmailViewer
          email={selectedEmailData}
          metadata={emailsMetadata[selectedEmailData.id]}
          isOpen={!!selectedEmail}
          onClose={() => setSelectedEmail(null)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onUpdateMetadata={onUpdateMetadata}
          onEmailSent={onEmailSent}
        />
      )}
    </>
  );
});
