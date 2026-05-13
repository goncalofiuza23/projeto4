"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Send,
  Paperclip,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useAuth } from "./auth-provider";
import {
  GraphService,
  type EmailDraft,
  type Email,
} from "@/lib/microsoft-graph";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast"; 

function UndoCountdown() {
  const [timeLeft, setTimeLeft] = useState(10);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  return (
    <span>
      Tem <strong className="font-bold">{timeLeft}</strong> {timeLeft === 1 ? "segundo" : "segundos"} para anular o envio.
    </span>
  );
}

interface EmailComposerProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "new" | "reply" | "replyAll" | "forward";
  originalEmail?: Email;
  onEmailSent?: () => void;
}

export function EmailComposer({
  isOpen,
  onClose,
  mode,
  originalEmail,
  onEmailSent,
}: EmailComposerProps) {
  const { accessToken } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
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
  });

  const [attachments, setAttachments] = useState<File[]>([]);
  const [toInput, setToInput] = useState("");
  const [ccInput, setCcInput] = useState("");
  const [bccInput, setBccInput] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    if (!originalEmail) {
      if (mode === "new") {
        setToInput("");
        setCcInput("");
        setBccInput("");
        setAttachments([]);
        setEmailData({
          subject: "",
          body: { contentType: "html", content: "" },
          toRecipients: [],
          ccRecipients: [],
          bccRecipients: [],
          importance: "normal",
          attachments: [],
        });
      }
      return;
    }

    let subject = originalEmail.subject || "";
    // O body Content começa sempre limpo para nós escrevermos apenas a resposta nova!
    let bodyContent = ""; 

    switch (mode) {
      case "reply":
      case "replyAll":
        subject = subject.startsWith("Re: ") ? subject : `Re: ${subject}`;

        const replyTo = originalEmail.replyTo?.[0] || originalEmail.from;
        if (mode === "reply") {
          setToInput(replyTo?.emailAddress?.address || "");
        } else {
          const allRecipients = [
            ...(originalEmail.toRecipients || []),
            ...(originalEmail.ccRecipients || []),
          ].filter(
            (r) => r.emailAddress.address !== replyTo?.emailAddress?.address,
          );

          setToInput(replyTo?.emailAddress?.address || "");
          setCcInput(
            allRecipients.map((r) => r.emailAddress.address).join(", "),
          );
          if (allRecipients.length > 0) setShowAdvanced(true);
        }
        break;

      case "forward":
        subject = subject.startsWith("Fwd: ") ? subject : `Fwd: ${subject}`;
        break;
    }

    setEmailData((prev) => ({
      ...prev,
      subject,
      body: {
        ...prev.body,
        content: bodyContent,
      },
    }));
  }, [isOpen, originalEmail, mode]);

  const parseEmailAddresses = (input: string) => {
    return input
      .split(",")
      .map((email) => email.trim())
      .filter((email) => email.length > 0)
      .map((email) => ({
        emailAddress: {
          address: email,
        },
      }));
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachments((prev) => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if (!accessToken) return;

    onClose();

    const timeoutId = setTimeout(async () => {
      try {
        const graphService = new GraphService(accessToken);

        const attachmentsData = await Promise.all(
          attachments.map(async (file) => ({
            "@odata.type": "#microsoft.graph.fileAttachment",
            name: file.name,
            contentBytes: await graphService.fileToBase64(file),
            contentType: file.type || "application/octet-stream",
          })),
        );

        const finalEmailData: EmailDraft = {
          ...emailData,
          toRecipients: parseEmailAddresses(toInput),
          ccRecipients: parseEmailAddresses(ccInput),
          bccRecipients: parseEmailAddresses(bccInput),
          attachments: attachmentsData,
        };

        switch (mode) {
          case "new":
            await graphService.sendEmail(finalEmailData);
            break;
          case "reply":
            await graphService.replyToEmail(originalEmail!.id, finalEmailData);
            break;
          case "replyAll":
            await graphService.replyAllToEmail(originalEmail!.id, finalEmailData);
            break;
          case "forward":
            await graphService.forwardEmail(originalEmail!.id, finalEmailData);
            break;
        }

        toast({
          title: "Email enviado com sucesso!",
          description: "A sua mensagem foi entregue.",
          duration: 4000,
        });

        if (onEmailSent) {
          onEmailSent();
        }
      } catch (error) {
        console.error("Erro ao enviar email:", error);
        toast({
          title: "Erro ao enviar email",
          description: error instanceof Error ? error.message : "Ocorreu um erro inesperado.",
          variant: "destructive",
        });
      }
    }, 10000);

    toast({
      title: "A enviar mensagem...",
      description: <UndoCountdown />,
      duration: 10000,
      action: (
        <ToastAction 
          altText="Anular envio" 
          onClick={() => {
            clearTimeout(timeoutId);
            toast({
              title: "Envio Anulado",
              description: "O e-mail foi cancelado e não foi enviado.",
            });
          }}
        >
          Anular
        </ToastAction>
      ),
    });
  };

  const getTitle = () => {
    switch (mode) {
      case "reply":
        return "Responder";
      case "replyAll":
        return "Responder a Todos";
      case "forward":
        return "Encaminhar Email";
      default:
        return "Nova Mensagem";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (
      Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-2xl gap-0 border-slate-200"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* CABEÇALHO */}
        <DialogHeader className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
            {mode === "new" ? "✏️" : "✉️"} {getTitle()}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-4">
              <label
                htmlFor="to"
                className="w-12 pt-2.5 text-xs font-bold text-slate-400 uppercase text-right"
              >
                Para
              </label>
              <div className="flex-1">
                <Input
                  id="to"
                  value={toInput}
                  onChange={(e) => setToInput(e.target.value)}
                  placeholder="emails@exemplo.com"
                  className="h-10 rounded-xl bg-slate-50 border-slate-200 shadow-none focus-visible:ring-1 focus-visible:ring-blue-400 focus-visible:bg-white"
                  required
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-10 px-3 text-slate-500 hover:text-slate-900 rounded-xl text-xs font-medium"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                CC / CCO{" "}
                {showAdvanced ? (
                  <ChevronUp className="ml-1 h-3 w-3" />
                ) : (
                  <ChevronDown className="ml-1 h-3 w-3" />
                )}
              </Button>
            </div>

            {showAdvanced && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-200 space-y-4 pt-1">
                <div className="flex items-start gap-4">
                  <label
                    htmlFor="cc"
                    className="w-12 pt-2.5 text-xs font-bold text-slate-400 uppercase text-right"
                  >
                    Cc
                  </label>
                  <Input
                    id="cc"
                    value={ccInput}
                    onChange={(e) => setCcInput(e.target.value)}
                    className="flex-1 h-10 rounded-xl bg-slate-50 border-slate-200 shadow-none"
                  />
                </div>
                <div className="flex items-start gap-4">
                  <label
                    htmlFor="bcc"
                    className="w-12 pt-2.5 text-xs font-bold text-slate-400 uppercase text-right"
                  >
                    Cco
                  </label>
                  <Input
                    id="bcc"
                    value={bccInput}
                    onChange={(e) => setBccInput(e.target.value)}
                    className="flex-1 h-10 rounded-xl bg-slate-50 border-slate-200 shadow-none"
                  />
                </div>
                <div className="flex items-start gap-4">
                  <label className="w-12 pt-2.5 text-xs font-bold text-slate-400 uppercase text-right">
                    Grau
                  </label>
                  <div className="flex-1">
                    <Select
                      value={emailData.importance}
                      onValueChange={(value: "low" | "normal" | "high") =>
                        setEmailData({ ...emailData, importance: value })
                      }
                    >
                      <SelectTrigger className="w-[180px] h-10 rounded-xl bg-slate-50 border-slate-200 shadow-none">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="low">
                          🟢 Baixa Importância
                        </SelectItem>
                        <SelectItem value="normal">🟡 Normal</SelectItem>
                        <SelectItem value="high">
                          🔴 Alta Importância
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            <div className="border-t border-slate-100 ml-16" />

            <div className="flex items-start gap-4">
              <label
                htmlFor="subject"
                className="w-12 pt-2.5 text-xs font-bold text-slate-400 uppercase text-right"
              >
                Tema
              </label>
              <Input
                id="subject"
                value={emailData.subject}
                onChange={(e) =>
                  setEmailData({ ...emailData, subject: e.target.value })
                }
                placeholder="Assunto da mensagem"
                className="flex-1 h-10 rounded-xl bg-slate-50 border-slate-200 shadow-none font-medium focus-visible:ring-1 focus-visible:ring-blue-400 focus-visible:bg-white"
                required
              />
            </div>

            <div className="pt-2 flex-1 flex flex-col min-h-[300px]">
              <Textarea
                id="body"
                value={emailData.body.content
                  .replace(/<br\s*\/?>/gi, "\n")
                  .replace(/<\/p>|<\/div>|<\/li>|<\/h[1-6]>/gi, "\n")
                  .replace(/<hr\s*\/?>/gi, "\n________________________________________\n")
                  .replace(/<[^>]*>?/gm, "")
                  .replace(/&nbsp;/g, " ")
                } 
                onChange={(e) =>
                  setEmailData({
                    ...emailData,
                    body: {
                      ...emailData.body,
                      content: e.target.value.replace(/\n/g, "<br>"),
                    },
                  })
                }
                placeholder="Escreva a sua mensagem aqui..."
                className="flex-1 resize-none border-0 shadow-none bg-transparent p-0 text-sm focus-visible:ring-0 placeholder:text-slate-300"
                required
              />
            </div>

            {attachments.length > 0 && (
              <div className="pt-4 border-t border-slate-100 flex gap-2 flex-wrap">
                {attachments.map((file, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="pl-2 pr-1 py-1.5 h-auto bg-slate-100 text-slate-700 hover:bg-slate-200 gap-2 rounded-lg font-medium"
                  >
                    <Paperclip className="h-3 w-3 text-slate-400" />
                    <span className="truncate max-w-[150px] text-xs">
                      {file.name}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      ({formatFileSize(file.size)})
                    </span>
                    <div
                      className="h-5 w-5 bg-slate-200/50 hover:bg-red-100 hover:text-red-600 rounded-md flex items-center justify-center cursor-pointer transition-colors ml-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeAttachment(index);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </div>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="text-slate-500 hover:text-slate-900 rounded-xl font-medium"
            >
              <Paperclip className="h-4 w-4 mr-2" />
              Anexar Ficheiro
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={isLoading}
              className="rounded-xl font-semibold text-slate-500 hover:bg-slate-200/50"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSend}
              disabled={
                isLoading || !toInput.trim() || !emailData.subject.trim()
              }
              className="rounded-xl px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-200"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {mode === "new" ? "Enviar Mensagem" : "Responder"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}