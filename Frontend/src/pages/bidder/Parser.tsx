import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { PageHeader } from '../../components/Shell'
import { Button, Card, StatusPill } from '../../components/ui'

export default function Parser() {
  const [text, setText] = useState('')
  const parse = useMutation({ mutationFn: () => api.post('/api/parse', { text }) })

  return (
    <div>
      <PageHeader title="Eligibility clause parser" sub="Paste any tender's eligibility clause block to see what the regex parser extracts, offline." />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Paste clause text">
          <textarea className="h-72 w-full rounded-md border border-ink-300 p-2.5 text-[12px] leading-relaxed outline-none focus:border-brand-500"
                    value={text} onChange={(e) => setText(e.target.value)}
                    placeholder="3.1 The bidder shall have an average annual turnover of Rs. 2.50 Crore…" />
          <Button className="mt-3" onClick={() => parse.mutate()} disabled={!text || parse.isPending}>
            {parse.isPending ? 'Parsing…' : 'Parse'}
          </Button>
        </Card>
        <Card title="Extracted criteria">
          {!parse.data && <div className="text-[13px] text-ink-400">Results appear here.</div>}
          {parse.data && (
            <div className="space-y-2 text-[13px]">
              <Row label="Min turnover" value={parse.data.parsed.min_turnover} />
              <Row label="Min experience (yrs)" value={parse.data.parsed.min_experience_years} />
              <Row label="Min similar work value" value={parse.data.parsed.min_similar_work} />
              <Row label="Similar work count" value={parse.data.parsed.similar_work_count} />
              <Row label="Bidder class" value={parse.data.parsed.bidder_class} />
              <Row label="MSME relaxation" value={String(parse.data.parsed.msme_relaxation ?? false)} />
              <Row label="Joint venture allowed" value={String(parse.data.parsed.joint_venture_allowed ?? true)} />
              <div>
                <span className="text-ink-500">Certifications: </span>
                {(parse.data.parsed.certifications ?? []).join(', ') || '—'}
              </div>
              {parse.data.match && (
                <div className="mt-3 border-t border-ink-100 pt-3">
                  <span className="mr-2 text-ink-500">Your eligibility:</span>
                  <StatusPill status={parse.data.match.verdict} />
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: any }) {
  return <div className="flex justify-between border-b border-ink-50 py-1 last:border-0">
    <span className="text-ink-500">{label}</span><span className="font-medium text-ink-800">{value ?? '—'}</span>
  </div>
}
