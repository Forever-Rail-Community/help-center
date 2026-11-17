import { Node, mergeAttributes, type Extensions } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import { TableKit } from '@tiptap/extension-table'

// What an article can contain. This must match the dashboard editor's list in
// ops-dashboard/app/utils/helpEditor.ts: a node the editor saves but this list lacks is dropped from the page.

// A highlighted box (tip or warning) around one or more paragraphs.
const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  addAttributes: () => ({
    variant: {
      default: 'tip',
      renderHTML: (attrs) => ({ 'data-variant': attrs.variant === 'warning' ? 'warning' : 'tip' })
    }
  }),
  renderHTML: ({ HTMLAttributes }) => ['div', mergeAttributes(HTMLAttributes, { class: 'callout', role: 'note' }), 0]
})

export const extensions: Extensions = [
  StarterKit.configure({
    heading: { levels: [2, 3] },
    // Help links open in the same tab; the browser's back button returns to the article.
    link: { HTMLAttributes: { target: null, rel: 'noopener' } }
  }),
  Image,
  TableKit,
  Callout
]
