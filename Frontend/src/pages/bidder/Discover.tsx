import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { PageHeader } from '../../components/Shell'
import { Button, Card, DaysPill, Field, Spinner, StatusPill, inputCls, money } from '../../components/ui'
import { DataGrid } from '../../components/DataGrid'

export default function Discover() {
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const [state, setState] = useState('')
  const [eligibleOnly, setEligibleOnly] = useState(false)
  const [savedName, setSavedName] = useState('')
  const [showSave, setShowSave] = useState(false)

  const { data: filters } = useQuery({ queryKey: ['filters'], queryFn: () => api.get('/api/filters') })
  const params = { q, category, state, eligible_only: eligibleOnly ? '1' : '', page_size: 50 }
  const { data, isLoading } = useQuery({
    queryKey: ['tenders', params],
    queryFn: () => api.get('/api/tenders', params),
  })

  const save = useMutation({
    mutationFn: () => api.post('/api/saved-searches', { name: savedName || `${category || 'All'} in ${state || 'any state'}`,
      params: { q, category, state } }),
    onSuccess: () => setShowSave(false),
  })

  return (
    <div>
      <PageHeader title="Discover tenders" sub="Search 200+ live tenders, screened against your eligibility profile." />
      <Card className="mb-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Field label="Keyword"><input className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} placeholder="title, buyer, ref no…" /></Field>
          <Field label="Category">
            <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Any</option>
              {filters?.categories?.map((c: string) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="State">
            <select className={inputCls} value={state} onChange={(e) => setState(e.target.value)}>
              <option value="">Any</option>
              {filters?.states?.map((s: string) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <label className="mt-6 flex items-center gap-2 text-[13px] text-ink-600">
            <input type="checkbox" checked={eligibleOnly} onChange={(e) => setEligibleOnly(e.target.checked)} />
            Eligible only
          </label>
          <div className="mt-6">
            {!showSave ? (
              <Button variant="ghost" className="w-full" onClick={() => setShowSave(true)}>Save this search</Button>
            ) : (
              <div className="flex gap-1">
                <input className={inputCls} placeholder="Search name" value={savedName}
                       onChange={(e) => setSavedName(e.target.value)} />
                <Button onClick={() => save.mutate()} disabled={save.isPending}>Save</Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {isLoading ? <Spinner /> : (
        <Card title={`${data?.total ?? 0} tenders`}>
          <DataGrid
            rows={data?.results ?? []}
            onRowClick={(r: any) => nav(`/app/tenders/${r.id}`)}
            columns={[
              { key: 'title', header: 'Tender', render: (r: any) => (
                <div><div className="font-medium text-ink-800">{r.title}</div>
                  <div className="text-[11px] text-ink-500">{r.buyer} · {r.category} · {r.buyer_state}</div></div>) },
              { key: 'value', header: 'Value', align: 'right', numeric: true, render: (r: any) => money(r.estimated_value) },
              { key: 'emd', header: 'EMD', align: 'right', numeric: true, render: (r: any) => money(r.emd) },
              { key: 'match', header: 'Match', align: 'center', render: (r: any) => r.match ? <StatusPill status={r.match.verdict} /> : '—' },
              { key: 'closes', header: 'Closes', align: 'right', render: (r: any) => <DaysPill days={r.days_left} /> },
            ]}
          />
        </Card>
      )}
    </div>
  )
}
