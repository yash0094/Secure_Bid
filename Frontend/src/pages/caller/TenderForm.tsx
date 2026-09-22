import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { PageHeader } from '../../components/Shell'
import { Button, Card, Field, inputCls } from '../../components/ui'

export default function TenderForm() {
  const nav = useNavigate()
  const [form, setForm] = useState({
    title: '', category: 'Civil Works', buyer_state: '', estimated_value: '', emd: '',
    closes_at: '', completion_months: '6', description: '', raw_eligibility: '',
  })
  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value })

  const create = useMutation({
    mutationFn: (status: string) => api.post('/api/caller/tenders', {
      ...form,
      estimated_value: Number(form.estimated_value),
      emd: form.emd ? Number(form.emd) : undefined,
      completion_months: Number(form.completion_months),
      status,
    }),
    onSuccess: (t) => nav(`/buyer/tenders/${t.id}`),
  })

  return (
    <div>
      <PageHeader title="Create tender" sub="Paste your eligibility clauses too — SecureBid's parser structures them automatically." />
      <Card>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Title"><input className={inputCls} value={form.title} onChange={set('title')} /></Field>
          <Field label="Category">
            <select className={inputCls} value={form.category} onChange={set('category')}>
              {['Civil Works', 'Electrical Works', 'Road Works', 'Water Supply & Sanitation',
                'Solar & Renewables', 'IT Services & Software', 'Medical Equipment',
                'Office Supplies & Furniture', 'Solid Waste Management', 'Facility Services',
                'Fleet & Transport'].map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="State"><input className={inputCls} value={form.buyer_state} onChange={set('buyer_state')} /></Field>
          <Field label="Estimated value (INR)"><input className={inputCls} value={form.estimated_value} onChange={set('estimated_value')} /></Field>
          <Field label="EMD (INR, optional — defaults to 2%)"><input className={inputCls} value={form.emd} onChange={set('emd')} /></Field>
          <Field label="Closing date"><input type="date" className={inputCls} value={form.closes_at} onChange={set('closes_at')} /></Field>
          <Field label="Completion (months)"><input className={inputCls} value={form.completion_months} onChange={set('completion_months')} /></Field>
        </div>
        <Field label="Description">
          <textarea className="mt-1 h-20 w-full rounded-md border border-ink-300 p-2.5 text-[13px]" value={form.description} onChange={set('description')} />
        </Field>
        <Field label="Eligibility clause text (optional — parsed automatically)">
          <textarea className="mt-1 h-32 w-full rounded-md border border-ink-300 p-2.5 text-[12px]" value={form.raw_eligibility} onChange={set('raw_eligibility')}
                    placeholder="3.1 The bidder shall have an average annual turnover of…" />
        </Field>
        <div className="mt-3 flex gap-2">
          <Button variant="ghost" onClick={() => create.mutate('draft')} disabled={create.isPending}>Save as draft</Button>
          <Button onClick={() => create.mutate('published')} disabled={create.isPending}>Publish</Button>
        </div>
      </Card>
    </div>
  )
}
