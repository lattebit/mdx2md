import type { Root } from 'mdast'
import type { VFile } from '../types/index.js'
import { visit } from 'unist-util-visit'

export function stripEsm(tree: Root, file: VFile): void {
  visit(tree, (node, index, parent) => {
    if (
      node.type === 'mdxjsEsm' ||
      node.type === 'mdxFlowExpression' ||
      node.type === 'mdxTextExpression'
    ) {
      if (parent && typeof index === 'number') {
        parent.children.splice(index, 1)
        return ['skip', index]
      }
    }
  })
}