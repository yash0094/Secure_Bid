import { useState, type CSSProperties, type ReactNode } from 'react'
import { LogoMark } from './Logo'
import { useAuth, type Role } from '../lib/auth'
import { api } from '../lib/api'
import { BottomNav, type BottomNavItem } from './BottomNav'
import { Drawer, type DrawerItem } from './Drawer'
import {
  IconHome, IconSearch, IconColumns, IconShieldAlert, IconWallet, IconBarChart,
  IconUsers, IconFileText, IconBell, IconUserCircle, IconPlusCircle,
  IconClipboardList, IconAward, IconBuilding, IconMenu, IconSettings, IconHelp,
} from './Icons'

const BOTTOM: Record<Role, BottomNavItem[]> = {
  bidder: [
    { to: '/app/dashboard', label: 'Home', icon: (p) => <IconHome {...p} /> },
    { to: '/app/discover', label: 'Discover', icon: (p) => <IconSearch {...p} /> },
    { to: '/app/pipeline', label: 'Pipeline', icon: (p) => <IconColumns {...p} /> },
    { to: '/app/screens', label: 'Anomaly', icon: (p) => <IconShieldAlert {...p} /> },
  ],
  tender_caller: [
    { to: '/buyer/tenders', label: 'Tenders', icon: (p) => <IconClipboardList {...p} /> },
    { to: '/buyer/tenders/new', label: 'Create', icon: (p) => <IconPlusCircle {...p} /> },
    { to: '/buyer/awards', label: 'Awards', icon: (p) => <IconAward {...p} /> },
    { to: '/buyer/profile', label: 'Profile', icon: (p) => <IconUserCircle {...p} /> },
  ],
  official: [
    { to: '/oversight/overview', label: 'Overview', icon: (p) => <IconHome {...p} /> },
    { to: '/oversight/registry', label: 'Registry', icon: (p) => <IconBuilding {...p} /> },
    { to: '/oversight/screens', label: 'Anomaly', icon: (p) => <IconShieldAlert {...p} /> },
    { to: '/oversight/profile', label: 'Profile', icon: (p) => <IconUserCircle {...p} /> },
  ],
}

const DRAWER: Record<Role, DrawerItem[]> = {
  bidder: [
    { to: '/app/portfolio', label: 'Portfolio Optimiser', icon: (p) => <IconWallet {...p} /> },
    { to: '/app/analytics', label: 'Analytics', icon: (p) => <IconBarChart {...p} /> },
    { to: '/app/competitors', label: 'Competitors', icon: (p) => <IconUsers {...p} /> },
    { to: '/app/parser', label: 'Eligibility Parser', icon: (p) => <IconFileText {...p} /> },
    { to: '/app/alerts', label: 'Alerts & Saved Searches', icon: (p) => <IconBell {...p} /> },
    { to: '/app/profile', label: 'Company Profile', icon: (p) => <IconUserCircle {...p} /> },
    { to: '/app/settings', label: 'Settings', icon: (p) => <IconSettings {...p} /> },
    { to: '/app/help', label: 'Help & Manual', icon: (p) => <IconHelp {...p} /> },
  ],
  tender_caller: [
    { to: '/buyer/settings', label: 'Settings', icon: (p) => <IconSettings {...p} /> },
    { to: '/buyer/help', label: 'Help & Manual', icon: (p) => <IconHelp {...p} /> },
  ],
  official: [
    { to: '/oversight/settings', label: 'Settings', icon: (p) => <IconSettings {...p} /> },
    { to: '/oversight/help', label: 'Help & Manual', icon: (p) => <IconHelp {...p} /> },
  ],
}

const ROLE_ACCENT: Record<Role, string> = {
  bidder: 'var(--color-brand-500)',
  tender_caller: 'var(--color-caller-500)',
  official: 'var(--color-official-500)',
}

const ROLE_TITLE: Record<Role, string> = {
  bidder: 'SecureBid',
  tender_caller: 'SecureBid for Buyers',
  official: 'SecureBid Oversight',
}

export function Shell({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)
  if (!user) return null

  const accent = ROLE_ACCENT[user.role]
  const bottomItems = BOTTOM[user.role]
  const drawerItems = DRAWER[user.role]

  return (
    <div className="min-h-screen bg-ink-50" style={{ '--role-accent': accent } as CSSProperties}>
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-ink-200 bg-white px-4"
              style={{ paddingTop: 'env(safe-area-inset-top, 0px)', height: 'calc(56px + env(safe-area-inset-top, 0px))' }}>
        <button onClick={() => setDrawerOpen(true)} className="rounded-md p-1.5 -ml-1.5 text-ink-600 hover:bg-ink-50" aria-label="Open menu">
          <IconMenu />
        </button>
        <LogoMark size={24} />
        <span className="text-[15px] font-semibold text-ink-900">{ROLE_TITLE[user.role]}</span>
        <span className="ml-auto h-2 w-2 rounded-full" style={{ background: accent }} aria-hidden="true" />
      </header>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} items={drawerItems} accent={accent} />

      {!user.email_verified && <VerificationBanner />}

      <main className="mx-auto max-w-[1400px] p-4 pb-24 sm:p-6 sm:pb-24">{children}</main>

      <BottomNav items={bottomItems} accent={accent} />
    </div>
  )
}

function VerificationBanner() {
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  async function resend() {
    setState('sending')
    try {
      await api.post('/api/auth/request-verification')
      setState('sent')
    } catch {
      setState('idle')
    }
  }
  return (
    <div className="flex items-center justify-between gap-3 border-b border-warn-100 bg-warn-100/60 px-4 py-2 text-[12px] text-ink-700 sm:px-6">
      <span>Please verify your email address.</span>
      {state === 'sent' ? (
        <span className="text-ink-500">Link sent — check the server console (no SMTP configured).</span>
      ) : (
        <button onClick={resend} disabled={state === 'sending'} className="font-medium text-brand-600 hover:underline disabled:opacity-50">
          {state === 'sending' ? 'Sending…' : 'Resend verification email'}
        </button>
      )}
    </div>
  )
}

export function PageHeader({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">{title}</h1>
        {sub && <p className="mt-0.5 text-[13px] text-ink-500">{sub}</p>}
      </div>
      {action}
    </div>
  )
}
