import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { isCurrentUserAdmin } from '@/lib/auth/admin-check'
import {
  Activity,
  BarChart3,
  Bug,
  Cloud,
  Cpu,
  Database,
  FileText,
  GitBranch,
  Globe,
  HeartHandshake,
  LayoutDashboard,
  Lock,
  Package,
  Settings,
  Shield,
  Terminal,
  Users,
  Zap,
} from 'lucide-react'
import { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Admin Panel | NNH AI Studio',
  description: 'System administration and monitoring dashboard',
}

const sidebarItems = [
  {
    title: 'Overview',
    items: [
      { title: 'Dashboard', href: '/admin', icon: LayoutDashboard },
      { title: 'System Monitoring', href: '/admin/monitoring', icon: Activity },
      { title: 'Error Tracking', href: '/admin/errors', icon: Bug },
      { title: 'Owner Diagnostics', href: '/admin/diagnostics', icon: Terminal },
    ],
  },
  {
    title: 'Management',
    items: [
      { title: 'Users', href: '/admin/users', icon: Users },
      { title: 'GMB Accounts', href: '/admin/gmb', icon: Globe },
      { title: 'Database', href: '/admin/database', icon: Database },
    ],
  },
  {
    title: 'Analytics',
    items: [
      { title: 'Usage Analytics', href: '/admin/analytics', icon: BarChart3 },
      { title: 'AI Usage', href: '/admin/ai-usage', icon: Cpu },
      { title: 'Performance', href: '/admin/performance', icon: Zap },
    ],
  },
  {
    title: 'Security',
    items: [
      { title: 'Audit Logs', href: '/admin/audit', icon: Shield },
      { title: 'Access Control', href: '/admin/access', icon: Lock },
      { title: 'API Keys', href: '/admin/api-keys', icon: Terminal },
    ],
  },
  {
    title: 'Development',
    items: [
      { title: 'API Docs', href: '/admin/api-docs', icon: FileText },
      { title: 'Deployments', href: '/admin/deployments', icon: Cloud },
      { title: 'Feature Flags', href: '/admin/features', icon: GitBranch },
    ],
  },
  {
    title: 'System',
    items: [
      { title: 'Settings', href: '/admin/settings', icon: Settings },
      { title: 'Integrations', href: '/admin/integrations', icon: Package },
      { title: 'Support', href: '/admin/support', icon: HeartHandshake },
    ],
  },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Check if user is admin
  const { isAdmin } = await isCurrentUserAdmin()

  if (!isAdmin) {
    redirect('/dashboard')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card">
        <div className="flex h-full flex-col">
          {/* Logo/Header */}
          <div className="flex h-16 items-center border-b px-6">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Shield className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Admin Panel</h2>
                <p className="text-xs text-muted-foreground">admin.nnh.ae</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 px-3 py-4">
            <div className="space-y-6">
              {sidebarItems.map((section, i) => (
                <div key={i}>
                  <h3 className="mb-2 px-3 text-xs font-semibold uppercase text-muted-foreground">
                    {section.title}
                  </h3>
                  <div className="space-y-1">
                    {section.items.map((item, j) => (
                      <Link key={j} href={item.href}>
                        <Button variant="ghost" className="w-full justify-start" size="sm">
                          <item.icon className="mr-2 h-4 w-4" />
                          {item.title}
                        </Button>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="border-t p-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/avatar.png" />
                <AvatarFallback>AD</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-medium">Admin User</p>
                <p className="text-xs text-muted-foreground">Super Admin</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="h-full">{children}</div>
      </main>
    </div>
  )
}
