import type { Root } from 'mdast'
import type { VFile } from '../types/index.js'
import { visit } from 'unist-util-visit'

export function headingOffset(
  tree: Root,
  file: VFile,
  options: { offset: number }
): void {
  const { offset } = options
  
  visit(tree, 'heading', (node) => {
    node.depth = Math.min(6, Math.max(1, node.depth + offset)) as 1 | 2 | 3 | 4 | 5 | 6
  })
}