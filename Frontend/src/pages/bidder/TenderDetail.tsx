import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { PageHeader } from '../../components/Shell'
import { Button, Card, Field, Spinner, StatusPill, inputCls, money, pct } from '../../components/ui'

export default function TenderDetail() {
  const { id } = useParams()
  const qc = useQueryClient()
  const { data: t, isLoading } = useQuery({
    queryKey: ['tender', id], queryFn: () => api.get(`/api/tenders/${id}`),
  })
  const [cost, setCost] = useState('')
  const [target, setTarget] = useState('8')
  const recommend = useMutation({
    mutationFn: () => api.post('/api/pricing/recommend', {
      tender_id: Number(id), cost: cost ? Number(cost) : undefined, target_margin_pct: Number(target),
    }),
  })
  const [ourBid, setOurBid] = useState('')
  const [costEst, setCostEst] = useState('')
  const upsertPipeline = useMutation({
    mutationFn: (status: string) => api.post('/api/pipeline', {
      tender_id: Number(id), status,
      our_bid: ourBid ? Number(ourBid) : undefined,
      cost_est: costEst ? Number(costEst) : undefined,
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tender', id] }),
  })

  if (isLoading || !t) return <Spinner />

  return (
    <div>
      <PageHeader title={t.title} sub={`${t.buyer} · ${t.category} · ${t.buyer_state} · ${t.ref_no}`} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Tender details">
            <div className="grid grid-cols-2 gap-3 text-[13px] sm:grid-cols-4">
              <Info label="Estimated value" value={money(t.estimated_value)} />
              <Info label="EMD" value={money(t.emd)} />
              <Info label="Closes" value={t.closes_at} />
              <Info label="Portal" value={t.portal} />
            </div>
            <p className="mt-3 text-[13px] text-ink-600">{t.description}</p>
          </Card>

          {t.match && (
            <Card title="Eligibility match" action={<StatusPill status={t.match.verdict} />}>
              <div className="space-y-1.5">
                {t.match.checks?.map((c: any, i: number) => (
                  <div key={i} className="flex items-center justify-between border-b border-ink-50 py-1.5 text-[13px] last:border-0">
                    <span className="text-ink-700">{c.criterion}</span>
                    <span className={c.status === 'pass' ? 'text-success-500' : c.blocking ? 'text-danger-500' : 'text-warn-500'}>
                      {c.status}
                    </span>
                  </div>
                ))}
              </div>
              {t.checklist?.length > 0 && (
                <div className="mt-4">
                  <div className="mb-1.5 text-[11px] font-semibold uppercase text-ink-500">Document checklist</div>
                  <ul className="list-disc space-y-1 pl-4 text-[13px] text-ink-600">
                    {t.checklist.map((c: any, i: number) => <li key={i}>{c.item}</li>)}
                  </ul>
                </div>
              )}
            </Card>
          )}

          <Card title="Comparable history">
            <div className="space-y-1.5 text-[13px]">
              {(t.comparables ?? []).map((c: any) => (
                <div key={c.ref_no} className="flex items-center justify-between border-b border-ink-50 py-1.5 last:border-0">
                  <span className="text-ink-600">{c.title}</span>
                  <span className="mono text-ink-500">{(c.l1_ratio * 100).toFixed(1)}% of estimate</span>
                </div>
              ))}
              {(!t.comparables || t.comparables.length === 0) && <div className="text-ink-400">No comparable history yet.</div>}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="BidVector pricing recommendation">
            <div className="space-y-2">
              <Field label="Your cost (leave blank for 82% of estimate)">
                <input className={inputCls} value={cost} onChange={(e) => setCost(e.target.value)} placeholder={money(t.estimated_value * 0.82)} />
              </Field>
              <Field label="Target margin %"><input className={inputCls} value={target} onChange={(e) => setTarget(e.target.value)} /></Field>
              <Button className="w-full" onClick={() => recommend.mutate()} disabled={recommend.isPending}>
                {recommend.isPending ? 'Computing…' : 'Recommend a bid'}
              </Button>
              {recommend.data && (
                <>
                  <div className="mt-2 space-y-1 rounded-md bg-brand-50 p-3 text-[13px]">
                    <Row label="Recommended bid" value={money(recommend.data.recommendation.bid)} />
                    <Row label="Win probability" value={pct(recommend.data.recommendation.win_prob)} />
                    <Row label="Expected profit" value={money(recommend.data.recommendation.expected_profit)} />
                  </div>
                  <div className="rounded-md border border-ink-100 p-2 text-[11px] text-ink-500">
                    Confidence: <span className="font-medium text-ink-700">{recommend.data.data.confidence}</span>
                    {' — '}{recommend.data.data.confidence_note}
                  </div>
                  <div className="space-y-1.5">
                    {recommend.data.options.map((o: any) => (
                      <div key={o.label} className="flex items-center justify-between border-b border-ink-50 py-1 text-[12px] last:border-0">
                        <span className="font-medium text-ink-700">{o.label}</span>
                        <span className="mono text-ink-600">{money(o.bid)} · {pct(o.win_prob)} win</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </Card>

          <Card title="Add to pipeline">
            <div className="space-y-2">
              {t.pipeline && <StatusPill status={t.pipeline.status} />}
              <Field label="Our bid"><input className={inputCls} value={ourBid} onChange={(e) => setOurBid(e.target.value)} /></Field>
              <Field label="Cost estimate"><input className={inputCls} value={costEst} onChange={(e) => setCostEst(e.target.value)} /></Field>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="ghost" onClick={() => upsertPipeline.mutate('watching')}>Watch</Button>
                <Button variant="ghost" onClick={() => upsertPipeline.mutate('preparing')}>Preparing</Button>
                <Button className="col-span-2" onClick={() => upsertPipeline.mutate('submitted')}>Mark submitted</Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><div className="text-[11px] uppercase text-ink-400">{label}</div><div className="font-medium text-ink-800">{value}</div></div>
}
function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><span className="text-ink-600">{label}</span><span className="font-semibold text-ink-900">{value}</span></div>
}
