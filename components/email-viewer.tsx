"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Paperclip,
  Mail,
  Users,
  Eye,
  Reply,
  ReplyAll,
  Forward,
  Download,
} from "lucide-react";
import { useAuth } from "./auth-provider";
import { GraphService, type Email } from "@/lib/microsoft-graph";
import type { EmailMetadata } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { EmailComposer } from "./email-composer";

interface EmailViewerProps {
  email: Email;
  metadata?: EmailMetadata;
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void; // Mantemos na interface para não quebrar quem o chama, mas não usamos visualmente
  onUpdateMetadata: (emailId: string, updates: Partial<EmailMetadata>) => void;
  onEmailSent?: () => void;
}

const priorityColors = {
  baixa: "bg-green-50 text-green-700 border-green-200",
  media: "bg-yellow-50 text-yellow-700 border-yellow-200",
  alta: "bg-orange-50 text-orange-700 border-orange-200",
  urgente: "bg-red-50 text-red-700 border-red-200",
};

const priorityIcons = {
  baixa: "🟢",
  media: "🟡",
  alta: "🟠",
  urgente: "🔴",
};

export function EmailViewer({
  email,
  metadata,
  isOpen,
  onClose,
  onUpdateMetadata,
  onEmailSent,
}: EmailViewerProps) {
  const { accessToken } = useAuth();
  const { toast } = useToast();
  const [fullEmail, setFullEmail] = useState<Email | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [composerMode, setComposerMode] = useState<
    "reply" | "replyAll" | "forward" | null
  >(null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-PT", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const loadFullEmail = async () => {
    if (!accessToken || !email.id) return;

    setIsLoading(true);
    try {
      const graphService = new GraphService(accessToken);
      const emailData = await graphService.getEmailById(email.id);
      setFullEmail(emailData);
    } catch (error) {
      console.error("Erro ao carregar email completo:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o conteúdo completo do email.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async () => {
    if (!accessToken || !email.id) return;

    try {
      const graphService = new GraphService(accessToken);
      await graphService.markAsRead(email.id);

      // Atualiza visualmente se houver callback para o estado local
      toast({
        title: "Email lido",
        description: "Marcado como lido com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao marcar email como lido:", error);
    }
  };

  // Função para descarregar o anexo
  const handleDownloadAttachment = (attachment: any) => {
    if (attachment.contentBytes) {
      const linkSource = `data:${attachment.contentType || "application/octet-stream"};base64,${attachment.contentBytes}`;
      const downloadLink = document.createElement("a");
      downloadLink.href = linkSource;
      downloadLink.download = attachment.name;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } else {
      toast({
        title: "Erro de Download",
        description: "O conteúdo deste anexo não está disponível.",
        variant: "destructive",
      });
    }
  };

  const renderEmailBody = () => {
    const emailToRender = fullEmail || email;

    if (emailToRender.body?.content) {
      if (emailToRender.body.contentType === "html") {
        return (
          <div
            className="prose prose-sm max-w-none prose-slate"
            dangerouslySetInnerHTML={{ __html: emailToRender.body.content }}
          />
        );
      } else {
        return (
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 font-medium">
            {emailToRender.body.content}
          </div>
        );
      }
    }

    return (
      <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-500 italic">
        {emailToRender.bodyPreview || "Conteúdo não disponível"}
      </div>
    );
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

  useEffect(() => {
    if (isOpen && email.id) {
      loadFullEmail();
    }
  }, [isOpen, email.id]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-2xl gap-0 border-slate-200 shadow-2xl">
          {/* CABEÇALHO */}
          <DialogHeader className="px-8 py-6 border-b border-slate-100 bg-white space-y-4">
            <div className="flex items-start justify-between gap-4">
              <DialogTitle className="text-xl font-bold text-slate-900 leading-tight">
                {email.subject || "(Sem assunto)"}
              </DialogTitle>
            </div>

            <div className="flex flex-col gap-3 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                  {email.from?.emailAddress?.name?.charAt(0).toUpperCase() ||
                    email.from?.emailAddress?.address
                      ?.charAt(0)
                      .toUpperCase() ||
                    "M"}
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="font-bold text-slate-800">
                    {email.from?.emailAddress?.name ||
                      email.from?.emailAddress?.address}
                  </span>
                  <span className="text-xs text-slate-500">
                    {email.from?.emailAddress?.address}
                  </span>
                </div>
                <div className="ml-auto flex items-center gap-1.5 text-xs text-slate-400 font-medium bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDate(email.receivedDateTime)}
                </div>
              </div>

              {fullEmail?.toRecipients && fullEmail.toRecipients.length > 0 && (
                <div className="flex items-start gap-2 ml-10">
                  <Users className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <div className="flex-1 flex flex-wrap gap-1">
                    <span className="text-slate-400 text-xs font-semibold mr-1 mt-0.5 uppercase tracking-wider">
                      Para:
                    </span>
                    {fullEmail.toRecipients.map((recipient, index) => (
                      <span
                        key={index}
                        className="text-xs text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100"
                      >
                        {recipient.emailAddress.name ||
                          recipient.emailAddress.address}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* BADGES (Tags, Prioridade) */}
              <div className="flex items-center gap-2 flex-wrap ml-10 mt-1">
                {!email.isRead && (
                  <Badge
                    variant="default"
                    className="text-[10px] uppercase bg-blue-600"
                  >
                    Nova Mensagem
                  </Badge>
                )}

                {metadata?.priority && (
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-bold ${priorityColors[metadata.priority]}`}
                  >
                    {priorityIcons[metadata.priority]}{" "}
                    {metadata.priority.toUpperCase()}
                  </Badge>
                )}

                {metadata?.tags && metadata.tags.length > 0 && (
                  <>
                    {metadata.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="text-[10px] bg-slate-100 text-slate-600 hover:bg-slate-200 border-none font-medium"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </>
                )}
              </div>
            </div>
          </DialogHeader>

          {/* ÁREA DE CONTEÚDO (Scrollable) */}
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30">
            {/* ANEXOS */}
            {fullEmail?.attachments && fullEmail.attachments.length > 0 && (
              <div className="px-8 py-4 border-b border-slate-100 bg-white">
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                  <Paperclip className="h-3.5 w-3.5" />
                  Anexos ({fullEmail.attachments.length})
                </h4>
                <div className="flex flex-wrap gap-3">
                  {fullEmail.attachments.map((attachment, index) => (
                    <div
                      key={index}
                      onClick={() => handleDownloadAttachment(attachment)}
                      className="flex items-center gap-3 p-2.5 pr-4 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer group"
                      title="Descarregar anexo"
                    >
                      <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <Download className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-semibold text-slate-700 truncate max-w-[200px]">
                          {attachment.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {formatFileSize(attachment.size)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CORPO DO E-MAIL */}
            <div className="p-8 min-h-[300px]">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-32 text-slate-400 space-y-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="text-sm font-medium">
                    A carregar conteúdo...
                  </span>
                </div>
              ) : (
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  {renderEmailBody()}
                </div>
              )}
            </div>
          </div>

          {/* RODAPÉ E AÇÕES */}
          <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
                onClick={() => setComposerMode("reply")}
              >
                <Reply className="h-4 w-4 mr-2 text-slate-400" />
                Responder
              </Button>
              <Button
                variant="outline"
                className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
                onClick={() => setComposerMode("replyAll")}
              >
                <ReplyAll className="h-4 w-4 mr-2 text-slate-400" />
                Todos
              </Button>
              <Button
                variant="outline"
                className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
                onClick={() => setComposerMode("forward")}
              >
                <Forward className="h-4 w-4 mr-2 text-slate-400" />
                Encaminhar
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {!email.isRead && (
                <Button
                  variant="ghost"
                  className="rounded-xl text-blue-600 hover:bg-blue-50 font-medium"
                  onClick={markAsRead}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Marcar como lido
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={onClose}
                className="rounded-xl text-slate-500 hover:bg-slate-100 font-semibold"
              >
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
  );
}
