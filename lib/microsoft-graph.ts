import {
  PublicClientApplication,
  type Configuration,
} from "@azure/msal-browser";

const msalConfig: Configuration = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID || "",
    authority: "https://login.microsoftonline.com/common",
    redirectUri: typeof window !== "undefined" ? window.location.origin : "",
    postLogoutRedirectUri:
      typeof window !== "undefined" ? window.location.origin : "/",
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
};

export const msalInstance = new PublicClientApplication(msalConfig);

export const loginRequest = {
  scopes: [
    "https://graph.microsoft.com/Mail.ReadWrite",
    "https://graph.microsoft.com/Mail.Send",
    "https://graph.microsoft.com/User.Read",
    "https://graph.microsoft.com/User.ReadBasic.All",
  ],
};

export interface Email {
  id: string;
  subject: string;
  bodyPreview: string;
  body?: {
    contentType: string;
    content: string;
  };
  from: {
    emailAddress: {
      name: string;
      address: string;
    };
  };
  receivedDateTime: string;
  sentDateTime?: string;
  isRead: boolean;
  importance: string;
  hasAttachments: boolean;
  toRecipients?: Array<{
    emailAddress: {
      name: string;
      address: string;
    };
  }>;
  ccRecipients?: Array<{
    emailAddress: {
      name: string;
      address: string;
    };
  }>;
  bccRecipients?: Array<{
    emailAddress: {
      name: string;
      address: string;
    };
  }>;
  replyTo?: Array<{
    emailAddress: {
      name: string;
      address: string;
    };
  }>;
  attachments?: Array<{
    id: string;
    name: string;
    contentType: string;
    size: number;
    isInline: boolean;
  }>;
  parentFolderId?: string;
  conversationId?: string;
  conversationIndex?: string;
  internetMessageId?: string;
  isFromMe?: boolean;
  threadEmails?: Email[];
  folderType?: "inbox" | "sent" | "archive" | "deleted" | "spam"; // NOVO: Suporta deleted e spam
}

export interface EmailThread {
  id: string;
  subject: string;
  participants: string[];
  lastActivity: string;
  emails: Email[];
  hasUnread: boolean;
  totalEmails: number;
}

export interface EmailDraft {
  subject: string;
  body: {
    contentType: "text" | "html";
    content: string;
  };
  toRecipients: Array<{
    emailAddress: {
      name?: string;
      address: string;
    };
  }>;
  ccRecipients?: Array<{
    emailAddress: {
      name?: string;
      address: string;
    };
  }>;
  bccRecipients?: Array<{
    emailAddress: {
      name?: string;
      address: string;
    };
  }>;
  importance?: "low" | "normal" | "high";
  attachments?: Array<{
    "@odata.type": string;
    name: string;
    contentBytes: string;
    contentType: string;
  }>;
}

export class GraphService {
  private accessToken: string;
  private userEmail = "";

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async makeRequest(url: string, options: RequestInit = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }
    return response;
  }

  async getUserEmail(): Promise<string> {
    if (this.userEmail) return this.userEmail;

    try {
      const response = await this.makeRequest(
        "https://graph.microsoft.com/v1.0/me",
      );
      const user = await response.json();
      this.userEmail = user.mail || user.userPrincipalName;
      return this.userEmail;
    } catch (error) {
      console.error("Erro ao obter email do usuário:", error);
      return "";
    }
  }

  async getProfilePhoto(email: string): Promise<string | null> {
    try {
      const myEmail = await this.getUserEmail();
      const isMe = email.toLowerCase() === myEmail.toLowerCase();

      const endpoint = isMe
        ? `https://graph.microsoft.com/v1.0/me/photo/$value`
        : `https://graph.microsoft.com/v1.0/users/${email}/photo/$value`;

      const response = await this.makeRequest(endpoint);
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error(`❌ Erro ao buscar foto para ${email}:`, error);
      return null;
    }
  }

  async getEmails(top = 50): Promise<Email[]> {
    const response = await this.makeRequest(
      `https://graph.microsoft.com/v1.0/me/messages?$top=${top}&$orderby=receivedDateTime desc&$select=id,subject,bodyPreview,body,from,receivedDateTime,sentDateTime,isRead,importance,hasAttachments,toRecipients,ccRecipients,bccRecipients,replyTo,parentFolderId,conversationId,conversationIndex,internetMessageId`,
    );
    const data = await response.json();
    const userEmail = await this.getUserEmail();
    return data.value.map((email: any) => ({
      ...email,
      isFromMe:
        email.from?.emailAddress?.address?.toLowerCase() ===
        userEmail.toLowerCase(),
      folderType: "inbox",
    }));
  }

  async getSentEmails(top = 50): Promise<Email[]> {
    const response = await this.makeRequest(
      `https://graph.microsoft.com/v1.0/me/mailFolders/sentitems/messages?$top=${top}&$orderby=sentDateTime desc&$select=id,subject,bodyPreview,body,from,sentDateTime,receivedDateTime,isRead,importance,hasAttachments,toRecipients,ccRecipients,bccRecipients,replyTo,parentFolderId,conversationId,conversationIndex,internetMessageId`,
    );
    const data = await response.json();
    const userEmail = await this.getUserEmail();
    return data.value.map((email: any) => ({
      ...email,
      receivedDateTime: email.sentDateTime || email.receivedDateTime,
      isFromMe: true,
      folderType: "sent",
    }));
  }

  async getArchivedEmails(top = 50): Promise<Email[]> {
    try {
      const response = await this.makeRequest(
        `https://graph.microsoft.com/v1.0/me/mailFolders/archive/messages?$top=${top}&$orderby=receivedDateTime desc&$select=id,subject,bodyPreview,body,from,receivedDateTime,sentDateTime,isRead,importance,hasAttachments,toRecipients,ccRecipients,bccRecipients,replyTo,parentFolderId,conversationId,conversationIndex,internetMessageId`,
      );
      const data = await response.json();
      const userEmail = await this.getUserEmail();
      return data.value.map((email: any) => ({
        ...email,
        isFromMe:
          email.from?.emailAddress?.address?.toLowerCase() ===
          userEmail.toLowerCase(),
        folderType: "archive",
      }));
    } catch (error) {
      console.error("Erro ao buscar arquivo:", error);
      return [];
    }
  }

  // --- NOVA FUNÇÃO: Ler pasta de Eliminados ---
  async getDeletedEmails(top = 50): Promise<Email[]> {
    try {
      const response = await this.makeRequest(
        `https://graph.microsoft.com/v1.0/me/mailFolders/deleteditems/messages?$top=${top}&$orderby=receivedDateTime desc&$select=id,subject,bodyPreview,body,from,receivedDateTime,sentDateTime,isRead,importance,hasAttachments,toRecipients,ccRecipients,bccRecipients,replyTo,parentFolderId,conversationId,conversationIndex,internetMessageId`,
      );
      const data = await response.json();
      const userEmail = await this.getUserEmail();
      return data.value.map((email: any) => ({
        ...email,
        isFromMe:
          email.from?.emailAddress?.address?.toLowerCase() ===
          userEmail.toLowerCase(),
        folderType: "deleted",
      }));
    } catch (error) {
      console.error("Erro ao buscar eliminados:", error);
      return [];
    }
  }

  // --- NOVA FUNÇÃO: Ler pasta de Spam ---
  async getSpamEmails(top = 50): Promise<Email[]> {
    try {
      const response = await this.makeRequest(
        `https://graph.microsoft.com/v1.0/me/mailFolders/junkemail/messages?$top=${top}&$orderby=receivedDateTime desc&$select=id,subject,bodyPreview,body,from,receivedDateTime,sentDateTime,isRead,importance,hasAttachments,toRecipients,ccRecipients,bccRecipients,replyTo,parentFolderId,conversationId,conversationIndex,internetMessageId`,
      );
      const data = await response.json();
      const userEmail = await this.getUserEmail();
      return data.value.map((email: any) => ({
        ...email,
        isFromMe:
          email.from?.emailAddress?.address?.toLowerCase() ===
          userEmail.toLowerCase(),
        folderType: "spam",
      }));
    } catch (error) {
      console.error("Erro ao buscar spam:", error);
      return [];
    }
  }

  async getAllEmails(top = 50): Promise<Email[]> {
    try {
      // Vai buscar a todas as 5 pastas
      const [
        inboxEmails,
        sentEmails,
        archiveEmails,
        deletedEmails,
        spamEmails,
      ] = await Promise.all([
        this.getEmails(top),
        this.getSentEmails(top),
        this.getArchivedEmails(top),
        this.getDeletedEmails(top),
        this.getSpamEmails(top),
      ]);

      const allEmails = [
        ...inboxEmails,
        ...sentEmails,
        ...archiveEmails,
        ...deletedEmails,
        ...spamEmails,
      ];
      return allEmails.sort(
        (a, b) =>
          new Date(b.receivedDateTime).getTime() -
          new Date(a.receivedDateTime).getTime(),
      );
    } catch (error) {
      console.error("Erro ao buscar todos os emails:", error);
      return this.getEmails(top);
    }
  }

  groupEmailsIntoThreads(emails: Email[]): EmailThread[] {
    const threadsMap = new Map<string, EmailThread>();

    emails.forEach((email) => {
      const threadKey =
        email.conversationId || this.normalizeSubject(email.subject || "");

      if (!threadsMap.has(threadKey)) {
        threadsMap.set(threadKey, {
          id: threadKey,
          subject: this.getCleanSubject(email.subject || ""),
          participants: [],
          lastActivity: email.receivedDateTime,
          emails: [],
          hasUnread: false,
          totalEmails: 0,
        });
      }

      const thread = threadsMap.get(threadKey)!;
      thread.emails.push(email);

      const fromEmail = email.from?.emailAddress?.address;
      if (fromEmail && !thread.participants.includes(fromEmail)) {
        thread.participants.push(fromEmail);
      }

      email.toRecipients?.forEach((recipient) => {
        const toEmail = recipient.emailAddress.address;
        if (toEmail && !thread.participants.includes(toEmail)) {
          thread.participants.push(toEmail);
        }
      });

      if (new Date(email.receivedDateTime) > new Date(thread.lastActivity)) {
        thread.lastActivity = email.receivedDateTime;
      }

      if (!email.isRead) {
        thread.hasUnread = true;
      }
    });

    const threads = Array.from(threadsMap.values()).map((thread) => {
      thread.emails.sort(
        (a, b) =>
          new Date(a.receivedDateTime).getTime() -
          new Date(b.receivedDateTime).getTime(),
      );
      thread.totalEmails = thread.emails.length;
      return thread;
    });

    return threads.sort(
      (a, b) =>
        new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime(),
    );
  }

  private normalizeSubject(subject: string): string {
    return subject
      .replace(/^(Re:|RE:|Fwd:|FWD:|Fw:|FW:)\s*/gi, "")
      .trim()
      .toLowerCase();
  }

  private getCleanSubject(subject: string): string {
    return (
      subject.replace(/^(Re:|RE:|Fwd:|FWD:|Fw:|FW:)\s*/gi, "").trim() ||
      "(Sem assunto)"
    );
  }

  async getEmailById(emailId: string): Promise<Email> {
    const response = await this.makeRequest(
      `https://graph.microsoft.com/v1.0/me/messages/${emailId}?$select=id,subject,bodyPreview,body,from,receivedDateTime,sentDateTime,isRead,importance,hasAttachments,toRecipients,ccRecipients,bccRecipients,replyTo,parentFolderId,conversationId,conversationIndex,internetMessageId&$expand=attachments`,
    );

    const email = await response.json();
    const userEmail = await this.getUserEmail();

    return {
      ...email,
      isFromMe:
        email.from?.emailAddress?.address?.toLowerCase() ===
        userEmail.toLowerCase(),
    };
  }

  async sendEmail(emailDraft: EmailDraft): Promise<void> {
    await this.makeRequest("https://graph.microsoft.com/v1.0/me/sendMail", {
      method: "POST",
      body: JSON.stringify({
        message: emailDraft,
        saveToSentItems: true,
      }),
    });
  }

  async replyToEmail(
    emailId: string,
    replyDraft: Partial<EmailDraft>,
  ): Promise<void> {
    await this.makeRequest(
      `https://graph.microsoft.com/v1.0/me/messages/${emailId}/reply`,
      {
        method: "POST",
        body: JSON.stringify({ message: replyDraft }),
      },
    );
  }

  async replyAllToEmail(
    emailId: string,
    replyDraft: Partial<EmailDraft>,
  ): Promise<void> {
    await this.makeRequest(
      `https://graph.microsoft.com/v1.0/me/messages/${emailId}/replyAll`,
      {
        method: "POST",
        body: JSON.stringify({ message: replyDraft }),
      },
    );
  }

  async forwardEmail(
    emailId: string,
    forwardDraft: Partial<EmailDraft>,
  ): Promise<void> {
    await this.makeRequest(
      `https://graph.microsoft.com/v1.0/me/messages/${emailId}/forward`,
      {
        method: "POST",
        body: JSON.stringify({ message: forwardDraft }),
      },
    );
  }

  async markAsRead(emailId: string): Promise<void> {
    await this.makeRequest(
      `https://graph.microsoft.com/v1.0/me/messages/${emailId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ isRead: true }),
      },
    );
  }

  async moveToFolder(emailId: string, folderId: string): Promise<void> {
    await this.makeRequest(
      `https://graph.microsoft.com/v1.0/me/messages/${emailId}/move`,
      {
        method: "POST",
        body: JSON.stringify({
          destinationId: folderId,
        }),
      },
    );
  }

  async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  }
}
