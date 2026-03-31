"use client";

import { useState, useEffect, memo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock,
  Paperclip,
  ChevronDown,
  ChevronRight,
  Mail,
  Settings,
} from "lucide-react";
import type { EmailThread } from "@/lib/microsoft-graph";
import type { EmailMetadata } from "@/lib/supabase";
import { EmailViewer } from "./email-viewer";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

interface EmailThreadCardProps {
  thread: EmailThread;
  emailsMetadata: Record<string, EmailMetadata>;
  onUpdateMetadata: (emailId: string, updates: Partial<EmailMetadata>) => void;
  onEmailSent?: () => void;
  onThreadUpdated?: (thread: EmailThread) => void;
}

const priorityIcons = {
  baixa: "🟢",
  media: "🟡",
  alta: "🟠",
  urgente: "🔴",
};

export const EmailThreadCard = memo(function EmailThreadCard({
  thread,
  emailsMetadata,
  onUpdateMetadata,
  onEmailSent,
  onThreadUpdated,
}: EmailThreadCardProps) {
  const { accessToken } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [priority, setPriority] = useState("media");
  const [tags, setTags] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getParticipantsDisplay = () => {
    if (thread.participants.length <= 2) {
      return thread.participants.join(", ");
    }
    return `${thread.participants.slice(0, 2).join(", ")} +${thread.participants.length - 2}`;
  };

  const latestEmail = thread.emails[thread.emails.length - 1];
  const hasAttachments = thread.emails.some((e) => e.hasAttachments);
  const isUnread = thread.hasUnread;

  const priorities = ["urgente", "alta", "media", "baixa"];
  let highestPriority = "baixa";
  thread.emails.forEach((e) => {
    const metadata = emailsMetadata[e.id];
    if (metadata?.priority) {
      const currentIndex = priorities.indexOf(metadata.priority);
      const highestIndex = priorities.indexOf(highestPriority);
      if (currentIndex < highestIndex) {
        highestPriority = metadata.priority;
      }
    }
  });

  const selectedEmailData = selectedEmail
    ? thread.emails.find((e) => e.id === selectedEmail)
    : null;

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
    } catch (error) {
      console.error("Erro ao marcar como lido:", error);
    }
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

  return (
    <>
      <Card
        className={`mb-3 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border-l-4 group relative ${
          isUnread
            ? "border-l-blue-600 ring-1 ring-blue-100"
            : "hover:border-l-blue-400 border-l-transparent border border-slate-200/60"
        }`}
      >
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CardHeader className="pb-2">
            <div className="flex items-start gap-3 justify-between">
              <UserAvatar
                name={latestEmail.from?.emailAddress?.name}
                email={latestEmail.from?.emailAddress?.address || ""}
                imageUrl={avatarUrl}
                className="h-10 w-10 mt-1 flex-shrink-0"
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation(); // Trava o drag para expandir
                      setIsExpanded(!isExpanded);
                    }}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>

                  <h3
                    className={`text-sm truncate hover:text-blue-600 transition-colors flex-1 cursor-pointer ${
                      isUnread
                        ? "font-bold text-slate-900 dark:text-slate-100"
                        : "font-medium text-muted-foreground"
                    }`}
                    title={thread.subject}
                    onClick={(e) => {
                      e.stopPropagation(); // Trava o drag para abrir o email
                      setSelectedEmail(latestEmail.id);
                      if (!latestEmail.isRead) handleMarkAsRead(latestEmail.id);
                    }}
                  >
                    {thread.subject}
                  </h3>
                  {thread.totalEmails > 1 && (
                    <Badge variant="secondary" className="text-xs">
                      {thread.totalEmails}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs mb-2 text-muted-foreground">
                  <span className="truncate">{getParticipantsDisplay()}</span>
                </div>

                <p className="text-xs line-clamp-2 text-muted-foreground">
                  {latestEmail.bodyPreview}
                </p>
              </div>

              <div onClick={(e) => e.stopPropagation()}>
                <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Configurações da Conversa</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="priority">Prioridade</Label>
                        <Select
                          value={priority}
                          onValueChange={handlePriorityChange}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="baixa">🟢 Baixa</SelectItem>
                            <SelectItem value="media">🟡 Média</SelectItem>
                            <SelectItem value="alta">🟠 Alta</SelectItem>
                            <SelectItem value="urgente">🔴 Urgente</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="tags">Tags</Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            placeholder="Nova tag"
                            onKeyPress={(e) =>
                              e.key === "Enter" && handleAddTag()
                            }
                          />
                          <Button onClick={handleAddTag} size="sm">
                            Adicionar
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="text-xs cursor-pointer hover:bg-red-100"
                              onClick={() => handleRemoveTag(tag)}
                            >
                              {tag} ×
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <div className="flex items-center gap-2">
                <div
                  className={`flex items-center gap-1 ${isUnread ? "text-blue-600 font-medium" : ""}`}
                >
                  <Clock className="h-3 w-3" />
                  {formatDate(thread.lastActivity)}
                </div>
                {hasAttachments && <Paperclip className="h-3 w-3" />}
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs">
                  {priorityIcons[highestPriority as keyof typeof priorityIcons]}
                </span>
              </div>
            </div>

            <CollapsibleContent className="space-y-2">
              <div className="border-t pt-3 mt-3">
                <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                  Conversação
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  {thread.emails.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 p-2 rounded border transition-colors cursor-pointer ${
                        !item.isRead
                          ? "bg-blue-50/50 border-blue-100"
                          : "hover:bg-muted/50"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation(); // Trava o drag na lista interna
                        setSelectedEmail(item.id);
                        if (!item.isRead) handleMarkAsRead(item.id);
                      }}
                    >
                      <UserAvatar
                        name={item.from?.emailAddress?.name}
                        email={item.from?.emailAddress?.address || ""}
                        className="h-6 w-6 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs truncate ${!item.isRead ? "font-bold" : ""}`}
                          >
                            {item.isFromMe
                              ? "Você"
                              : item.from?.emailAddress?.name}
                          </span>
                        </div>
                        <p className="text-xs truncate text-muted-foreground">
                          {item.bodyPreview}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CollapsibleContent>
          </CardContent>
        </Collapsible>
      </Card>

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
