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
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Send,
  Paperclip,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  PenTool,
  Trash2,
  Bold,
  Italic,
  Underline,
  List as ListIcon,
  ListOrdered,
  Highlighter,
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
  onSendStart?: () => void;
}

interface Signature {
  id: string;
  name: string;
  content: string;
}

export function EmailComposer({
  isOpen,
  onClose,
  mode,
  originalEmail,
  onEmailSent,
  onSendStart,
}: EmailComposerProps) {
  const { accessToken } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [emailData, setEmailData] = useState<EmailDraft>({
    subject: "",
    body: { contentType: "html", content: "" },
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

  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    insertUnorderedList: false,
    insertOrderedList: false,
  });

  const checkFormattingState = () => {
    if (!editorRef.current) return;
    setActiveFormats({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      insertUnorderedList: document.queryCommandState("insertUnorderedList"),
      insertOrderedList: document.queryCommandState("insertOrderedList"),
    });
  };

  // --- GESTÃO DE ASSINATURAS ---
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [isSignManagerOpen, setIsSignManagerOpen] = useState(false);
  const [newSigName, setNewSigName] = useState("");
  const [newSigContent, setNewSigContent] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("email_signatures");
    if (saved) {
      try {
        setSignatures(JSON.parse(saved));
      } catch (e) {
        setSignatures([]);
      }
    }
  }, []);

  const saveSignature = () => {
    if (!newSigName.trim() || !newSigContent.trim()) return;

    const newSignature: Signature = {
      id: Date.now().toString(),
      name: newSigName.trim(),
      content: newSigContent.trim(),
    };

    const updatedSignatures = [...signatures, newSignature];
    setSignatures(updatedSignatures);
    localStorage.setItem("email_signatures", JSON.stringify(updatedSignatures));

    setNewSigName("");
    setNewSigContent("");

    toast({
      title: "Assinatura Guardada",
      description: `A assinatura "${newSignature.name}" foi guardada e já pode ser utilizada.`,
    });
  };

  const deleteSignature = (id: string) => {
    const updatedSignatures = signatures.filter((sig) => sig.id !== id);
    setSignatures(updatedSignatures);
    localStorage.setItem("email_signatures", JSON.stringify(updatedSignatures));
    
    toast({
      title: "Assinatura Removida",
      description: "A assinatura foi eliminada com sucesso.",
    });
  };

  const insertSignature = (content: string) => {
    const htmlContent = content.replace(/\n/g, "<br>");
    
    if (editorRef.current) {
      const currentHtml = editorRef.current.innerHTML;
      const spacer = currentHtml ? "<br><br>" : "";
      const newHtml = currentHtml + spacer + htmlContent;
      
      editorRef.current.innerHTML = newHtml;
      setEmailData((prev) => ({
        ...prev,
        body: {
          ...prev.body,
          content: newHtml,
        },
      }));
    }
  };
  // -----------------------------

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
        if (editorRef.current) editorRef.current.innerHTML = "";
      }
      return;
    }

    let subject = originalEmail.subject || "";
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
    
    if (editorRef.current) {
      editorRef.current.innerHTML = bodyContent;
    }
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

  // 👇 Atualizada para suportar valores de formatação (Fontes, Tamanhos e Cores)
  const executeCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    checkFormattingState();
    handleEditorInput();
  };

  const handleEditorInput = () => {
    if (editorRef.current) {
      setEmailData((prev) => ({
        ...prev,
        body: {
          ...prev.body,
          content: editorRef.current.innerHTML,
        },
      }));
      checkFormattingState();
    }
  };

  const handleSend = async () => {
    if (!accessToken || isLoading) return;
    
    setIsLoading(true);

    if (onSendStart) onSendStart();

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
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent 
          className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-2xl gap-0 border-slate-200"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <DialogHeader className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              {mode === "new" ? "✏️" : "✉️"} {getTitle()}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
            <div className="p-6 space-y-4 flex-1 flex flex-col">
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
                <div className="border border-slate-200 rounded-xl bg-white flex flex-col flex-1 overflow-hidden shadow-sm">
                  
                  {/* 👇 BARRA DE FERRAMENTAS COM FONTES E CORES 👇 */}
                  <div className="flex flex-wrap items-center gap-1 p-2 border-b border-slate-100 bg-slate-50/80">
                    
                    {/* Fonte */}
                    <Select onValueChange={(value) => executeCommand("fontName", value)}>
                      <SelectTrigger className="h-8 w-[130px] text-xs border-transparent bg-transparent shadow-none hover:bg-slate-200 focus:ring-0 px-2 transition-colors">
                        <SelectValue placeholder="Fonte" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Arial">Arial</SelectItem>
                        <SelectItem value="Verdana">Verdana</SelectItem>
                        <SelectItem value="Helvetica">Helvetica</SelectItem>
                        <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                        <SelectItem value="Courier New">Courier</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Tamanho */}
                    <Select onValueChange={(value) => executeCommand("fontSize", value)}>
                      <SelectTrigger className="h-8 w-[80px] text-xs border-transparent bg-transparent shadow-none hover:bg-slate-200 focus:ring-0 px-2 transition-colors">
                        <SelectValue placeholder="Tam." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">10 pt</SelectItem>
                        <SelectItem value="2">13 pt</SelectItem>
                        <SelectItem value="3">16 pt</SelectItem>
                        <SelectItem value="4">18 pt</SelectItem>
                        <SelectItem value="5">24 pt</SelectItem>
                        <SelectItem value="6">32 pt</SelectItem>
                        <SelectItem value="7">48 pt</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="w-px h-5 bg-slate-300 mx-1" />

                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      className={`h-8 w-8 p-0 rounded-md transition-colors ${activeFormats.bold ? "bg-slate-200 text-slate-900 shadow-inner" : "text-slate-600 hover:bg-slate-200"}`} 
                      onMouseDown={(e) => { e.preventDefault(); executeCommand('bold'); }}
                    >
                      <Bold className="h-4 w-4" />
                    </Button>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      className={`h-8 w-8 p-0 rounded-md transition-colors ${activeFormats.italic ? "bg-slate-200 text-slate-900 shadow-inner" : "text-slate-600 hover:bg-slate-200"}`} 
                      onMouseDown={(e) => { e.preventDefault(); executeCommand('italic'); }}
                    >
                      <Italic className="h-4 w-4" />
                    </Button>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      className={`h-8 w-8 p-0 rounded-md transition-colors ${activeFormats.underline ? "bg-slate-200 text-slate-900 shadow-inner" : "text-slate-600 hover:bg-slate-200"}`} 
                      onMouseDown={(e) => { e.preventDefault(); executeCommand('underline'); }}
                    >
                      <Underline className="h-4 w-4" />
                    </Button>
                    
                    <div className="w-px h-5 bg-slate-300 mx-1" />

                    {/* Cor do Texto (Forecolor) */}
                    <div className="relative flex items-center justify-center w-8 h-8 rounded-md hover:bg-slate-200 overflow-hidden cursor-pointer" title="Cor do Texto">
                      <span className="font-serif font-bold text-slate-700 pointer-events-none z-10 text-[15px] border-b-[3px] border-red-500 leading-none pb-0.5">A</span>
                      <input 
                        type="color" 
                        className="absolute inset-0 w-[200%] h-[200%] -top-2 -left-2 cursor-pointer opacity-0 z-20" 
                        onChange={(e) => executeCommand("foreColor", e.target.value)} 
                      />
                    </div>

                    {/* Cor de Fundo / Marcador (HiliteColor) */}
                    <div className="relative flex items-center justify-center w-8 h-8 rounded-md hover:bg-slate-200 overflow-hidden cursor-pointer" title="Cor de Destaque">
                      <Highlighter className="h-[18px] w-[18px] text-slate-700 pointer-events-none z-10" />
                      <input 
                        type="color" 
                        className="absolute inset-0 w-[200%] h-[200%] -top-2 -left-2 cursor-pointer opacity-0 z-20" 
                        onChange={(e) => executeCommand("hiliteColor", e.target.value)} 
                      />
                    </div>
                    
                    <div className="w-px h-5 bg-slate-300 mx-1" />
                    
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      className={`h-8 w-8 p-0 rounded-md transition-colors ${activeFormats.insertUnorderedList ? "bg-slate-200 text-slate-900 shadow-inner" : "text-slate-600 hover:bg-slate-200"}`} 
                      onMouseDown={(e) => { e.preventDefault(); executeCommand('insertUnorderedList'); }}
                    >
                      <ListIcon className="h-4 w-4" />
                    </Button>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      className={`h-8 w-8 p-0 rounded-md transition-colors ${activeFormats.insertOrderedList ? "bg-slate-200 text-slate-900 shadow-inner" : "text-slate-600 hover:bg-slate-200"}`} 
                      onMouseDown={(e) => { e.preventDefault(); executeCommand('insertOrderedList'); }}
                    >
                      <ListOrdered className="h-4 w-4" />
                    </Button>
                  </div>

                  <div
                    ref={editorRef}
                    className="flex-1 p-4 focus-visible:outline-none text-sm text-slate-700 overflow-y-auto [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:ml-5 [&_ol]:my-2 [&_li]:mt-1"
                    contentEditable
                    onInput={handleEditorInput}
                    onKeyUp={checkFormattingState}
                    onMouseUp={checkFormattingState}
                    style={{ minHeight: "200px" }}
                    data-placeholder="Escreva a sua mensagem aqui..."
                  />
                </div>
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
            <div className="flex items-center gap-2">
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
                Anexar
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-500 hover:text-slate-900 rounded-xl font-medium"
                  >
                    <PenTool className="h-4 w-4 mr-2" />
                    Assinatura
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 rounded-xl">
                  {signatures.length === 0 ? (
                    <div className="px-2 py-3 text-xs text-slate-400 text-center">
                      Nenhuma assinatura
                    </div>
                  ) : (
                    signatures.map((sig) => (
                      <DropdownMenuItem
                        key={sig.id}
                        onClick={() => insertSignature(sig.content)}
                        className="cursor-pointer"
                      >
                        {sig.name}
                      </DropdownMenuItem>
                    ))
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setIsSignManagerOpen(true)}
                    className="cursor-pointer font-medium text-blue-600 focus:text-blue-700"
                  >
                    + Gerir Assinaturas
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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

      <Dialog open={isSignManagerOpen} onOpenChange={setIsSignManagerOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Gerir Assinaturas</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-2">
            {signatures.length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                <label className="text-xs font-bold text-slate-500 uppercase">
                  Assinaturas Guardadas
                </label>
                {signatures.map((sig) => (
                  <div
                    key={sig.id}
                    className="flex items-center justify-between bg-slate-50 border border-slate-100 p-2 pl-3 rounded-xl"
                  >
                    <span className="text-sm font-medium text-slate-700">
                      {sig.name}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteSignature(sig.id)}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3 pt-4 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-500 uppercase">
                Criar Nova Assinatura
              </label>
              <Input
                placeholder="Nome (ex: IPVC, Pessoal, Inglês...)"
                value={newSigName}
                onChange={(e) => setNewSigName(e.target.value)}
                className="h-10 rounded-xl bg-slate-50 border-slate-200 shadow-none"
              />
              <Textarea
                placeholder="Escreva o texto da sua assinatura aqui..."
                value={newSigContent}
                onChange={(e) => setNewSigContent(e.target.value)}
                className="min-h-[120px] rounded-xl bg-slate-50 border-slate-200 resize-none shadow-none text-sm"
              />
              <Button
                onClick={saveSignature}
                disabled={!newSigName.trim() || !newSigContent.trim()}
                className="w-full h-10 rounded-xl bg-blue-600 text-white hover:bg-blue-700 font-bold"
              >
                Guardar Assinatura
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}