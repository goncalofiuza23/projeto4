"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Send, Paperclip, X, Loader2 } from "lucide-react"
import { useAuth } from "./auth-provider"
import { GraphService, type EmailDraft, type Email } from "@/lib/microsoft-graph"
import { useToast } from "@/hooks/use-toast"

interface EmailComposerProps {
  isOpen: boolean
  onClose: () => void
  mode: "new" | "reply" | "replyAll" | "forward"
  originalEmail?: Email
  onEmailSent?: () => void
}

export function EmailComposer({ isOpen, onClose, mode, originalEmail, onEmailSent }: EmailComposerProps) {
  const { accessToken } = useAuth()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isLoading, setIsLoading] = useState(false)
  const [emailData, setEmailData] = useState<EmailDraft>({
    subject: "",
    body: {
      contentType: "html",
      content: "",
    },
    toRecipients: [],
    ccRecipients: [],
    bccRecipients: [],
    importance: "normal",
    attachments: [],
  })

  const [attachments, setAttachments] = useState<File[]>([])
  const [toInput, setToInput] = useState("")
  const [ccInput, setCcInput] = useState("")
  const [bccInput, setBccInput] = useState("")

  // Inicializar dados baseado no modo
  useState(() => {
    if (!originalEmail) return

    let subject = originalEmail.subject || ""
    let bodyContent = ""

    switch (mode) {
      case "reply":
      case "replyAll":
        subject = subject.startsWith("Re: ") ? subject : `Re: ${subject}`
        bodyContent = `
          <br><br>
          <div style="border-left: 2px solid #ccc; padding-left: 10px; margin-left: 10px;">
            <p><strong>De:</strong> ${originalEmail.from?.emailAddress?.name || originalEmail.from?.emailAddress?.address}</p>
            <p><strong>Enviado:</strong> ${new Date(originalEmail.receivedDateTime).toLocaleString("pt-BR")}</p>
            <p><strong>Para:</strong> ${originalEmail.toRecipients?.map((r) => r.emailAddress.address).join(", ") || ""}</p>
            <p><strong>Assunto:</strong> ${originalEmail.subject}</p>
            <br>
            ${originalEmail.body?.content || originalEmail.bodyPreview}
          </div>
        `

        const replyTo = originalEmail.replyTo?.[0] || originalEmail.from
        if (mode === "reply") {
          setToInput(replyTo?.emailAddress?.address || "")
        } else {
          // Reply All
          const allRecipients = [...(originalEmail.toRecipients || []), ...(originalEmail.ccRecipients || [])].filter(
            (r) => r.emailAddress.address !== replyTo?.emailAddress?.address,
          )

          setToInput(replyTo?.emailAddress?.address || "")
          setCcInput(allRecipients.map((r) => r.emailAddress.address).join(", "))
        }
        break

      case "forward":
        subject = subject.startsWith("Fwd: ") ? subject : `Fwd: ${subject}`
        bodyContent = `
          <br><br>
          <div style="border-left: 2px solid #ccc; padding-left: 10px; margin-left: 10px;">
            <p><strong>---------- Mensagem encaminhada ----------</strong></p>
            <p><strong>De:</strong> ${originalEmail.from?.emailAddress?.name || originalEmail.from?.emailAddress?.address}</p>
            <p><strong>Data:</strong> ${new Date(originalEmail.receivedDateTime).toLocaleString("pt-BR")}</p>
            <p><strong>Assunto:</strong> ${originalEmail.subject}</p>
            <p><strong>Para:</strong> ${originalEmail.toRecipients?.map((r) => r.emailAddress.address).join(", ") || ""}</p>
            <br>
            ${originalEmail.body?.content || originalEmail.bodyPreview}
          </div>
        `
        break
    }

    setEmailData((prev) => ({
      ...prev,
      subject,
      body: {
        ...prev.body,
        content: bodyContent,
      },
    }))
  })

  const parseEmailAddresses = (input: string) => {
    return input
      .split(",")
      .map((email) => email.trim())
      .filter((email) => email.length > 0)
      .map((email) => ({
        emailAddress: {
          address: email,
        },
      }))
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setAttachments((prev) => [...prev, ...files])
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSend = async () => {
    if (!accessToken) return

    setIsLoading(true)
    try {
      const graphService = new GraphService(accessToken)

      // Preparar anexos
      const attachmentsData = await Promise.all(
        attachments.map(async (file) => ({
          "@odata.type": "#microsoft.graph.fileAttachment",
          name: file.name,
          contentBytes: await graphService.fileToBase64(file),
          contentType: file.type || "application/octet-stream",
        })),
      )

      const finalEmailData: EmailDraft = {
        ...emailData,
        toRecipients: parseEmailAddresses(toInput),
        ccRecipients: parseEmailAddresses(ccInput),
        bccRecipients: parseEmailAddresses(bccInput),
        attachments: attachmentsData,
      }

      switch (mode) {
        case "new":
          await graphService.sendEmail(finalEmailData)
          break
        case "reply":
          await graphService.replyToEmail(originalEmail!.id, finalEmailData)
          break
        case "replyAll":
          await graphService.replyAllToEmail(originalEmail!.id, finalEmailData)
          break
        case "forward":
          await graphService.forwardEmail(originalEmail!.id, finalEmailData)
          break
      }

      toast({
        title: "Email enviado com sucesso!",
        description: `Seu email foi ${mode === "new" ? "enviado" : mode === "reply" || mode === "replyAll" ? "respondido" : "encaminhado"} com sucesso.`,
      })

      // Chamar callback para atualizar a lista de emails
      if (onEmailSent) {
        onEmailSent()
      }

      onClose()
    } catch (error) {
      console.error("Erro ao enviar email:", error)
      toast({
        title: "Erro ao enviar email",
        description: error instanceof Error ? error.message : "Ocorreu um erro inesperado.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getTitle = () => {
    switch (mode) {
      case "reply":
        return "Responder Email"
      case "replyAll":
        return "Responder para Todos"
      case "forward":
        return "Encaminhar Email"
      default:
        return "Novo Email"
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Destinatários */}
          <div className="space-y-3">
            <div>
              <Label htmlFor="to">Para *</Label>
              <Input
                id="to"
                value={toInput}
                onChange={(e) => setToInput(e.target.value)}
                placeholder="destinatario@exemplo.com, outro@exemplo.com"
                required
              />
            </div>

            <Tabs defaultValue="basic" className="w-full">
              <TabsList>
                <TabsTrigger value="basic">Básico</TabsTrigger>
                <TabsTrigger value="advanced">Avançado</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-3">
                <div>
                  <Label htmlFor="subject">Assunto *</Label>
                  <Input
                    id="subject"
                    value={emailData.subject}
                    onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                    placeholder="Assunto do email"
                    required
                  />
                </div>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-3">
                <div>
                  <Label htmlFor="cc">CC (Cópia)</Label>
                  <Input
                    id="cc"
                    value={ccInput}
                    onChange={(e) => setCcInput(e.target.value)}
                    placeholder="cc@exemplo.com, outro-cc@exemplo.com"
                  />
                </div>

                <div>
                  <Label htmlFor="bcc">CCO (Cópia Oculta)</Label>
                  <Input
                    id="bcc"
                    value={bccInput}
                    onChange={(e) => setBccInput(e.target.value)}
                    placeholder="bcc@exemplo.com, outro-bcc@exemplo.com"
                  />
                </div>

                <div>
                  <Label htmlFor="importance">Importância</Label>
                  <Select
                    value={emailData.importance}
                    onValueChange={(value: "low" | "normal" | "high") =>
                      setEmailData({ ...emailData, importance: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">🟢 Baixa</SelectItem>
                      <SelectItem value="normal">🟡 Normal</SelectItem>
                      <SelectItem value="high">🔴 Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="subject">Assunto *</Label>
                  <Input
                    id="subject"
                    value={emailData.subject}
                    onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                    placeholder="Assunto do email"
                    required
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Anexos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Anexos</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Paperclip className="h-4 w-4 mr-2" />
                Adicionar Anexo
              </Button>
            </div>

            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />

            {attachments.length > 0 && (
              <div className="space-y-2">
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-2">
                      <Paperclip className="h-4 w-4" />
                      <span className="text-sm">{file.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {formatFileSize(file.size)}
                      </Badge>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeAttachment(index)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Corpo do email */}
          <div>
            <Label htmlFor="body">Mensagem *</Label>
            <Textarea
              id="body"
              value={emailData.body.content}
              onChange={(e) =>
                setEmailData({
                  ...emailData,
                  body: { ...emailData.body, content: e.target.value },
                })
              }
              placeholder="Digite sua mensagem aqui..."
              className="min-h-64"
              required
            />
          </div>
        </div>

        {/* Botões de ação */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {attachments.length > 0 && `${attachments.length} anexo(s) adicionado(s)`}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button onClick={handleSend} disabled={isLoading || !toInput.trim() || !emailData.subject.trim()}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              {mode === "new" ? "Enviar" : mode === "reply" || mode === "replyAll" ? "Responder" : "Encaminhar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
