import type { ReactNode } from 'react'

export function FeatureHero({ eyebrow, title, sub, accent, tint, children }: {
  eyebrow: string; title: string; sub: string; accent: string; tint: string; children?: ReactNode
}) {
  return (
    <div className="mb-6 rounded-2xl border border-ink-200 p-6 sm:p-8" style={{ background: tint }}>
      <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-semibold"
            style={{ background: 'rgba(255,255,255,0.7)', color: accent }}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
        {eyebrow}
      </span>
      <h1 className="mt-3 max-w-2xl text-[26px] font-semibold leading-tight text-ink-900 sm:text-[32px]"
          style={{ fontFamily: 'var(--font-serif)', textWrap: 'balance' }}>
        {title}
      </h1>
      <p className="mt-2 max-w-xl text-[14px] text-ink-600">{sub}</p>
      {children}
    </div>
  )
}

export function PreviewCard({ icon, title, description, accent }: {
  icon: ReactNode; title: string; description: string; accent: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-ink-200 bg-white p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
            style={{ background: `${accent}1a`, color: accent }}>
        {icon}
      </span>
      <div>
        <div className="text-[13.5px] font-semibold text-ink-800">{title}</div>
        <div className="mt-0.5 text-[12.5px] leading-snug text-ink-500">{description}</div>
      </div>
    </div>
  )
}
