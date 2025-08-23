import type { Root } from 'mdast'
import type { VFile } from '../types/index.js'
import { visit } from 'unist-util-visit'
import { isUMRNode, getUMRKind } from '../umr/index.js'
import type { IncludeUMR } from '../types/index.js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'

export async function expandIncludes(tree: Root, file: VFile): Promise<void> {
  const includes: Array<{ node: IncludeUMR; index: number; parent: any }> = []
  
  visit(tree, (node, index, parent) => {
    if (isUMRNode(node) && getUMRKind(node) === 'include' && typeof index === 'number') {
      includes.push({ node: node as IncludeUMR, index, parent })
    }
  })
  
  for (const { node, index, parent } of includes) {
    const includePath = node.data.umr.props.path
    
    if (node.data.umr.props.expanded) {
      continue
    }
    
    try {
      const basePath = file.path ? dirname(file.path) : process.cwd()
      const fullPath = join(basePath, includePath)
      const content = readFileSync(fullPath, 'utf-8')
      
      node.data.umr.props.expanded = true
      node.data.umr.props.content = content
    } catch (error) {
      console.warn(`Failed to expand include: ${includePath}`, error)
    }
  }
}