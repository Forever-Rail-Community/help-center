import type { Help } from './feed'

// Images from the dashboard's Admin > Appearance, copied into this site's build as /<name>.<ext>, so pages don't
// repeat a large data: image and the help site doesn't depend on the dashboard (or Blob) being up.
// - logo: a small data: image, a path on the dashboard ("/logo.svg"), or an https address. Required.
// - hero: an https address for the home page band. Optional: if it can't be loaded, the band stays a plain color.

export type SiteImageName = 'logo' | 'hero'

export interface SiteImage {
  name: SiteImageName
  ext: string
  type: string
  bytes: Uint8Array<ArrayBuffer>
  path: string // where pages link to it, like /logo.svg
}

const RASTER: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' }
const TYPES: Record<SiteImageName, Record<string, string>> = {
  logo: { 'image/svg+xml': 'svg', ...RASTER },
  hero: RASTER
}

async function read(name: SiteImageName, source: string, feedUrl: string): Promise<SiteImage> {
  const types = TYPES[name]
  const found = (type: string, bytes: Uint8Array<ArrayBuffer>): SiteImage => {
    const ext = types[type]
    if (!ext) throw new Error(`The ${name} image is ${type || 'an unknown type'}, not one of: ${Object.values(types).join(', ')}`)
    return { name, ext, type, bytes, path: `/${name}.${ext}` }
  }

  const data = /^data:(image\/[a-z+]+);base64,(.+)$/.exec(source)
  if (data) return found(data[1]!, new Uint8Array(Buffer.from(data[2]!, 'base64')))

  const url = new URL(source, feedUrl)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Could not load the ${name} image from ${url}: ${res.status}`)
  return found((res.headers.get('content-type') ?? '').split(';')[0]!.trim(), new Uint8Array(await res.arrayBuffer()))
}

const loaded = new Map<SiteImageName, Promise<SiteImage | null>>()

// Each image is fetched once per build; every page and its /<name>.<ext> file share it.
export function siteImage(help: Help, name: SiteImageName): Promise<SiteImage | null> {
  if (!loaded.has(name)) {
    const source = name === 'logo' ? help.site.logo : help.site.helpHeroImage
    loaded.set(
      name,
      !source
        ? Promise.resolve(null)
        : name === 'logo'
          ? read(name, source, help.feedUrl)
          : read(name, source, help.feedUrl).catch((err) => {
              console.warn(`Building without the home page image: ${err.message}`)
              return null
            })
    )
  }
  return loaded.get(name)!
}

// The address pages use for the logo and favicon. The logo is required, so a missing one stops the build.
export async function logoPath(help: Help): Promise<string> {
  const logo = await siteImage(help, 'logo')
  if (!logo) throw new Error('The dashboard has no logo set')
  return logo.path
}
