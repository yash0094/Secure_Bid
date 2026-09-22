import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { Card, RiskBadge, Spinner } from '../../components/ui'
import { DataGrid } from '../../components/DataGrid'
import { FeatureHero, PreviewCard } from '../../components/FeatureHero'
import { IconBarChart, IconColumns, IconShieldAlert, IconUsers } from '../../components/Icons'

const ACCENT = 'var(--color-official-500)'
const TINT = 'linear-gradient(135deg, var(--color-official-50), #ffffff)'

const SCREEN_TYPES = [
  { icon: <IconBarChart />, title: 'Bid Dispersion', description: 'How tightly bids cluster in a bucket, system-wide — real cost estimates disagree; identical ones raise questions.' },
  { icon: <IconColumns />, title: 'L1–L2 Spread', description: 'The gap between the winning bid and runner-up across every tender caller — a wide gap can mean a cover bid.' },
  { icon: <IconUsers />, title: 'Win Concentration', description: 'Whether a small clique of firms wins far more than their bid count alone would predict, in any department.' },
  { icon: <IconShieldAlert />, title: 'Bid Rotation', description: 'Firms taking turns to win within an otherwise stable bidder group, across departments.' },
  { icon: <IconUsers />, title: 'Repeated Pairing', description: 'The same firms showing up together across many tenders, regardless of which department called them.' },
  { icon: <IconBarChart />, title: 'Round-Number Clustering', description: 'Bids landing on suspiciously round figures more often than genuine estimation would produce.' },
]

export default function OfficialScreens() {
  const { data, isLoading } = useQuery({ queryKey: ['official-screens'], queryFn: () => api.get('/api/official/screens') })

  return (
    <div>
      <FeatureHero eyebrow="System-Wide Anomaly Intelligence" accent={ACCENT} tint={TINT}
        title="Every department, one risk-ranked view"
        sub="The same OECD-style structural screens available to bidders, run across every buyer/category bucket in the system and ranked by risk — a starting point for oversight, not a finding." />

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SCREEN_TYPES.map((s) => <PreviewCard key={s.title} icon={s.icon} title={s.title} description={s.description} accent={ACCENT} />)}
      </div>

      <Card title="Highest-risk buckets, system-wide">
        {isLoading ? <Spinner /> : (
          <DataGrid
            rows={data?.buckets ?? []}
            columns={[
              { key: 'buyer', header: 'Buyer', render: (r: any) => r.buyer },
              { key: 'category', header: 'Category', render: (r: any) => r.category },
              { key: 'risk', header: 'Risk', align: 'center', render: (r: any) => <RiskBadge risk={r.risk} /> },
              { key: 'top', header: 'Top flag', render: (r: any) => r.top_flag ?? '—' },
              { key: 'n', header: 'Tenders', align: 'right', numeric: true, render: (r: any) => r.n_tenders },
            ]}
          />
        )}
      </Card>
    </div>
  )
}
