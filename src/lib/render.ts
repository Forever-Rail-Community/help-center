import { getSchema, type JSONContent } from '@tiptap/core'
import { generateHTML } from '@tiptap/html/server'
import { extensions } from './schema'

// Turns an article body (the editor's JSON) into HTML for the page.
// Only nodes and marks the schema knows are kept, links must be http(s) or mailto, and images must be https.
// Text is escaped by the renderer, so nothing in an article can add its own markup or scripts.

export interface Heading {
  level: 2 | 3
  text: string
  id: string
}

// The body as stored: untrusted JSON that may hold anything.
interface JsonMark {
  type?: string
  attrs?: Record<string, unknown>
}
interface JsonNode {
  type?: string
  text?: string
  attrs?: Record<string, unknown>
  marks?: JsonMark[]
  content?: JsonNode[]
}

const schema = getSchema(extensions)
const SAFE_LINK = /^(https?:|mailto:)/i
const SAFE_IMAGE = /^https:\/\//i

function cleanMarks(marks: JsonMark[] | undefined) {
  return marks?.filter((m): m is JsonMark & { type: string } => {
    if (!m.type || !schema.marks[m.type]) return false
    return m.type !== 'link' || SAFE_LINK.test(String(m.attrs?.href ?? ''))
  })
}

// Returns the node with unknown or unsafe parts removed, or null if the whole node should go.
function clean(node: JsonNode): JSONContent | null {
  if (!node.type || !schema.nodes[node.type]) return null
  if (node.type === 'image' && !SAFE_IMAGE.test(String(node.attrs?.src ?? ''))) return null
  const content = node.content?.map(clean).filter((n): n is JSONContent => n !== null)
  // Built field by field, so only these parts of the stored node ever reach the renderer.
  return {
    type: node.type,
    ...(node.attrs ? { attrs: node.attrs } : {}),
    ...(node.text !== undefined ? { text: node.text } : {}),
    ...(node.marks ? { marks: cleanMarks(node.marks) } : {}),
    ...(content ? { content } : {})
  }
}

const textOf = (node: JSONContent): string => node.text ?? (node.content ?? []).map(textOf).join('')

// Headings in document order, with unique ids for the "On this page" links.
function collectHeadings(node: JSONContent, out: Heading[] = [], used = new Set<string>()): Heading[] {
  if (node.type === 'heading') {
    const text = textOf(node).trim()
    const base = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'section'
    let id = base
    for (let n = 2; used.has(id); n++) id = `${base}-${n}`
    used.add(id)
    out.push({ level: node.attrs?.level === 3 ? 3 : 2, text, id })
  }
  node.content?.forEach((child) => collectHeadings(child, out, used))
  return out
}

export function renderArticle(body: unknown): { html: string; headings: Heading[] } {
  const doc = clean((body ?? {}) as JsonNode)
  if (!doc || doc.type !== 'doc') return { html: '', headings: [] }

  const headings = collectHeadings(doc)
  let next = 0
  const html = generateHTML(doc, extensions)
    // The renderer writes headings in the same order the walk above found them; give each its id.
    .replace(/<h([23])>/g, (tag, level) => {
      const h = headings[next++]
      return h ? `<h${level} id="${h.id}">` : tag
    })
    .replace(/<img /g, '<img loading="lazy" decoding="async" ')
    // Wide tables scroll inside the article instead of widening the page.
    .replace(/<table/g, '<div class="table-scroll"><table')
    .replace(/<\/table>/g, '</table></div>')

  return { html, headings }
}
