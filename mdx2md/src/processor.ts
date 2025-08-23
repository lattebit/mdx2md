import { unified } from 'unified'
import remarkStringify from 'remark-stringify'
import remarkGfm from 'remark-gfm'
import type { Root } from 'mdast'
import type { ProcessorOptions, VFile, CorePass } from './types/index.js'
import { createParser } from './parser/index.js'
import { renderUMR } from './renderer/index.js'
import { createCorePasses } from './core/index.js'

export function createProcessor(options: ProcessorOptions) {
  const { preset, config } = options
  
  // Merge preset defaults with config
  const corePassConfig = {
    ...preset.corePassDefaults,
    ...config.corePass
  }
  
  const renderOptions = {
    ...preset.renderDefaults,
    ...config.renderOptions
  }
  
  return async function process(file: VFile): Promise<string> {
    // Pass configuration to file.data for transformers to use
    file.data = {
      ...file.data,
      codeSource: config.codeSource
    }
    
    // Create core passes
    const corePasses = await createCorePasses(corePassConfig)
    
    // Parse
    const parser = createParser()
    let tree = await parser.parse(file.contents) as Root
    
    // Pre-phase transformers
    for (const transformer of preset.transformers) {
      if (transformer.phase === 'pre') {
        await transformer.transform(tree, file)
      }
    }
    
    // Core pre passes (including codeSource which must run before main transformers)
    for (const pass of corePasses.filter(p => 
      p.name === 'codeSource' || 
      p.name === 'stripEsm' || 
      p.name === 'frontmatterTitle'
    )) {
      await pass.transform(tree, file, corePassConfig)
    }
    
    // Main-phase transformers (component to UMR conversion)
    for (const transformer of preset.transformers) {
      if (transformer.phase === 'main') {
        await transformer.transform(tree, file)
      }
    }
    
    // Core main passes
    for (const pass of corePasses.filter(p => 
      p.name !== 'codeSource' &&
      p.name !== 'stripEsm' && 
      p.name !== 'frontmatterTitle' &&
      p.name !== 'normalizeWhitespace' &&
      p.name !== 'rewriteLinks'
    )) {
      await pass.transform(tree, file, corePassConfig)
    }
    
    // Post-phase transformers
    for (const transformer of preset.transformers) {
      if (transformer.phase === 'post') {
        await transformer.transform(tree, file)
      }
    }
    
    // Render UMR to mdast
    renderUMR(tree, file, renderOptions)
    
    // Clean up any remaining UMR nodes and JSX elements that weren't handled
    const { visit } = await import('unist-util-visit')
    
    // First pass: Remove UMR nodes - do multiple passes to ensure all are removed
    let hasUMRNodes = true
    let passes = 0
    while (hasUMRNodes && passes < 5) {
      hasUMRNodes = false
      visit(tree, 'umr', (node, index, parent) => {
        hasUMRNodes = true
        if (parent && typeof index === 'number') {
          // Replace UMR node with its children or remove it
          const children = (node as any).children || []
          if (children.length > 0) {
            parent.children.splice(index, 1, ...children)
            return ['skip', index + children.length]
          } else {
            parent.children.splice(index, 1)
            return ['skip', index]
          }
        }
      })
      passes++
    }
    
    if (hasUMRNodes) {
      console.warn('Warning: Could not remove all UMR nodes after 5 passes')
    }
    
    // Second pass: Clean up any remaining JSX elements
    visit(tree, (node, index, parent) => {
      if (!parent || typeof index !== 'number') return
      
      const nodeType = node.type
      if (nodeType === 'mdxJsxFlowElement' || nodeType === 'mdxJsxTextElement') {
        const jsxNode = node as any
        const componentName = jsxNode.name
        
        // Try to extract meaningful content
        const children = jsxNode.children || []
        
        // For Image components, create a markdown image if possible
        if (componentName === 'Image') {
          const attrs = jsxNode.attributes || []
          const srcAttr = attrs.find((a: any) => a.name === 'src')
          const altAttr = attrs.find((a: any) => a.name === 'alt')
          
          if (srcAttr) {
            const src = srcAttr.value
            const alt = altAttr ? altAttr.value : ''
            parent.children[index] = {
              type: 'paragraph',
              children: [{
                type: 'image',
                url: src,
                alt: alt
              }]
            }
            return
          }
        }
        
        // For other components, try to preserve children content
        if (children.length > 0) {
          parent.children.splice(index, 1, ...children)
          return ['skip', index + children.length]
        } else {
          // If no children, remove the node
          parent.children.splice(index, 1)
          return ['skip', index]
        }
      }
    })
    
    // Core post passes
    for (const pass of corePasses.filter(p => 
      p.name === 'normalizeWhitespace' || 
      p.name === 'rewriteLinks'
    )) {
      await pass.transform(tree, file, corePassConfig)
    }
    
    // Debug: Check for remaining UMR nodes (if DEBUG_UMR is set)
    try {
      if (typeof process !== 'undefined' && process.env?.DEBUG_UMR) {
        const { visit } = await import('unist-util-visit')
        let umrCount = 0
        visit(tree, 'umr', (node: any) => {
          umrCount++
          console.log('Remaining UMR:', node.data?.umr)
        })
        if (umrCount > 0) {
          console.log(`Warning: ${umrCount} UMR nodes still present before stringify`)
        }
      }
    } catch (e) {
      // Ignore debug errors
    }
    
    // Stringify
    const stringifier = unified()
      .use(remarkGfm)
      .use(remarkStringify, {
        bullet: renderOptions.listMarker || '-',
        emphasis: renderOptions.emphasis || '_',
        strong: renderOptions.strong === '**' ? '*' : renderOptions.strong || '*',
        fence: renderOptions.fence || '`',
        fences: true,
        listItemIndent: renderOptions.listIndent || 'one'
      })
    
    const result = stringifier.stringify(tree)
    return result
  }
}