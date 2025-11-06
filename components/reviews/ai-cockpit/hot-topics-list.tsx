"use client"

import { Badge } from "@/components/ui/badge"

interface HotTopicsListProps {
  topics: Array<{ topic: string; count: number }>
}

export function HotTopicsList({ topics }: HotTopicsListProps) {
  if (topics.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4">
        No topics found yet
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {topics.map((topic) => (
        <Badge
          key={topic.topic}
          variant="outline"
          className="bg-zinc-800 border-zinc-700 hover:border-orange-500/50 transition-colors cursor-pointer"
        >
          <span className="capitalize">{topic.topic}</span>
          <span className="ml-1.5 text-orange-500 font-semibold">{topic.count}</span>
        </Badge>
      ))}
    </div>
  )
}

