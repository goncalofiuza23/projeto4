"use client"

import { useState } from "react"
import { useAuth } from "./auth-provider"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Mail, LogOut, Plus, Loader2 } from "lucide-react"
import { EmailComposer } from "./email-composer"

interface HeaderProps {
  onEmailSent?: () => void
}

export function Header({ onEmailSent }: HeaderProps) {
  const { account, login, logout, isLoading, isAuthenticating } = useAuth()
  const [isComposerOpen, setIsComposerOpen] = useState(false)

  const handleEmailSent = () => {
    setIsComposerOpen(false)
    if (onEmailSent) {
      onEmailSent()
    }
  }

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
    )
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
                  Novo Email
                </Button>
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{account.name?.charAt(0) || account.username?.charAt(0) || "U"}</AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block">
                    <p className="text-sm font-medium">{account.name || account.username}</p>
                    <p className="text-xs text-muted-foreground">{account.username}</p>
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
  )
}
