import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { PageHeader } from '../../components/Shell'
import { Button, DaysPill, money } from '../../components/ui'

const COLUMNS = [
  { key: 'watching', label: 'Watching' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'won', label: 'Won' },
  { key: 'lost', label: 'Lost' },
] as const

type Status = typeof COLUMNS[number]['key']
const FLOW: Record<Status, Status | null> = {
  watching: 'preparing', preparing: 'submitted', submitted: 'won', won: null, lost: null,
}

export default function Pipeline() {
  const qc = useQueryClient()
  const [expanded, setExpanded] = useState<number | null>(null)
  const { data, isLoading } = useQuery({ queryKey: ['pipeline'], queryFn: () => api.get('/api/pipeline') })

  const move = useMutation({
    mutationFn: ({ tender_id, status }: { tender_id: number; status: string }) =>
      api.post('/api/pipeline', { tender_id, status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipeline'] }),
  })

  if (isLoading || !data) return null
  const byStatus: Record<string, any[]> = {}
  for (const c of COLUMNS) byStatus[c.key] = []
  for (const p of data.pipeline) (byStatus[p.status] ?? (byStatus[p.status] = [])).push(p)

  return (
    <div>
      <PageHeader title="Bid pipeline" sub="Move a card forward as work progresses. Checklists and post-award milestones live on each card." />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {COLUMNS.map((col) => (
          <div key={col.key} className="rounded-lg bg-ink-100/60 p-2">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-[11px] font-semibold uppercase text-ink-500">{col.label}</span>
              <span className="text-[11px] text-ink-400">{byStatus[col.key]?.length ?? 0}</span>
            </div>
            <div className="space-y-2">
              {(byStatus[col.key] ?? []).map((p) => (
                <PipelineCard key={p.id} p={p} expanded={expanded === p.id}
                  onToggle={() => setExpanded(expanded === p.id ? null : p.id)}
                  onAdvance={FLOW[col.key] ? () => move.mutate({ tender_id: p.tender_id, status: FLOW[col.key]! }) : undefined} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PipelineCard({ p, expanded, onToggle, onAdvance }: any) {
  return (
    <div className="rounded-md border border-ink-200 bg-white p-2.5 shadow-sm">
      <div className="cursor-pointer" onClick={onToggle}>
        <div className="text-[13px] font-medium text-ink-800">{p.title}</div>
        <div className="mt-0.5 text-[11px] text-ink-500">{p.buyer}</div>
        <div className="mt-1.5 flex items-center justify-between">
          <span className="mono text-[11px] text-ink-600">{money(p.our_bid)}</span>
          <DaysPill days={p.days_left} />
        </div>
      </div>
      {onAdvance && (
        <Button variant="ghost" className="mt-2 w-full !py-1 text-[11px]" onClick={onAdvance}>Advance →</Button>
      )}
      {expanded && p.status !== 'won' && <Checklist pipelineId={p.id} />}
      {expanded && p.status === 'won' && <Milestones pipelineId={p.id} />}
    </div>
  )
}

function Checklist({ pipelineId }: { pipelineId: number }) {
  const qc = useQueryClient()
  const [label, setLabel] = useState('')
  const { data } = useQuery({
    queryKey: ['checklist', pipelineId], queryFn: () => api.get(`/api/pipeline/${pipelineId}/checklist`),
  })
  const toggle = useMutation({
    mutationFn: (item: any) => api.put(`/api/pipeline/${pipelineId}/checklist/${item.id}`, { done: !item.done }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['checklist', pipelineId] }),
  })
  const add = useMutation({
    mutationFn: () => api.post(`/api/pipeline/${pipelineId}/checklist`, { label }),
    onSuccess: () => { setLabel(''); qc.invalidateQueries({ queryKey: ['checklist', pipelineId] }) },
  })
  return (
    <div className="mt-2 space-y-1 border-t border-ink-100 pt-2">
      {data?.checklist?.map((item: any) => (
        <label key={item.id} className="flex items-center gap-1.5 text-[12px]">
          <input type="checkbox" checked={!!item.done} onChange={() => toggle.mutate(item)} />
          <span className={item.done ? 'text-ink-400 line-through' : 'text-ink-700'}>{item.label}</span>
        </label>
      ))}
      <div className="flex gap-1 pt-1">
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Add item…"
               className="w-full rounded border border-ink-200 px-1.5 py-0.5 text-[11px]" />
        <button onClick={() => label && add.mutate()} className="text-[11px] font-medium text-brand-600">Add</button>
      </div>
    </div>
  )
}

function Milestones({ pipelineId }: { pipelineId: number }) {
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['milestones', pipelineId], queryFn: () => api.get(`/api/pipeline/${pipelineId}/milestones`),
  })
  const setDone = useMutation({
    mutationFn: (m: any) => api.put(`/api/pipeline/${pipelineId}/milestones/${m.id}`,
      { status: m.status === 'done' ? 'pending' : 'done' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['milestones', pipelineId] }),
  })
  return (
    <div className="mt-2 space-y-1 border-t border-ink-100 pt-2">
      {data?.milestones?.map((m: any) => (
        <label key={m.id} className="flex items-center justify-between gap-1.5 text-[12px]">
          <span className="flex items-center gap-1.5">
            <input type="checkbox" checked={m.status === 'done'} onChange={() => setDone.mutate(m)} />
            <span className={m.status === 'done' ? 'text-ink-400 line-through' : 'text-ink-700'}>{m.title}</span>
          </span>
          <span className="text-ink-400">{m.due_date}</span>
        </label>
      ))}
      {(!data?.milestones || data.milestones.length === 0) && <div className="text-[11px] text-ink-400">No milestones yet.</div>}
    </div>
  )
}
