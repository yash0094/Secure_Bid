export function LogoMark({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect x="9" y="6" width="34" height="46" rx="4" fill="#ffffff" stroke="#0857a8" strokeWidth="3" />
      <path d="M33 6 L43 16 L33 16 Z" fill="#d9ecff" stroke="#0857a8" strokeWidth="2" strokeLinejoin="round" />
      <line x1="15" y1="24" x2="31" y2="24" stroke="#98a3b3" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="15" y1="31" x2="35" y2="31" stroke="#98a3b3" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="15" y1="38" x2="27" y2="38" stroke="#98a3b3" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M40 46 L36 58 L46 52 L56 58 L52 46 Z" fill="#0857a8" />
      <circle cx="46" cy="42" r="15" fill="#0a6ed1" stroke="#0c2c50" strokeWidth="2" />
      <path d="M39 42 L44 47 L54 35" fill="none" stroke="#ffffff" strokeWidth="4"
            strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Logo({ size = 40, wordmark = true }: { size?: number; wordmark?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark size={size} />
      {wordmark && (
        <span className="font-semibold tracking-tight text-ink-900" style={{ fontSize: size * 0.42 }}>
          SecureBid
        </span>
      )}
    </div>
  )
}
