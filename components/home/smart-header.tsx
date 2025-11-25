'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { LogOut, Settings } from 'lucide-react'
import { Link } from '@/lib/navigation'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'
import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { SmartNotifications } from '@/components/home/smart-notifications'

interface SmartHeaderProps {
  user: {
    id: string
    name?: string
    email: string
    avatar?: string
  }
  lastLogin?: string
}

const formatLastLogin = (timestamp: string, locale: string) => {
  if (!timestamp) return null

  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function SmartHeader({ user, lastLogin }: SmartHeaderProps) {
  const locale = useLocale()
  const t = useTranslations('home.header')
  const formattedLastLogin =
    lastLogin && locale ? formatLastLogin(lastLogin, locale) : null

  return (
    <motion.header
      className="sticky top-0 z-50 border-b border-orange-500/20 bg-black/95 backdrop-blur supports-[backdrop-filter]:bg-black/80"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <div className="container flex h-16 items-center justify-between px-4">
        {/* User Info */}
        <div className="flex items-center gap-4">
          <Avatar className="h-10 w-10 border-2 border-primary/20">
            <AvatarImage src={user.avatar} alt={user.name || user.email} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {(user.name || user.email).charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div>
            <h1 className="text-sm font-semibold">
              {t('welcome')}, {user.name || user.email.split('@')[0]}
            </h1>
            {formattedLastLogin && (
              <p className="text-xs text-muted-foreground">
                {t('lastLogin')}: {formattedLastLogin}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <LanguageSwitcher />

          {/* Smart Notifications */}
          <SmartNotifications userId={user.id} />

          {/* Settings */}
          <Link href="/settings">
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
          </Link>

          {/* Sign Out */}
          <form action="/auth/signout" method="post">
            <Button variant="ghost" size="icon" type="submit">
              <LogOut className="h-5 w-5" />
            </Button>
          </form>
        </div>
      </div>
    </motion.header>
  )
}
