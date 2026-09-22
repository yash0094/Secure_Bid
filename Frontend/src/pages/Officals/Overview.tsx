import { useQuery } from '@tanstack/react-query'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../../lib/api'
import { PageHeader } from '../../components/Shell'
import { Card, KpiTile, Spinner, money } from '../../components/ui'

export default function Overview() {
  const { data, isLoading } = useQuery({ queryKey: ['official-overview'], queryFn: () => api.get('/api/official/overview') })
  if (isLoading || !data) return <Spinner />
  const t = data.totals

  return (
    <div>
      <PageHeader title="Oversight dashboard" sub="Cross-department, read-only visibility into procurement activity." />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiTile label="Total tenders" value={t.tenders} sub={`${t.published} published / ${t.closed} closed`} />
        <KpiTile label="Total awards" value={t.awards} />
        <KpiTile label="Pipeline value" value={money(t.pipeline_value)} />
        <KpiTile label="Awarded value" value={money(t.awarded_value)} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Award value trend">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.award_trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => money(v)} width={70} />
              <Tooltip formatter={(v: any) => money(Number(v))} />
              <Line type="monotone" dataKey="value" stroke="#0a6ed1" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Value by state">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.by_state}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" />
              <XAxis dataKey="buyer_state" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => money(v)} width={70} />
              <Tooltip formatter={(v: any) => money(Number(v))} />
              <Bar dataKey="value" fill="#0a6ed1" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
      <Card title="Top tender callers by value" className="mt-4">
        <div className="space-y-1.5 text-[13px]">
          {data.top_callers.map((c: any) => (
            <div key={c.company_name} className="flex items-center justify-between border-b border-ink-50 py-1.5 last:border-0">
              <span className="text-ink-700">{c.company_name}</span>
              <span className="mono text-ink-500">{c.tenders} tenders · {money(c.value)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
