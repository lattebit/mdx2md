import type { Root } from 'mdast'
import type { VFile } from '../types/index.js'
import { visit } from 'unist-util-visit'

export function normalizeFences(tree: Root, file: VFile): void {
  visit(tree, 'code', (node) => {
    if (node.lang) {
      node.lang = node.lang.toLowerCase().trim()
      
      const langMap: Record<string, string> = {
        'javascript': 'js',
        'typescript': 'ts',
        'javascriptreact': 'jsx',
        'typescriptreact': 'tsx',
        'shellscript': 'bash',
        'shell': 'bash',
        'sh': 'bash',
        'yml': 'yaml',
        'jsonc': 'json'
      }
      
      if (langMap[node.lang]) {
        node.lang = langMap[node.lang]
      }
    }
    
    if (node.meta) {
      node.meta = node.meta.trim()
      if (node.meta.startsWith('{') && node.meta.endsWith('}')) {
        try {
          const parsed = JSON.parse(node.meta)
          if (parsed.title || parsed.filename) {
            node.meta = parsed.title || parsed.filename
          } else {
            node.meta = ''
          }
        } catch {
          node.meta = node.meta.replace(/^{|}$/g, '').trim()
        }
      }
    }
  })
}