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
  let processedContent = content
  
  // 1. Extract and completely remove script tags (including setup scripts)
  const scriptRegex = /<script\b[^>]*>[\s\S]*?<\/script>/gi
  const styleRegex = /<style\b[^>]*>[\s\S]*?<\/style>/gi
  
  const scripts: string[] = []
  const styles: string[] = []
  
  // Extract scripts and their imports
  let scriptMatch
  while ((scriptMatch = scriptRegex.exec(content)) !== null) {
    scripts.push(scriptMatch[0])
    
    // Extract component names from imports
    const importRegex = /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g
    let importMatch
    while ((importMatch = importRegex.exec(scriptMatch[0])) !== null) {
      const componentName = importMatch[1]
      // Replace component usages with placeholders
      const componentRegex = new RegExp(`<${componentName}\\s*\\/?>`, 'g')
      processedContent = processedContent.replace(componentRegex, `[Component: ${componentName}]`)
    }
  }
  
  // Extract styles
  let styleMatch
  while ((styleMatch = styleRegex.exec(content)) !== null) {
    styles.push(styleMatch[0])
  }
  
  // Remove script and style tags
  processedContent = processedContent
    .replace(scriptRegex, '')
    .replace(styleRegex, '')
  
  // 2. Convert VitePress anchor syntax {#anchor} to standard markdown
  processedContent = processedContent.replace(
    /^(#{1,6})\s+(.+?)\s*\{#([^}]+)\}\s*$/gm,
    '$1 $2'
  )
  
  // 3. Handle HTML comments
  processedContent = processedContent.replace(
    /<!--\s*(.*?)\s*-->/gs,
    (match, content) => {
      // Skip markers we use internally
      if (!content || content.includes('CLIENT_ONLY')) return ''
      if (content.includes('prettier-ignore') || content.includes('TODO')) {
        return `{/* ${content.trim()} */}`
      }
      return ''
    }
  )
  
  // 4. Handle Vue template syntax - @ and : prefixes
  processedContent = processedContent.replace(
    /<(\w+)([^>]*?)(@|:)(\w+)([^>]*?)>/g,
    (match, tag, before, prefix, directive, after) => {
      // Convert Vue directives to data attributes
      const attrName = prefix === '@' ? `v-on-${directive}` : `v-bind-${directive}`
      return `<${tag}${before}data-${attrName}${after}>`
    }
  )
  
  // 5. Convert div class blocks to containers
  // Handle composition-api and options-api divs
  processedContent = processedContent.replace(
    /<div\s+class="(composition-api|options-api)">\s*\n/g,
    '\n::: $1\n\n'
  )
  
  // Handle closing divs after api blocks
  processedContent = processedContent.replace(
    /\n<\/div>\s*(?=\n(?:<div\s+class="(?:composition-api|options-api)">|\n## |$))/g,
    '\n\n:::\n'
  )
  
  // 6. Handle template tags (Vue-specific)
  processedContent = processedContent.replace(
    /<template[^>]*>[\s\S]*?<\/template>/gi,
    '```vue\n[Vue Template]\n```'
  )
  
  // 7. Handle self-closing Vue components
  processedContent = processedContent.replace(
    /<([A-Z][A-Za-z0-9]*)\s*\/>/g,
    '[Component: $1]'
  )
  
  // 8. Handle Vue components with content
  processedContent = processedContent.replace(
    /<([A-Z][A-Za-z0-9]*)[^>]*>[\s\S]*?<\/\1>/g,
    '[Component: $1]'
  )
  
  // 9. Handle special Vue components
  const vueComponents = [
    'ClientOnly', 'Teleport', 'Suspense', 'Transition', 
    'TransitionGroup', 'KeepAlive', 'VueSchoolLink'
  ]
  
  for (const comp of vueComponents) {
    // Self-closing
    processedContent = processedContent.replace(
      new RegExp(`<${comp}([^>]*?)\\/>`, 'g'),
      `[${comp}]`
    )
    // With content
    processedContent = processedContent.replace(
      new RegExp(`<${comp}([^>]*?)>([\\s\\S]*?)<\\/${comp}>`, 'g'),
      `[${comp}]$2[/${comp}]`
    )
  }
  
  // 10. Handle <details> tags
  processedContent = processedContent.replace(
    /<details[^>]*>[\s\S]*?<\/details>/gi,
    (match) => {
      const summaryMatch = match.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i)
      const summary = summaryMatch ? summaryMatch[1] : 'Details'
      return `\n> **${summary}**\n> \n> [Details content]\n`
    }
  )
  
  // 11. Clean up any remaining unmatched closing tags
  processedContent = processedContent.replace(
    /^\s*<\/\w+>\s*$/gm,
    ''
  )
  
  // 12. Handle standalone closing divs
  processedContent = processedContent.replace(
    /^\s*<\/div>\s*$/gm,
    ''
  )
  
  // Store extracted content in file.data
  file.data = file.data || {}
  file.data.vitepressScripts = scripts
  file.data.vitepressStyles = styles
  
  // Update file contents
  file.contents = processedContent
}

function transformVitePressComponents(tree: Root): void {
  // Track if we're inside a code-group
  let inCodeGroup = false
  const codeGroupItems: Array<{ label: string; code: string; language: string }> = []
  
  visit(tree, (node, index, parent) => {
    // Handle any remaining JSX elements
    if (node.type === 'mdxJsxTextElement' || node.type === 'mdxJsxFlowElement') {
      const jsxNode = node as any
      
      // Replace with text placeholder
      if (parent && typeof index === 'number') {
        const componentName = jsxNode.name || 'Component'
        const newNode = {
          type: 'text',
          value: `[${componentName}]`
        } as any
        (parent as any).children[index] = newNode
      }
      return
    }
    
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
    if (inCodeGroup && node.type === 'containerDirective' && (node as any).name === 'code-group') {
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
  })
}

function isVitePressContainer(type: string): boolean {
  const containerTypes = [
    'info', 'tip', 'warning', 'danger', 'details',
    'code-group', 'raw', 'composition-api', 'options-api'
  ]
  return containerTypes.includes(type.toLowerCase())
}

function handleVitePressContainer(node: any) {
  const type = node.name || 'info'
  const attrs = getAttributes(node)
  const title = attrs.title || node.label || undefined
  const children = getChildren(node)
  
  // Special handling for api blocks
  if (type === 'composition-api' || type === 'options-api') {
    return {
      type: 'blockquote',
      children: [
        {
          type: 'paragraph',
          children: [
            { type: 'strong', children: [{ type: 'text', value: `${type}:` }] }
          ]
        },
        ...children
      ]
    }
  }
  
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