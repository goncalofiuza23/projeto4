"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { UserAvatar } from "./user-avatar";
import { BACKGROUNDS } from "./dashboard-layout";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: (open: boolean) => void;
  account: any;
  avatarUrl: string | null;
  currentBgId: string;
  onBgChange: (bgId: string) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  account,
  avatarUrl,
  currentBgId,
  onBgChange,
}: SettingsModalProps) {
  const currentBg =
    BACKGROUNDS.find((b) => b.id === currentBgId) || BACKGROUNDS[0];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Definições Gerais</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {/* Perfil */}
          <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <UserAvatar
              name={account?.name}
              email={account?.username || ""}
              imageUrl={avatarUrl}
              className="h-12 w-12 shadow-sm"
            />
            <div className="min-w-0">
              <p className="font-bold text-slate-900 truncate">
                {account?.name}
              </p>
              <p className="text-sm text-slate-500 truncate">
                {account?.username}
              </p>
            </div>
          </div>

          {/* Tema */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500 uppercase">
              Tema do Painel
            </Label>
            <Select onValueChange={onBgChange} value={currentBgId}>
              <SelectTrigger className="w-full h-11 bg-white border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-2 truncate">
                  <div
                    className={`w-4 h-4 rounded-full shrink-0 shadow-sm border border-slate-200/50 ${
                      currentBg.type === "color"
                        ? currentBg.class
                        : "bg-slate-300"
                    }`}
                    style={
                      currentBg.type === "image"
                        ? {
                            backgroundImage: `url(${currentBg.url})`,
                            backgroundSize: "cover",
                          }
                        : {}
                    }
                  />
                  <span className="truncate">{currentBg.name}</span>
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {BACKGROUNDS.map((bg) => (
                  <SelectItem
                    key={bg.id}
                    value={bg.id}
                    className="text-sm py-2"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded-full shrink-0 shadow-sm border border-slate-200/50 ${
                          bg.type === "color" ? bg.class : "bg-slate-300"
                        }`}
                        style={
                          bg.type === "image"
                            ? {
                                backgroundImage: `url(${bg.url})`,
                                backgroundSize: "cover",
                              }
                            : {}
                        }
                      />
                      {bg.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
