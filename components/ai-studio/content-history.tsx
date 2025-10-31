"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, Copy, Trash2, Loader2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { createClient } from "@/lib/supabase/client"
import { ContentGeneration } from "@/lib/types/database"
import { formatDistanceToNow } from "date-fns"
import { toast } from "sonner"

export function ContentHistory() {
  const [history, setHistory] = useState<ContentGeneration[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchHistory()

    const channel = supabase
      .channel("content_generations_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "content_generations",
        },
        (payload) => {
          try {
            if (payload.eventType === "INSERT") {
              setHistory((prev) => [payload.new as ContentGeneration, ...prev])
            } else if (payload.eventType === "DELETE") {
              setHistory((prev) => prev.filter((item) => item.id !== payload.old.id))
            } else if (payload.eventType === "UPDATE") {
              setHistory((prev) =>
                prev.map((item) => (item.id === payload.new.id ? (payload.new as ContentGeneration) : item))
              )
            }
          } catch (error) {
            console.error("Error handling realtime update:", error)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchHistory = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("content_generations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10)

      if (error) throw error

      setHistory(data || [])
    } catch (error) {
      console.error("Error fetching history:", error)
      toast.error("Failed to load content history")
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content)
    toast.success("Content copied to clipboard!")
  }

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id)
      const { error } = await supabase.from("content_generations").delete().eq("id", id)

      if (error) throw error

      toast.success("Content deleted successfully!")
    } catch (error) {
      console.error("Error deleting content:", error)
      toast.error("Failed to delete content")
    } finally {
      setDeletingId(null)
    }
  }

  const formatTimestamp = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true })
    } catch {
      return "Unknown time"
    }
  }

  return (
    <Card className="bg-card border-primary/30">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Recent Generations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No content generated yet</p>
            <p className="text-sm mt-1">Start generating content to see your history here</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {history.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 rounded-lg bg-secondary border border-primary/20 hover:border-primary/40 transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="bg-primary/20 text-primary border-primary/30 capitalize">
                      {item.content_type}
                    </Badge>
                    <Badge variant="outline" className="border-primary/30 text-muted-foreground capitalize">
                      {item.tone}
                    </Badge>
                    <Badge variant="outline" className="border-accent/30 text-accent capitalize text-xs">
                      {item.provider}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatTimestamp(item.created_at)}
                  </span>
                </div>
                <p className="text-sm text-foreground line-clamp-2 mb-3">{item.generated_content}</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCopy(item.generated_content)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(item.id)}
                    disabled={deletingId === item.id}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    {deletingId === item.id ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3 mr-1" />
                    )}
                    Delete
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </CardContent>
    </Card>
  )
}
