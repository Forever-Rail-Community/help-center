import type { Help } from './feed'

// The logo set in the dashboard's Admin > Appearance. It can be a small data: image, a path on the
// dashboard ("/logo.svg"), or an https address. The site copies it into its own build as /logo.<ext>,
// so pages don't repeat a large data: image and the help site doesn't depend on the dashboard being up.

const TYPES: Record<string, string> = { 'image/svg+xml': 'svg', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }

export interface Logo {
  ext: string
  type: string
  bytes: Uint8Array<ArrayBuffer>
}

let loaded: Promise<Logo> | undefined

// Fetched once per build; every page and the /logo.<ext> file share it.
export function loadLogo(help: Help): Promise<Logo> {
  loaded ??= readLogo(help.site.logo, help.feedUrl)
  return loaded
}

async function readLogo(source: string, feedUrl: string): Promise<Logo> {
  const data = /^data:(image\/[a-z+]+);base64,(.+)$/.exec(source)
  if (data) {
    const type = data[1]!
    return { type, ext: TYPES[type] ?? 'png', bytes: new Uint8Array(Buffer.from(data[2]!, 'base64')) }
  }
  const url = new URL(source, feedUrl)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Could not load the logo from ${url}: ${res.status}`)
  const type = (res.headers.get('content-type') ?? '').split(';')[0]!.trim()
  if (!TYPES[type]) throw new Error(`The logo at ${url} is ${type || 'an unknown type'}, not a PNG, JPG, WebP, or SVG image`)
  return { type, ext: TYPES[type], bytes: new Uint8Array(await res.arrayBuffer()) }
}

// The address pages use for the logo and favicon.
export const logoPath = async (help: Help) => `/logo.${(await loadLogo(help)).ext}`
