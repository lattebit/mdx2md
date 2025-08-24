import type { Root } from 'mdast'
import type { Preset, VFile } from '../types/index.js'
import { visit } from 'unist-util-visit'
import { createPreset } from './base.js'
import {
  createAdmonition,
  createTabs
} from '../umr/index.js'

export const mkdocsPreset: Preset = createPreset({
  name: 'mkdocs',
  transformers: [
    {
      name: 'mkdocs-components',
      phase: 'main',
      transform: (tree: Root, file: VFile) => transformMkdocsComponents(tree, file)
    }
  ],
  corePassDefaults: {
    stripEsm: true,
    frontmatterTitle: true,
    normalizeFences: true,
    groupCodeTabs: true,
    normalizeWhitespace: true,
    rewriteLinks: true
  },
  renderDefaults: {
    listMarker: '-',
    listIndent: 'one',
    emphasis: '_',
    strong: '**',
    fence: '`',
    fenceLength: 3
  }
})

function transformMkdocsComponents(tree: Root, _file: VFile): void {
  // Transform MkDocs-style admonitions/callouts
  visit(tree, (node, index, parent) => {
    // Check for directive-like nodes (if present in AST)
    const directiveNode = node as any
    
    if (directiveNode.type === 'containerDirective' || directiveNode.type === 'textDirective') {
      const directiveName = directiveNode.name
      
      if (!directiveName || typeof index !== 'number' || !parent) {
        return
      }
      
      let replacement = null
      
      // Handle MkDocs admonitions
      // MkDocs uses !!! for admonitions and ??? for collapsible ones
      if (isAdmonitionType(directiveName)) {
        replacement = handleMkdocsAdmonition(directiveNode)
      }
      
      if (replacement) {
        (parent as any).children[index] = replacement
      }
    }
  })
  
  // Transform code blocks with special annotations
  visit(tree, (node) => {
    if (node.type !== 'code') {
      return
    }
    
    const codeNode = node as any
    
    // Handle title attribute in code blocks (e.g., ```python title="example.py")
    if (codeNode.meta && codeNode.meta.includes('title=')) {
      const titleMatch = codeNode.meta.match(/title="([^"]+)"/)
      if (titleMatch) {
        const title = titleMatch[1]
        // Add title as a comment in the first line
        codeNode.value = `# ${title}\n${codeNode.value}`
      }
    }
    
    // Handle hl_lines (highlighted lines)
    if (codeNode.meta && codeNode.meta.includes('hl_lines=')) {
      // Remove hl_lines from meta as it's not standard markdown
      codeNode.meta = codeNode.meta.replace(/hl_lines="[^"]*"/, '').trim()
    }
  })
  
  // Handle tabbed content
  visit(tree, (node, index, parent) => {
    if (node.type !== 'mdxJsxFlowElement') {
      return
    }
    
    const jsxNode = node as any
    const componentName = jsxNode.name
    
    if (!componentName || typeof index !== 'number' || !parent) {
      return
    }
    
    let replacement = null
    
    // Handle tab components (if using pymdownx.tabbed or similar)
    if (componentName === 'Tabs' || componentName === 'Tab') {
      replacement = handleMkdocsTabs(jsxNode)
    }
    
    if (replacement) {
      (parent as any).children[index] = replacement
    }
  })
}

function isAdmonitionType(type: string): boolean {
  // Common MkDocs admonition types
  const admonitionTypes = [
    'note', 'abstract', 'info', 'tip', 'success', 
    'question', 'warning', 'failure', 'danger', 'bug',
    'example', 'quote', 'hint', 'caution', 'error',
    'attention', 'important', 'see-also', 'todo'
  ]
  
  return admonitionTypes.includes(type.toLowerCase())
}

function handleMkdocsAdmonition(node: any) {
  const type = node.name || 'note'
  const attrs = getAttributes(node)
  const title = attrs.title || node.label || undefined
  const children = getChildren(node)
  
  // Map MkDocs admonition types to standard types
  const typeMap: Record<string, string> = {
    'abstract': 'info',
    'hint': 'tip',
    'attention': 'warning',
    'caution': 'warning',
    'error': 'danger',
    'failure': 'danger',
    'bug': 'danger',
    'question': 'info',
    'quote': 'note',
    'see-also': 'info',
    'todo': 'note'
  }
  
  const mappedType = typeMap[type.toLowerCase()] || type.toLowerCase()
  
  return createAdmonition(mappedType, title, children)
}

function handleMkdocsTabs(node: any) {
  const children = getChildren(node)
  const items: Array<{ label: string; value: string; content: any[] }> = []
  
  if (node.name === 'Tabs') {
    // Process tabs container
    for (const child of children) {
      if (child.type === 'mdxJsxFlowElement' && child.name === 'Tab') {
        const attrs = getAttributes(child)
        const label = attrs.label || attrs.title || `Tab ${items.length + 1}`
        const value = attrs.value || label.toLowerCase().replace(/\s+/g, '-')
        
        items.push({
          label: label,
          value: value,
          content: getChildren(child)
        })
      }
    }
  } else if (node.name === 'Tab') {
    // Single tab - convert to regular content
    return {
      type: 'root',
      children: getChildren(node)
    }
  }
  
  if (items.length > 0) {
    return createTabs(items)
  }
  
  return null
}

function getAttributes(node: any): Record<string, any> {
  const attrs: Record<string, any> = {}
  
  if (node.attributes) {
    for (const attr of node.attributes) {
      if (attr.type === 'mdxJsxAttribute') {
        const name = attr.name
        const value = attr.value
        
        if (typeof value === 'string') {
          attrs[name] = value
        } else if (value && value.type === 'mdxJsxAttributeValueExpression') {
          if (value.value && typeof value.value === 'string') {
            try {
              attrs[name] = JSON.parse(value.value)
            } catch {
              attrs[name] = value.value
            }
          }
        } else if (value === null || value === true) {
          attrs[name] = true
        }
      }
    }
  }
  
  // Also check for directive labels
  if (node.label) {
    attrs.label = node.label
  }
  
  return attrs
}

function getChildren(node: any): any[] {
  return node.children || []
}