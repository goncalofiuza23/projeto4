"use client";

import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "@/components/auth-provider"; 
import { supabase, isSupabaseAvailable, safeSupabaseOperation } from "@/lib/supabase";
import { useLanguage } from "@/components/language-provider";
import { Users, ArrowLeft, Activity, Search, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface UserStat {
  user_id: string;
  email: string;
  joined_at: string;
  last_active: string;
  total_emails_organized: number;
  is_admin: boolean;
}

function BackofficeContent() {
  const { account, isLoading: authLoading } = useAuth();
  const { t, language } = useLanguage();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [users, setUsers] = useState<UserStat[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!account?.username || !isSupabaseAvailable()) {
      if (!authLoading) setIsAdmin(false);
      return;
    }

    const checkAdmin = async () => {
      await safeSupabaseOperation(async () => {
        const { data } = await supabase!
          .from("user_stats")
          .select("is_admin")
          .eq("email", account.username)
          .single();

        if (data?.is_admin) {
          setIsAdmin(true);
          loadAllUsers();
        } else {
          setIsAdmin(false);
        }
      }, null);
    };

    checkAdmin();
  }, [account?.username, authLoading]);

  const loadAllUsers = async () => {
    await safeSupabaseOperation(async () => {
      const { data } = await supabase!
        .from("user_stats")
        .select("*")
        .order("last_active", { ascending: false });

      if (data) setUsers(data);
    }, null);
    setLoadingData(false);
  };

  const formatDate = (dateString: string) => {
    const locale = language === "en" ? "en-US" : "pt-PT";
    return new Date(dateString).toLocaleDateString(locale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (authLoading || isAdmin === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-sm font-medium">{t("checking_creds")}</span>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 space-y-4">
        <ShieldCheck className="h-16 w-16 text-slate-300" />
        <h1 className="text-2xl font-bold text-slate-800">{t("restricted_area")}</h1>
        <p className="text-slate-500 font-medium">{t("admin_only")}</p>
        <Button onClick={() => window.location.href = "/"} variant="outline" className="mt-4 rounded-xl h-10 px-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> {t("back_to_platform")}
        </Button>
      </div>
    );
  }

  const totalUsers = users.length;
  const activeLast7Days = users.filter(u => {
    const lastActive = new Date(u.last_active).getTime();
    const sevenDaysAgo = new Date().getTime() - (7 * 24 * 60 * 60 * 1000);
    return lastActive >= sevenDaysAgo;
  }).length;

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.user_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-blue-600" />
              {t("admin_panel_title")}
            </h1>
            <p className="text-slate-500 text-sm mt-1 font-medium">{t("admin_panel_desc")}</p>
          </div>
          <Button onClick={() => window.location.href = "/"} variant="outline" className="bg-white border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl shadow-sm h-10">
            <ArrowLeft className="mr-2 h-4 w-4" /> {t("exit_btn")}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-white border-slate-200 shadow-sm rounded-2xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{t("total_users")}</p>
                <div className="p-2 bg-blue-50 rounded-lg"><Users className="h-4 w-4 text-blue-600" /></div>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-bold text-slate-900">{totalUsers}</span>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-slate-200 shadow-sm rounded-2xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{t("active_7_days")}</p>
                <div className="p-2 bg-emerald-50 rounded-lg"><Activity className="h-4 w-4 text-emerald-600" /></div>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-bold text-slate-900">{activeLast7Days}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white">
            <h2 className="text-base font-bold text-slate-800">{t("registered_users")}</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t("search_user_placeholder")} 
                className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all w-64 bg-slate-50"
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase tracking-wider bg-slate-50/80 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-bold">{t("table_account")}</th>
                  <th className="px-6 py-4 font-bold">{t("table_joined")}</th>
                  <th className="px-6 py-4 font-bold">{t("table_last_active")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingData ? (
                  <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-500 font-medium">{t("loading_info")}</td></tr>
                ) : filteredUsers.length === 0 ? (
                  <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-500 font-medium">{t("no_user_found")}</td></tr>
                ) : (
                  filteredUsers.map((user) => {
                    const lastActiveTime = new Date(user.last_active).getTime();
                    const now = new Date().getTime();
                    const diffInMinutes = (now - lastActiveTime) / (1000 * 60);
                    const isOnline = diffInMinutes < 15; 

                    return (
                      <tr key={user.user_id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900 flex items-center gap-2">
                            {user.email}
                            {user.is_admin && <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200 text-[9px] px-1.5 h-4 font-bold">ADMIN</Badge>}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 font-mono">{user.user_id}</div>
                        </td>
                        <td className="px-6 py-4 text-slate-600 font-medium whitespace-nowrap">{formatDate(user.joined_at)}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 text-slate-600 font-medium whitespace-nowrap">
                            
                            <span className="relative flex h-2 w-2" title={isOnline ? t("online_now") : t("offline")}>
                              {isOnline && (
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              )}
                              <span className={`relative inline-flex rounded-full h-2 w-2 ${isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                            </span>

                            {formatDate(user.last_active)}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function AdminBackoffice() {
  return (
    <AuthProvider>
      <BackofficeContent />
    </AuthProvider>
  );
}