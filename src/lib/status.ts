// The status page's public summary (its /api/summary), read in the browser by the header's status widget and
// the incident notice. Words match the status page and the dashboard's status widget.
import { fetchJson } from './live'

export type StatusLevel = 'operational' | 'degraded' | 'partial_outage' | 'major_outage' | 'maintenance' | 'paused' | 'unknown'

interface StatusComponent {
  id: string
  name: string
  status: string
  components: StatusComponent[]
}

export interface StatusIncident {
  id: number
  title: string
  impact: string
  status: string
  url: string
}

export interface StatusSummary {
  overall: string
  groups: { name: string; status: string; components: StatusComponent[] }[]
  incidents?: StatusIncident[] | null // missing from status pages older than this help site
}

// The status page caches its summary for 60 seconds, so asking more often gains nothing.
export const STATUS_REFRESH_MS = 60_000

export const summaryUrl = (statusPage: string) => `${statusPage.replace(/\/+$/, '')}/api/summary`
export const loadSummary = (url: string) => fetchJson<StatusSummary>(url, STATUS_REFRESH_MS)

export const OVERALL: Record<StatusLevel, string> = {
  operational: 'All systems operational',
  degraded: 'Some systems are degraded',
  partial_outage: 'Partial system outage',
  major_outage: 'Major system outage',
  maintenance: 'Maintenance in progress',
  paused: 'Paused',
  unknown: 'Status unknown'
}

export const LABEL: Record<StatusLevel, string> = {
  operational: 'Operational',
  degraded: 'Degraded',
  partial_outage: 'Partial outage',
  major_outage: 'Major outage',
  maintenance: 'Maintenance',
  paused: 'Paused',
  unknown: 'Unknown'
}

export const IMPACT: Record<string, string> = {
  degraded: 'Degraded performance',
  partial_outage: 'Partial outage',
  major_outage: 'Major outage',
  maintenance: 'Maintenance'
}

export const INCIDENT_STATUS: Record<string, string> = {
  investigating: 'Investigating',
  identified: 'Identified',
  monitoring: 'Monitoring',
  scheduled: 'Scheduled',
  in_progress: 'In progress'
}

export const level = (status: string): StatusLevel => (status in LABEL ? (status as StatusLevel) : 'unknown')

/** Open incidents that are happening now: planned maintenance that hasn't started yet is left out. */
export const liveIncidents = (summary: StatusSummary | null) => (summary?.incidents ?? []).filter((i) => i.status !== 'scheduled')

/** A colored status dot; the color comes from global.css (.status-dot[data-level]). */
export function dot(status: string): HTMLSpanElement {
  const span = document.createElement('span')
  span.className = 'status-dot'
  span.dataset.level = level(status)
  return span
}
