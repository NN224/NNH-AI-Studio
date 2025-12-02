'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import {
  Ban,
  Download,
  Edit,
  Eye,
  Mail,
  MoreVertical,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react'
import { useEffect, useState } from 'react'

interface User {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string
  email_confirmed_at: string
  phone: string
  role: string
  app_metadata: Record<string, unknown>
  user_metadata: Record<string, unknown>
}

interface Profile {
  id: string
  full_name: string
  avatar_url: string
  company_name: string
  created_at: string
  updated_at: string
}

export default function UsersManagementPage() {
  const [users, setUsers] = useState<User[]>([])
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTab, setSelectedTab] = useState('all')
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    admins: 0,
    gmb_connected: 0,
    new_today: 0,
  })

  const supabase = createClient()

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)

    try {
      // Fetch users from auth.users (requires service role)
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()

      if (authError) {
        // Error fetching users from auth.admin
        // Fallback to profiles table
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false })

        if (profilesData) {
          // Convert profiles to user format
          const usersFromProfiles = profilesData.map((p) => ({
            id: p.id,
            email: p.email || 'No email',
            created_at: p.created_at,
            last_sign_in_at: p.updated_at,
            email_confirmed_at: p.created_at,
            phone: '',
            role: 'user',
            app_metadata: {},
            user_metadata: { full_name: p.full_name },
          }))

          setUsers(usersFromProfiles)

          // Create profiles map
          const profilesMap: Record<string, Profile> = {}
          profilesData.forEach((p) => {
            profilesMap[p.id] = p
          })
          setProfiles(profilesMap)
        }
      } else if (authUsers) {
        setUsers(
          authUsers.users.map((user) => ({
            id: user.id,
            email: user.email || '',
            created_at: user.created_at || '',
            last_sign_in_at: user.last_sign_in_at || '',
            email_confirmed_at: user.email_confirmed_at || '',
            phone: user.phone || '',
            role: user.role || 'user',
            app_metadata: user.app_metadata || {},
            user_metadata: user.user_metadata || {},
          })),
        )

        // Fetch profiles for these users
        const userIds = authUsers.users.map((u) => u.id)
        const { data: profilesData } = await supabase.from('profiles').select('*').in('id', userIds)

        if (profilesData) {
          const profilesMap: Record<string, Profile> = {}
          profilesData.forEach((p) => {
            profilesMap[p.id] = p
          })
          setProfiles(profilesMap)
        }
      }

      // Fetch GMB connections
      const { data: _gmbAccounts } = await supabase
        .from('gmb_accounts')
        .select('user_id, account_name, is_active')

      // Calculate stats
      calculateStats()
    } catch {
      // Error in fetchUsers
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = () => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',') || []

    setStats({
      total: users.length,
      active: users.filter((u) => {
        const lastSignIn = new Date(u.last_sign_in_at)
        const daysSinceLogin = (now.getTime() - lastSignIn.getTime()) / (1000 * 60 * 60 * 24)
        return daysSinceLogin < 7
      }).length,
      inactive: users.filter((u) => {
        const lastSignIn = new Date(u.last_sign_in_at)
        const daysSinceLogin = (now.getTime() - lastSignIn.getTime()) / (1000 * 60 * 60 * 24)
        return daysSinceLogin >= 7
      }).length,
      admins: users.filter((u) => adminEmails.includes(u.email)).length,
      gmb_connected: 0, // Will be updated with GMB data
      new_today: users.filter((u) => new Date(u.created_at) >= today).length,
    })
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profiles[user.id]?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profiles[user.id]?.company_name?.toLowerCase().includes(searchTerm.toLowerCase())

    if (selectedTab === 'all') return matchesSearch
    if (selectedTab === 'active') {
      const lastSignIn = new Date(user.last_sign_in_at)
      const daysSinceLogin = (Date.now() - lastSignIn.getTime()) / (1000 * 60 * 60 * 24)
      return matchesSearch && daysSinceLogin < 7
    }
    if (selectedTab === 'inactive') {
      const lastSignIn = new Date(user.last_sign_in_at)
      const daysSinceLogin = (Date.now() - lastSignIn.getTime()) / (1000 * 60 * 60 * 24)
      return matchesSearch && daysSinceLogin >= 7
    }
    if (selectedTab === 'admins') {
      const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',') || []
      return matchesSearch && adminEmails.includes(user.email)
    }

    return matchesSearch
  })

  const handleImpersonate = async (userId: string) => {
    // TODO: Implement impersonation logic
    // Will open user session in new tab
    alert(`Impersonate user: ${userId}`)
  }

  const handleSuspend = async (userId: string) => {
    // TODO: Implement suspend logic
    // Will disable user account
    alert(`Suspend user: ${userId}`)
  }

  const handleDelete = async (userId: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      // TODO: Implement delete logic
      // Will permanently delete user
      alert(`Delete user: ${userId}`)
    }
  }

  const exportUsers = () => {
    const csv = [
      ['ID', 'Email', 'Name', 'Company', 'Created', 'Last Login', 'Status'].join(','),
      ...filteredUsers.map((user) =>
        [
          user.id,
          user.email,
          profiles[user.id]?.full_name || '',
          profiles[user.id]?.company_name || '',
          format(new Date(user.created_at), 'yyyy-MM-dd'),
          format(new Date(user.last_sign_in_at), 'yyyy-MM-dd'),
          new Date(user.last_sign_in_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
            ? 'Active'
            : 'Inactive',
        ].join(','),
      ),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `users-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage all users and their permissions</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchUsers} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportUsers} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Inactive</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-500">{stats.inactive}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Admins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.admins}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">GMB Connected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.gmb_connected}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">New Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.new_today}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email, name, or company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList>
              <TabsTrigger value="all">All Users ({users.length})</TabsTrigger>
              <TabsTrigger value="active">Active ({stats.active})</TabsTrigger>
              <TabsTrigger value="inactive">Inactive ({stats.inactive})</TabsTrigger>
              <TabsTrigger value="admins">Admins ({stats.admins})</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedTab} className="mt-4">
              {loading ? (
                <div className="text-center py-8">Loading users...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => {
                      const profile = profiles[user.id]
                      const isAdmin = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').includes(
                        user.email,
                      )
                      const isActive =
                        new Date(user.last_sign_in_at).getTime() >
                        Date.now() - 7 * 24 * 60 * 60 * 1000

                      return (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src={profile?.avatar_url} />
                                <AvatarFallback>
                                  {user.email.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{profile?.full_name || 'No name'}</div>
                                <div className="text-sm text-muted-foreground">{user.email}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{profile?.company_name || '-'}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {isActive ? (
                                <Badge variant="default">Active</Badge>
                              ) : (
                                <Badge variant="secondary">Inactive</Badge>
                              )}
                              {isAdmin && <Badge variant="destructive">Admin</Badge>}
                            </div>
                          </TableCell>
                          <TableCell>{format(new Date(user.created_at), 'MMM dd, yyyy')}</TableCell>
                          <TableCell>
                            {format(new Date(user.last_sign_in_at), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleImpersonate(user.id)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View as User
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Details
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Mail className="h-4 w-4 mr-2" />
                                  Send Email
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleSuspend(user.id)}
                                  className="text-yellow-600"
                                >
                                  <Ban className="h-4 w-4 mr-2" />
                                  Suspend Account
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDelete(user.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete User
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
