import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { IconClose, IconLogout } from './Icons'
import { Logo } from './Logo'
import { useAuth, type Role } from '../lib/auth'

export interface DrawerItem { to: string; label: string; icon: (p: { className?: string }) => ReactNode }

const ROLE_LABEL: Record<Role, string> = {
  bidder: 'Bidder / Contractor',
  tender_caller: 'Tender Caller',
  official: 'Government Official',
}

export function Drawer({ open, onClose, items, accent }: {
  open: boolean; onClose: () => void; items: DrawerItem[]; accent: string
}) {
  const { user, logout } = useAuth()
  if (!user) return null

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-ink-900/40 transition-opacity ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-white shadow-2xl transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between border-b border-ink-100 px-4 py-4">
          <Logo size={28} />
          <button onClick={onClose} className="rounded-md p-1.5 text-ink-500 hover:bg-ink-50" aria-label="Close menu">
            <IconClose width={20} height={20} />
          </button>
        </div>

        <div className="border-b border-ink-100 px-4 py-3">
          <div className="truncate text-[13px] font-semibold text-ink-800">{user.company_name}</div>
          <div className="text-[11.5px] font-medium" style={{ color: accent }}>{ROLE_LABEL[user.role]}</div>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2.5">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium ${isActive ? 'bg-ink-50 text-ink-900' : 'text-ink-600 hover:bg-ink-50'}`}>
              {({ isActive }) => (
                <>
                  <span style={{ color: isActive ? accent : undefined }}>{item.icon({ className: 'shrink-0' })}</span>
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-ink-100 p-2.5">
          <button onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium text-danger-500 hover:bg-danger-100/60">
            <IconLogout /> Sign out
          </button>
        </div>
      </aside>
    </>
  )
}
