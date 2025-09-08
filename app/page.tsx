"use client"

import { useState } from "react"
import { AuthProvider } from "@/components/auth-provider"
import { Header } from "@/components/header"
import { KanbanBoard } from "@/components/kanban-board"
import { Toaster } from "@/components/ui/toaster"

export default function Home() {
  const [refreshKey, setRefreshKey] = useState(0)

  const handleEmailSent = () => {
    // Forçar atualização do KanbanBoard
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <AuthProvider>
      <div className="min-h-screen bg-background">
        <Header onEmailSent={handleEmailSent} />
        <main className="w-full p-10">
          <KanbanBoard key={refreshKey} />
        </main>
        <Toaster />
      </div>
    </AuthProvider>
  )
}
