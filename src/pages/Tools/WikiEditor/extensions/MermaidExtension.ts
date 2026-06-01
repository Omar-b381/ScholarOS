import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { MermaidNodeView } from './MermaidNodeView'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mermaid: {
      insertMermaid: () => ReturnType
    }
  }
}

export const MermaidExtension = Node.create({
  name: 'mermaid',
  group: 'block',
  atom: true,

  addAttributes() {
    return { code: { default: 'flowchart LR\n  A[بداية] --> B[نهاية]' } }
  },

  parseHTML() {
    return [{ tag: 'div[data-mermaid]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-mermaid': '' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(MermaidNodeView)
  },

  addCommands() {
    return {
      insertMermaid: () => ({ commands }: any) =>
        commands.insertContent({
          type: 'mermaid',
          attrs: { code: 'flowchart TD\n  A[ابدأ هنا] --> B[أضف خطواتك]' },
        }),
    } as any
  },
})
