"use client";

import { useState, useEffect } from "react";
import { useAuth } from "./auth-provider";
import { Button } from "@/components/ui/button";
import { Mail, LogOut, Plus, Loader2 } from "lucide-react";
import { EmailComposer } from "./email-composer";
import { UserAvatar } from "./user-avatar";
import { GraphService } from "@/lib/microsoft-graph";

interface HeaderProps {
  onEmailSent?: () => void;
}

export function Header({ onEmailSent }: HeaderProps) {
  // 1. Adicionámos o accessToken aqui
  const { account, accessToken, login, logout, isLoading, isAuthenticating } =
    useAuth();
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  // 2. Estado para guardar a foto
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const handleEmailSent = () => {
    setIsComposerOpen(false);
    if (onEmailSent) {
      onEmailSent();
    }
  };

  // 3. O trabalhador de fundo que vai buscar a tua própria foto à Microsoft
  useEffect(() => {
    let isMounted = true;

    const fetchMyPhoto = async () => {
      // Se não houver token ou email, não faz nada
      if (!accessToken || !account?.username) return;

      try {
        const graphService = new GraphService(accessToken);
        // Como o teu GraphService já sabe que este é o teu e-mail, ele vai usar a rota "/me" automaticamente!
        const photoUrl = await graphService.getProfilePhoto(account.username);

        if (isMounted && photoUrl) {
          setAvatarUrl(photoUrl);
        }
      } catch (error) {
        // Falha silenciosa se não houver foto (mostra as iniciais coloridas)
      }
    };

    fetchMyPhoto();

    return () => {
      isMounted = false;
    };
  }, [accessToken, account?.username]);

  if (isLoading) {
    return (
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-10">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Outlook Kanban</h1>
          </div>
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Carregando...</span>
          </div>
        </div>
      </header>
    );
  }

  return (
    <>
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-10">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Outlook Kanban</h1>
          </div>

          <div className="flex items-center gap-4">
            {account ? (
              <>
                <Button onClick={() => setIsComposerOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo E-mail
                </Button>
                <div className="flex items-center gap-2">
                  {/* 4. Trocámos o Avatar antigo pelo nosso UserAvatar inteligente! */}
                  <UserAvatar
                    name={account.name}
                    email={account.username || ""}
                    imageUrl={avatarUrl}
                    className="h-8 w-8"
                  />

                  <div className="hidden sm:block">
                    <p className="text-sm font-medium">
                      {account.name || account.username}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {account.username}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={logout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </Button>
              </>
            ) : (
              <Button onClick={login} disabled={isAuthenticating}>
                {isAuthenticating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  "Entrar com Microsoft"
                )}
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Composer para novo email */}
      <EmailComposer
        isOpen={isComposerOpen}
        onClose={() => setIsComposerOpen(false)}
        mode="new"
        onEmailSent={handleEmailSent}
      />
    </>
  );
}
