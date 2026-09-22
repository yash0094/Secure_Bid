import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { PageHeader } from '../../components/Shell'
import { Card, EmptyState, money } from '../../components/ui'

export default function CallerAwards() {
  const nav = useNavigate()
  const { data } = useQuery({ queryKey: ['caller-tenders'], queryFn: () => api.get('/api/caller/tenders') })
  const closed = (data?.tenders ?? []).filter((t: any) => t.status === 'closed')

  return (
    <div>
      <PageHeader title="Awards issued" sub="Tenders you've awarded a winner to." />
      <Card>
        {closed.length === 0 && <EmptyState>No awards yet — awarded tenders will show up here.</EmptyState>}
        <div className="space-y-2">
          {closed.map((t: any) => (
            <div key={t.id} onClick={() => nav(`/buyer/tenders/${t.id}`)}
                 className="cursor-pointer rounded-md border border-ink-100 px-3 py-2 hover:bg-brand-50/50">
              <div className="text-[13px] font-medium text-ink-800">{t.title}</div>
              <div className="text-[11px] text-ink-500">{t.category} · {money(t.estimated_value)}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
