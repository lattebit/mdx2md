import type { Mdx2MdConfig } from '../mdx2md/src/types/index.js'
import { join } from 'path'

// Export a function that returns the config with dynamic values
// TanStack documentation is served from tanstack.com repository
export function getConfig(repoPath: string, docsPath: string): Mdx2MdConfig {
  return {
    preset: undefined, // Uses TanStack Router itself
    source: join(repoPath, docsPath),
    output: '../output/tanstack',
    outputMode: 'tree',
    include: ['**/*.mdx', '**/*.md'],
    exclude: ['node_modules/**', '.git/**', '**/meta.json', 'public/**'],
    corePass: {
      stripEsm: true,
      frontmatterTitle: true,
      normalizeFences: true,
      groupCodeTabs: true,
      normalizeWhitespace: true,
      rewriteLinks: {
        extensions: { '.mdx': '.md' },
        removeExtension: false
      }
    },
    renderOptions: {
      listMarker: '-',
      listIndent: 'one',
      emphasis: '_',
      strong: '**',
      fence: '`',
      fenceLength: 3
    }
  }
}