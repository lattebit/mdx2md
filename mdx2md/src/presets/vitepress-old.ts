import type { Root } from 'mdast'
import type { Preset, VFile } from '../types/index.js'
import { visit } from 'unist-util-visit'
import { createPreset } from './base.js'
import { createAdmonition, createTabs } from '../umr/index.js'

export const vitepressPreset: Preset = createPreset({
  name: 'vitepress',
  transformers: [
    {
      name: 'vitepress-components',
      phase: 'main',
      transform: (tree: Root, _file: VFile) => transformVitePressComponents(tree)
    }
  ],
  corePassDefaults: {
    stripEsm: true,
    frontmatterTitle: true,
    normalizeFences: true,
    groupCodeTabs: false, // VitePress uses code-group
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

function transformVitePressComponents(tree: Root): void {
  // Track if we're inside a code-group
  let inCodeGroup = false
  const codeGroupItems: Array<{ label: string; code: string; language: string }> = []
  
  visit(tree, (node, index, parent) => {
    // Handle VitePress containers (:::)
    if (node.type === 'containerDirective' || (node as any).type === 'textDirective') {
      const directiveNode = node as any
      const directiveName = directiveNode.name
      
      if (!directiveName || typeof index !== 'number' || !parent) {
        return
      }
      
      // Handle custom containers
      if (isVitePressContainer(directiveName)) {
        const replacement = handleVitePressContainer(directiveNode)
        if (replacement) {
          (parent as any).children[index] = replacement
        }
      }
      
      // Handle code-group
      if (directiveName === 'code-group') {
        inCodeGroup = true
        codeGroupItems.length = 0
      }
    }
    
    // Collect code blocks inside code-group
    if (inCodeGroup && node.type === 'code') {
      const codeNode = node as any
      const label = extractCodeLabel(codeNode.meta) || codeNode.lang || 'Code'
      codeGroupItems.push({
        label,
        code: codeNode.value,
        language: codeNode.lang || ''
      })
      
      // Remove the code block from the tree
      if (parent && typeof index === 'number') {
        (parent as any).children.splice(index, 1)
        return ['skip', index]
      }
    }
    
    // End of code-group
    if (inCodeGroup && node.type === 'containerDirective' && (node as any).name === 'code-group' && (node as any).data?.hName === 'closing') {
      inCodeGroup = false
      
      // Create tabs from collected code blocks
      if (codeGroupItems.length > 0 && parent && typeof index === 'number') {
        const tabs = createTabs(codeGroupItems.map((item, i) => ({
          label: item.label,
          value: `tab-${i}`,
          content: [{
            type: 'code',
            lang: item.language,
            value: item.code
          }]
        })))
        
        (parent as any).children[index] = tabs
      }
    }
    
    // Handle Badge component
    if (node.type === 'mdxJsxTextElement' || node.type === 'mdxJsxFlowElement') {
      const jsxNode = node as any
      
      if (jsxNode.name === 'Badge') {
        const attrs = getAttributes(jsxNode)
        const text = extractText(jsxNode)
        const type = attrs.type || 'info'
        
        // Convert to inline badge notation
        const badgeText = type === 'info' ? `[${text}]` : `**[${text}]**`
        
        if (parent && typeof index === 'number') {
          (parent as any).children[index] = {
            type: 'text',
            value: badgeText
          }
        }
      }
    }
  })
}

function isVitePressContainer(type: string): boolean {
  const containerTypes = [
    'info', 'tip', 'warning', 'danger', 'details',
    'code-group', 'raw'
  ]
  return containerTypes.includes(type.toLowerCase())
}

function handleVitePressContainer(node: any) {
  const type = node.name || 'info'
  const attrs = getAttributes(node)
  const title = attrs.title || node.label || undefined
  const children = getChildren(node)
  
  // Map VitePress container types to standard admonition types
  const typeMap: Record<string, string> = {
    'details': 'note',
    'raw': 'note'
  }
  
  const mappedType = typeMap[type.toLowerCase()] || type.toLowerCase()
  
  // Special handling for details (collapsible)
  if (type === 'details') {
    return {
      type: 'blockquote',
      children: [
        {
          type: 'paragraph',
          children: [
            { type: 'text', value: '▼ ' },
            { type: 'strong', children: [{ type: 'text', value: title || 'Details' }] }
          ]
        },
        ...children
      ]
    }
  }
  
  return createAdmonition(mappedType, title, children)
}

function extractCodeLabel(meta: string | null | undefined): string | null {
  if (!meta) return null
  
  // VitePress uses [label] syntax in meta
  const match = meta.match(/\[([^\]]+)\]/)
  return match ? match[1] : null
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

function extractText(node: any): string {
  if (node.type === 'text') {
    return node.value
  }
  
  if (node.children) {
    return node.children.map(extractText).join('')
  }
  
  return ''
}