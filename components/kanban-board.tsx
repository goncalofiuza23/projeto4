"use client"

import { useState, useEffect } from "react"
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { KanbanColumn } from "./kanban-column"
import { EmailThreadCard } from "./email-thread-card"
import { ColumnManager } from "./column-manager"
import { FiltersPanel, type EmailFilters } from "./filters-panel"
import { useAuth } from "./auth-provider"
import { GraphService, type Email, type EmailThread } from "@/lib/microsoft-graph"
import {
  supabase,
  isSupabaseAvailable,
  safeSupabaseOperation,
  type EmailMetadata,
  type CustomColumn,
} from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { RefreshCw, Loader2, AlertCircle, Mail, Database } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Apenas coluna padrão (inbox)
const DEFAULT_COLUMNS = [
  {
    id: "inbox",
    title: "Caixa de Entrada",
    color: "bg-blue-100 text-blue-800",
    icon: "📥",
  },
]

export function KanbanBoard() {
  const { accessToken, account, isLoading: authLoading } = useAuth()
  const { toast } = useToast()
  const [emails, setEmails] = useState<Email[]>([])
  const [threads, setThreads] = useState<EmailThread[]>([])
  const [filteredThreads, setFilteredThreads] = useState<EmailThread[]>([])
  const [emailsMetadata, setEmailsMetadata] = useState<Record<string, EmailMetadata>>({})
  const [customColumns, setCustomColumns] = useState<CustomColumn[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [activeThread, setActiveThread] = useState<EmailThread | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [supabaseError, setSupabaseError] = useState<string | null>(null)

  // Estados dos filtros
  const [filters, setFilters] = useState<EmailFilters>({
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
  const [isFiltersVisible, setIsFiltersVisible] = useState(false)
  const [availableTags, setAvailableTags] = useState<string[]>([])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
  )

  // Verificar disponibilidade do Supabase na inicialização
  useEffect(() => {
    if (!isSupabaseAvailable()) {
      setSupabaseError(
        "Supabase não está configurado. As funcionalidades de colunas personalizadas, tags e prioridades não estarão disponíveis.",
      )
    }
  }, [])

  const loadCustomColumns = async () => {
    if (!account || !isSupabaseAvailable()) return

    try {
      const result = await safeSupabaseOperation(async () => {
        const { data, error } = await supabase!
          .from("custom_columns")
          .select("*")
          .eq("user_id", account.homeAccountId)
          .order("position")

        if (error) throw error
        return data || []
      }, [])

      setCustomColumns(result || [])
    } catch (error) {
      console.error("Erro ao carregar colunas:", error)
    }
  }

  const loadEmails = async () => {
    if (!accessToken || !account) return

    setIsLoading(true)
    setError(null)

    try {
      const graphService = new GraphService(accessToken)
      const fetchedEmails = await graphService.getAllEmails(100)
      setEmails(fetchedEmails)

      // Agrupar emails em threads
      const emailThreads = graphService.groupEmailsIntoThreads(fetchedEmails)
      setThreads(emailThreads)

      // Carregar metadados do Supabase apenas se disponível
      if (isSupabaseAvailable()) {
        const metadata = await safeSupabaseOperation(async () => {
          const { data, error } = await supabase!
            .from("email_metadata")
            .select("*")
            .eq("user_id", account.homeAccountId)

          if (error) throw error
          return data
        }, [])

        const metadataMap: Record<string, EmailMetadata> = {}
        metadata?.forEach((meta) => {
          metadataMap[meta.email_id] = meta
        })
        setEmailsMetadata(metadataMap)

        // Extrair tags disponíveis
        const allTags = new Set<string>()
        metadata?.forEach((meta) => {
          meta.tags.forEach((tag: string) => allTags.add(tag))
        })
        setAvailableTags(Array.from(allTags))
      } else {
        setEmailsMetadata({})
        setAvailableTags([])
      }

      toast({
        title: "Emails carregados",
        description: `${fetchedEmails.length} emails agrupados em ${emailThreads.length} conversas.`,
      })
    } catch (error: any) {
      console.error("Erro ao carregar emails:", error)

      let errorMessage = "Não foi possível carregar os emails."

      if (error.message?.includes("401") || error.message?.includes("Unauthorized")) {
        errorMessage = "Sessão expirada. Faça login novamente."
      } else if (error.message?.includes("403") || error.message?.includes("Forbidden")) {
        errorMessage = "Sem permissão para acessar os emails. Verifique as permissões da aplicação."
      } else if (error.message?.includes("network") || error.message?.includes("fetch")) {
        errorMessage = "Erro de conexão. Verifique sua internet e tente novamente."
      }

      setError(errorMessage)
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const updateEmailMetadata = async (emailId: string, updates: Partial<EmailMetadata>) => {
    if (!account) {
      toast({
        title: "Erro de autenticação",
        description: "Você precisa estar logado para mover emails.",
        variant: "destructive",
      })
      return
    }

    if (!isSupabaseAvailable()) {
      toast({
        title: "Funcionalidade não disponível",
        description: "Supabase não está configurado. Não é possível salvar alterações.",
        variant: "destructive",
      })
      return
    }

    try {
      const existingMetadata = emailsMetadata[emailId]

      const result = await safeSupabaseOperation(async () => {
        if (existingMetadata) {
          const { error } = await supabase!
            .from("email_metadata")
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq("email_id", emailId)
            .eq("user_id", account.homeAccountId)

          if (error) throw error
        } else {
          const newMetadata = {
            email_id: emailId,
            user_id: account.homeAccountId,
            priority: "media" as EmailMetadata["priority"],
            tags: [],
            ...updates,
          }

          const { error } = await supabase!.from("email_metadata").insert(newMetadata)

          if (error) throw error
        }
        return true
      })

      if (result) {
        const updatedMetadata = {
          id: existingMetadata?.id || "",
          email_id: emailId,
          user_id: account.homeAccountId,
          priority: existingMetadata?.priority || "media",
          tags: existingMetadata?.tags || [],
          created_at: existingMetadata?.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...existingMetadata,
          ...updates,
        } as EmailMetadata

        setEmailsMetadata((prev) => ({
          ...prev,
          [emailId]: updatedMetadata,
        }))

        if (updates.tags) {
          setAvailableTags((prev) => {
            const newTags = new Set([...prev, ...updates.tags])
            return Array.from(newTags)
          })
        }
      }
    } catch (error) {
      console.error("Erro ao atualizar metadados:", error)
      toast({
        title: "Erro",
        description: "Não foi possível atualizar os metadados do email.",
        variant: "destructive",
      })
      throw error
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    const thread = threads.find((t) => t.id === event.active.id)
    setActiveThread(thread || null)
    document.body.style.cursor = "grabbing"
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveThread(null)
    document.body.style.cursor = ""

    if (!over) return

    const threadId = active.id as string
    const targetColumnId = over.id as string

    const thread = threads.find((t) => t.id === threadId)
    if (!thread) return

    // Verificar se algum email da thread já está na coluna de destino
    const hasEmailInTargetColumn = thread.emails.some((email) => {
      const metadata = emailsMetadata[email.id]
      if (targetColumnId === "inbox") {
        return !metadata?.column_id
      } else {
        return metadata?.column_id === targetColumnId
      }
    })

    if (hasEmailInTargetColumn) return

    if (!isSupabaseAvailable() && targetColumnId !== "inbox") {
      toast({
        title: "Funcionalidade não disponível",
        description: "Supabase não está configurado. Não é possível mover para colunas personalizadas.",
        variant: "destructive",
      })
      return
    }

    try {
      const updates: Partial<EmailMetadata> = {}

      if (targetColumnId === "inbox") {
        updates.column_id = null
      } else {
        updates.column_id = targetColumnId
      }

      // Atualizar todos os emails da thread
      await Promise.all(thread.emails.map((email) => updateEmailMetadata(email.id, updates)))

      const targetColumn =
        targetColumnId === "inbox" ? DEFAULT_COLUMNS[0] : customColumns.find((c) => c.id === targetColumnId)

      toast({
        title: "Conversa movida com sucesso",
        description: `Conversa "${thread.subject}" movida para "${targetColumn?.title || targetColumn?.name}".`,
      })
    } catch (error) {
      console.error("Erro ao mover conversa:", error)
      toast({
        title: "Erro ao mover conversa",
        description: "Não foi possível mover a conversa. Tente novamente.",
        variant: "destructive",
      })
    }
  }

  const getThreadsByColumn = (columnId: string) => {
    return filteredThreads.filter((thread) => {
      // Verificar se pelo menos um email da thread está na coluna
      return thread.emails.some((email) => {
        const metadata = emailsMetadata[email.id]
        if (columnId === "inbox") {
          return !metadata?.column_id
        } else {
          return metadata?.column_id === columnId
        }
      })
    })
  }

  const handleColumnsChange = () => {
    loadCustomColumns()
  }

  // Aplicar filtros nas threads
  useEffect(() => {
    let filtered = [...threads]

    // Filtro de busca geral
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      filtered = filtered.filter((thread) =>
        thread.emails.some(
          (email) =>
            email.subject?.toLowerCase().includes(searchTerm) ||
            email.from?.emailAddress?.address?.toLowerCase().includes(searchTerm) ||
            email.from?.emailAddress?.name?.toLowerCase().includes(searchTerm) ||
            email.bodyPreview?.toLowerCase().includes(searchTerm),
        ),
      )
    }

    // Filtro de remetente
    if (filters.sender) {
      const senderTerm = filters.sender.toLowerCase()
      filtered = filtered.filter((thread) =>
        thread.emails.some(
          (email) =>
            email.from?.emailAddress?.address?.toLowerCase().includes(senderTerm) ||
            email.from?.emailAddress?.name?.toLowerCase().includes(senderTerm),
        ),
      )
    }

    // Filtro de assunto
    if (filters.subject) {
      const subjectTerm = filters.subject.toLowerCase()
      filtered = filtered.filter((thread) => thread.subject.toLowerCase().includes(subjectTerm))
    }

    // Filtro de tags (apenas se Supabase estiver disponível)
    if (filters.tags.length > 0 && isSupabaseAvailable()) {
      filtered = filtered.filter((thread) =>
        thread.emails.some((email) => {
          const metadata = emailsMetadata[email.id]
          return metadata && filters.tags.some((tag) => metadata.tags.includes(tag))
        }),
      )
    }

    // Filtro de prioridade (apenas se Supabase estiver disponível)
    if (filters.priority.length > 0 && isSupabaseAvailable()) {
      filtered = filtered.filter((thread) =>
        thread.emails.some((email) => {
          const metadata = emailsMetadata[email.id]
          return metadata && filters.priority.includes(metadata.priority)
        }),
      )
    }

    // Filtro de anexos
    if (filters.hasAttachments !== null) {
      filtered = filtered.filter((thread) =>
        thread.emails.some((email) => email.hasAttachments === filters.hasAttachments),
      )
    }

    // Filtro de status de leitura
    if (filters.isRead !== null) {
      filtered = filtered.filter((thread) => thread.emails.some((email) => email.isRead === filters.isRead))
    }

    // Filtro de data
    if (filters.dateRange.from || filters.dateRange.to) {
      filtered = filtered.filter((thread) =>
        thread.emails.some((email) => {
          const emailDate = new Date(email.receivedDateTime)
          const fromDate = filters.dateRange.from ? new Date(filters.dateRange.from) : null
          const toDate = filters.dateRange.to ? new Date(filters.dateRange.to + "T23:59:59") : null

          if (fromDate && emailDate < fromDate) return false
          if (toDate && emailDate > toDate) return false
          return true
        }),
      )
    }

    setFilteredThreads(filtered)
  }, [threads, filters, emailsMetadata])

  useEffect(() => {
    if (accessToken && account && !authLoading) {
      loadEmails()
      loadCustomColumns()
    }
  }, [accessToken, account, authLoading])

  // Mostrar loading durante autenticação
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Inicializando...</p>
        </div>
      </div>
    )
  }

  // Mostrar tela de login se não autenticado
  if (!accessToken) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <Mail className="h-16 w-16 mx-auto text-muted-foreground" />
          <div>
            <h3 className="text-lg font-semibold">Bem-vindo ao Outlook Kanban</h3>
            <p className="text-muted-foreground">Faça login com sua conta Microsoft para começar</p>
          </div>
        </div>
      </div>
    )
  }

  // Mostrar erro se houver
  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Gerenciador de Conversas Kanban</h2>
          <Button onClick={loadEmails} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Tentar Novamente
          </Button>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  // Combinar colunas padrão com colunas personalizadas
  const allColumns = [
    ...DEFAULT_COLUMNS,
    ...customColumns.map((col) => ({
      id: col.id,
      title: col.name,
      color: col.color,
      icon: col.icon,
    })),
  ]

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gerenciador de Conversas Kanban</h2>
        <div className="flex gap-2">
          {isSupabaseAvailable() && <ColumnManager columns={customColumns} onColumnsChange={handleColumnsChange} />}
          <Button onClick={loadEmails} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Atualizar
          </Button>
        </div>
      </div>

      {/* Aviso sobre Supabase */}
      {supabaseError && (
        <Alert>
          <Database className="h-4 w-4" />
          <AlertDescription>
            {supabaseError}
            <br />
            <span className="text-sm text-muted-foreground">
              Para habilitar essas funcionalidades, configure as variáveis NEXT_PUBLIC_SUPABASE_URL e
              NEXT_PUBLIC_SUPABASE_ANON_KEY.
            </span>
          </AlertDescription>
        </Alert>
      )}

      <FiltersPanel
        filters={filters}
        onFiltersChange={setFilters}
        availableTags={availableTags}
        isVisible={isFiltersVisible}
        onToggleVisibility={() => setIsFiltersVisible(!isFiltersVisible)}
      />

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {allColumns.map((column) => (
            <KanbanColumn
              key={column.id}
              id={column.id}
              title={column.title}
              threads={getThreadsByColumn(column.id)}
              emailsMetadata={emailsMetadata}
              onUpdateMetadata={updateEmailMetadata}
              color={column.color}
              icon={column.icon}
              onEmailSent={loadEmails}
            />
          ))}
        </div>

        <DragOverlay>
          {activeThread ? (
            <div className="rotate-3 scale-105 shadow-2xl">
              <EmailThreadCard
                thread={activeThread}
                emailsMetadata={emailsMetadata}
                onUpdateMetadata={updateEmailMetadata}
                onEmailSent={loadEmails}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
