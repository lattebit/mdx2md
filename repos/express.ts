import type { Mdx2MdConfig } from '../mdx2md/src/types/index.js'
import { join } from 'path'

// Export a function that returns the config with dynamic values
// Note: Express uses Jekyll (legacy) for expressjs.com, but repo contains plain markdown
export function getConfig(repoPath: string, docsPath: string): Mdx2MdConfig {
  return {
    preset: undefined, // Plain markdown, no specific framework
    source: join(repoPath, docsPath),
    output: '../output/express',
    outputMode: 'tree',
    include: ['README.md', '*.md', 'examples/**/*.md'],
    exclude: ['node_modules/**', '.git/**', 'test/**'],
    corePass: {
      stripEsm: false,
      frontmatterTitle: true,
      normalizeFences: true,
      groupCodeTabs: false,
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