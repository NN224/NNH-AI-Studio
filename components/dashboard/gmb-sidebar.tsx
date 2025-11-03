// GMBDashboardSidebar.tsx (أعد تسميته إلى Sidebar.tsx في المجلد components/layout)

"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
// ⭐️ استيراد AvatarImage لعرض الصورة
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import {
BarChart3,
MapPin,
MessageSquare,
TrendingUp,
Settings,
LogOut,
Menu,
ChevronLeft,
ChevronRight,
Home,
Sparkles,
Youtube,
Bot,
Lightbulb,
Target,
LayoutGrid,
HelpCircle,
Tags,
ImageIcon,
Send
} from "lucide-react"

// ⭐️ واجهة جديدة لبيانات المستخدم التي تمرر من layout.tsx
interface UserProfileData {
    name: string | null;
    avatarUrl: string | null;
    email?: string | null; // افترض أننا لا نزال بحاجة إلى البريد الإلكتروني للمنطق أو العرض الثانوي
}

interface SidebarProps {
activeTab: string
setActiveTab: (tab: string) => void
// ⭐️ تم تغيير Prop name لاستقبال بيانات البروفايل المعالجة
userProfile: UserProfileData 
// 💡 يمكن حذف 'user: any' إذا لم يعد مستخدماً
user?: any 
}

const navItems = [
{ id: "dashboard", label: "Overview", icon: LayoutGrid },
{ id: "locations", label: "Locations", icon: MapPin },
{ id: "reviews", label: "Reviews", icon: MessageSquare },
{ id: "media", label: "Media", icon: ImageIcon },
{ id: "questions", label: "Q&A", icon: HelpCircle },
{ id: "posts", label: "Posts", icon: Sparkles },
{ id: "analytics", label: "Analytics", icon: BarChart3 },
{ id: "settings", label: "Settings", icon: Settings },
]

// ⭐️ تغيير اسم المكون ليتطابق مع (dashboard)/layout.tsx
export function Sidebar({ activeTab, setActiveTab, userProfile, user }: SidebarProps) {
const router = useRouter()
const supabase = createClient()
const [collapsed, setCollapsed] = useState(false)
const [isMobile, setIsMobile] = useState(false)
const [mobileOpen, setMobileOpen] = useState(false)

// Check if mobile and load collapsed state from localStorage
useEffect(() => {
const checkMobile = () => {
const isMobileView = window.innerWidth < 1024
setIsMobile(isMobileView)
// Reset collapsed state when switching to mobile
if (isMobileView) {
setCollapsed(false)
}
}

// Load collapsed state from localStorage (desktop only)
const savedCollapsed = localStorage.getItem("gmb-sidebar-collapsed")
if (savedCollapsed && window.innerWidth >= 1024) {
setCollapsed(JSON.parse(savedCollapsed))
}

checkMobile()
window.addEventListener("resize", checkMobile)
return () => window.removeEventListener("resize", checkMobile)
}, [])

// Save collapsed state to localStorage (desktop only)
const toggleCollapsed = () => {
const newState = !collapsed
setCollapsed(newState)
// Only save to localStorage on desktop
if (!isMobile) {
localStorage.setItem("gmb-sidebar-collapsed", JSON.stringify(newState))
}
}

const handleSignOut = async () => {
await supabase.auth.signOut()
router.push("/auth/login")
}

// ⭐️ تحديث: استخدام الاسم بدلاً من البريد الإلكتروني للحروف الأولى
const getInitials = (nameOrEmail?: string | null) => {
if (!nameOrEmail) return "U"
const parts = nameOrEmail.split(' ');
    if (parts.length > 1) {
        return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
return nameOrEmail.charAt(0).toUpperCase()
}

const sidebarContent = (
<>
{/* Header with Logo */}
<div className="h-16 flex items-center justify-between px-4 border-b border-primary/30">
<Link href="/home" className="flex items-center gap-3">
<Image
src="/nnh-logo.png"
alt="NNH Logo"
width={32}
height={32}
className="object-contain"
/>
<AnimatePresence>
{!collapsed && (
<motion.div
initial={{ opacity: 0, width: 0 }}
animate={{ opacity: 1, width: "auto" }}
exit={{ opacity: 0, width: 0 }}
transition={{ duration: 0.2 }}
className="overflow-hidden"
>
<h1 className="text-lg font-bold whitespace-nowrap">
<span className="text-primary">NNH</span>
<span className="text-muted-foreground ml-1">GMB</span>
</h1>
</motion.div>
)}
</AnimatePresence>
</Link>
{!isMobile && (
<Button
variant="ghost"
size="icon"
onClick={toggleCollapsed}
className="text-muted-foreground hover:text-foreground h-8 w-8"
>
{collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
</Button>
)}
</div>

{/* Navigation Items */}
<nav className="flex-1 px-3 py-4 space-y-1">
{navItems.map((item, index) => (
<motion.div
key={item.id}
initial={{ opacity: 0, x: -20 }}
animate={{ opacity: 1, x: 0 }}
transition={{ delay: index * 0.05 }}
>
<Button
variant="ghost"
onClick={() => {
setActiveTab(item.id)
if (isMobile) setMobileOpen(false)
}}
className={cn(
"w-full justify-start gap-3 relative transition-all duration-200",
activeTab === item.id
? "bg-primary/15 text-primary hover:bg-primary/25"
: "text-muted-foreground hover:text-foreground hover:bg-primary/10",
collapsed && !isMobile && "justify-center px-2"
)}
>
<item.icon className={cn("h-5 w-5", collapsed && !isMobile && "h-5 w-5")} />
{(!collapsed || isMobile) && <span className="font-medium">{item.label}</span>}
{activeTab === item.id && (
<motion.div
layoutId="gmb-active-tab"
className="absolute inset-0 border border-primary/30 rounded-md -z-10"
initial={false}
transition={{ type: "spring", stiffness: 500, damping: 30 }}
/>
)}
</Button>
</motion.div>
))}

{/* Quick Links */}
<div className={cn("pt-4 mt-4 border-t border-primary/20", collapsed && !isMobile && "border-t-0")}>
<Link href="/home">
<Button
variant="ghost"
className={cn(
"w-full justify-start gap-3 text-muted-foreground hover:text-foreground hover:bg-primary/5",
collapsed && !isMobile && "justify-center px-2"
)}
>
<Home className="h-5 w-5" />
{(!collapsed || isMobile) && <span className="font-medium">Home</span>}
</Button>
</Link>
<Link href="/youtube-dashboard">
<Button
variant="ghost"
className={cn(
"w-full justify-start gap-3 text-muted-foreground hover:text-foreground hover:bg-primary/5",
collapsed && !isMobile && "justify-center px-2"
)}
>
<Youtube className="h-5 w-5 text-red-500" />
{(!collapsed || isMobile) && <span className="font-medium">YouTube</span>}
</Button>
</Link>
</div>
</nav>

{/* User Profile Section */}
<div className="border-t border-primary/30 p-3">
<div className={cn(
"flex items-center gap-3 mb-2",
collapsed && !isMobile && "justify-center"
)}>
{/* ⭐️ تحديث: استخدام AvatarImage لعرض الصورة */}
<Avatar className="h-9 w-9 border border-primary/30">
                {userProfile.avatarUrl && <AvatarImage src={userProfile.avatarUrl} alt={userProfile.name || 'User'} />}
<AvatarFallback className="bg-primary/10 text-primary">
{getInitials(userProfile.name || userProfile.email)}
</AvatarFallback>
</Avatar>
{(!collapsed || isMobile) && (
<div className="flex-1 min-w-0">
{/* ⭐️ تحديث: عرض الاسم الفعلي */}
<p className="text-sm font-medium text-foreground truncate">
{userProfile.name || 'User'}
</p>
{/* ⭐️ تحديث: عرض البريد الإلكتروني (الافتراضي هو user.email) */}
<p className="text-xs text-muted-foreground truncate">
{userProfile.email || 'user@example.com'}
</p>
</div>
)}
</div>
<Button
onClick={handleSignOut}
variant="ghost"
className={cn(
"w-full justify-start gap-3 text-muted-foreground hover:text-foreground hover:bg-secondary",
collapsed && !isMobile && "justify-center px-2"
)}
>
<LogOut className="h-5 w-5" />
{(!collapsed || isMobile) && <span className="font-medium">Sign Out</span>}
</Button>
</div>
</>
)

// Mobile Sidebar (Sheet)
if (isMobile) {
return (
<>
<Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
<SheetTrigger asChild>
<Button
variant="ghost"
size="icon"
className="fixed top-4 left-4 z-40 lg:hidden text-muted-foreground hover:text-foreground bg-card/80 backdrop-blur-md border border-primary/20"
>
<Menu className="h-6 w-6" />
</Button>
</SheetTrigger>
<SheetContent
side="left"
className="w-64 p-0 bg-card/95 backdrop-blur-lg border-primary/30"
>
{sidebarContent}
</SheetContent>
</Sheet>
</>
)
}

// Desktop Sidebar
return (
<motion.aside
animate={{ width: collapsed ? 80 : 240 }}
transition={{ duration: 0.3, ease: "easeInOut" }}
className="fixed left-0 top-0 h-screen bg-card/80 backdrop-blur-xl border-r border-primary/30 flex flex-col z-30"
>
{sidebarContent}
</motion.aside>
)
}