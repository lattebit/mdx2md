import type { Root } from 'mdast'
import type { Preset, VFile } from '../types/index.js'
import { visit } from 'unist-util-visit'
import { createPreset } from './base.js'
import {
  createAdmonition,
  createTabs,
  createCards,
  createSteps,
  createUnknownComponent,
  createCodeGroup
} from '../umr/index.js'
import { getJsxAttributes } from '../utils/jsx-attributes.js'

export const fumadocsPreset: Preset = createPreset({
  name: 'fumadocs',
  transformers: [
    {
      name: 'fumadocs-components',
      phase: 'main',
      transform: (tree: Root, file: VFile) => transformFumadocsComponents(tree, file)
    }
  ],
  corePassDefaults: {
    codeSource: true,
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

function transformFumadocsComponents(tree: Root, file: VFile): void {
  // Handle flow elements (block-level components)
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
    
    switch (componentName) {
      case 'Callout':
        replacement = handleCallout(jsxNode)
        break
      
      case 'Tabs':
      case 'CodeTabs':
        replacement = handleTabs(jsxNode)
        break
      
      case 'Tab':
      case 'TabsList':
      case 'TabsTrigger':
      case 'TabsContent':
        // These are handled by parent Tabs component
        break
      
      case 'Cards':
      case 'CardGrid':
        replacement = handleCards(jsxNode)
        break
      
      case 'Card':
        // Cards are handled by parent Cards component
        break
      
      case 'Steps':
        replacement = handleSteps(jsxNode)
        break
      
      case 'Step':
        // Steps are handled by parent Steps component
        break
      
      case 'CodeGroup':
        replacement = handleCodeGroup(jsxNode)
        break
      
      case 'CodeTab':
        // CodeTabs are handled by parent CodeGroup component
        break
      
      case 'Accordion':
        replacement = handleAccordion(jsxNode)
        break
      
      case 'AccordionItem':
        // Accordion items are handled by parent Accordion
        break
      
      case 'Image':
        // Handle Image components specially
        const imgAttrs = getAttributes(jsxNode)
        if (imgAttrs.src || imgAttrs.srcLight || imgAttrs.srcDark) {
          const src = imgAttrs.src || imgAttrs.srcLight || imgAttrs.srcDark
          replacement = {
            type: 'paragraph',
            children: [{
              type: 'image',
              url: src,
              alt: imgAttrs.alt || ''
            }]
          }
        } else {
          replacement = createUnknownComponent(
            componentName,
            imgAttrs,
            getChildren(jsxNode)
          )
        }
        break
      
      case 'LinkedCard':
        // Handle LinkedCard components - extract link and content
        const cardAttrs = getAttributes(jsxNode)
        const cardChildren = getChildren(jsxNode)
        if (cardAttrs.href) {
          replacement = {
            type: 'paragraph',
            children: [
              { type: 'text', value: '- [' },
              ...cardChildren,
              { type: 'text', value: `](${cardAttrs.href})` }
            ]
          }
        } else {
          replacement = createUnknownComponent(
            componentName,
            cardAttrs,
            cardChildren
          )
        }
        break
      
      default:
        // Unknown component - preserve children
        replacement = createUnknownComponent(
          componentName,
          getAttributes(jsxNode),
          getChildren(jsxNode)
        )
    }
    
    if (replacement) {
      parent.children[index] = replacement
    }
  })
  
  // Second pass: handle text elements (inline components)
  visit(tree, (node, index, parent) => {
    if (node.type !== 'mdxJsxTextElement') {
      return
    }
    
    const jsxNode = node as any
    const componentName = jsxNode.name
    
    if (!componentName || typeof index !== 'number' || !parent) {
      return
    }
    
    // For inline elements, convert to text with markers
    let replacement = null
    
    switch (componentName) {
      case 'Step':
        // Step inside Steps should be handled by parent - don't convert here
        if (parent && parent.type === 'mdxJsxFlowElement' && (parent as any).name === 'Steps') {
          return
        }
        replacement = {
          type: 'text',
          value: extractText(jsxNode)
        }
        break
        
      case 'Tab':
        // Tab inside Tabs should be handled by parent
        if (parent.type === 'mdxJsxFlowElement' && (parent as any).name === 'Tabs') {
          return
        }
        replacement = {
          type: 'text',
          value: extractText(jsxNode)
        }
        break
        
      default:
        // Unknown inline component - extract text content
        const textContent = extractText(jsxNode)
        if (textContent) {
          replacement = {
            type: 'text',
            value: textContent
          }
        } else {
          // Remove empty inline components
          replacement = {
            type: 'text',
            value: ''
          }
        }
    }
    
    if (replacement) {
      parent.children[index] = replacement
    }
  })
}

function handleCallout(node: any) {
  const attrs = getAttributes(node)
  const type = attrs.type || attrs.variant || 'note'
  const title = attrs.title || attrs.label
  const children = getChildren(node)
  
  return createAdmonition(type, title, children)
}

function handleTabs(node: any) {
  const children = getChildren(node)
  const items: Array<{ label: string; value: string; content: any[] }> = []
  const triggers: Map<string, string> = new Map()
  
  // First, collect all tab triggers from TabsList
  for (const child of children) {
    if (child.type === 'mdxJsxFlowElement' && child.name === 'TabsList') {
      const listChildren = getChildren(child)
      for (const trigger of listChildren) {
        if (trigger.type === 'mdxJsxFlowElement' && trigger.name === 'TabsTrigger') {
          const attrs = getAttributes(trigger)
          const value = attrs.value || `tab-${triggers.size}`
          const label = extractText(trigger) || attrs.label || value
          triggers.set(value, label)
        }
      }
    }
  }
  
  // Then, collect all tab contents
  for (const child of children) {
    if (child.type === 'mdxJsxFlowElement' && child.name === 'TabsContent') {
      const attrs = getAttributes(child)
      const value = attrs.value || `tab-${items.length}`
      const label = triggers.get(value) || attrs.label || value
      items.push({
        label: label,
        value: value,
        content: getChildren(child)
      })
    } else if (child.type === 'mdxJsxFlowElement' && child.name === 'Tab') {
      // Also support simple Tab components (Fumadocs style)
      const attrs = getAttributes(child)
      items.push({
        label: attrs.label || attrs.title || 'Tab',
        value: attrs.value || attrs.label || `tab-${items.length}`,
        content: getChildren(child)
      })
    }
  }
  
  return createTabs(items)
}

function handleCards(node: any) {
  const children = getChildren(node)
  const items: Array<{ title: string; description?: string; href?: string }> = []
  
  for (const child of children) {
    if (child.type === 'mdxJsxFlowElement' && child.name === 'Card') {
      const attrs = getAttributes(child)
      const cardChildren = getChildren(child)
      
      // Try to extract description from children
      let description = attrs.description
      if (!description && cardChildren.length > 0) {
        const firstParagraph = cardChildren.find((c: any) => c.type === 'paragraph')
        if (firstParagraph) {
          description = extractText(firstParagraph)
        }
      }
      
      items.push({
        title: attrs.title || attrs.label || 'Card',
        description,
        href: attrs.href || attrs.url
      })
    }
  }
  
  return createCards(items)
}

function handleSteps(node: any) {
  const children = getChildren(node)
  const items: Array<{ title?: string; content: any[] }> = []
  let currentStep: { title?: string; content: any[] } | null = null
  
  for (const child of children) {
    if ((child.type === 'mdxJsxFlowElement' || child.type === 'mdxJsxTextElement') && child.name === 'Step') {
      // Save previous step if exists
      if (currentStep) {
        items.push(currentStep)
      }
      
      const attrs = getAttributes(child)
      const stepText = extractText(child)
      
      // Start a new step
      currentStep = {
        title: stepText || attrs.title || attrs.label,
        content: []
      }
    } else if (child.type === 'paragraph') {
      // Check if paragraph contains Step elements
      const paragraphChildren = getChildren(child)
      let hasSteps = false
      
      for (const pChild of paragraphChildren) {
        if (pChild.type === 'mdxJsxTextElement' && pChild.name === 'Step') {
          hasSteps = true
          // Save previous step if exists
          if (currentStep) {
            items.push(currentStep)
          }
          
          const stepText = extractText(pChild)
          currentStep = {
            title: stepText,
            content: []
          }
        }
      }
      
      // If no Step elements found and we have a current step, add to its content
      if (!hasSteps) {
        if (currentStep) {
          currentStep.content.push(child)
        } else {
          // No current step, create a generic one
          items.push({
            content: [child]
          })
        }
      }
    } else {
      // Any other content (code blocks, ComponentSource, etc.)
      if (currentStep) {
        // Add to current step's content
        currentStep.content.push(child)
      } else {
        // No current step, create a generic one
        items.push({
          content: [child]
        })
      }
    }
  }
  
  // Don't forget the last step
  if (currentStep) {
    items.push(currentStep)
  }
  
  return createSteps(items)
}

function handleCodeGroup(node: any) {
  const children = getChildren(node)
  const items: Array<{ label: string; language: string; code: string }> = []
  
  for (const child of children) {
    if (child.type === 'mdxJsxFlowElement' && (child.name === 'CodeTab' || child.name === 'Code')) {
      const attrs = getAttributes(child)
      const codeChildren = getChildren(child)
      
      // Find code block in children
      let code = ''
      let language = attrs.language || attrs.lang || ''
      
      for (const codeChild of codeChildren) {
        if (codeChild.type === 'code') {
          code = codeChild.value
          language = language || codeChild.lang || ''
          break
        } else if (codeChild.type === 'pre') {
          // Sometimes code is wrapped in pre
          const preChildren = getChildren(codeChild)
          for (const preChild of preChildren) {
            if (preChild.type === 'code') {
              code = preChild.value
              language = language || preChild.lang || ''
              break
            }
          }
        }
      }
      
      items.push({
        label: attrs.label || attrs.title || language || 'Code',
        language,
        code
      })
    } else if (child.type === 'code') {
      // Direct code blocks
      items.push({
        label: child.meta || child.lang || 'Code',
        language: child.lang || '',
        code: child.value
      })
    }
  }
  
  if (items.length > 0) {
    return createCodeGroup(items)
  }
  
  return null
}


function handleAccordion(node: any) {
  const children = getChildren(node)
  const items: any[] = []
  
  for (const child of children) {
    if (child.type === 'mdxJsxFlowElement' && child.name === 'AccordionItem') {
      const attrs = getAttributes(child)
      const title = attrs.title || attrs.label || 'Item'
      
      items.push({
        type: 'heading',
        depth: 4,
        children: [{ type: 'text', value: `▶ ${title}` }]
      })
      
      items.push(...getChildren(child))
    }
  }
  
  return {
    type: 'blockquote',
    children: items
  }
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
          // Try to extract literal value
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