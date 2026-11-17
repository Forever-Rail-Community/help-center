import { icons, type IconNode } from 'lucide'

// Draws a Lucide icon by its name ("train-front"), the way categories store it in the dashboard.
// Unknown names fall back to a book. The output is built from Lucide's own shapes, never from the feed.

const toPascal = (name: string) => name.replace(/(^|-)([a-z0-9])/g, (_, __, c: string) => c.toUpperCase())
const escapeAttr = (v: unknown) => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

export function iconSvg(name: string, size = 20): string {
  const node: IconNode = (icons as Record<string, IconNode>)[toPascal(name)] ?? icons.BookOpen
  const children = node
    .map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).map(([k, v]) => `${k}="${escapeAttr(v)}"`).join(' ')}></${tag}>`)
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${children}</svg>`
}
