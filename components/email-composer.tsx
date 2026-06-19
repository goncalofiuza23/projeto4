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
  Image as ImageIcon,
  Archive,
  Clock,
} from "lucide-react";
import { useAuth } from "./auth-provider";
import { useLanguage } from "./language-provider";
import {
  GraphService,
  type EmailDraft,
  type Email,
} from "@/lib/microsoft-graph";
import {
  supabase,
  isSupabaseAvailable,
  safeSupabaseOperation,
} from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";

interface ContactSuggestion {
  name: string;
  email: string;
}

function AutocompleteEmailInput({ 
  id, 
  value, 
  onChange, 
  placeholder, 
  required, 
  accessToken 
}: { 
  id?: string, 
  value: string, 
  onChange: (val: string) => void, 
  placeholder?: string, 
  required?: boolean, 
  accessToken: string | null 
}) {
  const { t } = useLanguage();
  const [suggestions, setSuggestions] = useState<ContactSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const chips = value.split(',').map(s => s.trim()).filter(s => s.length > 0);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const currentTerm = inputValue.trim().toLowerCase();

    if (currentTerm.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsOpen(true);
    setIsLoading(true);

    const timeoutId = setTimeout(async () => {
      let localMatches: ContactSuggestion[] = [];
      try {
        const saved = localStorage.getItem("recent_sent_contacts");
        if (saved) {
          const parsed: ContactSuggestion[] = JSON.parse(saved);
          localMatches = parsed.filter(c => 
            c.email.toLowerCase().includes(currentTerm) || 
            c.name.toLowerCase().includes(currentTerm)
          );
        }
      } catch (e) {}

      if (!accessToken) {
        setSuggestions(localMatches);
        setIsLoading(false);
        return;
      }
      
      try {
        let apiMatches: ContactSuggestion[] = [];

        const resPeople = await fetch(`https://graph.microsoft.com/v1.0/me/people?$search=${encodeURIComponent(currentTerm)}&$top=5`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        
        if (resPeople.ok) {
          const dataPeople = await resPeople.json();
          if (dataPeople && dataPeople.value) {
            apiMatches = dataPeople.value
              .filter((p: any) => p.scoredEmailAddresses && p.scoredEmailAddresses.length > 0)
              .map((p: any) => ({
                name: p.displayName || p.scoredEmailAddresses[0].address,
                email: p.scoredEmailAddresses[0].address
              }));
          }
        }

        if (apiMatches.length === 0) {
          const resUsers = await fetch(`https://graph.microsoft.com/v1.0/users?$filter=startswith(displayName,'${encodeURIComponent(currentTerm)}') or startswith(mail,'${encodeURIComponent(currentTerm)}')&$top=5`, {
            headers: { 
              Authorization: `Bearer ${accessToken}`,
              ConsistencyLevel: "eventual" 
            }
          });
          
          if (resUsers.ok) {
            const dataUsers = await resUsers.json();
            if (dataUsers && dataUsers.value) {
              apiMatches = dataUsers.value
                .filter((u: any) => u.mail)
                .map((u: any) => ({
                  name: u.displayName || u.mail,
                  email: u.mail
                }));
            }
          }
        }

        const combined = [...localMatches, ...apiMatches];
        const unique = combined.filter((item, index, self) =>
          index === self.findIndex((t) => t.email.toLowerCase() === item.email.toLowerCase())
        );

        setSuggestions(unique.slice(0, 6));
      } catch (e) {
        setSuggestions(localMatches);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [inputValue, accessToken]);

  const handleSelect = (contact: ContactSuggestion) => {
    const formattedStr = contact.name && contact.name !== contact.email && !contact.name.includes('@')
      ? `${contact.name} <${contact.email}>`
      : contact.email;
      
    const newChips = [...chips, formattedStr];
    onChange(newChips.join(', ')); 
    
    setInputValue("");
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleRemove = (indexToRemove: number) => {
    const newChips = chips.filter((_, i) => i !== indexToRemove);
    onChange(newChips.join(', '));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && inputValue === '' && chips.length > 0) {
      handleRemove(chips.length - 1);
    } else if ((e.key === 'Enter' || e.key === ',') && inputValue.trim()) {
      e.preventDefault();
      const newEmail = inputValue.replace(',', '').trim();
      if (newEmail) {
        handleSelect({ name: newEmail.split('@')[0], email: newEmail });
      }
    }
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div 
        className="min-h-[40px] w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 flex flex-wrap items-center gap-1.5 focus-within:ring-1 focus-within:ring-blue-400 focus-within:bg-white cursor-text transition-colors"
        onClick={() => inputRef.current?.focus()}
      >
        {chips.map((chip, index) => (
          <Badge 
            key={index} 
            variant="secondary" 
            className="h-6 flex items-center gap-1 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-md font-medium px-2 py-0 shadow-sm"
          >
            {chip}
            <X 
              className="h-3 w-3 cursor-pointer opacity-50 hover:opacity-100 transition-opacity ml-0.5" 
              onClick={(e) => {
                e.stopPropagation();
                handleRemove(index);
              }}
            />
          </Badge>
        ))}
        <input
          ref={inputRef}
          id={id}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={chips.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[120px] bg-transparent outline-none text-sm text-slate-700 h-6 focus:ring-0 border-none p-0"
          autoComplete="off"
          required={required && chips.length === 0}
        />
      </div>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg z-[100] overflow-hidden max-h-48 overflow-y-auto">
          {isLoading && suggestions.length === 0 ? (
            <div className="p-3 flex items-center justify-center gap-2 text-xs text-slate-400">
              <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
              {t("loading_contacts")}
            </div>
          ) : suggestions.length > 0 ? (
            suggestions.map((s, i) => (
              <div
                key={i}
                className="p-2.5 hover:bg-blue-50 cursor-pointer flex flex-col border-b border-slate-50 last:border-0 transition-colors"
                onClick={() => handleSelect(s)}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-700">{s.name}</span>
                </div>
                <span className="text-xs text-slate-500">{s.email}</span>
              </div>
            ))
          ) : (
            <div className="p-3 text-center text-xs text-slate-400 font-medium">
              {t("no_contacts")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function UndoCountdown() {
  const { t } = useLanguage();
  const [timeLeft, setTimeLeft] = useState(10);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  return (
    <span>
      {t("undo_seconds_1")} <strong className="font-bold">{timeLeft}</strong> {timeLeft === 1 ? t("undo_seconds_2") : t("undo_seconds_3")} {t("undo_seconds_4")}
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
  const { accessToken, account } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  
  const sigEditorRef = useRef<HTMLDivElement>(null);
  const sigFileInputRef = useRef<HTMLInputElement>(null);

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

  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [isSignManagerOpen, setIsSignManagerOpen] = useState(false);
  const [newSigName, setNewSigName] = useState("");
  const [newSigContent, setNewSigContent] = useState("");

  const [customColumns, setCustomColumns] = useState<any[]>([]);
  const [sendAction, setSendAction] = useState<{type: string, payload?: string, label: string}>({ type: 'send', label: t("send_msg") });

  useEffect(() => {
    if (mode === "new") setSendAction({ type: 'send', label: t("send_msg") });
    else if (mode === "forward") setSendAction({ type: 'send', label: t("forward") });
    else setSendAction({ type: 'send', label: t("reply") });
  }, [mode, t]);

  useEffect(() => {
    if (!account?.homeAccountId || !isSupabaseAvailable()) return;

    const loadData = async () => {
      await safeSupabaseOperation(async () => {
        const { data: prefData } = await supabase!
          .from("user_preferences")
          .select("signatures")
          .eq("user_id", account.homeAccountId)
          .single();

        if (prefData?.signatures) {
          setSignatures(prefData.signatures);
        }

        const { data: colsData } = await supabase!
          .from("custom_columns")
          .select("*")
          .eq("user_id", account.homeAccountId)
          .order("position");

        if (colsData) {
          setCustomColumns(colsData);
        }
      });
    };

    loadData();
  }, [account?.homeAccountId]);

  const saveSignature = async () => {
    if (!newSigName.trim() || !newSigContent.trim() || !account?.homeAccountId) return;

    const newSignature: Signature = {
      id: Date.now().toString(),
      name: newSigName.trim(),
      content: newSigContent.trim(),
    };

    const updatedSignatures = [...signatures, newSignature];
    setSignatures(updatedSignatures);

    setNewSigName("");
    setNewSigContent("");
    if (sigEditorRef.current) sigEditorRef.current.innerHTML = "";
    
    setIsSignManagerOpen(false);

    if (isSupabaseAvailable()) {
      await safeSupabaseOperation(async () => {
        await supabase!.from("user_preferences").upsert({
          user_id: account.homeAccountId,
          signatures: updatedSignatures,
          updated_at: new Date().toISOString(),
        });
      });
    }

    toast({
      title: t("sig_saved"),
      description: t("sig_saved_desc").replace("{name}", newSignature.name),
    });
  };

  const deleteSignature = async (id: string) => {
    const updatedSignatures = signatures.filter((sig) => sig.id !== id);
    setSignatures(updatedSignatures);
    
    if (account?.homeAccountId && isSupabaseAvailable()) {
      await safeSupabaseOperation(async () => {
        await supabase!.from("user_preferences").upsert({
          user_id: account.homeAccountId,
          signatures: updatedSignatures,
          updated_at: new Date().toISOString(),
        });
      });
    }
    
    toast({
      title: t("sig_deleted"),
      description: t("sig_deleted_desc"),
    });
  };

  const insertSignature = (content: string) => {
    const htmlContent = content.includes("<") && content.includes(">") 
      ? content 
      : content.replace(/\n/g, "<br>");
    
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

  const formatAddressForChip = (recipient: any) => {
    if (recipient?.emailAddress?.name && recipient?.emailAddress?.name !== recipient?.emailAddress?.address) {
      return `${recipient.emailAddress.name} <${recipient.emailAddress.address}>`;
    }
    return recipient?.emailAddress?.address || "";
  };

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
    
    let originalBodyContent = originalEmail.body?.content || "";

    if (originalEmail.body?.contentType === "html" && originalEmail.attachments && originalEmail.attachments.length > 0) {
      originalEmail.attachments.forEach((att: any) => {
        if (att.contentBytes) {
          const base64String = `data:${att.contentType || "image/png"};base64,${att.contentBytes}`;
          if (att.contentId) {
            const cleanCid = att.contentId.replace(/[<>]/g, '');
            const cidRegex1 = new RegExp(`cid:${cleanCid}`, 'gi');
            originalBodyContent = originalBodyContent.replace(cidRegex1, base64String);
            const cidRegex2 = new RegExp(`cid:${att.contentId}`, 'gi');
            originalBodyContent = originalBodyContent.replace(cidRegex2, base64String);
          }
          if (att.name) {
            const nameRegex = new RegExp(`cid:${att.name}`, 'gi');
            originalBodyContent = originalBodyContent.replace(nameRegex, base64String);
            const directNameRegex = new RegExp(`src=["']${att.name}["']`, 'gi');
            originalBodyContent = originalBodyContent.replace(directNameRegex, `src="${base64String}"`);
          }
        }
      });
    }

    const fromName = originalEmail.from?.emailAddress?.name || originalEmail.from?.emailAddress?.address || "";
    const dateStr = originalEmail.receivedDateTime 
      ? new Date(originalEmail.receivedDateTime).toLocaleString(language === "en" ? "en-US" : "pt-PT") 
      : "";
    const toNames = originalEmail.toRecipients?.map(r => r.emailAddress.name || r.emailAddress.address).join("; ") || "";
    
    const ccNames = originalEmail.ccRecipients?.map(r => r.emailAddress.name || r.emailAddress.address).join("; ") || "";
    const ccLine = ccNames ? `<b>${t("history_cc")}</b> ${ccNames}<br>` : "";

    const historyHeader = `<br><br><br>
<hr tabindex="-1" style="display:inline-block; width:100%; border:none; border-top:1px solid #E1E1E1;">
<div style="font-family: Calibri, Arial, Helvetica, sans-serif; font-size: 11pt; color: #000000; padding-top: 8px;">
<b>${t("history_from")}</b> ${fromName}<br>
<b>${t("history_sent")}</b> ${dateStr}<br>
<b>${t("history_to")}</b> ${toNames}<br>
${ccLine}<b>${t("history_subject")}</b> ${originalEmail.subject || ""}<br>
</div>
<br>`;

    switch (mode) {
      case "reply":
      case "replyAll":
        subject = subject.toLowerCase().startsWith("re:") || subject.toLowerCase().startsWith("fw:") 
          ? subject 
          : `RE: ${subject}`;
        
        bodyContent = historyHeader + originalBodyContent;

        const replyTo = originalEmail.replyTo?.[0] || originalEmail.from;
        if (mode === "reply") {
          setToInput(formatAddressForChip(replyTo));
        } else {
          const allRecipients = [
            ...(originalEmail.toRecipients || []),
            ...(originalEmail.ccRecipients || []),
          ].filter(
            (r) => r.emailAddress.address !== replyTo?.emailAddress?.address,
          );

          setToInput(formatAddressForChip(replyTo));
          setCcInput(
            allRecipients.map((r) => formatAddressForChip(r)).join(", "),
          );
          if (allRecipients.length > 0) setShowAdvanced(true);
        }
        break;

      case "forward":
        subject = subject.toLowerCase().startsWith("fw:") || subject.toLowerCase().startsWith("fwd:") 
          ? subject 
          : `FW: ${subject}`;
        
        bodyContent = historyHeader + originalBodyContent;
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
      
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.focus();
          const selection = window.getSelection();
          const range = document.createRange();
          range.setStart(editorRef.current, 0);
          range.collapse(true);
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
      }, 100);
    }
  }, [isOpen, originalEmail, mode, t, language]);

  const parseEmailAddresses = (input: string) => {
    return input
      .split(",")
      .map((email) => email.trim())
      .filter((email) => email.length > 0)
      .map((email) => {
        const match = email.match(/(.*)<(.*)>/);
        if (match) {
          return {
            emailAddress: {
              name: match[1].trim(),
              address: match[2].trim(),
            },
          };
        }
        return {
          emailAddress: {
            address: email,
          },
        };
      });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachments((prev) => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

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

    try {
      const allRawEmails = `${toInput},${ccInput},${bccInput}`;
      const parsedEmails = allRawEmails.split(',').map(e => e.trim()).filter(e => e.length > 0);
      
      if (parsedEmails.length > 0) {
        const existingString = localStorage.getItem("recent_sent_contacts") || "[]";
        let existingList: ContactSuggestion[] = JSON.parse(existingString);
        
        parsedEmails.forEach(emailStr => {
          let name = emailStr;
          let email = emailStr;
          const match = emailStr.match(/(.*)<(.*)>/);
          if (match) {
            name = match[1].trim();
            email = match[2].trim();
          } else {
            name = email.split('@')[0];
          }
          
          if (email.includes('@') && !existingList.some(c => c.email.toLowerCase() === email.toLowerCase())) {
            existingList.unshift({ name, email });
          }
        });
        
        localStorage.setItem("recent_sent_contacts", JSON.stringify(existingList.slice(0, 30)));
      }
    } catch (e) {
      console.error("Erro a guardar e-mails enviados na cache local", e);
    }

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

        if (mode !== "new" && originalEmail && sendAction.type !== 'send' && account?.homeAccountId && isSupabaseAvailable()) {
          try {
            if (sendAction.type === 'archive') {
               await graphService.moveToFolder(originalEmail.id, "archive");
               await safeSupabaseOperation(async () => {
                  await supabase!.from('email_metadata').upsert({ user_id: account.homeAccountId, email_id: originalEmail.id, column_id: 'archive', updated_at: new Date().toISOString() });
               });
            } else if (sendAction.type === 'snooze') {
               const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(8,0,0,0);
               await safeSupabaseOperation(async () => {
                  await supabase!.from('email_metadata').upsert({ user_id: account.homeAccountId, email_id: originalEmail.id, snoozed_until: d.toISOString(), updated_at: new Date().toISOString() });
               });
            } else if (sendAction.type === 'column' && sendAction.payload) {
               await safeSupabaseOperation(async () => {
                  await supabase!.from('email_metadata').upsert({ user_id: account.homeAccountId, email_id: originalEmail.id, column_id: sendAction.payload, updated_at: new Date().toISOString() });
               });
            }
          } catch (e) {
            console.error("Erro a atualizar cartão após envio", e);
          }
        }

        toast({
          title: t("send_success"),
          description: t("send_success_desc"),
          duration: 4000,
        });

        if (onEmailSent) {
          onEmailSent();
        }
      } catch (error) {
        console.error("Erro ao enviar email:", error);
        toast({
          title: t("send_error"),
          description: error instanceof Error ? error.message : t("unexpected_error"),
          variant: "destructive",
        });
      }
    }, 10000);

    toast({
      title: t("sending_msg"),
      description: <UndoCountdown />,
      duration: 10000,
      action: (
        <ToastAction 
          altText={t("undo_send")} 
          onClick={() => {
            clearTimeout(timeoutId);
            toast({
              title: t("send_undone"),
              description: t("send_undone_desc"),
            });
          }}
        >
          {t("undo_btn")}
        </ToastAction>
      ),
    });
  };

  const getTitle = () => {
    switch (mode) {
      case "reply":
        return t("reply");
      case "replyAll":
        return t("reply_all");
      case "forward":
        return t("forward");
      default:
        return t("new_msg");
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
                  {t("to_label")}
                </label>
                <div className="flex-1 relative">
                  <AutocompleteEmailInput
                    id="to"
                    value={toInput}
                    onChange={setToInput}
                    placeholder="emails@exemplo.com"
                    required
                    accessToken={accessToken}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 px-3 text-slate-500 hover:text-slate-900 rounded-xl text-xs font-medium"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  {t("cc_bcc_btn")}{" "}
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
                      {t("cc_label")}
                    </label>
                    <div className="flex-1 relative">
                      <AutocompleteEmailInput
                        id="cc"
                        value={ccInput}
                        onChange={setCcInput}
                        className="w-full h-10 rounded-xl bg-slate-50 border-slate-200 shadow-none"
                        accessToken={accessToken}
                      />
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <label
                      htmlFor="bcc"
                      className="w-12 pt-2.5 text-xs font-bold text-slate-400 uppercase text-right"
                    >
                      {t("bcc_label")}
                    </label>
                    <div className="flex-1 relative">
                      <AutocompleteEmailInput
                        id="bcc"
                        value={bccInput}
                        onChange={setBccInput}
                        className="w-full h-10 rounded-xl bg-slate-50 border-slate-200 shadow-none"
                        accessToken={accessToken}
                      />
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <label className="w-12 pt-2.5 text-xs font-bold text-slate-400 uppercase text-right">
                      {t("importance_label")}
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
                            🟢 {t("importance_low")}
                          </SelectItem>
                          <SelectItem value="normal">🟡 {t("importance_normal")}</SelectItem>
                          <SelectItem value="high">
                            🔴 {t("importance_high")}
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
                  {t("subject_label")}
                </label>
                <Input
                  id="subject"
                  value={emailData.subject}
                  onChange={(e) =>
                    setEmailData({ ...emailData, subject: e.target.value })
                  }
                  placeholder={t("subject_placeholder")}
                  className="flex-1 h-10 rounded-xl bg-slate-50 border-slate-200 shadow-none font-medium focus-visible:ring-1 focus-visible:ring-blue-400 focus-visible:bg-white"
                  required
                />
              </div>

              <div className="pt-2 flex-1 flex flex-col min-h-[300px]">
                <div className="border border-slate-200 rounded-xl bg-white flex flex-col flex-1 overflow-hidden shadow-sm">
                  
                  <div className="flex flex-wrap items-center gap-1 p-2 border-b border-slate-100 bg-slate-50/80">
                    
                    <Select onValueChange={(value) => executeCommand("fontName", value)}>
                      <SelectTrigger className="h-8 w-[130px] text-xs border-transparent bg-transparent shadow-none hover:bg-slate-200 focus:ring-0 px-2 transition-colors">
                        <SelectValue placeholder={t("font_placeholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Arial">Arial</SelectItem>
                        <SelectItem value="Verdana">Verdana</SelectItem>
                        <SelectItem value="Helvetica">Helvetica</SelectItem>
                        <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                        <SelectItem value="Courier New">Courier</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select onValueChange={(value) => executeCommand("fontSize", value)}>
                      <SelectTrigger className="h-8 w-[80px] text-xs border-transparent bg-transparent shadow-none hover:bg-slate-200 focus:ring-0 px-2 transition-colors">
                        <SelectValue placeholder={t("size_placeholder")} />
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

                    <div className="relative flex items-center justify-center w-8 h-8 rounded-md hover:bg-slate-200 overflow-hidden cursor-pointer" title={t("text_color")}>
                      <span className="font-serif font-bold text-slate-700 pointer-events-none z-10 text-[15px] border-b-[3px] border-red-500 leading-none pb-0.5">A</span>
                      <input 
                        type="color" 
                        className="absolute inset-0 w-[200%] h-[200%] -top-2 -left-2 cursor-pointer opacity-0 z-20" 
                        onChange={(e) => executeCommand("foreColor", e.target.value)} 
                      />
                    </div>

                    <div className="relative flex items-center justify-center w-8 h-8 rounded-md hover:bg-slate-200 overflow-hidden cursor-pointer" title={t("highlight_color")}>
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
                    data-placeholder={t("body_placeholder")}
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
                {t("attach_btn")}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-500 hover:text-slate-900 rounded-xl font-medium"
                  >
                    <PenTool className="h-4 w-4 mr-2" />
                    {t("sig_btn")}
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 rounded-xl">
                  {signatures.length === 0 ? (
                    <div className="px-2 py-3 text-xs text-slate-400 text-center">
                      {t("no_sig")}
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
                    {t("manage_sigs_btn")}
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
                {t("cancel_btn")}
              </Button>
              
              <div className="flex items-center">
                {mode === "new" ? (
                  <Button
                    onClick={handleSend}
                    disabled={isLoading || !toInput.trim() || !emailData.subject.trim()}
                    className="rounded-xl px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-200"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    {sendAction.label}
                  </Button>
                ) : (
                  <div className="flex items-center rounded-xl bg-blue-600 shadow-md shadow-blue-200 transition-colors hover:bg-blue-700">
                    <Button
                      onClick={handleSend}
                      disabled={isLoading || !toInput.trim() || !emailData.subject.trim()}
                      className="rounded-l-xl rounded-r-none px-5 bg-transparent hover:bg-transparent shadow-none text-white font-bold h-10 border-r border-blue-500/50 focus:ring-0"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      {sendAction.label}
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          disabled={isLoading || !toInput.trim() || !emailData.subject.trim()}
                          className="rounded-r-xl rounded-l-none px-2.5 bg-transparent hover:bg-transparent shadow-none text-white h-10 focus:ring-0"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-64 rounded-xl border-slate-100 shadow-xl">
                        <DropdownMenuItem 
                          onClick={() => setSendAction({ type: 'send', label: mode === 'forward' ? t("forward") : t("reply") })}
                          className="cursor-pointer py-2 font-medium"
                        >
                          <Send className="mr-2 h-4 w-4 text-slate-500" /> 
                          {mode === 'forward' ? t("only_forward") : t("only_reply")}
                        </DropdownMenuItem>
                        
                        <DropdownMenuSeparator className="bg-slate-100" />
                        
                        <DropdownMenuItem 
                          onClick={() => setSendAction({ type: 'archive', label: t("send_archive") })}
                          className="cursor-pointer py-2 font-medium"
                        >
                          <Archive className="mr-2 h-4 w-4 text-amber-500" /> {t("send_archive")}
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem 
                          onClick={() => setSendAction({ type: 'snooze', label: t("send_snooze") })}
                          className="cursor-pointer py-2 font-medium"
                        >
                          <Clock className="mr-2 h-4 w-4 text-indigo-500" /> {t("send_snooze")}
                        </DropdownMenuItem>

                        {customColumns.length > 0 && (
                          <>
                            <DropdownMenuSeparator className="bg-slate-100" />
                            <div className="px-2 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              {t("send_move_to")}
                            </div>
                            {customColumns.map(col => (
                              <DropdownMenuItem 
                                key={col.id}
                                onClick={() => setSendAction({ type: 'column', payload: col.id, label: `${t("send_to_col")} ${col.name}` })}
                                className="cursor-pointer py-2 font-medium"
                              >
                                <span className="mr-2 text-base">{col.icon || "📁"}</span> {col.name}
                              </DropdownMenuItem>
                            ))}
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isSignManagerOpen} onOpenChange={setIsSignManagerOpen}>
        <DialogContent 
          className="max-w-md rounded-2xl"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle>{t("manage_sigs_title")}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-2">
            {signatures.length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                <label className="text-xs font-bold text-slate-500 uppercase">
                  {t("saved_sigs")}
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
                {t("create_sig")}
              </label>
              <Input
                placeholder={t("sig_name_placeholder")}
                value={newSigName}
                onChange={(e) => setNewSigName(e.target.value)}
                className="h-10 rounded-xl bg-slate-50 border-slate-200 shadow-none"
              />
              
              <div className="border border-slate-200 rounded-xl overflow-hidden flex flex-col bg-white">
                <div className="flex items-center gap-1 p-1.5 border-b border-slate-100 bg-slate-50">
                  <Select onValueChange={(value) => {
                    if (sigEditorRef.current) {
                      sigEditorRef.current.focus();
                      document.execCommand("fontSize", false, value);
                      setNewSigContent(sigEditorRef.current.innerHTML);
                    }
                  }}>
                    <SelectTrigger className="h-7 w-[80px] text-xs border-transparent bg-transparent shadow-none hover:bg-slate-200 focus:ring-0 px-2 transition-colors">
                      <SelectValue placeholder={t("size_placeholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">10 pt</SelectItem>
                      <SelectItem value="2">13 pt</SelectItem>
                      <SelectItem value="3">16 pt</SelectItem>
                      <SelectItem value="4">18 pt</SelectItem>
                      <SelectItem value="5">24 pt</SelectItem>
                      <SelectItem value="6">32 pt</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="w-px h-4 bg-slate-300 mx-1" />

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-slate-600 hover:bg-slate-200 text-xs font-medium"
                    onClick={() => sigFileInputRef.current?.click()}
                  >
                    <ImageIcon className="h-3.5 w-3.5 mr-1" />
                    {t("add_image")}
                  </Button>
                  <input
                    type="file"
                    ref={sigFileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          const dataUrl = ev.target?.result as string;
                          if (sigEditorRef.current) {
                            sigEditorRef.current.focus();
                            document.execCommand('insertImage', false, dataUrl);
                            setNewSigContent(sigEditorRef.current.innerHTML);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </div>
                
                <div
                  ref={sigEditorRef}
                  contentEditable
                  onInput={(e) => setNewSigContent(e.currentTarget.innerHTML)}
                  className="min-h-[120px] p-3 text-sm focus-visible:outline-none custom-scrollbar overflow-y-auto"
                  data-placeholder={t("sig_body_placeholder")}
                />
              </div>

              <Button
                onClick={saveSignature}
                disabled={!newSigName.trim() || !newSigContent.trim()}
                className="w-full h-10 rounded-xl bg-blue-600 text-white hover:bg-blue-700 font-bold"
              >
                {t("save_sig_btn")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}