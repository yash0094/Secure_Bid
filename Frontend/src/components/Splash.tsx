import { LogoMark } from './Logo'

export function Splash() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-white">
      <div style={{ animation: 'splash-fade 3s ease-in-out forwards' }}
           className="flex flex-col items-center gap-4">
        <LogoMark size={96} />
        <div className="text-center">
          <div className="text-3xl font-semibold tracking-tight text-ink-900">SecureBid</div>
          <div className="mt-1 text-sm text-ink-500">
            Discover &middot; Price &middot; Award &middot; Deliver
          </div>
        </div>
      </div>
      <div className="absolute bottom-10 h-1 w-40 overflow-hidden rounded-full bg-ink-100">
        <div className="h-full bg-brand-500" style={{ animation: 'splash-bar 3s linear forwards' }} />
      </div>
      <style>{`
        @keyframes splash-bar { from { width: 0% } to { width: 100% } }
      `}</style>
    </div>
  )
}
