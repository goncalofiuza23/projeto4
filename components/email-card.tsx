"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Clock, Paperclip, Settings, Send } from "lucide-react";
import type { Email } from "@/lib/microsoft-graph";
import type { EmailMetadata } from "@/lib/supabase";
import { EmailViewer } from "./email-viewer";
import { useState } from "react";
import { useLanguage } from "./language-provider";

interface EmailCardProps {
  email: Email;
  metadata?: EmailMetadata;
  onUpdateMetadata: (emailId: string, updates: Partial<EmailMetadata>) => void;
}

const priorityColors = {
  baixa: "bg-green-100 text-green-800",
  media: "bg-yellow-100 text-yellow-800",
  alta: "bg-orange-100 text-orange-800",
  urgente: "bg-red-100 text-red-800",
};

const priorityIcons = {
  baixa: "🟢",
  media: "🟡",
  alta: "🟠",
  urgente: "🔴",
};

export function EmailCard({
  email,
  metadata,
  onUpdateMetadata,
}: EmailCardProps) {
  const { t, language } = useLanguage();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [priority, setPriority] = useState<EmailMetadata["priority"]>(metadata?.priority || "media");
  const [tags, setTags] = useState(metadata?.tags || []);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      const updatedTags = [...tags, newTag.trim()];
      setTags(updatedTags);
      onUpdateMetadata(email.id, { tags: updatedTags });
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updatedTags = tags.filter((tag) => tag !== tagToRemove);
    setTags(updatedTags);
    onUpdateMetadata(email.id, { tags: updatedTags });
  };

  const handlePriorityChange = (newPriority: string) => {
    setPriority(newPriority as EmailMetadata["priority"]);
    onUpdateMetadata(email.id, {
      priority: newPriority as EmailMetadata["priority"],
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(
      language === "en" ? "en-US" : "pt-PT", 
      {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  };

  const isEmailSent = email.folderType === "sent" || (email as any).isFromMe;

  return (
    <div>
      <Card className="mb-3 cursor-pointer hover:shadow-lg transition-all duration-200 border-l-4 border-l-transparent hover:border-l-blue-500 group">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div
              className="flex-1 min-w-0"
              onClick={() => setIsViewDialogOpen(true)}
            >
              <h3
                className="font-medium text-sm truncate hover:text-blue-600 transition-colors"
                title={email.subject}
              >
                {email.subject || t("no_subject")}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {isEmailSent ? (
                  <>
                    {t("to_prefix")}{" "}
                    {email.toRecipients?.[0]?.emailAddress?.name ||
                      email.toRecipients?.[0]?.emailAddress?.address}
                  </>
                ) : (
                  <>
                    {t("from_prefix")}{" "}
                    {email.from?.emailAddress?.name ||
                      email.from?.emailAddress?.address}
                  </>
                )}
              </p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Settings className="h-3 w-3" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{t("email_settings")}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="priority">{t("priority_label")}</Label>
                    <Select
                      value={priority}
                      onValueChange={handlePriorityChange}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="baixa">🟢 {t("priority_low")}</SelectItem>
                        <SelectItem value="media">🟡 {t("priority_medium")}</SelectItem>
                        <SelectItem value="alta">🟠 {t("priority_high")}</SelectItem>
                        <SelectItem value="urgente">🔴 {t("priority_urgent")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="tags">{t("tags_label")}</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        placeholder={t("new_tag_placeholder")}
                        onKeyPress={(e) => e.key === "Enter" && handleAddTag()}
                      />
                      <Button onClick={handleAddTag} size="sm">
                        {t("add_btn")}
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
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {email.bodyPreview}
          </p>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDate(email.receivedDateTime)}
              </div>
              {email.hasAttachments && <Paperclip className="h-3 w-3" />}
              {!email.isRead && (
                <Badge variant="secondary" className="text-xs">
                  {t("badge_new")}
                </Badge>
              )}
              {isEmailSent && (
                <Badge variant="outline" className="text-xs">
                  <Send className="h-3 w-3 mr-1" />
                  {t("badge_sent")}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1">
              <span className="text-xs">{priorityIcons[priority as keyof typeof priorityIcons]}</span>
            </div>
          </div>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      <EmailViewer
        email={email}
        metadata={metadata}
        isOpen={isViewDialogOpen}
        onClose={() => setIsViewDialogOpen(false)}
        onOpenSettings={() => setIsDialogOpen(true)}
        onUpdateMetadata={onUpdateMetadata}
        hideArchiveButton={
          email.folderType === "archive" || 
          (typeof window !== "undefined" && window.location.href.toLowerCase().includes("arquivad")) ||
          JSON.stringify(metadata || {}).toLowerCase().includes("arquivad")
        }
      />
    </div>
  );
}