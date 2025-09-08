"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { msalInstance, loginRequest } from "@/lib/microsoft-graph"
import type { AuthenticationResult, AccountInfo } from "@azure/msal-browser"
import { useToast } from "@/hooks/use-toast"

interface AuthContextType {
  account: AccountInfo | null
  accessToken: string | null
  login: () => Promise<void>
  logout: () => Promise<void>
  isLoading: boolean
  isAuthenticating: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<AccountInfo | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const initializeMsal = async () => {
      try {
        await msalInstance.initialize()
        const accounts = msalInstance.getAllAccounts()

        if (accounts.length > 0) {
          setAccount(accounts[0])
          try {
            const response = await msalInstance.acquireTokenSilent({
              ...loginRequest,
              account: accounts[0],
            })
            setAccessToken(response.accessToken)

            toast({
              title: "Login automático realizado",
              description: `Bem-vindo de volta, ${accounts[0].name || accounts[0].username}!`,
            })
          } catch (error) {
            console.error("Erro ao obter token silenciosamente:", error)
            // Se falhar o token silencioso, limpar a conta
            setAccount(null)
            setAccessToken(null)
          }
        }
      } catch (error) {
        console.error("Erro ao inicializar MSAL:", error)
        toast({
          title: "Erro de inicialização",
          description: "Houve um problema ao inicializar o sistema de autenticação.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    initializeMsal()
  }, [toast])

  const login = async () => {
    if (isAuthenticating) return

    setIsAuthenticating(true)
    try {
      // Tentar login silencioso primeiro se houver contas
      const accounts = msalInstance.getAllAccounts()
      if (accounts.length > 0) {
        try {
          const response = await msalInstance.acquireTokenSilent({
            ...loginRequest,
            account: accounts[0],
          })
          setAccount(accounts[0])
          setAccessToken(response.accessToken)

          toast({
            title: "Login realizado com sucesso",
            description: `Bem-vindo, ${accounts[0].name || accounts[0].username}!`,
          })
          return
        } catch (silentError) {
          console.log("Login silencioso falhou, tentando popup:", silentError)
        }
      }

      // Se login silencioso falhar ou não houver contas, usar popup
      const response: AuthenticationResult = await msalInstance.loginPopup({
        ...loginRequest,
        prompt: "select_account", // Permite escolher conta
      })

      setAccount(response.account)
      setAccessToken(response.accessToken)

      toast({
        title: "Login realizado com sucesso",
        description: `Bem-vindo, ${response.account?.name || response.account?.username}!`,
      })
    } catch (error: any) {
      console.error("Erro no login:", error)

      // Tratar diferentes tipos de erro
      if (error.errorCode === "user_cancelled" || error.message?.includes("user_cancelled")) {
        // Usuário cancelou - não mostrar erro, é comportamento normal
        console.log("Usuário cancelou o login")
      } else if (error.errorCode === "popup_window_error" || error.message?.includes("popup")) {
        toast({
          title: "Erro de popup",
          description: "Por favor, permita popups para este site e tente novamente.",
          variant: "destructive",
        })
      } else if (error.errorCode === "network_error") {
        toast({
          title: "Erro de conexão",
          description: "Verifique sua conexão com a internet e tente novamente.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Erro no login",
          description: "Não foi possível fazer login. Tente novamente em alguns instantes.",
          variant: "destructive",
        })
      }
    } finally {
      setIsAuthenticating(false)
    }
  }

  const logout = async () => {
    try {
      const account = msalInstance.getAllAccounts()[0]
      if (account) {
        await msalInstance.logoutPopup({
          account,
          mainWindowRedirectUri: window.location.origin,
        })
      }

      setAccount(null)
      setAccessToken(null)

      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      })
    } catch (error) {
      console.error("Erro no logout:", error)
      // Mesmo com erro, limpar o estado local
      setAccount(null)
      setAccessToken(null)

      toast({
        title: "Logout realizado",
        description: "Você foi desconectado.",
      })
    }
  }

  return (
    <AuthContext.Provider value={{ account, accessToken, login, logout, isLoading, isAuthenticating }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider")
  }
  return context
}
