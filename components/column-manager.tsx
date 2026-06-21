"use client";

import { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Settings,
  Trash2,
  Edit,
  GripVertical,
  Columns3,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "./auth-provider";
import { useLanguage } from "./language-provider";
import {
  supabase,
  isSupabaseAvailable,
  safeSupabaseOperation,
  type CustomColumn,
} from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface ColumnManagerProps {
  columns: CustomColumn[];
  onColumnsChange: () => void;
}

const colorOptions = [
  { value: "bg-blue-100 text-blue-800", labelKey: "color_blue", preview: "bg-blue-400" },
  { value: "bg-green-100 text-green-800", labelKey: "color_green", preview: "bg-green-400" },
  { value: "bg-yellow-100 text-yellow-800", labelKey: "color_yellow", preview: "bg-yellow-400" },
  { value: "bg-red-100 text-red-800", labelKey: "color_red", preview: "bg-red-400" },
  { value: "bg-purple-100 text-purple-800", labelKey: "color_purple", preview: "bg-purple-400" },
  { value: "bg-orange-100 text-orange-800", labelKey: "color_orange", preview: "bg-orange-400" },
  { value: "bg-pink-100 text-pink-800", labelKey: "color_pink", preview: "bg-pink-400" },
  { value: "bg-slate-100 text-slate-800", labelKey: "color_gray", preview: "bg-slate-400" },
];

const iconOptions = [
  "📁", "📋", "⚡", "🔥", "⭐", "🎯", "📌", "🚀", 
  "💼", "📊", "🔔", "✅", "⏳", "🔄", "📝", "💡",
];

function SortableColumnItem({
  column,
  onEdit,
  onDelete,
}: {
  column: CustomColumn;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useLanguage();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-3.5 border border-slate-100 rounded-xl bg-white transition-all ${
        isDragging
          ? "shadow-xl ring-2 ring-blue-400/20 opacity-95 scale-[1.02]"
          : "hover:border-slate-200 hover:shadow-sm"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
        >
          <GripVertical className="h-4 w-4" />
        </div>
        <div className="h-10 w-10 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center text-xl shadow-sm">
          {column.icon}
        </div>
        <div className="flex flex-col">
          <p className="font-bold text-sm text-slate-800">{column.name}</p>
          <div className="mt-1">
            <Badge
              className={`text-[10px] font-semibold px-1.5 py-0 border-none ${column.color} bg-opacity-50`}
              variant="outline"
            >
              {t("custom_badge")}
            </Badge>
          </div>
        </div>
      </div>
      <div className="flex gap-1.5 pr-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onEdit}
          className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function ColumnManager({
  columns,
  onColumnsChange,
}: ColumnManagerProps) {
  const { account } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<CustomColumn | null>(null);

  const [columnToDelete, setColumnToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const [localColumns, setLocalColumns] = useState<CustomColumn[]>(columns);
  const [newColumn, setNewColumn] = useState({
    name: "",
    color: "bg-blue-100 text-blue-800",
    icon: "📁",
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    setLocalColumns(columns);
  }, [columns]);

  if (!isSupabaseAvailable()) return null;

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = localColumns.findIndex((col) => col.id === active.id);
      const newIndex = localColumns.findIndex((col) => col.id === over?.id);

      const newOrder = arrayMove(localColumns, oldIndex, newIndex);
      setLocalColumns(newOrder);

      try {
        await safeSupabaseOperation(async () => {
          const updates = newOrder.map((col, index) =>
            supabase!
              .from("custom_columns")
              .update({ position: index })
              .eq("id", col.id),
          );
          await Promise.all(updates);
          return true;
        }, false);
        onColumnsChange();
      } catch (error) {
        console.error("Erro ao reordenar:", error);
        toast({
          title: t("error_title"),
          description: t("error_reorder"),
          variant: "destructive",
        });
        setLocalColumns(columns);
      }
    }
  };

  const createColumn = async () => {
    if (!account || !newColumn.name.trim()) return;
    try {
      const result = await safeSupabaseOperation(async () => {
        const { error } = await supabase!.from("custom_columns").insert({
          user_id: account.homeAccountId,
          name: newColumn.name.trim(),
          color: newColumn.color,
          icon: newColumn.icon,
          position: columns.length,
        });
        if (error) throw error;
        return true;
      }, false);
      
      if (result) {
        toast({
          title: t("toast_col_created"),
          description: t("toast_col_created_desc").replace("{name}", newColumn.name),
        });
        setNewColumn({
          name: "",
          color: "bg-blue-100 text-blue-800",
          icon: "📁",
        });
        setIsCreateOpen(false);
        onColumnsChange();
      }
    } catch (error) {
      toast({
        title: t("error_title"),
        description: t("error_create_col"),
        variant: "destructive",
      });
    }
  };

  const updateColumn = async (column: CustomColumn) => {
    if (!account) return;
    try {
      const result = await safeSupabaseOperation(async () => {
        const { error } = await supabase!
          .from("custom_columns")
          .update({ name: column.name, color: column.color, icon: column.icon })
          .eq("id", column.id)
          .eq("user_id", account.homeAccountId);
        if (error) throw error;
        return true;
      }, false);
      
      if (result) {
        toast({
          title: t("toast_col_updated"),
          description: t("toast_col_updated_desc").replace("{name}", column.name),
        });
        setEditingColumn(null);
        onColumnsChange();
      }
    } catch (error) {
      toast({
        title: t("error_title"),
        description: t("error_update_col"),
        variant: "destructive",
      });
    }
  };

  const confirmDeleteColumn = async () => {
    if (!account || !columnToDelete) return;

    try {
      const result = await safeSupabaseOperation(async () => {
        await supabase!
          .from("email_metadata")
          .update({ column_id: null })
          .eq("column_id", columnToDelete.id)
          .eq("user_id", account.homeAccountId);
        const { error } = await supabase!
          .from("custom_columns")
          .delete()
          .eq("id", columnToDelete.id)
          .eq("user_id", account.homeAccountId);
        if (error) throw error;
        return true;
      }, false);

      if (result) {
        toast({
          title: t("toast_col_deleted"),
          description: t("toast_col_deleted_desc").replace("{name}", columnToDelete.name),
        });
        setColumnToDelete(null);
        onColumnsChange();
      }
    } catch (error) {
      toast({
        title: t("error_title"),
        description: t("error_delete_col"),
        variant: "destructive",
      });
      setColumnToDelete(null);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start rounded-xl font-medium text-slate-600 border-slate-200 hover:bg-slate-50"
          >
            <Columns3 className="h-4 w-4 mr-2 text-blue-600" />
            {t("manage_columns")}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0 rounded-2xl border-slate-200 shadow-2xl">
          <DialogHeader className="px-8 py-5 border-b border-slate-100 bg-slate-50/50">
            <DialogTitle className="text-xl font-bold text-slate-800">
              {t("kanban_org_title")}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 custom-scrollbar bg-slate-50/30">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {t("your_structure")}
              </h3>
              <Button
                onClick={() => setIsCreateOpen(true)}
                size="sm"
                className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm px-4"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("new_col_btn")}
              </Button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3.5 border border-slate-200/60 rounded-xl bg-slate-100/50 opacity-80">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 px-2">
                    <GripVertical className="h-4 w-4 text-slate-300" />
                  </div>
                  <div className="h-10 w-10 bg-white rounded-xl border border-slate-200/50 flex items-center justify-center text-xl shadow-sm">
                    📥
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-600">
                      {t("col_inbox")}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                      {t("inbox_desc")}
                    </p>
                  </div>
                </div>
                <Badge className="bg-blue-100/50 text-blue-700 border-none shadow-none text-[10px] uppercase font-bold tracking-wide mr-2">
                  {t("system_badge")}
                </Badge>
              </div>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={localColumns.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {localColumns.map((column) => (
                    <SortableColumnItem
                      key={column.id}
                      column={column}
                      onEdit={() => setEditingColumn(column)}
                      onDelete={() =>
                        setColumnToDelete({ id: column.id, name: column.name })
                      }
                    />
                  ))}
                </SortableContext>
              </DndContext>

              {columns.length === 0 && (
                <div className="text-center py-10 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-white/50">
                  <p className="font-medium">{t("empty_kanban")}</p>
                  <p className="text-xs mt-1">
                    {t("empty_kanban_desc")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md p-0 rounded-2xl overflow-hidden border-slate-200 shadow-2xl">
          <DialogHeader className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <DialogTitle className="text-lg font-bold text-slate-800">
              {t("create_col_title")}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-6 bg-white">
            <div className="space-y-2">
              <Label
                htmlFor="column-name"
                className="text-xs font-bold text-slate-400 uppercase tracking-wider"
              >
                {t("col_name_label")}
              </Label>
              <Input
                id="column-name"
                value={newColumn.name}
                onChange={(e) =>
                  setNewColumn({ ...newColumn, name: e.target.value })
                }
                placeholder={t("col_name_placeholder")}
                className="h-11 rounded-xl bg-slate-50 border-slate-200 shadow-none focus-visible:ring-1 focus-visible:ring-blue-400 focus-visible:bg-white font-medium"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {t("visual_id_label")}
              </Label>
              <div className="grid grid-cols-4 gap-2.5 mt-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    onClick={() =>
                      setNewColumn({ ...newColumn, color: color.value })
                    }
                    className={`p-2 rounded-xl border transition-all flex flex-col items-center justify-center ${
                      newColumn.color === color.value
                        ? "border-blue-500 ring-1 ring-blue-500 bg-blue-50/30"
                        : "border-slate-100 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div
                      className={`w-full h-6 rounded-md ${color.preview} mb-1.5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)]`}
                    ></div>
                    <span className="text-[10px] font-bold text-slate-600">
                      {/* @ts-ignore */}
                      {t(color.labelKey)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {t("icon_label")}
              </Label>
              <div className="grid grid-cols-8 gap-2 mt-2">
                {iconOptions.map((icon) => (
                  <button
                    key={icon}
                    onClick={() => setNewColumn({ ...newColumn, icon })}
                    className={`h-10 text-xl rounded-xl border transition-all flex items-center justify-center ${
                      newColumn.icon === icon
                        ? "border-blue-500 ring-1 ring-blue-500 bg-blue-50/30"
                        : "border-slate-100 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                variant="ghost"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-xl font-semibold text-slate-500 hover:bg-slate-100"
              >
                {t("cancel_btn")}
              </Button>
              <Button
                onClick={createColumn}
                disabled={!newColumn.name.trim()}
                className="rounded-xl px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-200"
              >
                {t("save_btn")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {editingColumn && (
        <Dialog
          open={!!editingColumn}
          onOpenChange={() => setEditingColumn(null)}
        >
          <DialogContent className="sm:max-w-md p-0 rounded-2xl overflow-hidden border-slate-200 shadow-2xl">
            <DialogHeader className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <DialogTitle className="text-lg font-bold text-slate-800">
                {t("edit_col_title")}
              </DialogTitle>
            </DialogHeader>
            <div className="p-6 space-y-6 bg-white">
              <div className="space-y-2">
                <Label
                  htmlFor="edit-column-name"
                  className="text-xs font-bold text-slate-400 uppercase tracking-wider"
                >
                  {t("col_name_label")}
                </Label>
                <Input
                  id="edit-column-name"
                  value={editingColumn.name}
                  onChange={(e) =>
                    setEditingColumn({ ...editingColumn, name: e.target.value })
                  }
                  className="h-11 rounded-xl bg-slate-50 border-slate-200 shadow-none focus-visible:ring-1 focus-visible:ring-blue-400 focus-visible:bg-white font-medium"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {t("visual_id_label")}
                </Label>
                <div className="grid grid-cols-4 gap-2.5 mt-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      onClick={() =>
                        setEditingColumn({
                          ...editingColumn,
                          color: color.value,
                        })
                      }
                      className={`p-2 rounded-xl border transition-all flex flex-col items-center justify-center ${
                        editingColumn.color === color.value
                          ? "border-blue-500 ring-1 ring-blue-500 bg-blue-50/30"
                          : "border-slate-100 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div
                        className={`w-full h-6 rounded-md ${color.preview} mb-1.5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)]`}
                      ></div>
                      <span className="text-[10px] font-bold text-slate-600">
                        {/* @ts-ignore */}
                        {t(color.labelKey)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {t("icon_label")}
                </Label>
                <div className="grid grid-cols-8 gap-2 mt-2">
                  {iconOptions.map((icon) => (
                    <button
                      key={icon}
                      onClick={() =>
                        setEditingColumn({ ...editingColumn, icon })
                      }
                      className={`h-10 text-xl rounded-xl border transition-all flex items-center justify-center ${
                        editingColumn.icon === icon
                          ? "border-blue-500 ring-1 ring-blue-500 bg-blue-50/30"
                          : "border-slate-100 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button
                  variant="ghost"
                  onClick={() => setEditingColumn(null)}
                  className="rounded-xl font-semibold text-slate-500 hover:bg-slate-100"
                >
                  {t("cancel_btn")}
                </Button>
                <Button
                  onClick={() => updateColumn(editingColumn)}
                  className="rounded-xl px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-200"
                >
                  {t("save_changes_btn")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Dialog
        open={!!columnToDelete}
        onOpenChange={(open) => !open && setColumnToDelete(null)}
      >
        <DialogContent className="sm:max-w-md p-0 rounded-2xl overflow-hidden border-slate-200 shadow-2xl">
          <DialogHeader className="px-6 py-4 border-b border-red-100 bg-red-50/50">
            <DialogTitle className="text-lg font-bold text-red-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> {t("delete_col_title")}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4 bg-white">
            <p className="text-slate-700 font-medium">
              {t("delete_col_confirm")}{" "}
              <strong className="text-slate-900">
                "{columnToDelete?.name}"
              </strong>
              ?
            </p>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm text-slate-500 leading-relaxed">
              {t("delete_col_warn")}{" "}
              <strong className="font-semibold text-slate-700">
                {t("col_inbox")}
              </strong>
              .
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                variant="ghost"
                onClick={() => setColumnToDelete(null)}
                className="rounded-xl font-semibold text-slate-500 hover:bg-slate-100"
              >
                {t("cancel_btn")}
              </Button>
              <Button
                onClick={confirmDeleteColumn}
                className="rounded-xl px-6 bg-red-600 hover:bg-red-700 text-white font-bold shadow-md shadow-red-200"
              >
                {t("delete_col_title")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}