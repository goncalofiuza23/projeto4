"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Clock, Paperclip, ChevronDown, ChevronRight, Users, Mail, Settings } from "lucide-react"
import type { EmailThread } from "@/lib/microsoft-graph"
import type { EmailMetadata } from "@/lib/supabase"
import { EmailViewer } from "./email-viewer"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface EmailThreadCardProps {
  thread: EmailThread
  emailsMetadata: Record<string, EmailMetadata>
  onUpdateMetadata: (emailId: string, updates: Partial<EmailMetadata>) => void
  onEmailSent?: () => void
}

const priorityColors = {
  baixa: "bg-green-100 text-green-800",
  media: "bg-yellow-100 text-yellow-800",
  alta: "bg-orange-100 text-orange-800",
  urgente: "bg-red-100 text-red-800",
}

const priorityIcons = {
  baixa: "🟢",
  media: "🟡",
  alta: "🟠",
  urgente: "🔴",
}

export function EmailThreadCard({ thread, emailsMetadata, onUpdateMetadata, onEmailSent }: EmailThreadCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [newTag, setNewTag] = useState("")
  const [priority, setPriority] = useState("media")
  const [tags, setTags] = useState<string[]>([])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getInitials = (email: string) => {
    return email.split("@")[0].charAt(0).toUpperCase()
  }

  const getParticipantsDisplay = () => {
    if (thread.participants.length <= 2) {
      return thread.participants.join(", ")
    }
    return `${thread.participants.slice(0, 2).join(", ")} +${thread.participants.length - 2}`
  }

  // Email mais recente (último da thread)
  const latestEmail = thread.emails[thread.emails.length - 1]
  const latestMetadata = emailsMetadata[latestEmail.id]

  // Verificar se há anexos na thread
  const hasAttachments = thread.emails.some((email) => email.hasAttachments)

  // Obter todas as tags da thread
  const allTags = new Set<string>()
  thread.emails.forEach((email) => {
    const metadata = emailsMetadata[email.id]
    if (metadata?.tags) {
      metadata.tags.forEach((tag) => allTags.add(tag))
    }
  })

  // Obter prioridade mais alta da thread
  const priorities = ["urgente", "alta", "media", "baixa"]
  let highestPriority = "media"
  thread.emails.forEach((email) => {
    const metadata = emailsMetadata[email.id]
    if (metadata?.priority) {
      const currentIndex = priorities.indexOf(metadata.priority)
      const highestIndex = priorities.indexOf(highestPriority)
      if (currentIndex < highestIndex) {
        highestPriority = metadata.priority
      }
    }
  })

  const selectedEmailData = selectedEmail ? thread.emails.find((e) => e.id === selectedEmail) : null

  // Inicializar configurações com base no primeiro email da thread
  useState(() => {
    const firstEmailMetadata = emailsMetadata[thread.emails[0]?.id]
    if (firstEmailMetadata) {
      setPriority(firstEmailMetadata.priority)
      setTags(firstEmailMetadata.tags)
    }
  })

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      const updatedTags = [...tags, newTag.trim()]
      setTags(updatedTags)
      // Aplicar a todos os emails da thread
      thread.emails.forEach((email) => {
        onUpdateMetadata(email.id, { tags: updatedTags })
      })
      setNewTag("")
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    const updatedTags = tags.filter((tag) => tag !== tagToRemove)
    setTags(updatedTags)
    // Aplicar a todos os emails da thread
    thread.emails.forEach((email) => {
      onUpdateMetadata(email.id, { tags: updatedTags })
    })
  }

  const handlePriorityChange = (newPriority: string) => {
    setPriority(newPriority as EmailMetadata["priority"])
    // Aplicar a todos os emails da thread
    thread.emails.forEach((email) => {
      onUpdateMetadata(email.id, { priority: newPriority as EmailMetadata["priority"] })
    })
  }

  return (
    <>
      <Card className="mb-3 cursor-pointer hover:shadow-lg transition-all duration-200 border-l-4 hover:border-l-blue-500 group">
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <h3
                    className="font-medium text-sm truncate hover:text-blue-600 transition-colors flex-1"
                    title={thread.subject}
                    onClick={() => setSelectedEmail(latestEmail.id)}
                  >
                    {thread.subject}
                  </h3>
                  {thread.totalEmails > 1 && (
                    <Badge variant="secondary" className="text-xs">
                      {thread.totalEmails - 1}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <Users className="h-3 w-3" />
                  <span className="truncate">{getParticipantsDisplay()}</span>
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2">{latestEmail.bodyPreview}</p>
              </div>

              <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
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
                    <DialogTitle>Configurações da Conversa</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="priority">Prioridade</Label>
                      <Select value={priority} onValueChange={handlePriorityChange}>
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
                          onKeyPress={(e) => e.key === "Enter" && handleAddTag()}
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
          </CardHeader>

          <CardContent className="pt-0">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDate(thread.lastActivity)}
                </div>
                {hasAttachments && <Paperclip className="h-3 w-3" />}
                {thread.hasUnread && (
                  <Badge variant="secondary" className="text-xs">
                    Novo
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-1">
                <span className="text-xs">{priorityIcons[highestPriority as keyof typeof priorityIcons]}</span>
              </div>
            </div>

            {Array.from(allTags).length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {Array.from(allTags)
                  .slice(0, 3)
                  .map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                {Array.from(allTags).length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{Array.from(allTags).length - 3}
                  </Badge>
                )}
              </div>
            )}

            {/* Lista expandida de emails na thread */}
            <CollapsibleContent className="space-y-2">
              <div className="border-t pt-3 mt-3">
                <h4 className="text-sm font-medium mb-2">Conversação ({thread.totalEmails - 1} emails)</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {/* Filtrando emails com IDs únicos antes de mapear */}
                  {thread.emails
                    .filter((email, index, self) => 
                      index === self.findIndex((e) => e.id === email.id)
                    )
                    .map((email, index) => (
                      <div
                        key={email.id}
                        className="flex items-center gap-3 p-2 rounded border hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => setSelectedEmail(email.id)}
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {getInitials(email.from?.emailAddress?.address || "")}
                          </AvatarFallback>
                        </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium truncate">
                            {email.isFromMe
                              ? "Você"
                              : email.from?.emailAddress?.name || email.from?.emailAddress?.address}
                          </span>
                          {email.isFromMe && <Mail className="h-3 w-3 text-blue-500" />}
                          {!email.isRead && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{email.bodyPreview}</p>
                      </div>
                      <div className="text-xs text-muted-foreground">{formatDate(email.receivedDateTime)}</div>
                    </div>
                    ))}
                </div>
              </div>
            </CollapsibleContent>
          </CardContent>
        </Collapsible>
      </Card>

      {/* Viewer para email selecionado */}
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
  )
}
