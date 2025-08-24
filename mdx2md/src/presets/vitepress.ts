import type { Root } from 'mdast'
import type { Preset, VFile } from '../types/index.js'
import { visit } from 'unist-util-visit'
import { createPreset } from './base.js'
import { createAdmonition, createTabs } from '../umr/index.js'
import { getJsxAttributes } from '../utils/jsx-attributes.js'

export const vitepressPreset: Preset = createPreset({
  name: 'vitepress',
  transformers: [
    {
      name: 'vitepress-preprocessor',
      phase: 'pre',
      transform: (_tree: Root, file: VFile) => preprocessVitePress(file)
    },
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

function preprocessVitePress(file: VFile): void {
  const content = String(file.contents)
  
  // Extract and store script tags
  const scriptRegex = /<script\b[^>]*>[\s\S]*?<\/script>/gi
  const styleRegex = /<style\b[^>]*>[\s\S]*?<\/style>/gi
  
  const scripts: string[] = []
  const styles: string[] = []
  
  // Extract scripts
  let scriptMatch
  while ((scriptMatch = scriptRegex.exec(content)) !== null) {
    scripts.push(scriptMatch[0])
  }
  
  // Extract styles
  let styleMatch
  while ((styleMatch = styleRegex.exec(content)) !== null) {
    styles.push(styleMatch[0])
  }
  
  // Remove script and style tags from content
  let processedContent = content
    .replace(scriptRegex, '')
    .replace(styleRegex, '')
  
  // Convert VitePress anchor syntax {#anchor} to standard markdown
  processedContent = processedContent.replace(
    /^(#{1,6})\s+(.+?)\s*\{#([^}]+)\}\s*$/gm,
    '$1 $2'
  )
  
  // Convert HTML comments to MDX comments
  processedContent = processedContent.replace(
    /<!--\s*(.*?)\s*-->/gs,
    (match, content) => {
      // Skip markers we use internally
      if (content.includes('CLIENT_ONLY')) return match
      return `{/* ${content.trim()} */}`
    }
  )
  
  // Handle Vue template syntax - escape @ symbols in certain contexts
  processedContent = processedContent.replace(
    /<(\w+)([^>]*?)(@\w+)([^>]*?)>/g,
    (match, tag, before, vueDir, after) => {
      // Convert Vue directives to data attributes for preservation
      const directive = vueDir.replace('@', 'v-on-')
      return `<${tag}${before}data-${directive}${after}>`
    }
  )
  
  // Handle VitePress-specific div containers with classes
  processedContent = processedContent.replace(
    /<div\s+class="(composition-api|options-api)">/g,
    '\n::: $1\n'
  ).replace(
    /<\/div>\s*(?=<div\s+class="(?:composition-api|options-api)">|$)/g,
    '\n:::\n'
  )
  
  // Also handle Vue-specific components that aren't valid MDX
  // Replace <ClientOnly> with a marker that we can restore later
  processedContent = processedContent
    .replace(/<ClientOnly>/g, '<!-- CLIENT_ONLY_START -->')
    .replace(/<\/ClientOnly>/g, '<!-- CLIENT_ONLY_END -->')
  
  // Replace VueSchoolLink and other Vue components with markdown equivalents
  processedContent = processedContent.replace(
    /<VueSchoolLink\s+href="([^"]+)"\s+title="([^"]+)"\s*\/>/g,
    '[$2]($1)'
  )
  
  // Replace Teleport and other Vue built-in components
  processedContent = processedContent.replace(
    /<Teleport\s+to="([^"]+)">/g,
    '<!-- TELEPORT_TO:$1 -->'
  ).replace(
    /<\/Teleport>/g,
    '<!-- /TELEPORT -->'
  )
  
  // Store extracted content in file.data for later use if needed
  file.data = file.data || {}
  file.data.vitepressScripts = scripts
  file.data.vitepressStyles = styles
  
  // Update file contents with processed content
  file.contents = processedContent
}

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
  return getJsxAttributes(node)
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