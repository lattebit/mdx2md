import type { Root, Code } from 'mdast'
import type { VFile } from '../types/index.js'
import { createCodeGroup } from '../umr/index.js'

export function groupCodeTabs(tree: Root, file: VFile): void {
  const children = tree.children
  const newChildren: any[] = []
  let i = 0
  
  while (i < children.length) {
    const node = children[i]
    
    if (node.type === 'code' && (node as Code).meta?.includes('tab=')) {
      const group: Array<{ label: string; language: string; code: string }> = []
      let j = i
      
      while (j < children.length) {
        const current = children[j]
        if (current.type === 'code') {
          const codeNode = current as Code
          const tabMatch = codeNode.meta?.match(/tab=["']?([^"'\s]+)["']?/)
          
          if (tabMatch) {
            group.push({
              label: tabMatch[1],
              language: codeNode.lang || '',
              code: codeNode.value
            })
            j++
          } else {
            break
          }
        } else if (current.type === 'paragraph' || current.type === 'heading') {
          break
        } else {
          j++
        }
      }
      
      if (group.length > 1) {
        newChildren.push(createCodeGroup(group))
        i = j
      } else {
        newChildren.push(node)
        i++
      }
    } else {
      newChildren.push(node)
      i++
    }
  }
  
  tree.children = newChildren
}