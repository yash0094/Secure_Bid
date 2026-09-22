import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api, ApiError, setToken } from '../../lib/api'
import { useAuth, type Role } from '../../lib/auth'
import { PageHeader } from '../../components/Shell'
import { Button, Card, Field, inputCls } from '../../components/ui'
import { IconLock } from '../../components/Icons'

const ROLE_LABEL: Record<Role, string> = {
  bidder: 'Bidder / Contractor',
  tender_caller: 'Tender Caller',
  official: 'Government Official',
}

export default function Settings() {
  const { user, logout } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const changePassword = useMutation({
    mutationFn: () => api.post('/api/auth/change-password', {
      current_password: currentPassword, new_password: newPassword,
    }),
    onSuccess: (res) => {
      setToken(res.token)
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
      setFormError(null)
      setSuccess(true)
    },
    onError: (err) => {
      setSuccess(false)
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong')
    },
  })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setSuccess(false)
    if (newPassword.length < 8) { setFormError('New password must be at least 8 characters'); return }
    if (newPassword !== confirmPassword) { setFormError('New passwords do not match'); return }
    setFormError(null)
    changePassword.mutate()
  }

  if (!user) return null

  return (
    <div>
      <PageHeader title="Settings" sub="Account security and sign-in." />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Account">
          <div className="space-y-3 text-[13px]">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wide text-ink-500">Email</div>
              <div className="mt-0.5 text-ink-800">{user.email}</div>
            </div>
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wide text-ink-500">Account type</div>
              <div className="mt-0.5 text-ink-800">{ROLE_LABEL[user.role]}</div>
            </div>
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wide text-ink-500">Email verified</div>
              <div className="mt-0.5 text-ink-800">{user.email_verified ? 'Yes' : 'Not yet verified'}</div>
            </div>
            <div className="border-t border-ink-100 pt-3">
              <Button variant="danger" onClick={logout}>Sign out</Button>
              <p className="mt-1.5 text-[11.5px] text-ink-400">
                This account only allows one active session — signing in elsewhere already signs this one out.
              </p>
            </div>
          </div>
        </Card>

        <Card title="Change password" action={<IconLock width={16} height={16} className="text-ink-400" />}>
          <form onSubmit={submit} className="space-y-3">
            <Field label="Current password">
              <input type="password" className={inputCls} value={currentPassword} autoComplete="current-password"
                     onChange={(e) => setCurrentPassword(e.target.value)} required />
            </Field>
            <Field label="New password" hint="At least 8 characters.">
              <input type="password" className={inputCls} value={newPassword} autoComplete="new-password"
                     onChange={(e) => setNewPassword(e.target.value)} required />
            </Field>
            <Field label="Confirm new password">
              <input type="password" className={inputCls} value={confirmPassword} autoComplete="new-password"
                     onChange={(e) => setConfirmPassword(e.target.value)} required />
            </Field>
            {formError && <div className="rounded-md bg-danger-100 px-2.5 py-1.5 text-[12px] text-danger-500">{formError}</div>}
            {success && <div className="rounded-md bg-success-100 px-2.5 py-1.5 text-[12px] text-success-500">Password updated.</div>}
            <Button type="submit" disabled={changePassword.isPending}>
              {changePassword.isPending ? 'Updating…' : 'Update password'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
