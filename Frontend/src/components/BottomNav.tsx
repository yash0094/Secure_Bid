import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'

export interface BottomNavItem { to: string; label: string; icon: (p: { className?: string }) => ReactNode }

export function BottomNav({ items, accent }: { items: BottomNavItem[]; accent: string }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-ink-200 bg-white/95 backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {items.map((item) => (
        <NavLink key={item.to} to={item.to} end
          className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-ink-500">
          {({ isActive }) => (
            <>
              <span style={{ color: isActive ? accent : undefined }}>{item.icon({})}</span>
              <span style={{ color: isActive ? accent : undefined }}>{item.label}</span>
              <span className="h-0.5 w-6 rounded-full" style={{ background: isActive ? accent : 'transparent' }} />
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
