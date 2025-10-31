"use client"

import { useState, useEffect } from "react"
import { Bell, Search, Menu, Check, CheckCheck, Trash2, AlertCircle, Info, CheckCircle, AlertTriangle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useSupabase } from "@/lib/hooks/use-supabase"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Sidebar } from "@/components/layout/sidebar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import Link from "next/link"
import Image from "next/image"
import { cn } from "@/lib/utils"

type Notification = {
  id: string
  type: 'review' | 'sync' | 'error' | 'info' | 'success' | 'warning'
  title: string
  message: string
  link?: string
  read: boolean
  created_at: string
}

export function Header() {
  const { user } = useSupabase()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  const getInitials = (email?: string) => {
    if (!email) return "U"
    return email.charAt(0).toUpperCase()
  }

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications?limit=10')
      const data = await res.json()
      if (res.ok) {
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (e) {
      console.error('Failed to fetch notifications:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchNotifications()
      // Poll every 30 seconds
      const interval = setInterval(fetchNotifications, 30000)
      return () => clearInterval(interval)
    }
  }, [user])

  const markAsRead = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id })
      })
      fetchNotifications()
    } catch (e) {
      console.error('Failed to mark as read:', e)
    }
  }

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllAsRead: true })
      })
      fetchNotifications()
    } catch (e) {
      console.error('Failed to mark all as read:', e)
    }
  }

  const deleteNotification = async (id: string) => {
    try {
      await fetch(`/api/notifications?id=${id}`, { method: 'DELETE' })
      fetchNotifications()
    } catch (e) {
      console.error('Failed to delete notification:', e)
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'review': return <AlertCircle className="w-4 h-4 text-blue-500" />
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-500" />
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      default: return <Info className="w-4 h-4 text-primary" />
    }
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-primary/30 bg-card px-4 md:px-6">
      {/* Mobile Menu Button */}
      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 bg-card border-primary/30">
            <Sidebar />
          </SheetContent>
        </Sheet>
      </div>

      {/* Logo */}
      <div className="flex items-center gap-3">
        <Image 
          src="/nnh-logo.png" 
          alt="NNH Logo" 
          width={40} 
          height={40}
          className="object-contain"
        />
        <span className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent hidden sm:block">
          NNH - AI Studio
        </span>
      </div>

      {/* Search - Hidden on small screens */}
      <div className="hidden md:flex items-center gap-4 flex-1 max-w-xl ml-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search locations, reviews..."
            className="pl-10 bg-secondary border-primary/30 text-foreground placeholder:text-muted-foreground focus:border-primary"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 md:gap-4">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-5 w-5 rounded-full bg-primary text-[10px] font-bold text-white flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 md:w-96 p-0" align="end">
            <div className="border-b border-primary/20 p-4 flex items-center justify-between">
              <h3 className="font-semibold">Notifications</h3>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs">
                  <CheckCheck className="w-3 h-3 mr-1" />
                  Mark all read
                </Button>
              )}
            </div>
            <ScrollArea className="h-[400px]">
              {loading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-primary/10">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={cn(
                        "p-4 hover:bg-primary/5 transition-colors",
                        !notif.read && "bg-primary/5"
                      )}
                    >
                      <div className="flex gap-3">
                        <div className="mt-1">{getIcon(notif.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="text-sm font-medium">{notif.title}</p>
                              <p className="text-xs text-muted-foreground mt-1">{notif.message}</p>
                              <p className="text-xs text-muted-foreground/70 mt-1">
                                {new Date(notif.created_at).toLocaleString()}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              {!notif.read && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => markAsRead(notif.id)}
                                >
                                  <Check className="w-3 h-3" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => deleteNotification(notif.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          {notif.link && (
                            <Link href={notif.link} className="text-xs text-primary hover:underline mt-1 inline-block">
                              View details →
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>

        <Avatar className="h-9 w-9 border-2 border-primary/30">
          <AvatarFallback className="bg-primary/20 text-primary font-semibold">
            {getInitials(user?.email)}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
