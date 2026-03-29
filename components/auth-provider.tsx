"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { msalInstance, loginRequest } from "@/lib/microsoft-graph";
import type { AuthenticationResult, AccountInfo } from "@azure/msal-browser";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  account: AccountInfo | null;
  accessToken: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  isAuthenticating: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;

    const initializeMsal = async () => {
      try {
        // Garantir que a inicialização acontece apenas uma vez
        await msalInstance.initialize();

        if (!isMounted) return;

        const accounts = msalInstance.getAllAccounts();

        if (accounts.length > 0) {
          const activeAccount = accounts[0];
          msalInstance.setActiveAccount(activeAccount); // Define a conta ativa
          setAccount(activeAccount);

          try {
            const response = await msalInstance.acquireTokenSilent({
              ...loginRequest,
              account: activeAccount,
            });
            setAccessToken(response.accessToken);
          } catch (error) {
            console.error("Erro ao obter token silenciosamente:", error);
            setAccount(null);
            setAccessToken(null);
          }
        }
      } catch (error: any) {
        // Evita mostrar erro se já estiver inicializado
        if (error.errorCode !== "browser_environment_not_supported") {
          console.error("Erro ao inicializar MSAL:", error);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    initializeMsal();

    return () => {
      isMounted = false;
    };
  }, []); // Removida a dependência do toast para evitar re-renders desnecessários

  const login = async () => {
    if (isAuthenticating) return;

    // --- CORREÇÃO: Quebrar o "cadeado" preso do MSAL antes de tentar login ---
    Object.keys(sessionStorage).forEach((key) => {
      if (key.includes("interaction.status")) {
        sessionStorage.removeItem(key);
      }
    });
    // -------------------------------------------------------------------------

    setIsAuthenticating(true);
    try {
      const accounts = msalInstance.getAllAccounts();

      // Tentar login silencioso se já houver uma conta reconhecida
      if (accounts.length > 0) {
        try {
          const activeAccount = accounts[0];
          msalInstance.setActiveAccount(activeAccount);

          const response = await msalInstance.acquireTokenSilent({
            ...loginRequest,
            account: activeAccount,
          });
          setAccount(activeAccount);
          setAccessToken(response.accessToken);

          toast({
            title: "Login realizado com sucesso",
            description: `Bem-vindo, ${activeAccount.name || activeAccount.username}!`,
          });
          return;
        } catch (silentError) {
          console.log("Token expirado ou inválido. A abrir janela de login...");
        }
      }

      // Se não houver conta ou o silencioso falhar, abre o Popup
      const response: AuthenticationResult = await msalInstance.loginPopup({
        ...loginRequest,
        prompt: "select_account",
      });

      msalInstance.setActiveAccount(response.account);
      setAccount(response.account);
      setAccessToken(response.accessToken);

      toast({
        title: "Login realizado com sucesso",
        description: `Bem-vindo, ${response.account?.name || response.account?.username}!`,
      });
    } catch (error: any) {
      console.error("Detalhes do erro no login:", error);

      // Ignora o erro se for apenas o popup a demorar a abrir
      if (error.errorCode === "interaction_in_progress") {
        return;
      }

      if (
        error.errorCode === "user_cancelled" ||
        error.message?.includes("user_cancelled")
      ) {
        console.log("Usuário cancelou o login");
      } else if (
        error.errorCode === "popup_window_error" ||
        error.message?.includes("popup")
      ) {
        toast({
          title: "Erro de popup",
          description:
            "Por favor, permita popups para este site e tente novamente.",
          variant: "destructive",
        });
      } else if (error.errorCode !== "monitor_window_timeout") {
        toast({
          title: "Erro no login",
          description: "Não foi possível fazer login. Tente novamente.",
          variant: "destructive",
        });
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const logout = async () => {
    try {
      const account =
        msalInstance.getActiveAccount() || msalInstance.getAllAccounts()[0];

      // O logoutPopup trata de limpar a cache da Microsoft de forma segura
      if (account) {
        await msalInstance.logoutPopup({
          account,
          mainWindowRedirectUri: window.location.origin,
        });
      }
    } catch (error) {
      console.error("Erro no logout:", error);
    } finally {
      // Limpeza segura do estado
      msalInstance.setActiveAccount(null);
      setAccount(null);
      setAccessToken(null);

      // --- CORREÇÃO: Quebrar o "cadeado" preso do MSAL após o logout ---
      Object.keys(sessionStorage).forEach((key) => {
        if (key.includes("interaction.status")) {
          sessionStorage.removeItem(key);
        }
      });
      // -----------------------------------------------------------------

      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        account,
        accessToken,
        login,
        logout,
        isLoading,
        isAuthenticating,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
}
