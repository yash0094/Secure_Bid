import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { PageHeader } from '../../components/Shell'
import { Button, Card, StatusPill, money } from '../../components/ui'
import { DataGrid } from '../../components/DataGrid'

export default function MyTenders() {
  const nav = useNavigate()
  const { data, isLoading } = useQuery({ queryKey: ['caller-tenders'], queryFn: () => api.get('/api/caller/tenders') })

  return (
    <div>
      <PageHeader title="My tenders" sub="Tenders you've authored, draft or published."
        action={<Button onClick={() => nav('/buyer/tenders/new')}>+ Create tender</Button>} />
      <Card>
        <DataGrid
          rows={data?.tenders ?? []}
          onRowClick={(r: any) => nav(`/buyer/tenders/${r.id}`)}
          emptyLabel={isLoading ? 'Loading…' : 'No tenders yet — create your first one.'}
          columns={[
            { key: 'title', header: 'Title', render: (r: any) => (
              <div><div className="font-medium text-ink-800">{r.title}</div>
                <div className="text-[11px] text-ink-500">{r.category} · {r.ref_no}</div></div>) },
            { key: 'value', header: 'Value', align: 'right', numeric: true, render: (r: any) => money(r.estimated_value) },
            { key: 'closes', header: 'Closes', align: 'right', render: (r: any) => r.closes_at },
            { key: 'subs', header: 'Submissions', align: 'right', numeric: true, render: (r: any) => r.submission_count },
            { key: 'status', header: 'Status', align: 'center', render: (r: any) => <StatusPill status={r.status} /> },
          ]}
        />
      </Card>
    </div>
  )
}
