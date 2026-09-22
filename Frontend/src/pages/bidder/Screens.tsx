import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { Card, Field, RiskBadge, Spinner, inputCls } from '../../components/ui'
import { DataGrid } from '../../components/DataGrid'
import { FeatureHero, PreviewCard } from '../../components/FeatureHero'
import { IconBarChart, IconColumns, IconShieldAlert, IconUsers } from '../../components/Icons'

const ACCENT = 'var(--color-brand-500)'
const TINT = 'linear-gradient(135deg, var(--color-brand-50), #ffffff)'

const SCREEN_TYPES = [
  { icon: <IconBarChart />, title: 'Bid Dispersion', description: 'How tightly bids in a bucket cluster together — real cost estimates disagree; identical ones raise questions.' },
  { icon: <IconColumns />, title: 'L1–L2 Spread', description: 'The gap between the winning bid and the runner-up — a suspiciously wide gap can mean a "cover" bid.' },
  { icon: <IconUsers />, title: 'Win Concentration', description: 'Whether a small clique of firms wins far more often than their bid count alone would predict.' },
  { icon: <IconShieldAlert />, title: 'Bid Rotation', description: 'Firms taking turns to win within an otherwise stable group of bidders, tender after tender.' },
  { icon: <IconUsers />, title: 'Repeated Pairing', description: 'The same firms consistently showing up together across many tenders in a bucket.' },
  { icon: <IconBarChart />, title: 'Round-Number Clustering', description: "Bids landing on suspiciously round figures more often than genuine estimation would produce." },
]

export default function Screens() {
  const [buyer, setBuyer] = useState('')
  const [category, setCategory] = useState('')
  const { data: filters } = useQuery({ queryKey: ['filters'], queryFn: () => api.get('/api/filters') })
  const { data: ranked, isLoading } = useQuery({ queryKey: ['screens-ranked'], queryFn: () => api.get('/api/screens/ranked') })
  const { data: bucket } = useQuery({
    queryKey: ['screens', buyer, category],
    queryFn: () => api.get('/api/screens', { buyer, category }),
    enabled: !!(buyer && category),
  })

  return (
    <div>
      <FeatureHero eyebrow="Anomaly Intelligence" accent={ACCENT} tint={TINT}
        title="Know which bidding patterns deserve a second look"
        sub="Six OECD-style structural screens run across every buyer/category bucket, ranked by risk. These are statistical signals for deciding where to look closer — not accusations." />

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SCREEN_TYPES.map((s) => <PreviewCard key={s.title} icon={s.icon} title={s.title} description={s.description} accent={ACCENT} />)}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Highest-risk buckets" className="lg:col-span-2">
          {isLoading ? <Spinner /> : (
            <DataGrid
              rows={ranked?.buckets ?? []}
              onRowClick={(r: any) => { setBuyer(r.buyer); setCategory(r.category) }}
              columns={[
                { key: 'buyer', header: 'Buyer', render: (r: any) => r.buyer },
                { key: 'category', header: 'Category', render: (r: any) => r.category },
                { key: 'risk', header: 'Risk', align: 'center', render: (r: any) => <RiskBadge risk={r.risk} /> },
                { key: 'top', header: 'Top flag', render: (r: any) => r.top_flag ?? '—' },
                { key: 'n', header: 'Tenders', align: 'right', numeric: true, render: (r: any) => r.n_tenders },
              ]}
            />
          )}
        </Card>
        <Card title="Inspect a bucket">
          <div className="grid grid-cols-1 gap-2">
            <Field label="Buyer">
              <select className={inputCls} value={buyer} onChange={(e) => setBuyer(e.target.value)}>
                <option value="">Select…</option>
                {filters?.buyers?.map((b: string) => <option key={b} value={b}>{b}</option>)}
              </select>
            </Field>
            <Field label="Category">
              <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">Select…</option>
                {filters?.categories?.map((c: string) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>
          {bucket?.insufficient && <div className="mt-3 text-[12px] text-ink-400">{bucket.message}</div>}
          {bucket && !bucket.insufficient && (
            <div className="mt-3 space-y-2 border-t border-ink-100 pt-3">
              <RiskBadge risk={bucket.risk} />
              {bucket.screens?.map((s: any, i: number) => (
                <div key={i} className="border-b border-ink-50 pb-2 text-[12px] last:border-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-ink-700">{s.name}</span>
                    <span className={s.flag ? 'text-danger-500' : 'text-ink-400'}>{s.display}</span>
                  </div>
                  <div className="mt-0.5 text-ink-500">{s.detail}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
