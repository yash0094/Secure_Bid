import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { PageHeader } from '../../components/Shell'
import { Card, Field, Spinner, inputCls, money, pct } from '../../components/ui'
import { DataGrid } from '../../components/DataGrid'

export default function Competitors() {
  const [buyer, setBuyer] = useState('')
  const [category, setCategory] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const { data: filters } = useQuery({ queryKey: ['filters'], queryFn: () => api.get('/api/filters') })
  const { data, isLoading } = useQuery({
    queryKey: ['competitors', buyer, category],
    queryFn: () => api.get('/api/competitors', { buyer, category }),
  })
  const { data: detail } = useQuery({
    queryKey: ['competitor', selected],
    queryFn: () => api.get(`/api/competitors/${encodeURIComponent(selected!)}`),
    enabled: !!selected,
  })

  return (
    <div>
      <PageHeader title="Competitor intelligence" sub="Who bids in a bucket, how often, and how aggressively." />
      <Card className="mb-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Buyer">
            <select className={inputCls} value={buyer} onChange={(e) => setBuyer(e.target.value)}>
              <option value="">Any</option>
              {filters?.buyers?.map((b: string) => <option key={b} value={b}>{b}</option>)}
            </select>
          </Field>
          <Field label="Category">
            <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Any</option>
              {filters?.categories?.map((c: string) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Firms" className="lg:col-span-2">
          {isLoading ? <Spinner /> : (
            <DataGrid
              rows={data?.competitors ?? []}
              onRowClick={(r: any) => setSelected(r.bidder)}
              columns={[
                { key: 'bidder', header: 'Firm', render: (r: any) => r.bidder },
                { key: 'bids', header: 'Bids', align: 'right', numeric: true, render: (r: any) => r.bids },
                { key: 'wins', header: 'Wins', align: 'right', numeric: true, render: (r: any) => r.wins },
                { key: 'hit', header: 'Hit rate', align: 'right', numeric: true, render: (r: any) => pct(r.hit_rate) },
                { key: 'avg', header: 'Avg ratio', align: 'right', numeric: true, render: (r: any) => pct(r.avg_ratio) },
                { key: 'won', header: 'Won value', align: 'right', numeric: true, render: (r: any) => money(r.won_value) },
              ]}
            />
          )}
        </Card>
        <Card title={selected ?? 'Select a firm'}>
          {!selected && <div className="text-[13px] text-ink-400">Click a firm to see its bidding behaviour.</div>}
          {detail && (
            <div className="space-y-2 text-[13px]">
              <div className="flex justify-between"><span>Bids / wins</span><span>{detail.bids} / {detail.wins}</span></div>
              <div className="flex justify-between"><span>Hit rate</span><span>{pct(detail.hit_rate)}</span></div>
              <div className="flex justify-between"><span>Median ratio</span><span>{pct(detail.median_ratio)}</span></div>
              <div className="flex justify-between"><span>P10 ratio (aggressive)</span><span>{pct(detail.p10_ratio)}</span></div>
              <div className="mt-2 border-t border-ink-100 pt-2">
                {detail.categories.map((c: any) => (
                  <div key={c.category} className="flex justify-between py-0.5 text-ink-600">
                    <span>{c.category}</span><span>{c.wins}/{c.bids}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
