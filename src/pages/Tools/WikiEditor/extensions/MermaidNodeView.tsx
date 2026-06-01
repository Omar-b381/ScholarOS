import { NodeViewWrapper } from '@tiptap/react'
import { MermaidBlock } from '../MermaidBlock'

export function MermaidNodeView(props: any) {
  const code = props.node.attrs.code
  const updateAttributes = props.updateAttributes

  return (
    <NodeViewWrapper className="mermaid-node-view">
      <MermaidBlock
        code={code}
        editable={true}
        onChange={(newCode) => updateAttributes({ code: newCode })}
      />
    </NodeViewWrapper>
  )
}
