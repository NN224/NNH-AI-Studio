"use client"

import { Bell, Search, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useSupabase } from "@/lib/hooks/use-supabase"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Sidebar } from "@/components/layout/sidebar"
import Image from "next/image"

export function Header() {
  const { user } = useSupabase()

  const getInitials = (email?: string) => {
    if (!email) return "U"
    return email.charAt(0).toUpperCase()
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
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary" />
        </Button>

        <Avatar className="h-9 w-9 border-2 border-primary/30">
          <AvatarFallback className="bg-primary/20 text-primary font-semibold">
            {getInitials(user?.email)}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
