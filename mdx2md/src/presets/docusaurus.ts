import type { Root } from 'mdast'
import type { Preset, VFile } from '../types/index.js'
import { visit } from 'unist-util-visit'
import { createPreset } from './base.js'
import { createAdmonition, createTabs } from '../umr/index.js'
import { getJsxAttributes } from '../utils/jsx-attributes.js'

export const docusaurusPreset: Preset = createPreset({
  name: 'docusaurus',
  transformers: [
    {
      name: 'docusaurus-preprocessor',
      phase: 'pre',
      transform: (_tree: Root, file: VFile) => preprocessDocusaurus(file)
    },
    {
      name: 'docusaurus-components',
      phase: 'main',
      transform: (tree: Root, _file: VFile) => transformDocusaurusComponents(tree)
    }
  ],
  corePassDefaults: {
    stripEsm: true,
    frontmatterTitle: true,
    normalizeFences: true,
    groupCodeTabs: false, // Docusaurus uses Tabs component
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

function preprocessDocusaurus(file: VFile): void {
  const content = String(file.contents)
  
  // Convert HTML comments to MDX comments
  let processedContent = content.replace(
    /<!--\s*(.*?)\s*-->/gs,
    (match, content) => {
      // Preserve empty comments and special markers
      if (!content || content.trim() === '') return '{/* */}'
      // Check for special markers that should be preserved
      if (content.includes('prettier-ignore') || 
          content.includes('markdownlint-disable') ||
          content.includes('TODO') ||
          content.includes('FIXME')) {
        return `{/* ${content.trim()} */}`
      }
      return `{/* ${content.trim()} */}`
    }
  )
  
  // Convert Docusaurus anchor syntax {#anchor} to standard markdown
  // This appears in headers and needs to be removed
  processedContent = processedContent.replace(
    /^(#{1,6})\s+(.+?)\s*\{#([^}]+)\}\s*$/gm,
    '$1 $2'
  )
  
  // Also handle inline anchor syntax
  processedContent = processedContent.replace(
    /\{#([^}]+)\}/g,
    ''
  )
  
  // Update file contents with processed content  
  file.contents = processedContent
}

function transformDocusaurusComponents(tree: Root): void {
  // Track if we're inside Tabs component
  let inTabs = false
  const tabItems: Array<{ label: string; value: string; content: any[] }> = []
  
  visit(tree, (node, index, parent) => {
    // Handle Docusaurus admonitions (:::)
    if (node.type === 'containerDirective' || (node as any).type === 'textDirective') {
      const directiveNode = node as any
      const directiveName = directiveNode.name
      
      if (!directiveName || typeof index !== 'number' || !parent) {
        return
      }
      
      // Handle admonitions
      if (isDocusaurusAdmonition(directiveName)) {
        const replacement = handleDocusaurusAdmonition(directiveNode)
        if (replacement) {
          (parent as any).children[index] = replacement
        }
      }
    }
    
    // Handle MDX JSX components
    if (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') {
      const jsxNode = node as any
      const componentName = jsxNode.name
      
      if (!componentName || typeof index !== 'number' || !parent) {
        return
      }
      
      let replacement = null
      
      switch (componentName) {
        case 'Tabs':
          replacement = handleTabs(jsxNode)
          break
          
        case 'TabItem':
          // TabItems are handled by parent Tabs
          break
          
        case 'CodeBlock':
          replacement = handleCodeBlock(jsxNode)
          break
          
        case 'details':
          replacement = handleDetails(jsxNode)
          break
          
        case 'BrowserWindow':
          replacement = handleBrowserWindow(jsxNode)
          break
          
        case 'DocCardList':
          replacement = handleDocCardList(jsxNode)
          break
          
        case 'Admonition':
          replacement = handleAdmonitionComponent(jsxNode)
          break
      }
      
      if (replacement) {
        (parent as any).children[index] = replacement
      }
    }
    
    // Handle HTML abbr tags
    if (node.type === 'html') {
      const htmlNode = node as any
      
      // Convert <abbr> tags to emphasis
      if (htmlNode.value && htmlNode.value.includes('<abbr')) {
        const abbrMatch = htmlNode.value.match(/<abbr[^>]*title="([^"]*)"[^>]*>([^<]*)<\/abbr>/)
        if (abbrMatch && parent && typeof index === 'number') {
          const [, title, text] = abbrMatch
          (parent as any).children[index] = {
            type: 'emphasis',
            children: [{
              type: 'text',
              value: `${text} (${title})`
            }]
          }
        }
      }
    }
  })
}

function isDocusaurusAdmonition(type: string): boolean {
  const admonitionTypes = [
    'note', 'tip', 'info', 'warning', 'danger', 'caution'
  ]
  return admonitionTypes.includes(type.toLowerCase())
}

function handleDocusaurusAdmonition(node: any) {
  const type = node.name || 'note'
  const attrs = getAttributes(node)
  const title = attrs.title || node.label || undefined
  const children = getChildren(node)
  
  // Map Docusaurus admonition types to standard types
  const typeMap: Record<string, string> = {
    'caution': 'warning'
  }
  
  const mappedType = typeMap[type.toLowerCase()] || type.toLowerCase()
  
  return createAdmonition(mappedType, title, children)
}

function handleTabs(node: any) {
  const children = getChildren(node)
  const items: Array<{ label: string; value: string; content: any[] }> = []
  
  // Process TabItem children
  for (const child of children) {
    if (child.type === 'mdxJsxFlowElement' && child.name === 'TabItem') {
      const attrs = getAttributes(child)
      const label = attrs.label || attrs.value || 'Tab'
      const value = attrs.value || label.toLowerCase().replace(/\s+/g, '-')
      
      items.push({
        label: label,
        value: value,
        content: getChildren(child)
      })
    }
  }
  
  if (items.length > 0) {
    return createTabs(items)
  }
  
  return null
}

function handleCodeBlock(node: any) {
  const attrs = getAttributes(node)
  const children = getChildren(node)
  const language = attrs.language || attrs.lang || ''
  const title = attrs.title || ''
  
  // Extract code content
  let code = ''
  for (const child of children) {
    if (child.type === 'text') {
      code = child.value
      break
    }
  }
  
  return {
    type: 'code',
    lang: language,
    meta: title ? `title="${title}"` : null,
    value: code
  }
}

function handleDetails(node: any) {
  const children = getChildren(node)
  let summary = 'Details'
  let content = children
  
  // Find summary element
  for (let i = 0; i < children.length; i++) {
    if (children[i].type === 'mdxJsxFlowElement' && children[i].name === 'summary') {
      summary = extractText(children[i])
      content = children.slice(i + 1)
      break
    } else if (children[i].type === 'html' && children[i].value?.includes('<summary>')) {
      const match = children[i].value.match(/<summary>([^<]*)<\/summary>/)
      if (match) {
        summary = match[1]
        content = children.slice(i + 1)
        break
      }
    }
  }
  
  return {
    type: 'blockquote',
    children: [
      {
        type: 'paragraph',
        children: [
          { type: 'text', value: '▼ ' },
          { type: 'strong', children: [{ type: 'text', value: summary }] }
        ]
      },
      ...content
    ]
  }
}

function handleBrowserWindow(node: any) {
  const attrs = getAttributes(node)
  const url = attrs.url || ''
  const children = getChildren(node)
  
  return {
    type: 'blockquote',
    children: [
      {
        type: 'paragraph',
        children: [
          { type: 'text', value: '🌐 ' },
          { type: 'strong', children: [{ type: 'text', value: url || 'Browser Window' }] }
        ]
      },
      ...children
    ]
  }
}

function handleDocCardList(node: any) {
  // Convert to a simple list of links
  return {
    type: 'paragraph',
    children: [{ type: 'text', value: '[Documentation Cards]' }]
  }
}

function handleAdmonitionComponent(node: any) {
  const attrs = getAttributes(node)
  const type = attrs.type || 'note'
  const title = attrs.title
  const children = getChildren(node)
  
  return createAdmonition(type, title, children)
}

function getAttributes(node: any): Record<string, any> {
  const attrs: Record<string, any> = {}
  
  if (node.attributes && Array.isArray(node.attributes)) {
    for (const attr of node.attributes) {
      if (attr.type === 'mdxJsxAttribute') {
        const name = attr.name
        const value = attr.value
        
        if (typeof value === 'string') {
          attrs[name] = value
        } else if (value && value.type === 'mdxJsxAttributeValueExpression') {
          if (value.value && typeof value.value === 'string') {
            try {
              // Remove quotes if it's a string literal
              const trimmed = value.value.trim()
              if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
                  (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
                attrs[name] = trimmed.slice(1, -1)
              } else {
                attrs[name] = JSON.parse(value.value)
              }
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