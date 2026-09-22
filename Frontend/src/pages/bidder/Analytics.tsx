import { useQuery } from '@tanstack/react-query'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../../lib/api'
import { PageHeader } from '../../components/Shell'
import { Card, KpiTile, Spinner, money, pct } from '../../components/ui'

export default function Analytics() {
  const { data, isLoading } = useQuery({ queryKey: ['analytics'], queryFn: () => api.get('/api/analytics/overview') })
  if (isLoading || !data) return <Spinner />

  return (
    <div>
      <PageHeader title="Analytics" sub="Spend, capital deployment and win-rate trends across your bidding activity." />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiTile label="Capital deployed" value={money(data.capital.deployed)}
                 sub={`${money(data.capital.available)} available`} />
        <KpiTile label="Utilisation" value={pct(data.capital.utilisation)} />
        <KpiTile label="Win rate" value={data.summary.win_rate === null ? '—' : pct(data.summary.win_rate)}
                 sub={`${data.summary.wins} of ${data.summary.total_bids}`} />
        <KpiTile label="Realized margin" value={money(data.summary.realized_margin)} tone="good" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Win-rate trend">
          {data.win_rate_trend.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data.win_rate_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `${Math.round(v * 100)}%`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => `${(Number(v) * 100).toFixed(0)}%`} />
                <Area type="monotone" dataKey="win_rate" stroke="#0a6ed1" fill="#d9ecff" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card title="Value by category">
          {data.categories.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.categories}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" />
                <XAxis dataKey="category" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => money(v)} width={70} />
                <Tooltip formatter={(v: any) => money(Number(v))} />
                <Bar dataKey="value" fill="#0a6ed1" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  )
}

function Empty() {
  return <div className="flex h-[220px] items-center justify-center text-[13px] text-ink-400">Not enough decided bids yet.</div>
}
