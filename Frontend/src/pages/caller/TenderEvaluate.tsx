import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { PageHeader } from '../../components/Shell'
import { Button, Card, Spinner, StatusPill, money } from '../../components/ui'
import { DataGrid } from '../../components/DataGrid'

export default function TenderEvaluate() {
  const { id } = useParams()
  const qc = useQueryClient()
  const { data: t, isLoading } = useQuery({
    queryKey: ['caller-tender', id], queryFn: () => api.get(`/api/caller/tenders/${id}`),
  })

  const setStatus = useMutation({
    mutationFn: ({ sid, status }: { sid: number; status: string }) =>
      api.post(`/api/caller/tenders/${id}/submissions/${sid}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['caller-tender', id] }),
  })
  const publish = useMutation({
    mutationFn: () => api.put(`/api/caller/tenders/${id}`, { status: 'published' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['caller-tender', id] }),
  })
  const award = useMutation({
    mutationFn: (submission_id: number) => api.post(`/api/caller/tenders/${id}/award`, { submission_id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['caller-tender', id] }),
  })

  if (isLoading || !t) return <Spinner />

  return (
    <div>
      <PageHeader title={t.title} sub={`${t.category} · ${t.ref_no} · closes ${t.closes_at}`}
        action={<StatusPill status={t.status} />} />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card><div className="text-[11px] uppercase text-ink-400">Estimated value</div><div className="text-lg font-semibold">{money(t.estimated_value)}</div></Card>
        <Card><div className="text-[11px] uppercase text-ink-400">EMD</div><div className="text-lg font-semibold">{money(t.emd)}</div></Card>
        <Card><div className="text-[11px] uppercase text-ink-400">Submissions</div><div className="text-lg font-semibold">{t.submissions?.length ?? 0}</div></Card>
        <Card>
          {t.status === 'draft' ? (
            <Button className="w-full" onClick={() => publish.mutate()} disabled={publish.isPending}>Publish tender</Button>
          ) : <div className="text-[13px] text-ink-500 pt-1">Visible to bidders</div>}
        </Card>
      </div>

      <Card title="Submissions, lowest first">
        <DataGrid
          rows={t.submissions ?? []}
          emptyLabel="No bids submitted yet."
          columns={[
            { key: 'company', header: 'Bidder', render: (r: any) => r.company_name },
            { key: 'amount', header: 'Amount', align: 'right', numeric: true, render: (r: any) => money(r.amount) },
            { key: 'status', header: 'Status', align: 'center', render: (r: any) => <StatusPill status={r.status} /> },
            { key: 'actions', header: '', align: 'right', render: (r: any) => (
              t.status !== 'closed' && r.status === 'submitted' ? (
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" className="!py-1 text-[11px]" onClick={() => setStatus.mutate({ sid: r.id, status: 'shortlisted' })}>Shortlist</Button>
                  <Button variant="ghost" className="!py-1 text-[11px]" onClick={() => setStatus.mutate({ sid: r.id, status: 'rejected' })}>Reject</Button>
                  <Button className="!py-1 text-[11px]" onClick={() => award.mutate(r.id)} disabled={award.isPending}>Award</Button>
                </div>
              ) : null) },
          ]}
        />
      </Card>
    </div>
  )
}
