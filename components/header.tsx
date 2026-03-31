// "use client";

// import { useState, useEffect } from "react";
// import { useAuth } from "./auth-provider";
// import { Button } from "@/components/ui/button";
// import { Mail, LogOut, Loader2 } from "lucide-react";
// import { UserAvatar } from "./user-avatar";
// import { GraphService } from "@/lib/microsoft-graph";

// export function Header() {
//   const { account, accessToken, logout, isLoading } = useAuth();
//   const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

//   useEffect(() => {
//     let isMounted = true;
//     const fetchMyPhoto = async () => {
//       if (!accessToken || !account?.username) return;
//       try {
//         const graphService = new GraphService(accessToken);
//         const photoUrl = await graphService.getProfilePhoto(account.username);
//         if (isMounted && photoUrl) setAvatarUrl(photoUrl);
//       } catch (error) {}
//     };
//     fetchMyPhoto();
//     return () => {
//       isMounted = false;
//     };
//   }, [accessToken, account?.username]);

//   if (isLoading) {
//     return (
//       <header className="border-b bg-background/95 backdrop-blur px-10 h-16 flex items-center justify-between">
//         <div className="flex items-center gap-2">
//           <Mail className="h-6 w-6 text-primary" />
//           <h1 className="text-xl font-bold">Outlook Kanban</h1>
//         </div>
//         <div className="flex items-center gap-2">
//           <Loader2 className="h-4 w-4 animate-spin" />
//           <span className="text-sm">Carregando...</span>
//         </div>
//       </header>
//     );
//   }

//   return (
//     <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-10">
//       <div className="flex h-16 items-center justify-between">
//         <div className="flex items-center gap-2">
//           <Mail className="h-6 w-6 text-primary" />
//           <h1 className="text-xl font-bold text-slate-800">Outlook Kanban</h1>
//         </div>

//         <div className="flex items-center gap-4">
//           {account && (
//             <>
//               <div className="flex items-center gap-3">
//                 <UserAvatar
//                   name={account.name}
//                   email={account.username || ""}
//                   imageUrl={avatarUrl}
//                   className="h-8 w-8"
//                 />
//                 <div className="hidden sm:block">
//                   <p className="text-sm font-bold text-slate-900 leading-tight">
//                     {account.name || account.username}
//                   </p>
//                   <p className="text-[10px] text-muted-foreground">
//                     {account.username}
//                   </p>
//                 </div>
//               </div>
//               <Button
//                 variant="outline"
//                 size="sm"
//                 onClick={logout}
//                 className="rounded-xl border-slate-200 hover:bg-slate-50 text-slate-600"
//               >
//                 <LogOut className="h-4 w-4 mr-2 text-slate-400" />
//                 Sair
//               </Button>
//             </>
//           )}
//         </div>
//       </div>
//     </header>
//   );
// }
