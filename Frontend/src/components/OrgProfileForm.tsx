import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { PageHeader } from './Shell'
import { Button, Card, Field, inputCls } from './ui'

export function OrgProfileForm({ title, sub }: { title: string; sub: string }) {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['me'], queryFn: () => api.get('/api/me') })
  const [form, setForm] = useState<any>(null)
  useEffect(() => { if (data) setForm({ company_name: data.user.company_name, ...data.org_profile }) }, [data])

  const save = useMutation({
    mutationFn: () => api.put('/api/org-profile', form),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
  })

  if (!form) return null
  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value })

  return (
    <div>
      <PageHeader title={title} sub={sub} action={
        <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</Button>
      } />
      <Card>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Organisation name"><input className={inputCls} value={form.company_name ?? ''} onChange={set('company_name')} /></Field>
          <Field label="Department"><input className={inputCls} value={form.department ?? ''} onChange={set('department')} /></Field>
          <Field label="State"><input className={inputCls} value={form.state ?? ''} onChange={set('state')} /></Field>
          <Field label="Designation"><input className={inputCls} value={form.designation ?? ''} onChange={set('designation')} /></Field>
        </div>
      </Card>
    </div>
  )
}
