import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { PageHeader } from '../../components/Shell'
import { Button, Card, Field, inputCls } from '../../components/ui'

export default function Profile() {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['me'], queryFn: () => api.get('/api/me') })
  const [form, setForm] = useState<any>(null)

  useEffect(() => {
    if (data?.profile) {
      setForm({
        ...data.profile,
        states: (data.profile.states ?? []).join(', '),
        categories: (data.profile.categories ?? []).join(', '),
        certifications: (data.profile.certifications ?? []).join(', '),
      })
    }
  }, [data])

  const save = useMutation({
    mutationFn: () => api.put('/api/profile', {
      ...form,
      turnover_cr: Number(form.turnover_cr), experience_years: Number(form.experience_years),
      max_similar_work_cr: Number(form.max_similar_work_cr),
      working_capital_cr: Number(form.working_capital_cr),
      overhead_pct: Number(form.overhead_pct), target_margin_pct: Number(form.target_margin_pct),
      states: form.states.split(',').map((s: string) => s.trim()).filter(Boolean),
      categories: form.categories.split(',').map((s: string) => s.trim()).filter(Boolean),
      certifications: form.certifications.split(',').map((s: string) => s.trim()).filter(Boolean),
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
  })

  if (!form) return null
  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value })

  return (
    <div>
      <PageHeader title="Company profile" sub="Drives eligibility matching and the capital model." action={
        <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</Button>
      } />
      <Card>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Field label="Udyam registration no."><input className={inputCls} value={form.udyam_no ?? ''} onChange={set('udyam_no')} /></Field>
          <Field label="MSME class">
            <select className={inputCls} value={form.msme_class ?? ''} onChange={set('msme_class')}>
              <option>Micro</option><option>Small</option><option>Medium</option>
            </select>
          </Field>
          <Field label="Bidder class">
            <select className={inputCls} value={form.bidder_class ?? ''} onChange={set('bidder_class')}>
              <option>Class I</option><option>Class II</option><option>Non-local</option>
            </select>
          </Field>
          <Field label="Turnover (Cr)"><input className={inputCls} value={form.turnover_cr ?? ''} onChange={set('turnover_cr')} /></Field>
          <Field label="Experience (years)"><input className={inputCls} value={form.experience_years ?? ''} onChange={set('experience_years')} /></Field>
          <Field label="Largest similar work (Cr)"><input className={inputCls} value={form.max_similar_work_cr ?? ''} onChange={set('max_similar_work_cr')} /></Field>
          <Field label="Working capital (Cr)"><input className={inputCls} value={form.working_capital_cr ?? ''} onChange={set('working_capital_cr')} /></Field>
          <Field label="Overhead %"><input className={inputCls} value={form.overhead_pct ?? ''} onChange={set('overhead_pct')} /></Field>
          <Field label="Target margin %"><input className={inputCls} value={form.target_margin_pct ?? ''} onChange={set('target_margin_pct')} /></Field>
          <Field label="States (comma separated)"><input className={inputCls} value={form.states} onChange={set('states')} /></Field>
          <Field label="Categories (comma separated)"><input className={inputCls} value={form.categories} onChange={set('categories')} /></Field>
          <Field label="Certifications (comma separated)"><input className={inputCls} value={form.certifications} onChange={set('certifications')} /></Field>
        </div>
      </Card>
    </div>
  )
}
