import type { Root } from 'mdast'
import type { VFile } from '../types/index.js'
import type { LinkRewriteOptions } from '../types/index.js'
import { visit } from 'unist-util-visit'

export function rewriteLinks(
  tree: Root,
  file: VFile,
  options: LinkRewriteOptions = {}
): void {
  const {
    extensions = { '.mdx': '.md' },
    removeExtension = false
  } = options
  
  visit(tree, 'link', (node) => {
    if (!node.url) return
    
    if (node.url.startsWith('http://') || node.url.startsWith('https://')) {
      return
    }
    
    let url = node.url
    
    for (const [from, to] of Object.entries(extensions)) {
      if (url.endsWith(from)) {
        url = url.slice(0, -from.length) + to
        break
      }
    }
    
    if (removeExtension && url.endsWith('.md')) {
      url = url.slice(0, -3)
    }
    
    if (url.includes('#')) {
      const [path, hash] = url.split('#')
      url = `${path}#${hash.toLowerCase().replace(/[^\w-]/g, '-')}`
    }
    
    node.url = url
  })
}