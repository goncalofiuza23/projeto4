"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Clock, Paperclip, Settings, Mail, Users, Eye, Reply, ReplyAll, Forward } from "lucide-react"
import { useAuth } from "./auth-provider"
import { GraphService, type Email } from "@/lib/microsoft-graph"
import type { EmailMetadata } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { EmailComposer } from "./email-composer"

interface EmailViewerProps {
  email: Email
  metadata?: EmailMetadata
  isOpen: boolean
  onClose: () => void
  onOpenSettings: () => void
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

export function EmailViewer({
  email,
  metadata,
  isOpen,
  onClose,
  onOpenSettings,
  onUpdateMetadata,
  onEmailSent,
}: EmailViewerProps) {
  const { accessToken } = useAuth()
  const { toast } = useToast()
  const [fullEmail, setFullEmail] = useState<Email | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [composerMode, setComposerMode] = useState<"reply" | "replyAll" | "forward" | null>(null)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const loadFullEmail = async () => {
    if (!accessToken || !email.id) return

    setIsLoading(true)
    try {
      const graphService = new GraphService(accessToken)
      const emailData = await graphService.getEmailById(email.id)
      setFullEmail(emailData)
    } catch (error) {
      console.error("Erro ao carregar email completo:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar o conteúdo completo do email.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const markAsRead = async () => {
    if (!accessToken || !email.id) return

    try {
      const graphService = new GraphService(accessToken)
      await graphService.markAsRead(email.id)

      toast({
        title: "Email marcado como lido",
        description: "O email foi marcado como lido com sucesso.",
      })
    } catch (error) {
      console.error("Erro ao marcar email como lido:", error)
      toast({
        title: "Erro",
        description: "Não foi possível marcar o email como lido.",
        variant: "destructive",
      })
    }
  }

  const renderEmailBody = () => {
    const emailToRender = fullEmail || email

    if (emailToRender.body?.content) {
      if (emailToRender.body.contentType === "html") {
        return (
          <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: emailToRender.body.content }} />
        )
      } else {
        return <div className="whitespace-pre-wrap text-sm leading-relaxed">{emailToRender.body.content}</div>
      }
    }

    return (
      <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
        {emailToRender.bodyPreview || "Conteúdo não disponível"}
      </div>
    )
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  useEffect(() => {
    if (isOpen && email.id) {
      loadFullEmail()
    }
  }, [isOpen, email.id])

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-lg font-semibold pr-8">{email.subject || "(Sem assunto)"}</DialogTitle>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {email.from?.emailAddress?.name || email.from?.emailAddress?.address}
                </span>
                <span className="text-muted-foreground">
                  {"<"}
                  {email.from?.emailAddress?.address}
                  {">"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{formatDate(email.receivedDateTime)}</span>
              </div>

              {fullEmail?.toRecipients && fullEmail.toRecipients.length > 0 && (
                <div className="flex items-start gap-2">
                  <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <span className="text-muted-foreground text-xs">Para: </span>
                    {fullEmail.toRecipients.map((recipient, index) => (
                      <span key={index} className="text-sm">
                        {recipient.emailAddress.name || recipient.emailAddress.address}
                        {index < fullEmail.toRecipients!.length - 1 && ", "}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                {email.hasAttachments && (
                  <Badge variant="outline" className="text-xs">
                    <Paperclip className="h-3 w-3 mr-1" />
                    Anexos
                  </Badge>
                )}

                {!email.isRead && (
                  <Badge variant="secondary" className="text-xs">
                    Não lido
                  </Badge>
                )}

                {email.importance === "high" && (
                  <Badge variant="destructive" className="text-xs">
                    Alta importância
                  </Badge>
                )}

                {metadata?.priority && (
                  <Badge className={priorityColors[metadata.priority]}>
                    {priorityIcons[metadata.priority]}{" "}
                    {metadata.priority.charAt(0).toUpperCase() + metadata.priority.slice(1)}
                  </Badge>
                )}
              </div>

              {metadata?.tags && metadata.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {metadata.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </DialogHeader>

          <Separator />

          {/* Anexos */}
          {fullEmail?.attachments && fullEmail.attachments.length > 0 && (
            <>
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Anexos ({fullEmail.attachments.length})</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {fullEmail.attachments.map((attachment, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 border rounded text-sm">
                      <Paperclip className="h-4 w-4" />
                      <div className="flex-1 min-w-0">
                        <p className="truncate">{attachment.name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(attachment.size)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <Separator />
            </>
          )}

          <ScrollArea className="flex-1 px-1">
            <div className="py-4">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                renderEmailBody()
              )}
            </div>
          </ScrollArea>

          <Separator />

          <div className="flex justify-between items-center pt-4">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setComposerMode("reply")}>
                <Reply className="h-4 w-4 mr-1" />
                Responder
              </Button>
              <Button variant="outline" size="sm" onClick={() => setComposerMode("replyAll")}>
                <ReplyAll className="h-4 w-4 mr-1" />
                Responder Todos
              </Button>
              <Button variant="outline" size="sm" onClick={() => setComposerMode("forward")}>
                <Forward className="h-4 w-4 mr-1" />
                Encaminhar
              </Button>
              {!email.isRead && (
                <Button variant="outline" size="sm" onClick={markAsRead}>
                  <Eye className="h-4 w-4 mr-1" />
                  Marcar como lido
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose()
                  onOpenSettings()
                }}
              >
                <Settings className="h-4 w-4 mr-1" />
                Configurar
              </Button>
              <Button variant="outline" size="sm" onClick={onClose}>
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Composer para responder/encaminhar */}
      {composerMode && (
        <EmailComposer
          isOpen={!!composerMode}
          onClose={() => setComposerMode(null)}
          mode={composerMode}
          originalEmail={fullEmail || email}
          onEmailSent={onEmailSent}
        />
      )}
    </>
  )
}
