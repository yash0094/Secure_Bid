import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const base = {
  width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
}

export function IconHome(p: IconProps) {
  return <svg {...base} {...p}><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v9a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-9" />
    <path d="M9.5 20v-6h5v6" /></svg>
}
export function IconSearch(p: IconProps) {
  return <svg {...base} {...p}><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.3-4.3" /></svg>
}
export function IconColumns(p: IconProps) {
  return <svg {...base} {...p}><rect x="3.5" y="4" width="17" height="16" rx="2" />
    <path d="M9.5 4v16M15 4v16" /></svg>
}
export function IconShieldAlert(p: IconProps) {
  return <svg {...base} {...p}><path d="M12 3l7 3v5.5c0 4.6-3 8.2-7 9.5-4-1.3-7-4.9-7-9.5V6l7-3Z" />
    <path d="M12 8.5v4.2" /><circle cx="12" cy="16" r="0.9" fill="currentColor" stroke="none" /></svg>
}
export function IconWallet(p: IconProps) {
  return <svg {...base} {...p}><rect x="3" y="6.5" width="18" height="12.5" rx="2" />
    <path d="M3 10h18" /><path d="M16 14.2h2.2" /></svg>
}
export function IconBarChart(p: IconProps) {
  return <svg {...base} {...p}><path d="M4 20V10M11 20V4M18 20v-7" /><path d="M3 20h18" /></svg>
}
export function IconUsers(p: IconProps) {
  return <svg {...base} {...p}><circle cx="9" cy="8.5" r="3" /><path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
    <circle cx="17" cy="9" r="2.4" /><path d="M15.7 12.5c2.3.3 3.8 2 3.8 4.4" /></svg>
}
export function IconFileText(p: IconProps) {
  return <svg {...base} {...p}><path d="M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
    <path d="M14 3.5V8h4" /><path d="M8.5 12.5h7M8.5 15.5h7M8.5 18h4" /></svg>
}
export function IconBell(p: IconProps) {
  return <svg {...base} {...p}><path d="M6 10a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 14 6 10Z" />
    <path d="M10 19a2 2 0 0 0 4 0" /></svg>
}
export function IconUserCircle(p: IconProps) {
  return <svg {...base} {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="10" r="3" />
    <path d="M6 19c1.2-2.7 3.4-4 6-4s4.8 1.3 6 4" /></svg>
}
export function IconPlusCircle(p: IconProps) {
  return <svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></svg>
}
export function IconClipboardList(p: IconProps) {
  return <svg {...base} {...p}><rect x="5.5" y="4.5" width="13" height="16" rx="2" />
    <path d="M9 4.5V3.3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1.2" />
    <path d="M9 11h6M9 14.5h6M9 18h3.5" /></svg>
}
export function IconAward(p: IconProps) {
  return <svg {...base} {...p}><circle cx="12" cy="9" r="5" />
    <path d="M9 13.2 7.5 21l4.5-2.4 4.5 2.4-1.5-7.8" /></svg>
}
export function IconBuilding(p: IconProps) {
  return <svg {...base} {...p}><rect x="5" y="3.5" width="14" height="17" rx="1" />
    <path d="M9 7.5h.01M15 7.5h.01M9 11h.01M15 11h.01M9 14.5h.01M15 14.5h.01" strokeWidth="2.4" />
    <path d="M10 20.5v-3.7a2 2 0 0 1 4 0v3.7" /></svg>
}
export function IconMenu(p: IconProps) {
  return <svg {...base} {...p}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
}
export function IconClose(p: IconProps) {
  return <svg {...base} {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>
}
export function IconLogout(p: IconProps) {
  return <svg {...base} {...p}><path d="M9 4.5H6a1.5 1.5 0 0 0-1.5 1.5v12A1.5 1.5 0 0 0 6 19.5h3" />
    <path d="M14 15l4-3-4-3M18 12H9" /></svg>
}
export function IconSettings(p: IconProps) {
  return <svg {...base} {...p}><circle cx="12" cy="12" r="3" />
    <path d="M19.4 13.5a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V19.5a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.04-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.04H4.5a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.56-1.04 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H10.5A1.7 1.7 0 0 0 11.5 4.6V4.5a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V10.5c.16.7.66 1.27 1.56 1.04h.1a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.56 1.04Z" /></svg>
}
export function IconHelp(p: IconProps) {
  return <svg {...base} {...p}><circle cx="12" cy="12" r="9" />
    <path d="M9.3 9a2.8 2.8 0 0 1 5.4 1c0 1.8-2.4 2-2.6 3.6" /><circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" /></svg>
}
export function IconLock(p: IconProps) {
  return <svg {...base} {...p}><rect x="5" y="10.5" width="14" height="9.5" rx="1.8" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /><circle cx="12" cy="15" r="1.3" fill="currentColor" stroke="none" /></svg>
}

export function IconGoogle(p: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...p}>
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81Z"/>
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.92l-3.88-3c-1.08.73-2.46 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11A12 12 0 0 0 12 24Z"/>
      <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.61H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.39l4-3.11Z"/>
      <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.61 4.58 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.61l4 3.11C6.22 6.86 8.87 4.75 12 4.75Z"/>
    </svg>
  )
}
