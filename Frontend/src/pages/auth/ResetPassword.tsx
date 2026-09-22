import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Logo } from '../../components/Logo'
import { Button, Field, inputCls } from '../../components/ui'
import { api, ApiError } from '../../lib/api'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const nav = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await api.post('/api/auth/reset-password', { token, password })
      setDone(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <Logo size={44} />
          <div className="text-[13px] font-medium text-brand-600">Reset your password</div>
        </div>
        {!token ? (
          <div className="rounded-lg border border-ink-200 bg-white p-5 text-[13px] text-ink-600 shadow-sm">
            This link is missing its reset token. Request a new one from the sign-in page.
          </div>
        ) : done ? (
          <div className="space-y-3 rounded-lg border border-ink-200 bg-white p-5 text-center shadow-sm">
            <p className="text-[13px] text-ink-700">Your password has been reset. All previous sessions have been signed out.</p>
            <Button className="w-full" onClick={() => nav('/login')}>Go to sign in</Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3 rounded-lg border border-ink-200 bg-white p-5 shadow-sm">
            <Field label="New password" hint="At least 8 characters">
              <input type="password" className={inputCls} required value={password}
                     onChange={(e) => setPassword(e.target.value)} />
            </Field>
            {error && <div className="rounded-md bg-danger-100 px-2.5 py-1.5 text-[12px] text-danger-500">{error}</div>}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? 'Please wait…' : 'Set new password'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
