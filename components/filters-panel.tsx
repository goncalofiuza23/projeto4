"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  X,
  Filter,
  RotateCcw,
  Search,
  User,
  Type,
  Tag as TagIcon,
  Paperclip,
  Mail,
  CalendarDays,
  Plus,
} from "lucide-react";

export interface EmailFilters {
  search: string;
  sender: string;
  subject: string;
  tags: string[];
  priority: string[];
  hasAttachments: boolean | null;
  isRead: boolean | null;
  dateRange: {
    from: string;
    to: string;
  };
}

interface FiltersPanelProps {
  filters: EmailFilters;
  onFiltersChange: (filters: EmailFilters) => void;
  availableTags: string[];
  isVisible: boolean;
  onToggleVisibility: () => void;
}

export function FiltersPanel({
  filters,
  onFiltersChange,
  availableTags,
  isVisible,
  onToggleVisibility,
}: FiltersPanelProps) {
  const [tempTag, setTempTag] = useState("");

  const updateFilter = (key: keyof EmailFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const addTag = (tag: string) => {
    if (tag && !filters.tags.includes(tag)) {
      updateFilter("tags", [...filters.tags, tag]);
    }
    setTempTag("");
  };

  const removeTag = (tag: string) => {
    updateFilter(
      "tags",
      filters.tags.filter((t) => t !== tag),
    );
  };

  const togglePriority = (priority: string) => {
    const newPriorities = filters.priority.includes(priority)
      ? filters.priority.filter((p) => p !== priority)
      : [...filters.priority, priority];
    updateFilter("priority", newPriorities);
  };

  const clearAllFilters = () => {
    onFiltersChange({
      search: "",
      sender: "",
      subject: "",
      tags: [],
      priority: [],
      hasAttachments: null,
      isRead: null,
      dateRange: {
        from: "",
        to: "",
      },
    });
  };

  const hasActiveFilters = () => {
    return (
      filters.search ||
      filters.sender ||
      filters.subject ||
      filters.tags.length > 0 ||
      filters.priority.length > 0 ||
      filters.hasAttachments !== null ||
      filters.isRead !== null ||
      filters.dateRange.from ||
      filters.dateRange.to
    );
  };

  const activeFiltersCount = [
    filters.search,
    filters.sender,
    filters.subject,
    filters.tags.length > 0,
    filters.priority.length > 0,
    filters.hasAttachments !== null,
    filters.isRead !== null,
    filters.dateRange.from || filters.dateRange.to,
  ].filter(Boolean).length;

  if (!isVisible) {
    return (
      <Button
        variant="outline"
        onClick={onToggleVisibility}
        className="mb-6 bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-sm hover:shadow-md hover:bg-white text-slate-600 rounded-xl transition-all h-10 px-4"
      >
        <Filter className="h-4 w-4 mr-2 text-blue-500" />
        <span className="font-semibold">Mostrar Filtros</span>
        {hasActiveFilters() && (
          <Badge className="ml-3 bg-blue-100 text-blue-700 hover:bg-blue-200 border-none rounded-full px-2 py-0.5 text-xs font-bold">
            {activeFiltersCount} ativo{activeFiltersCount > 1 ? "s" : ""}
          </Badge>
        )}
      </Button>
    );
  }

  const priorities = [
    {
      value: "baixa",
      label: "Baixa",
      icon: "🟢",
      color: "hover:bg-green-50 text-green-700 border-green-200 bg-green-50/50",
    },
    {
      value: "media",
      label: "Média",
      icon: "🟡",
      color:
        "hover:bg-yellow-50 text-yellow-700 border-yellow-200 bg-yellow-50/50",
    },
    {
      value: "alta",
      label: "Alta",
      icon: "🟠",
      color:
        "hover:bg-orange-50 text-orange-700 border-orange-200 bg-orange-50/50",
    },
    {
      value: "urgente",
      label: "Urgente",
      icon: "🔴",
      color: "hover:bg-red-50 text-red-700 border-red-200 bg-red-50/50",
    },
  ];

  return (
    <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="bg-white/70 backdrop-blur-xl border border-slate-200/60 shadow-xl rounded-2xl overflow-hidden">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/50 bg-slate-50/30">
          <div className="flex items-center gap-2">
            <div className="bg-blue-100 p-1.5 rounded-lg">
              <Filter className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="font-bold text-slate-800 text-lg tracking-tight">
              Filtros de Pesquisa
            </h3>
          </div>
          <div className="flex items-center gap-3">
            {hasActiveFilters() && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-slate-500 hover:text-red-600 hover:bg-red-50 h-8 rounded-lg text-xs font-bold transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                Limpar Tudo
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleVisibility}
              className="h-8 w-8 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-lg transition-colors"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Corpo dos Filtros */}
        <div className="p-6 space-y-6">
          {/* Linha 1: Buscas de Texto */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label
                htmlFor="search"
                className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5"
              >
                <Search className="h-3.5 w-3.5" /> Busca Geral
              </Label>
              <Input
                id="search"
                value={filters.search}
                onChange={(e) => updateFilter("search", e.target.value)}
                placeholder="Ex: fatura, relatório, assunto..."
                className="bg-white/60 border-slate-200 h-10 rounded-xl focus-visible:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="sender"
                className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5"
              >
                <User className="h-3.5 w-3.5" /> Remetente
              </Label>
              <Input
                id="sender"
                value={filters.sender}
                onChange={(e) => updateFilter("sender", e.target.value)}
                placeholder="email@exemplo.com ou Nome"
                className="bg-white/60 border-slate-200 h-10 rounded-xl focus-visible:ring-blue-500"
              />
            </div>
          </div>

          <div className="h-px w-full bg-slate-200/50" />

          {/* Linha 2: Tags e Prioridade */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-3">
              <Label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                <TagIcon className="h-3.5 w-3.5" /> Tags
              </Label>
              <div className="flex gap-2">
                <Input
                  value={tempTag}
                  onChange={(e) => setTempTag(e.target.value)}
                  placeholder="Escreva e prima Enter..."
                  onKeyPress={(e) => e.key === "Enter" && addTag(tempTag)}
                  className="bg-white/60 border-slate-200 h-10 rounded-xl focus-visible:ring-blue-500"
                />
                <Button
                  onClick={() => addTag(tempTag)}
                  className="h-10 w-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-white shrink-0 p-0"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                {filters.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="bg-blue-50 hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-blue-700 border border-blue-200 rounded-lg px-3 py-1 cursor-pointer transition-colors group flex items-center gap-1"
                    onClick={() => removeTag(tag)}
                  >
                    {tag}
                    <X className="h-3 w-3 opacity-50 group-hover:opacity-100" />
                  </Badge>
                ))}
              </div>

              {availableTags.length > 0 && (
                <div className="mt-4 p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">
                    Sugestões rápidas
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {availableTags
                      .filter((tag) => !filters.tags.includes(tag))
                      .slice(0, 8)
                      .map((tag) => (
                        <button
                          key={tag}
                          onClick={() => addTag(tag)}
                          className="text-xs text-slate-500 bg-white border border-slate-200 hover:border-blue-300 hover:text-blue-600 rounded-md px-2 py-0.5 transition-colors"
                        >
                          + {tag}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-bold text-slate-500 uppercase">
                Prioridade
              </Label>
              <div className="flex flex-wrap gap-3 mt-1">
                {priorities.map((p) => {
                  const isActive = filters.priority.includes(p.value);
                  return (
                    <button
                      key={p.value}
                      onClick={() => togglePriority(p.value)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-200 font-medium text-sm ${
                        isActive
                          ? `${p.color} ring-2 ring-offset-2 ring-slate-200 shadow-sm scale-105`
                          : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <span>{p.icon}</span>
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="h-px w-full bg-slate-200/50" />

          {/* Linha 3: Status, Anexos, Data */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                <Paperclip className="h-3.5 w-3.5" /> Anexos
              </Label>
              <Select
                value={
                  filters.hasAttachments === null
                    ? "all"
                    : filters.hasAttachments
                      ? "yes"
                      : "no"
                }
                onValueChange={(value) =>
                  updateFilter(
                    "hasAttachments",
                    value === "all" ? null : value === "yes",
                  )
                }
              >
                <SelectTrigger className="bg-white/60 border-slate-200 h-10 rounded-xl focus:ring-blue-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all" className="rounded-lg">
                    Todos os emails
                  </SelectItem>
                  <SelectItem value="yes" className="rounded-lg">
                    Apenas com anexos
                  </SelectItem>
                  <SelectItem value="no" className="rounded-lg">
                    Sem anexos
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> Estado de Leitura
              </Label>
              <Select
                value={
                  filters.isRead === null
                    ? "all"
                    : filters.isRead
                      ? "read"
                      : "unread"
                }
                onValueChange={(value) =>
                  updateFilter(
                    "isRead",
                    value === "all" ? null : value === "read",
                  )
                }
              >
                <SelectTrigger className="bg-white/60 border-slate-200 h-10 rounded-xl focus:ring-blue-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all" className="rounded-lg">
                    Lidos e Não Lidos
                  </SelectItem>
                  <SelectItem value="read" className="rounded-lg">
                    Apenas Lidos
                  </SelectItem>
                  <SelectItem value="unread" className="rounded-lg">
                    Apenas Não Lidos
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" /> Período
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={filters.dateRange.from}
                  onChange={(e) =>
                    updateFilter("dateRange", {
                      ...filters.dateRange,
                      from: e.target.value,
                    })
                  }
                  className="bg-white/60 border-slate-200 h-10 rounded-xl focus-visible:ring-blue-500 text-xs"
                />
                <span className="text-slate-400 font-medium">a</span>
                <Input
                  type="date"
                  value={filters.dateRange.to}
                  onChange={(e) =>
                    updateFilter("dateRange", {
                      ...filters.dateRange,
                      to: e.target.value,
                    })
                  }
                  className="bg-white/60 border-slate-200 h-10 rounded-xl focus-visible:ring-blue-500 text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
