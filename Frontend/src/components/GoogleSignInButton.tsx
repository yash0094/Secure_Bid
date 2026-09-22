import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (r: { credential: string }) => void }) => void
          renderButton: (el: HTMLElement, options: Record<string, unknown>) => void
        }
      }
    }
  }
}

let scriptPromise: Promise<void> | null = null
function loadGoogleScript() {
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.defer = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Failed to load Google script'))
    document.head.appendChild(s)
  })
  return scriptPromise
}

/**
 * Renders Google's own "Sign in with Google" button and calls onCredential
 * with the real ID token Google issues once someone completes sign-in.
 * Only mounted by the caller when GET /api/config says a GOOGLE_CLIENT_ID is
 * configured server-side -- there is no fallback/demo mode here.
 */
export function GoogleSignInButton({ clientId, onCredential }: {
  clientId: string; onCredential: (credential: string) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    loadGoogleScript()
      .then(() => {
        if (cancelled || !ref.current || !window.google) return
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (r) => onCredential(r.credential),
        })
        window.google.accounts.id.renderButton(ref.current, {
          type: 'standard', theme: 'outline', size: 'large', width: 320, text: 'continue_with',
        })
      })
      .catch(() => setError('Could not load Google Sign-In'))
    return () => { cancelled = true }
  }, [clientId, onCredential])

  if (error) return <div className="text-[12px] text-danger-500">{error}</div>
  return <div ref={ref} className="flex justify-center" />
}

export function useGoogleClientId() {
  const [clientId, setClientId] = useState<string | null>(null)
  useEffect(() => {
    api.get('/api/config')
      .then((cfg) => setClientId(cfg.google_client_id || ''))
      .catch(() => setClientId(''))
  }, [])
  return clientId // null = still loading, '' = not configured, string = ready
}
