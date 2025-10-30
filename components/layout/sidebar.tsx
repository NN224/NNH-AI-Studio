"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, MapPin, MessageSquare, Users, Sparkles, BarChart3, Settings, LogOut, Home } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Image from "next/image"

const navigation = [
  { name: "Home", href: "/home", icon: Home },
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Locations", href: "/locations", icon: MapPin },
  { name: "Reviews", href: "/reviews", icon: MessageSquare },
  { name: "Accounts", href: "/accounts", icon: Users },
  { name: "AI Studio", href: "/ai-studio", icon: Sparkles },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  return (
    <div className="flex h-full w-64 flex-col bg-card border-r border-primary/30">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-primary/30 px-4">
        <Image 
          src="/nnh-logo.png" 
          alt="NNH Logo" 
          width={40} 
          height={40}
          className="object-contain"
        />
        <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          NNH - AI Studio
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Sign Out */}
      <div className="border-t border-primary/30 p-4">
        <Button
          onClick={handleSignOut}
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-secondary"
        >
          <LogOut className="mr-3 h-5 w-5" />
          Sign Out
        </Button>
      </div>
    </div>
  )
}
