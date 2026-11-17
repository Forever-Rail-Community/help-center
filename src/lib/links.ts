import type { Help } from './feed'

// Links to the community's other sites, shown in the header and footer. Each is optional except the
// dashboard, which defaults to the address the feed comes from.
export interface SiteLink {
  label: string
  url: string
}

const env = (name: 'DASHBOARD_URL' | 'STATUS_URL' | 'DISCORD_URL') => (import.meta.env[name] as string | undefined)?.trim() || undefined

export function siteLinks(help: Help) {
  const dashboard = env('DASHBOARD_URL') ?? new URL('/', help.feedUrl).toString()
  const status = env('STATUS_URL')
  const discord = env('DISCORD_URL')
  const nav: SiteLink[] = [
    { label: 'Dashboard', url: dashboard },
    ...(status ? [{ label: 'Status', url: status }] : [])
  ]
  return { nav, status, discord }
}
