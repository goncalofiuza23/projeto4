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

  // Função interna para limpar erros de interação presa
  const clearMsalStuckStatus = () => {
    Object.keys(sessionStorage).forEach((key) => {
      if (
        key.includes("interaction.status") ||
        key.includes("msal.interaction")
      ) {
        sessionStorage.removeItem(key);
      }
    });
  };

  useEffect(() => {
    let isMounted = true;
    const initializeMsal = async () => {
      try {
        await msalInstance.initialize();
        if (!isMounted) return;

        const accounts = msalInstance.getAllAccounts();
        if (accounts.length > 0) {
          const activeAccount = accounts[0];
          msalInstance.setActiveAccount(activeAccount);
          setAccount(activeAccount);

          try {
            const response = await msalInstance.acquireTokenSilent({
              ...loginRequest,
              account: activeAccount,
            });
            setAccessToken(response.accessToken);
          } catch (error) {
            // Se falhar o token silencioso, não entramos em pânico, apenas limpamos
            setAccount(null);
            setAccessToken(null);
          }
        }
      } catch (error) {
        console.error("Erro MSAL:", error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    initializeMsal();
    return () => {
      isMounted = false;
    };
  }, []);

  const login = async () => {
    if (isAuthenticating) return;
    setIsAuthenticating(true);
    clearMsalStuckStatus(); // Limpa antes de tentar

    try {
      const response: AuthenticationResult = await msalInstance.loginPopup({
        ...loginRequest,
        prompt: "select_account",
      });
      msalInstance.setActiveAccount(response.account);
      setAccount(response.account);
      setAccessToken(response.accessToken);
    } catch (error: any) {
      if (error.errorCode === "interaction_in_progress") {
        clearMsalStuckStatus();
        window.location.reload(); // Se estiver preso, recarrega
      }
      console.error("Login cancelado ou erro:", error);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const logout = async () => {
    try {
      const activeAccount =
        msalInstance.getActiveAccount() || msalInstance.getAllAccounts()[0];
      if (activeAccount) {
        await msalInstance.logoutPopup({
          account: activeAccount,
          postLogoutRedirectUri: window.location.origin,
        });
      }
    } catch (error) {
      console.warn("Logout popup fechado ou erro. Forçando limpeza...");
    } finally {
      // LIMPEZA TOTAL (Resolve o teu limbo)
      sessionStorage.clear();
      localStorage.clear();
      setAccount(null);
      setAccessToken(null);
      window.location.href = window.location.origin; // Redireciona para o login
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
  if (context === undefined)
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  return context;
}
