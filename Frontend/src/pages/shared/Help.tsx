import type { ReactNode } from 'react'
import { useAuth, type Role } from '../../lib/auth'
import { PageHeader } from '../../components/Shell'
import { Card } from '../../components/ui'
import {
  IconHome, IconSearch, IconColumns, IconShieldAlert, IconWallet, IconBarChart,
  IconUsers, IconFileText, IconBell, IconUserCircle, IconPlusCircle,
  IconClipboardList, IconAward, IconBuilding, IconSettings,
} from '../../components/Icons'

interface Feature { icon: (p: { className?: string }) => ReactNode; title: string; desc: string }

const STEPS: Record<Role, string[]> = {
  bidder: [
    'Fill in your Company Profile (menu) — it drives eligibility matching and the bid model.',
    'Use Discover to search live tenders, or check Home for your ranked opportunities.',
    'Open a tender to see its recommended bid price, then track it on the Pipeline board.',
    'Save searches under Alerts so new matching tenders reach you automatically.',
  ],
  tender_caller: [
    'Create a tender — eligibility clauses are parsed automatically from what you paste in.',
    'Publish it once it looks right; it then appears to bidders under Discover.',
    'When submissions come in, open the tender to evaluate and shortlist bidders.',
    'Award a winner — this closes the tender and feeds the award into the platform’s historical data.',
  ],
  official: [
    'Overview gives you spend analytics and award-value trends across every department.',
    'Registry lists every tender from every tender caller, filterable by state and status.',
    'Anomaly screens flag unusual bidding patterns system-wide for follow-up.',
    'This role is read-only — officials cannot create tenders or place bids.',
  ],
}

const FEATURES: Record<Role, Feature[]> = {
  bidder: [
    { icon: (p) => <IconHome {...p} />, title: 'Home', desc: 'Your ranked opportunity list and pipeline health at a glance.' },
    { icon: (p) => <IconSearch {...p} />, title: 'Discover', desc: 'Search and filter every published tender.' },
    { icon: (p) => <IconColumns {...p} />, title: 'Pipeline', desc: 'Kanban board tracking bids from prep through award.' },
    { icon: (p) => <IconShieldAlert {...p} />, title: 'Anomaly screens', desc: 'OECD-style collusion screening on tenders you’re watching.' },
    { icon: (p) => <IconWallet {...p} />, title: 'Portfolio optimiser', desc: 'EMD-constrained pick of which tenders to bid, given your working capital.' },
    { icon: (p) => <IconBarChart {...p} />, title: 'Analytics', desc: 'Your win rate, margins and bidding history over time.' },
    { icon: (p) => <IconUsers {...p} />, title: 'Competitors', desc: 'Anonymised intelligence on who you tend to compete against.' },
    { icon: (p) => <IconFileText {...p} />, title: 'Eligibility parser', desc: 'Paste any tender’s eligibility clause to check it offline.' },
    { icon: (p) => <IconBell {...p} />, title: 'Alerts', desc: 'Saved searches that notify you when a matching tender is published.' },
    { icon: (p) => <IconUserCircle {...p} />, title: 'Company profile', desc: 'Your MSME class, certifications and capital — used for matching and pricing.' },
  ],
  tender_caller: [
    { icon: (p) => <IconClipboardList {...p} />, title: 'Tenders', desc: 'Every tender you’ve authored, draft or published.' },
    { icon: (p) => <IconPlusCircle {...p} />, title: 'Create', desc: 'Author a new tender; eligibility clauses are parsed automatically.' },
    { icon: (p) => <IconAward {...p} />, title: 'Awards', desc: 'Tenders you’ve closed out and who won them.' },
    { icon: (p) => <IconUserCircle {...p} />, title: 'Profile', desc: 'Your organisation, department and state.' },
  ],
  official: [
    { icon: (p) => <IconHome {...p} />, title: 'Overview', desc: 'Spend analytics and award-value trend across every department.' },
    { icon: (p) => <IconBuilding {...p} />, title: 'Registry', desc: 'Full tender registry across every tender caller.' },
    { icon: (p) => <IconShieldAlert {...p} />, title: 'Anomaly screens', desc: 'System-wide collusion screens, ranked.' },
    { icon: (p) => <IconUserCircle {...p} />, title: 'Profile', desc: 'Your department and designation.' },
  ],
}

export default function Help() {
  const { user } = useAuth()
  if (!user) return null
  const steps = STEPS[user.role]
  const features = FEATURES[user.role]

  return (
    <div>
      <PageHeader title="Help & manual" sub="A quick guide to using SecureBid." />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Getting started">
          <ol className="space-y-2.5">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-2.5 text-[13px] text-ink-700">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                      style={{ background: 'var(--role-accent, var(--color-brand-500))' }}>{i + 1}</span>
                <span className="pt-0.5">{s}</span>
              </li>
            ))}
          </ol>
        </Card>

        <Card title="Features">
          <div className="space-y-3">
            {features.map((f) => (
              <div key={f.title} className="flex items-start gap-3">
                <span className="mt-0.5 text-ink-500">{f.icon({ className: 'h-[18px] w-[18px] shrink-0' })}</span>
                <div>
                  <div className="text-[13px] font-medium text-ink-800">{f.title}</div>
                  <div className="text-[11.5px] text-ink-500">{f.desc}</div>
                </div>
              </div>
            ))}
            <div className="flex items-start gap-3 border-t border-ink-100 pt-3">
              <span className="mt-0.5 text-ink-500"><IconSettings className="h-[18px] w-[18px] shrink-0" /></span>
              <div>
                <div className="text-[13px] font-medium text-ink-800">Settings</div>
                <div className="text-[11.5px] text-ink-500">Change your password and manage your account.</div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
