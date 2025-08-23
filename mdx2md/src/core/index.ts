export { stripEsm } from './strip-esm.js'
export { frontmatterTitle } from './frontmatter-title.js'
export { normalizeFences } from './normalize-fences.js'
export { groupCodeTabs } from './group-code-tabs.js'
export { headingOffset } from './heading-offset.js'
export { normalizeWhitespace } from './normalize-whitespace.js'
export { rewriteLinks } from './rewrite-links.js'
export { expandIncludes } from './expand-includes.js'
export { codeSource } from './code-source.js'

import type { Root } from 'mdast'
import type { VFile } from '../types/index.js'
import type { CorePassConfig } from '../types/index.js'

export interface CorePass {
  name: string
  enabled: boolean
  transform: (tree: Root, file: VFile, config?: any) => void | Promise<void>
}

export async function createCorePasses(config: CorePassConfig = {}): Promise<CorePass[]> {
  const passes: CorePass[] = []
  
  // Code source should run early to replace JSX components with actual code
  if (config.codeSource !== false) {
    passes.push({
      name: 'codeSource',
      enabled: true,
      transform: (await import('./code-source.js')).codeSource
    })
  }
  
  if (config.stripEsm !== false) {
    passes.push({
      name: 'stripEsm',
      enabled: true,
      transform: (await import('./strip-esm.js')).stripEsm
    })
  }
  
  if (config.frontmatterTitle !== false) {
    passes.push({
      name: 'frontmatterTitle',
      enabled: true,
      transform: (await import('./frontmatter-title.js')).frontmatterTitle
    })
  }
  
  if (config.normalizeFences !== false) {
    passes.push({
      name: 'normalizeFences',
      enabled: true,
      transform: (await import('./normalize-fences.js')).normalizeFences
    })
  }
  
  if (config.groupCodeTabs !== false) {
    passes.push({
      name: 'groupCodeTabs',
      enabled: true,
      transform: (await import('./group-code-tabs.js')).groupCodeTabs
    })
  }
  
  if (config.headingOffset !== undefined && config.headingOffset !== 0) {
    passes.push({
      name: 'headingOffset',
      enabled: true,
      transform: async (tree, file) => {
        const { headingOffset } = await import('./heading-offset.js')
        return headingOffset(tree, file, { offset: config.headingOffset })
      }
    })
  }
  
  if (config.normalizeWhitespace !== false) {
    passes.push({
      name: 'normalizeWhitespace',
      enabled: true,
      transform: (await import('./normalize-whitespace.js')).normalizeWhitespace
    })
  }
  
  if (config.rewriteLinks !== false) {
    passes.push({
      name: 'rewriteLinks',
      enabled: true,
      transform: async (tree, file) => {
        const { rewriteLinks } = await import('./rewrite-links.js')
        const options = typeof config.rewriteLinks === 'object' ? config.rewriteLinks : {}
        return rewriteLinks(tree, file, options)
      }
    })
  }
  
  return passes
}