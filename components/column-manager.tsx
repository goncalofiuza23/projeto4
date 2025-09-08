"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Plus, Settings, Trash2, Edit, GripVertical } from "lucide-react"
import { useAuth } from "./auth-provider"
import { supabase, isSupabaseAvailable, safeSupabaseOperation, type CustomColumn } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

interface ColumnManagerProps {
  columns: CustomColumn[]
  onColumnsChange: () => void
}

const colorOptions = [
  { value: "bg-blue-100 text-blue-800", label: "Azul", preview: "bg-blue-100" },
  { value: "bg-green-100 text-green-800", label: "Verde", preview: "bg-green-100" },
  { value: "bg-yellow-100 text-yellow-800", label: "Amarelo", preview: "bg-yellow-100" },
  { value: "bg-red-100 text-red-800", label: "Vermelho", preview: "bg-red-100" },
  { value: "bg-purple-100 text-purple-800", label: "Roxo", preview: "bg-purple-100" },
  { value: "bg-orange-100 text-orange-800", label: "Laranja", preview: "bg-orange-100" },
  { value: "bg-pink-100 text-pink-800", label: "Rosa", preview: "bg-pink-100" },
  { value: "bg-gray-100 text-gray-800", label: "Cinza", preview: "bg-gray-100" },
]

const iconOptions = ["📁", "📋", "⚡", "🔥", "⭐", "🎯", "📌", "🚀", "💼", "📊", "🔔", "✅", "⏳", "🔄", "📝", "💡"]

export function ColumnManager({ columns, onColumnsChange }: ColumnManagerProps) {
  const { account } = useAuth()
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingColumn, setEditingColumn] = useState<CustomColumn | null>(null)
  const [newColumn, setNewColumn] = useState({
    name: "",
    color: "bg-blue-100 text-blue-800",
    icon: "📁",
  })

  // Não renderizar se Supabase não estiver disponível
  if (!isSupabaseAvailable()) {
    return null
  }

  const createColumn = async () => {
    if (!account || !newColumn.name.trim()) return

    try {
      const result = await safeSupabaseOperation(async () => {
        const { error } = await supabase!.from("custom_columns").insert({
          user_id: account.homeAccountId,
          name: newColumn.name.trim(),
          color: newColumn.color,
          icon: newColumn.icon,
          position: columns.length,
        })

        if (error) throw error
        return true
      })

      if (result) {
        toast({
          title: "Coluna criada",
          description: `A coluna "${newColumn.name}" foi criada com sucesso.`,
        })

        setNewColumn({ name: "", color: "bg-blue-100 text-blue-800", icon: "📁" })
        setIsCreateOpen(false)
        onColumnsChange()
      }
    } catch (error) {
      console.error("Erro ao criar coluna:", error)
      toast({
        title: "Erro",
        description: "Não foi possível criar a coluna.",
        variant: "destructive",
      })
    }
  }

  const updateColumn = async (column: CustomColumn) => {
    if (!account) return

    try {
      const result = await safeSupabaseOperation(async () => {
        const { error } = await supabase!
          .from("custom_columns")
          .update({
            name: column.name,
            color: column.color,
            icon: column.icon,
          })
          .eq("id", column.id)
          .eq("user_id", account.homeAccountId)

        if (error) throw error
        return true
      })

      if (result) {
        toast({
          title: "Coluna atualizada",
          description: `A coluna "${column.name}" foi atualizada com sucesso.`,
        })

        setEditingColumn(null)
        onColumnsChange()
      }
    } catch (error) {
      console.error("Erro ao atualizar coluna:", error)
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a coluna.",
        variant: "destructive",
      })
    }
  }

  const deleteColumn = async (columnId: string, columnName: string) => {
    if (!account) return

    if (
      !confirm(
        `Tem certeza que deseja excluir a coluna "${columnName}"? Os emails nesta coluna voltarão para a Caixa de Entrada.`,
      )
    ) {
      return
    }

    try {
      const result = await safeSupabaseOperation(async () => {
        // Primeiro, mover todos os emails desta coluna para a Caixa de Entrada (column_id = null)
        await supabase!
          .from("email_metadata")
          .update({ column_id: null })
          .eq("column_id", columnId)
          .eq("user_id", account.homeAccountId)

        // Depois, excluir a coluna
        const { error } = await supabase!
          .from("custom_columns")
          .delete()
          .eq("id", columnId)
          .eq("user_id", account.homeAccountId)

        if (error) throw error
        return true
      })

      if (result) {
        toast({
          title: "Coluna excluída",
          description: `A coluna "${columnName}" foi excluída e os emails foram movidos para a Caixa de Entrada.`,
        })

        onColumnsChange()
      }
    } catch (error) {
      console.error("Erro ao excluir coluna:", error)
      toast({
        title: "Erro",
        description: "Não foi possível excluir a coluna.",
        variant: "destructive",
      })
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Gerenciar Colunas
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerenciar Colunas</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Suas Colunas</h3>
              <Button onClick={() => setIsCreateOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nova Coluna
              </Button>
            </div>

            {/* Colunas padrão */}
            <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <span className="text-2xl">📥</span>
                <div>
                  <p className="font-medium">Caixa de Entrada</p>
                  <p className="text-sm text-muted-foreground">Coluna padrão (não pode ser editada)</p>
                </div>
              </div>
              <Badge className="bg-blue-100 text-blue-800">Padrão</Badge>
            </div>

            {/* Colunas personalizadas */}
            {columns.map((column) => (
              <div key={column.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                  <span className="text-2xl">{column.icon}</span>
                  <div>
                    <p className="font-medium">{column.name}</p>
                    <Badge className={column.color} variant="secondary">
                      Personalizada
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditingColumn(column)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => deleteColumn(column.id, column.name)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {columns.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>Você ainda não criou nenhuma coluna personalizada.</p>
                <p className="text-sm">Clique em "Nova Coluna" para começar!</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para criar nova coluna */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Nova Coluna</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="column-name">Nome da Coluna</Label>
              <Input
                id="column-name"
                value={newColumn.name}
                onChange={(e) => setNewColumn({ ...newColumn, name: e.target.value })}
                placeholder="Ex: Em Revisão, Urgente, Arquivados..."
              />
            </div>

            <div>
              <Label>Cor</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setNewColumn({ ...newColumn, color: color.value })}
                    className={`p-2 rounded border text-sm ${
                      newColumn.color === color.value ? "ring-2 ring-primary" : ""
                    }`}
                  >
                    <div className={`w-full h-6 rounded ${color.preview} mb-1`}></div>
                    {color.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Ícone</Label>
              <div className="grid grid-cols-8 gap-2 mt-2">
                {iconOptions.map((icon) => (
                  <button
                    key={icon}
                    onClick={() => setNewColumn({ ...newColumn, icon })}
                    className={`p-2 text-2xl rounded border hover:bg-muted ${
                      newColumn.icon === icon ? "ring-2 ring-primary bg-muted" : ""
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={createColumn} disabled={!newColumn.name.trim()}>
                Criar Coluna
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para editar coluna */}
      {editingColumn && (
        <Dialog open={!!editingColumn} onOpenChange={() => setEditingColumn(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Coluna</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-column-name">Nome da Coluna</Label>
                <Input
                  id="edit-column-name"
                  value={editingColumn.name}
                  onChange={(e) => setEditingColumn({ ...editingColumn, name: e.target.value })}
                />
              </div>

              <div>
                <Label>Cor</Label>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setEditingColumn({ ...editingColumn, color: color.value })}
                      className={`p-2 rounded border text-sm ${
                        editingColumn.color === color.value ? "ring-2 ring-primary" : ""
                      }`}
                    >
                      <div className={`w-full h-6 rounded ${color.preview} mb-1`}></div>
                      {color.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Ícone</Label>
                <div className="grid grid-cols-8 gap-2 mt-2">
                  {iconOptions.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setEditingColumn({ ...editingColumn, icon })}
                      className={`p-2 text-2xl rounded border hover:bg-muted ${
                        editingColumn.icon === icon ? "ring-2 ring-primary bg-muted" : ""
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingColumn(null)}>
                  Cancelar
                </Button>
                <Button onClick={() => updateColumn(editingColumn)}>Salvar Alterações</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
