import type { Root } from 'mdast'
import type { VFile } from '../types/index.js'
import { visit } from 'unist-util-visit'
import { readFileSync, existsSync } from 'fs'
import { join, resolve } from 'path'

/**
 * Core pass to handle code source loading for components
 * This will replace JSX elements like ComponentSource and ComponentPreview
 * with actual code blocks containing the source code
 */
export function codeSource(tree: Root, file: VFile): void {
  const config = file.data?.codeSource
  
  if (!config?.enabled) {
    return
  }
  
  visit(tree, (node, index, parent) => {
    if (node.type !== 'mdxJsxFlowElement' && node.type !== 'mdxJsxTextElement') {
      return
    }
    
    const jsxNode = node as any
    const componentName = jsxNode.name
    
    if (!componentName || typeof index !== 'number' || !parent) {
      return
    }
    
    // Handle components that need code source
    switch (componentName) {
      case 'ComponentSource':
      case 'ComponentPreview':
      case 'CodeSource':
      case 'Preview':
        const replacement = loadCodeSource(jsxNode, config, componentName)
        if (replacement) {
          if (Array.isArray(replacement)) {
            // Replace with multiple nodes
            parent.children.splice(index, 1, ...replacement)
            return ['skip', index + replacement.length]
          } else {
            parent.children[index] = replacement
          }
        }
        break
    }
  })
}

function loadCodeSource(node: any, config: any, componentType: string): any {
  const attrs = getAttributes(node)
  
  // Get the component name/key to look up
  const name = attrs.name || attrs.component || attrs.file || 'component'
  const title = attrs.title || attrs.file || `${name}.tsx`
  
  // Try to load the actual code
  if (config.components && config.components[name]) {
    const componentPath = join(config.baseDir, config.components[name])
    try {
      const absolutePath = resolve(process.cwd(), componentPath)
      if (existsSync(absolutePath)) {
        const code = readFileSync(absolutePath, 'utf-8')
        
        // For ComponentSource and CodeSource, return a code block
        if (componentType === 'ComponentSource' || componentType === 'CodeSource') {
          return {
            type: 'code',
            lang: getLangFromPath(componentPath),
            meta: `title="${title}"`,
            value: code
          }
        }
        
        // For ComponentPreview and Preview, also return a code block
        // The preview functionality should be handled by the renderer if needed
        if (componentType === 'ComponentPreview' || componentType === 'Preview') {
          return {
            type: 'code',
            lang: getLangFromPath(componentPath),
            meta: `title="${title}" preview="${name}"`,
            value: code
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to load code source for ${name}:`, error)
    }
  }
  
  // Fallback: create a reference paragraph
  if (componentType === 'ComponentSource' || componentType === 'CodeSource') {
    return {
      type: 'paragraph',
      children: [
        { type: 'text', value: '📄 ' },
        { type: 'strong', children: [{ type: 'text', value: 'Source:' }] },
        { type: 'text', value: ' ' },
        { type: 'inlineCode', value: title }
      ]
    }
  }
  
  // For preview components, add comment markers and description
  if (componentType === 'ComponentPreview' || componentType === 'Preview') {
    const children = []
    
    children.push({
      type: 'html',
      value: `<!-- Preview: ${name} -->`
    })
    
    if (attrs.description) {
      children.push({
        type: 'paragraph',
        children: [{ type: 'text', value: attrs.description }]
      })
    }
    
    children.push({
      type: 'html',
      value: `<!-- /Preview -->`
    })
    
    // Return as a fragment that will be expanded by the parent
    return children
  }
  
  return null
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
  
  return attrs
}

function getLangFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase()
  const extMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'jsx',
    'ts': 'typescript',
    'tsx': 'tsx',
    'json': 'json',
    'md': 'markdown',
    'mdx': 'mdx',
    'css': 'css',
    'scss': 'scss',
    'html': 'html',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
    'sh': 'bash',
    'bash': 'bash',
    'py': 'python',
    'rs': 'rust',
    'go': 'go'
  }
  return extMap[ext || ''] || 'text'
}