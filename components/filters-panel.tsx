"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { X, Filter, RotateCcw } from "lucide-react"

export interface EmailFilters {
  search: string
  sender: string
  subject: string
  tags: string[]
  priority: string[]
  hasAttachments: boolean | null
  isRead: boolean | null
  dateRange: {
    from: string
    to: string
  }
}

interface FiltersPanelProps {
  filters: EmailFilters
  onFiltersChange: (filters: EmailFilters) => void
  availableTags: string[]
  isVisible: boolean
  onToggleVisibility: () => void
}

export function FiltersPanel({
  filters,
  onFiltersChange,
  availableTags,
  isVisible,
  onToggleVisibility,
}: FiltersPanelProps) {
  const [tempTag, setTempTag] = useState("")

  const updateFilter = (key: keyof EmailFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    })
  }

  const addTag = (tag: string) => {
    if (tag && !filters.tags.includes(tag)) {
      updateFilter("tags", [...filters.tags, tag])
    }
    setTempTag("")
  }

  const removeTag = (tag: string) => {
    updateFilter(
      "tags",
      filters.tags.filter((t) => t !== tag),
    )
  }

  const togglePriority = (priority: string) => {
    const newPriorities = filters.priority.includes(priority)
      ? filters.priority.filter((p) => p !== priority)
      : [...filters.priority, priority]
    updateFilter("priority", newPriorities)
  }

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
    })
  }

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
    )
  }

  if (!isVisible) {
    return (
      <Button variant="outline" size="sm" onClick={onToggleVisibility} className="mb-4 bg-transparent">
        <Filter className="h-4 w-4 mr-2" />
        Mostrar Filtros
        {hasActiveFilters() && (
          <Badge variant="secondary" className="ml-2">
            Ativo
          </Badge>
        )}
      </Button>
    )
  }

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
          <div className="flex gap-2">
            {hasActiveFilters() && (
              <Button variant="outline" size="sm" onClick={clearAllFilters}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Limpar
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onToggleVisibility}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Busca geral */}
          <div>
            <Label htmlFor="search">Busca Geral</Label>
            <Input
              id="search"
              value={filters.search}
              onChange={(e) => updateFilter("search", e.target.value)}
              placeholder="Buscar em assunto, remetente, conteúdo..."
            />
          </div>

          {/* Remetente */}
          <div>
            <Label htmlFor="sender">Remetente</Label>
            <Input
              id="sender"
              value={filters.sender}
              onChange={(e) => updateFilter("sender", e.target.value)}
              placeholder="email@exemplo.com"
            />
          </div>

          {/* Assunto */}
          <div>
            <Label htmlFor="subject">Assunto</Label>
            <Input
              id="subject"
              value={filters.subject}
              onChange={(e) => updateFilter("subject", e.target.value)}
              placeholder="Palavras no assunto"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tags */}
          <div>
            <Label>Tags</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={tempTag}
                onChange={(e) => setTempTag(e.target.value)}
                placeholder="Adicionar tag"
                onKeyPress={(e) => e.key === "Enter" && addTag(tempTag)}
              />
              <Button size="sm" onClick={() => addTag(tempTag)}>
                +
              </Button>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {filters.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                  {tag} ×
                </Badge>
              ))}
            </div>
            {availableTags.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground mb-1">Tags disponíveis:</p>
                <div className="flex flex-wrap gap-1">
                  {availableTags
                    .filter((tag) => !filters.tags.includes(tag))
                    .slice(0, 10)
                    .map((tag) => (
                      <Badge key={tag} variant="outline" className="cursor-pointer text-xs" onClick={() => addTag(tag)}>
                        {tag}
                      </Badge>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Prioridade */}
          <div>
            <Label>Prioridade</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {[
                { value: "baixa", label: "🟢 Baixa" },
                { value: "media", label: "🟡 Média" },
                { value: "alta", label: "🟠 Alta" },
                { value: "urgente", label: "🔴 Urgente" },
              ].map((priority) => (
                <div key={priority.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={priority.value}
                    checked={filters.priority.includes(priority.value)}
                    onCheckedChange={() => togglePriority(priority.value)}
                  />
                  <Label htmlFor={priority.value} className="text-sm">
                    {priority.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Anexos */}
          <div>
            <Label>Anexos</Label>
            <Select
              value={filters.hasAttachments === null ? "all" : filters.hasAttachments ? "yes" : "no"}
              onValueChange={(value) => updateFilter("hasAttachments", value === "all" ? null : value === "yes")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="yes">Com anexos</SelectItem>
                <SelectItem value="no">Sem anexos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status de leitura */}
          <div>
            <Label>Status</Label>
            <Select
              value={filters.isRead === null ? "all" : filters.isRead ? "read" : "unread"}
              onValueChange={(value) => updateFilter("isRead", value === "all" ? null : value === "read")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="read">Lidos</SelectItem>
                <SelectItem value="unread">Não lidos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Período */}
          <div>
            <Label>Período</Label>
            <div className="flex gap-1">
              <Input
                type="date"
                value={filters.dateRange.from}
                onChange={(e) => updateFilter("dateRange", { ...filters.dateRange, from: e.target.value })}
              />
              <Input
                type="date"
                value={filters.dateRange.to}
                onChange={(e) => updateFilter("dateRange", { ...filters.dateRange, to: e.target.value })}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
