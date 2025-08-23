import type { Root } from 'mdast'
import type { VFile } from '../types/index.js'
import { visit } from 'unist-util-visit'
import matter from 'gray-matter'

export function frontmatterTitle(tree: Root, file: VFile): void {
  let frontmatterData: Record<string, any> = {}
  let yamlIndex: number | null = null
  
  visit(tree, (node, index, parent) => {
    if (node.type === 'yaml' && parent === tree && typeof index === 'number') {
      yamlIndex = index
      try {
        const parsed = matter(`---\n${node.value}\n---`)
        frontmatterData = parsed.data
      } catch (e) {
        console.warn('Failed to parse frontmatter:', e)
      }
    }
  })
  
  if (frontmatterData.title && yamlIndex !== null) {
    const titleNode = {
      type: 'heading',
      depth: 1,
      children: [
        {
          type: 'text',
          value: frontmatterData.title
        }
      ]
    }
    
    tree.children.splice(yamlIndex, 1, titleNode)
    
    if (frontmatterData.description) {
      const descNode = {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            value: frontmatterData.description
          }
        ]
      }
      tree.children.splice(yamlIndex + 1, 0, descNode)
    }
  }
}