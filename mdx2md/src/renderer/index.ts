import type { Root, Content, Code, Heading, Paragraph, List, ListItem } from 'mdast'
import type { VFile } from '../types/index.js'
import type { UMRNode, RenderOptions } from '../types/index.js'
import { visit } from 'unist-util-visit'
import { isUMRNode, getUMRKind } from '../umr/index.js'
import { toString } from 'mdast-util-to-string'

export function renderUMR(tree: Root, file: VFile, options: RenderOptions = {}): void {
  visit(tree, (node, index, parent) => {
    if (!isUMRNode(node) || !parent || typeof index !== 'number') return
    
    const kind = getUMRKind(node)
    const replacement = renderUMRNode(node as UMRNode, options)
    
    if (replacement) {
      if (Array.isArray(replacement)) {
        parent.children.splice(index, 1, ...replacement)
        return ['skip', index + replacement.length]
      } else {
        parent.children[index] = replacement
        return ['skip', index + 1]
      }
    } else {
      // If no replacement was generated, still remove the UMR node
      // and replace with its children if any
      const children = (node as any).children || []
      if (children.length > 0) {
        parent.children.splice(index, 1, ...children)
        return ['skip', index + children.length]
      } else {
        // Remove the UMR node entirely if no children
        parent.children.splice(index, 1)
        return ['skip', index]
      }
    }
  })
}

function renderUMRNode(node: UMRNode, options: RenderOptions): Content | Content[] | null {
  const kind = node.data.umr.kind
  const props = node.data.umr.props
  
  switch (kind) {
    case 'admonition':
      return renderAdmonition(node, props)
    
    case 'tabs':
      return renderTabs(node, props)
    
    case 'code-group':
      return renderCodeGroup(node, props)
    
    case 'cards':
      return renderCards(node, props)
    
    case 'steps':
      return renderSteps(node, props)
    
    case 'preview':
      return renderPreview(node, props)
    
    case 'include':
      return renderInclude(node, props)
    
    case 'unknown':
      return renderUnknown(node, props)
    
    default:
      // For any unhandled UMR kind, treat as unknown
      return renderUnknown(node, { ...props, componentName: kind })
  }
}

function renderAdmonition(node: UMRNode, props: any): Content[] {
  const { type, title } = props
  const children = (node as any).children || []
  const typeEmoji: Record<string, string> = {
    'note': '📝',
    'tip': '💡',
    'warning': '⚠️',
    'danger': '🚨',
    'info': 'ℹ️'
  }
  
  const result: Content[] = []
  
  // Use blockquote for better visual distinction
  const blockquoteChildren: Content[] = []
  
  // Add the title/type as the first paragraph
  blockquoteChildren.push({
    type: 'paragraph',
    children: [
      {
        type: 'strong',
        children: [
          {
            type: 'text',
            value: `${typeEmoji[type] || ''} ${title || type.toUpperCase()}`
          }
        ]
      }
    ]
  } as Paragraph)
  
  // Add the content
  blockquoteChildren.push(...children)
  
  result.push({
    type: 'blockquote',
    children: blockquoteChildren
  } as any)
  
  return result
}

function renderTabs(node: UMRNode, props: any): Content[] {
  const { items } = props
  const result: Content[] = []
  
  result.push({
    type: 'html',
    value: '<!-- Tabs -->'
  } as any)
  
  // Create a list of tab labels first
  if (items.length > 0) {
    const tabLabels = items.map((item: any) => item.label).join(' | ')
    result.push({
      type: 'paragraph',
      children: [
        {
          type: 'strong',
          children: [
            {
              type: 'text',
              value: `[${tabLabels}]`
            }
          ]
        }
      ]
    } as Paragraph)
  }
  
  // Render each tab's content with better formatting
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    
    result.push({
      type: 'heading',
      depth: 4,
      children: [
        {
          type: 'text',
          value: item.label
        }
      ]
    } as Heading)
    
    // Process content - some may contain UMR nodes that need rendering
    const processedContent: Content[] = []
    for (const contentNode of (item.content || [])) {
      if (isUMRNode(contentNode)) {
        // Recursively render UMR nodes
        const rendered = renderUMRNode(contentNode as UMRNode, {})
        if (rendered) {
          if (Array.isArray(rendered)) {
            processedContent.push(...rendered)
          } else {
            processedContent.push(rendered)
          }
        }
      } else {
        processedContent.push(contentNode)
      }
    }
    
    result.push(...processedContent)
    
    // Add separator between tabs (except for last)
    if (i < items.length - 1) {
      result.push({
        type: 'thematicBreak'
      } as any)
    }
  }
  
  result.push({
    type: 'html',
    value: '<!-- /Tabs -->'
  } as any)
  
  return result
}

function renderCodeGroup(node: UMRNode, props: any): Content[] {
  const { items } = props
  const result: Content[] = []
  
  result.push({
    type: 'html',
    value: '<!-- Code Tabs -->'
  } as any)
  
  for (const item of items) {
    result.push({
      type: 'paragraph',
      children: [
        {
          type: 'strong',
          children: [
            {
              type: 'text',
              value: item.label
            }
          ]
        }
      ]
    } as Paragraph)
    
    result.push({
      type: 'code',
      lang: item.language,
      value: item.code
    } as Code)
  }
  
  result.push({
    type: 'html',
    value: '<!-- /Code Tabs -->'
  } as any)
  
  return result
}

function renderCards(node: UMRNode, props: any): Content[] {
  const { items } = props
  const result: Content[] = []
  
  result.push({
    type: 'html',
    value: '<!-- Cards -->'
  } as any)
  
  const listItems: ListItem[] = items.map((item: any) => ({
    type: 'listItem',
    children: [
      {
        type: 'paragraph',
        children: [
          item.href ? {
            type: 'link',
            url: item.href,
            children: [
              {
                type: 'strong',
                children: [
                  {
                    type: 'text',
                    value: item.title
                  }
                ]
              }
            ]
          } : {
            type: 'strong',
            children: [
              {
                type: 'text',
                value: item.title
              }
            ]
          },
          ...(item.description ? [
            {
              type: 'text',
              value: ` - ${item.description}`
            }
          ] : [])
        ]
      }
    ]
  }))
  
  result.push({
    type: 'list',
    ordered: false,
    children: listItems
  } as List)
  
  result.push({
    type: 'html',
    value: '<!-- /Cards -->'
  } as any)
  
  return result
}

function renderSteps(node: UMRNode, props: any): Content[] {
  const { items } = props
  const result: Content[] = []
  
  result.push({
    type: 'html',
    value: '<!-- Steps -->'
  } as any)
  
  // Create an ordered list for steps
  const listItems: ListItem[] = items.map((item: any) => {
    const children: Content[] = []
    
    // Add title as the first paragraph if exists
    if (item.title) {
      children.push({
        type: 'paragraph',
        children: [
          {
            type: 'strong',
            children: [
              {
                type: 'text',
                value: item.title
              }
            ]
          }
        ]
      } as Paragraph)
    }
    
    // Add the rest of the content
    if (item.content && item.content.length > 0) {
      // If the first item is a paragraph and we already have a title, check if we should merge
      if (item.title && item.content[0].type === 'paragraph') {
        const firstPara = item.content[0] as Paragraph
        // Check if this is a ComponentSource or similar special paragraph (contains 📄 emoji)
        const firstChild = firstPara.children?.[0]
        const isSpecialParagraph = firstChild?.type === 'text' && 
                                  typeof firstChild.value === 'string' && 
                                  firstChild.value.includes('📄')
        
        if (!isSpecialParagraph) {
          // Merge regular paragraphs with title
          children[0] = {
            type: 'paragraph',
            children: [
              {
                type: 'strong',
                children: [
                  {
                    type: 'text',
                    value: item.title
                  }
                ]
              },
              {
                type: 'text',
                value: ' - '
              },
              ...(firstPara.children || [])
            ]
          } as Paragraph
          
          // Add remaining content
          children.push(...item.content.slice(1))
        } else {
          // Don't merge special paragraphs, keep them separate
          children.push(...item.content)
        }
      } else {
        children.push(...item.content)
      }
    } else if (!item.title) {
      // If no title and no content, add placeholder
      children.push({
        type: 'paragraph',
        children: [
          {
            type: 'text',
            value: 'Step'
          }
        ]
      } as Paragraph)
    }
    
    return {
      type: 'listItem',
      spread: false,
      children
    } as ListItem
  })
  
  result.push({
    type: 'list',
    ordered: true,
    spread: false,
    children: listItems
  } as List)
  
  result.push({
    type: 'html',
    value: '<!-- /Steps -->'
  } as any)
  
  return result
}

function renderPreview(node: UMRNode, props: any): Content[] {
  const { name, description, files } = props
  const result: Content[] = []
  
  result.push({
    type: 'html',
    value: `<!-- Preview: ${name} -->`
  } as any)
  
  if (description) {
    result.push({
      type: 'paragraph',
      children: [
        {
          type: 'text',
          value: description
        }
      ]
    } as Paragraph)
  }
  
  if (files && files.length > 0) {
    for (const file of files) {
      result.push({
        type: 'paragraph',
        children: [
          {
            type: 'strong',
            children: [
              {
                type: 'text',
                value: file.path
              }
            ]
          }
        ]
      } as Paragraph)
      
      result.push({
        type: 'code',
        lang: getLanguageFromPath(file.path),
        value: file.content
      } as Code)
    }
  }
  
  result.push({
    type: 'html',
    value: `<!-- /Preview -->`
  } as any)
  
  return result
}

function renderInclude(node: UMRNode, props: any): Content[] {
  const { path, expanded, content } = props
  const result: Content[] = []
  
  result.push({
    type: 'html',
    value: `<!-- Include: ${path} -->`
  } as any)
  
  if (expanded && content) {
    result.push({
      type: 'code',
      lang: getLanguageFromPath(path),
      value: content
    } as Code)
  } else {
    result.push({
      type: 'paragraph',
      children: [
        {
          type: 'text',
          value: `[Included content from: ${path}]`
        }
      ]
    } as Paragraph)
  }
  
  result.push({
    type: 'html',
    value: `<!-- /Include -->`
  } as any)
  
  return result
}

function renderUnknown(node: UMRNode, props: any): Content[] {
  const { componentName } = props
  const children = (node as any).children || []
  const result: Content[] = []
  
  result.push({
    type: 'html',
    value: `<!-- Component: ${componentName} -->`
  } as any)
  
  if (children.length > 0) {
    result.push(...children)
  }
  
  result.push({
    type: 'html',
    value: `<!-- /Component: ${componentName} -->`
  } as any)
  
  return result
}

function getLanguageFromPath(path: string): string {
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
  return extMap[ext || ''] || ''
}