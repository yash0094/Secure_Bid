import type { ReactNode } from 'react'
import { IconBuilding } from './Icons'

export function Card({ children, className = '', title, action }: {
  children: ReactNode; className?: string; title?: ReactNode; action?: ReactNode
}) {
  return (
    <div className={`rounded-lg border border-ink-200 bg-white shadow-sm ${className}`}>
      {title && (
        <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
          <h3 className="text-[13px] font-semibold text-ink-800">{title}</h3>
          {action}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  )
}

export function KpiTile({ label, value, sub, tone = 'default' }: {
  label: string; value: ReactNode; sub?: string; tone?: 'default' | 'good' | 'bad'
}) {
  const toneClass = tone === 'good' ? 'text-success-500' : tone === 'bad' ? 'text-danger-500' : 'text-ink-900'
  return (
    <div className="rounded-lg border border-ink-200 bg-white p-4 shadow-sm">
      <div className="text-[11px] font-medium uppercase tracking-wide text-ink-500">{label}</div>
      <div className={`mt-1 text-[22px] font-semibold ${toneClass}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-ink-500">{sub}</div>}
    </div>
  )
}

const PILL_TONES: Record<string, string> = {
  watching: 'bg-ink-100 text-ink-600',
  preparing: 'bg-brand-100 text-brand-700',
  submitted: 'bg-warn-100 text-warn-500',
  won: 'bg-success-100 text-success-500',
  lost: 'bg-danger-100 text-danger-500',
  dropped: 'bg-ink-100 text-ink-500',
  draft: 'bg-ink-100 text-ink-600',
  published: 'bg-brand-100 text-brand-700',
  closed: 'bg-ink-100 text-ink-500',
  eligible: 'bg-success-100 text-success-500',
  conditional: 'bg-warn-100 text-warn-500',
  not_eligible: 'bg-danger-100 text-danger-500',
  review: 'bg-brand-100 text-brand-700',
  shortlisted: 'bg-brand-100 text-brand-700',
  rejected: 'bg-danger-100 text-danger-500',
  pending: 'bg-ink-100 text-ink-600',
  done: 'bg-success-100 text-success-500',
  overdue: 'bg-danger-100 text-danger-500',
  held: 'bg-ink-100 text-ink-600',
  released: 'bg-success-100 text-success-500',
}

export function StatusPill({ status }: { status: string }) {
  const cls = PILL_TONES[status] || 'bg-ink-100 text-ink-600'
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${cls}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

const RISK_STYLE: Record<string, { bg: string; fg: string; icon: string }> = {
  elevated: { bg: 'var(--color-danger-100)', fg: 'var(--color-danger-500)', icon: '▲' },
  watch: { bg: 'var(--color-warn-100)', fg: 'var(--color-warn-500)', icon: '●' },
  normal: { bg: 'var(--color-success-100)', fg: 'var(--color-success-500)', icon: '✓' },
}

export function RiskBadge({ risk }: { risk: string }) {
  const s = RISK_STYLE[risk] ?? { bg: 'var(--color-ink-100)', fg: 'var(--color-ink-600)', icon: '•' }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize"
          style={{ background: s.bg, color: s.fg }}>
      <span aria-hidden="true">{s.icon}</span>{risk}
    </span>
  )
}

export function DaysPill({ days }: { days: number | null }) {
  if (days === null) return <span className="text-ink-400">&mdash;</span>
  const cls = days <= 3 ? 'bg-danger-100 text-danger-500'
    : days <= 10 ? 'bg-warn-100 text-warn-500'
    : 'bg-ink-100 text-ink-600'
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}>
      {days < 0 ? 'Closed' : `${days}d left`}
    </span>
  )
}

export function Button({ children, variant = 'primary', className = '', style, ...rest }:
  { children: ReactNode; variant?: 'primary' | 'ghost' | 'danger'; className?: string }
  & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base = 'inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    // Reads --role-accent (set once, per portal, on the Shell) so every
    // primary button in the app follows the signed-in role's colour without
    // each page having to know or care what that colour is.
    primary: 'text-white brightness-100 hover:brightness-90',
    ghost: 'border border-ink-200 bg-white text-ink-700 hover:bg-ink-50',
    danger: 'bg-danger-500 text-white hover:bg-red-700',
  }
  const primaryStyle = variant === 'primary' ? { background: 'var(--role-accent, var(--color-brand-500))', ...style } : style
  return <button className={`${base} ${variants[variant]} ${className}`} style={primaryStyle} {...rest}>{children}</button>
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-medium text-ink-600">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-ink-400">{hint}</span>}
    </label>
  )
}

export const inputCls = 'w-full rounded-md border border-ink-300 bg-white px-2.5 py-1.5 text-[13px] text-ink-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100'

export function money(v: number | null | undefined) {
  if (v === null || v === undefined) return '—'
  if (Math.abs(v) >= 10000000) return `Rs ${(v / 10000000).toFixed(2)} Cr`
  if (Math.abs(v) >= 100000) return `Rs ${(v / 100000).toFixed(2)} L`
  return `Rs ${v.toLocaleString('en-IN')}`
}

export function pct(v: number | null | undefined, digits = 0) {
  if (v === null || v === undefined) return '—'
  return `${(v * 100).toFixed(digits)}%`
}

export function TenderCard({ title, buyer, category, daysLeft, stats, onClick }: {
  title: string; buyer: string; category: string; daysLeft: number | null
  stats: { label: string; value: ReactNode; tone?: 'good' }[]
  onClick?: () => void
}) {
  return (
    <button onClick={onClick}
            className="w-full rounded-lg border border-ink-200 bg-white p-3.5 text-left shadow-sm transition-all hover:border-ink-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[13.5px] font-semibold text-ink-900">{title}</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-ink-500">
            <IconBuilding width={13} height={13} className="shrink-0" />
            <span className="truncate">{buyer}</span>
            <span>·</span>
            <span className="truncate">{category}</span>
          </div>
        </div>
        <DaysPill days={daysLeft} />
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2 border-t border-ink-100 pt-2.5">
        {stats.map((s) => (
          <div key={s.label}>
            <div className="text-[10px] uppercase tracking-wide text-ink-400">{s.label}</div>
            <div className={`text-[12.5px] font-semibold ${s.tone === 'good' ? 'text-success-500' : 'text-ink-800'}`}>{s.value}</div>
          </div>
        ))}
      </div>
    </button>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="flex flex-col items-center gap-1 py-10 text-center text-ink-400">{children}</div>
}

export function Spinner() {
  return (
    <div className="flex justify-center py-10">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-ink-200 border-t-brand-500" />
    </div>
  )
}
