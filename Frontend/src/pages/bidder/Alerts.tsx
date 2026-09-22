import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { PageHeader } from '../../components/Shell'
import { Button, Card, EmptyState } from '../../components/ui'

export default function Alerts() {
  const qc = useQueryClient()
  const { data: alerts } = useQuery({ queryKey: ['alerts'], queryFn: () => api.get('/api/alerts') })
  const { data: saved } = useQuery({ queryKey: ['saved-searches'], queryFn: () => api.get('/api/saved-searches') })

  const markRead = useMutation({
    mutationFn: (id: number) => api.post(`/api/alerts/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  })
  const removeSearch = useMutation({
    mutationFn: (id: number) => api.del(`/api/saved-searches/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved-searches'] }),
  })

  return (
    <div>
      <PageHeader title="Alerts & saved searches" sub="Your notification centre and the standing searches that feed it." />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title={`Alerts ${alerts?.unread ? `(${alerts.unread} unread)` : ''}`}>
          {(!alerts?.alerts || alerts.alerts.length === 0) && <EmptyState>No alerts yet.</EmptyState>}
          <div className="space-y-2">
            {alerts?.alerts?.map((a: any) => (
              <div key={a.id} className={`rounded-md border px-3 py-2 text-[13px] ${a.read ? 'border-ink-100 text-ink-500' : 'border-brand-200 bg-brand-50 text-ink-800'}`}>
                <div className="flex items-start justify-between gap-2">
                  <span>{a.message}</span>
                  {!a.read && <button className="shrink-0 text-[11px] font-medium text-brand-600" onClick={() => markRead.mutate(a.id)}>Mark read</button>}
                </div>
                <div className="mt-1 text-[11px] text-ink-400">{a.created_at}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Saved searches">
          {(!saved?.saved_searches || saved.saved_searches.length === 0) && <EmptyState>Save a search from Discover to see it here.</EmptyState>}
          <div className="space-y-2">
            {saved?.saved_searches?.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between rounded-md border border-ink-100 px-3 py-2 text-[13px]">
                <div>
                  <div className="font-medium text-ink-800">{s.name}</div>
                  <div className="text-[11px] text-ink-500">
                    {Object.entries(s.params).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(' · ') || 'All tenders'}
                  </div>
                </div>
                <Button variant="ghost" className="!py-1 text-[11px]" onClick={() => removeSearch.mutate(s.id)}>Remove</Button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
