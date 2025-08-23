import type { Root } from 'mdast'
import type { VFile } from '../types/index.js'
import { visit } from 'unist-util-visit'

export function normalizeWhitespace(tree: Root, file: VFile): void {
  const newChildren: any[] = []
  let prevWasBlock = false
  
  for (const child of tree.children) {
    const isBlock = ['heading', 'paragraph', 'list', 'code', 'blockquote', 'table', 'thematicBreak'].includes(child.type)
    
    if (isBlock) {
      if (prevWasBlock && newChildren.length > 0) {
        const lastChild = newChildren[newChildren.length - 1]
        if (lastChild.type !== 'thematicBreak') {
          // Ensure blank line between blocks
        }
      }
      prevWasBlock = true
    } else {
      prevWasBlock = false
    }
    
    newChildren.push(child)
  }
  
  tree.children = newChildren
  
  visit(tree, 'list', (node) => {
    if (!node.spread) {
      node.spread = false
    }
  })
  
  visit(tree, 'listItem', (node) => {
    if (!node.spread) {
      node.spread = false
    }
  })
}