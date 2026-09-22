import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Logo } from '../../components/Logo'
import { Button } from '../../components/ui'
import { api, ApiError } from '../../lib/api'

export default function VerifyEmail() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const nav = useNavigate()
  const [status, setStatus] = useState<'checking' | 'ok' | 'error'>('checking')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) { setStatus('error'); setError('This link is missing its verification token.'); return }
    api.get('/api/auth/verify-email', { token })
      .then(() => setStatus('ok'))
      .catch((err) => { setStatus('error'); setError(err instanceof ApiError ? err.message : 'Something went wrong') })
  }, [token])

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mb-6 flex flex-col items-center gap-2">
          <Logo size={44} />
        </div>
        <div className="rounded-lg border border-ink-200 bg-white p-6 shadow-sm">
          {status === 'checking' && <p className="text-[13px] text-ink-500">Verifying…</p>}
          {status === 'ok' && (
            <>
              <p className="text-[13px] text-ink-700">Your email is verified.</p>
              <Button className="mt-4 w-full" onClick={() => nav('/login')}>Go to sign in</Button>
            </>
          )}
          {status === 'error' && <p className="text-[13px] text-danger-500">{error}</p>}
        </div>
      </div>
    </div>
  )
}
