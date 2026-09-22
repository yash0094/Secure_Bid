import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Logo, LogoMark } from '../../components/Logo'
import { Button, Field, inputCls } from '../../components/ui'
import { GoogleSignInButton, useGoogleClientId } from '../../components/GoogleSignInButton'
import { useAuth, type Role } from '../../lib/auth'
import { api, ApiError } from '../../lib/api'

const COPY: Record<Role, { title: string; blurb: string; home: string; demo: string; accent: string; tint: string }> = {
  bidder: {
    title: 'Bidder Portal',
    blurb: 'Discover tenders, price bids with the auction-theoretic engine, and manage your pipeline.',
    home: '/app/dashboard', demo: 'demo@securebid.in',
    accent: 'var(--color-brand-500)', tint: 'var(--color-brand-50)',
  },
  tender_caller: {
    title: 'Tender Caller Portal',
    blurb: 'Publish tenders, evaluate submitted bids, and award contracts.',
    home: '/buyer/tenders', demo: 'buyer@securebid.in',
    accent: 'var(--color-caller-500)', tint: 'var(--color-caller-50)',
  },
  official: {
    title: 'Government Oversight Portal',
    blurb: 'Read-only, cross-department visibility into spend and collusion risk.',
    home: '/oversight/overview', demo: 'official@securebid.in',
    accent: 'var(--color-official-500)', tint: 'var(--color-official-50)',
  },
}

export function LoginPage({ role }: { role: Role }) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [department, setDepartment] = useState('')
  const [state, setState] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [forgotSent, setForgotSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const { login, loginWithGoogle, register } = useAuth()
  const nav = useNavigate()
  const copy = COPY[role]
  const googleClientId = useGoogleClientId()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (mode === 'forgot') {
        await api.post('/api/auth/request-password-reset', { email })
        setForgotSent(true)
        return
      }
      if (mode === 'login') {
        await login(email, password)
      } else {
        const payload: Record<string, unknown> = { email, password, company_name: companyName, role }
        if (role !== 'bidder') {
          payload.org_profile = { org_name: companyName, department, state, designation: '' }
        }
        await register(payload)
      }
      nav(copy.home)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  async function onGoogleCredential(credential: string) {
    setError(null)
    setBusy(true)
    try {
      await loginWithGoogle(credential)
      nav(copy.home)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Google sign-in failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10"
         style={{ background: `radial-gradient(120% 100% at 50% 0%, ${copy.tint}, var(--color-ink-50) 60%)` }}>
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-ink-200">
            <LogoMark size={40} />
          </div>
          <div className="mt-1 text-[15px] font-semibold" style={{ color: copy.accent, fontFamily: 'var(--font-serif)' }}>
            {copy.title}
          </div>
          <p className="max-w-[26ch] text-[12.5px] text-ink-500">{copy.blurb}</p>
        </div>

        {mode === 'forgot' && forgotSent ? (
          <div className="space-y-3 rounded-2xl border border-ink-200 bg-white p-5 text-center shadow-sm">
            <p className="text-[13px] text-ink-700">
              If an account exists for that email, a reset link has been sent.
            </p>
            <button className="text-[12px] font-medium hover:underline" style={{ color: copy.accent }}
                    onClick={() => { setMode('login'); setForgotSent(false) }}>
              Back to sign in
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-ink-200 bg-white p-5 shadow-sm">
            {mode === 'register' && (
              <Field label={role === 'bidder' ? 'Company name' : 'Organisation name'}>
                <input className={inputCls} required value={companyName}
                       onChange={(e) => setCompanyName(e.target.value)} />
              </Field>
            )}
            {mode === 'register' && role !== 'bidder' && (
              <div className="grid grid-cols-2 gap-2">
                <Field label="Department"><input className={inputCls} value={department}
                      onChange={(e) => setDepartment(e.target.value)} /></Field>
                <Field label="State"><input className={inputCls} value={state}
                      onChange={(e) => setState(e.target.value)} /></Field>
              </div>
            )}
            <Field label="Email">
              <input type="email" className={inputCls} required value={email}
                     onChange={(e) => setEmail(e.target.value)} />
            </Field>
            {mode !== 'forgot' && (
              <Field label="Password" hint={mode === 'register' ? 'At least 8 characters' : undefined}>
                <input type="password" className={inputCls} required value={password}
                       onChange={(e) => setPassword(e.target.value)} />
              </Field>
            )}
            {error && <div className="rounded-md bg-danger-100 px-2.5 py-1.5 text-[12px] text-danger-500">{error}</div>}
            <Button type="submit" className="w-full" disabled={busy}
                    style={{ background: copy.accent }}>
              {busy ? 'Please wait…'
                : mode === 'login' ? 'Sign in'
                : mode === 'forgot' ? 'Send reset link'
                : 'Create account'}
            </Button>
            {mode === 'login' && (
              <button type="button" className="block w-full text-center text-[12px] text-ink-500 hover:underline"
                      onClick={() => setMode('forgot')}>
                Forgot password?
              </button>
            )}

            {role === 'bidder' && mode !== 'forgot' && googleClientId && (
              <>
                <div className="flex items-center gap-3 pt-1 text-[11px] text-ink-400">
                  <span className="h-px flex-1 bg-ink-100" /> or continue with <span className="h-px flex-1 bg-ink-100" />
                </div>
                <GoogleSignInButton clientId={googleClientId} onCredential={onGoogleCredential} />
              </>
            )}
          </form>
        )}

        <div className="mt-3 flex items-center justify-between text-[12px] text-ink-500">
          <button className="hover:underline" onClick={() => setMode(mode === 'register' ? 'login' : 'register')}>
            {mode === 'register' ? 'Already have an account? Sign in' : 'Create an account'}
          </button>
          <span className="mono text-ink-400">demo: {copy.demo} / demo1234</span>
        </div>
        <RolePicker current={role} />
        <div className="mt-8 flex justify-center opacity-60"><Logo size={20} /></div>
      </div>
    </div>
  )
}

function RolePicker({ current }: { current: Role }) {
  const links: { role: Role; to: string; label: string; accent: string }[] = [
    { role: 'bidder', to: '/login', label: 'Bidder', accent: COPY.bidder.accent },
    { role: 'tender_caller', to: '/login/buyer', label: 'Tender Caller', accent: COPY.tender_caller.accent },
    { role: 'official', to: '/login/official', label: 'Government Official', accent: COPY.official.accent },
  ]
  return (
    <div className="mt-6 flex justify-center gap-1 rounded-full border border-ink-200 bg-white p-1 text-[11px]">
      {links.map((l) => (
        <a key={l.role} href={l.to}
           className={`rounded-full px-3 py-1 font-medium ${l.role === current ? 'text-white' : 'text-ink-500 hover:text-ink-800'}`}
           style={l.role === current ? { background: l.accent } : undefined}>
          {l.label}
        </a>
      ))}
    </div>
  )
}
