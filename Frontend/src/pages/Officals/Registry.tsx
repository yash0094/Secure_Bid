import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { PageHeader } from '../../components/Shell'
import { Card, Field, StatusPill, inputCls, money } from '../../components/ui'
import { DataGrid } from '../../components/DataGrid'

export default function Registry() {
  const [status, setStatus] = useState('')
  const { data } = useQuery({
    queryKey: ['official-registry', status],
    queryFn: () => api.get('/api/official/tenders', { status }),
  })

  return (
    <div>
      <PageHeader title="Tender registry" sub="Every tender across every tender-calling organisation." />
      <Card className="mb-4">
        <Field label="Status">
          <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="closed">Closed</option>
          </select>
        </Field>
      </Card>
      <Card>
        <DataGrid
          rows={data?.tenders ?? []}
          columns={[
            { key: 'title', header: 'Title', render: (r: any) => (
              <div><div className="font-medium text-ink-800">{r.title}</div>
                <div className="text-[11px] text-ink-500">{r.caller_name ?? 'Seeded demo data'} · {r.category}</div></div>) },
            { key: 'state', header: 'State', render: (r: any) => r.buyer_state },
            { key: 'value', header: 'Value', align: 'right', numeric: true, render: (r: any) => money(r.estimated_value) },
            { key: 'status', header: 'Status', align: 'center', render: (r: any) => <StatusPill status={r.status} /> },
          ]}
        />
      </Card>
    </div>
  )
}
