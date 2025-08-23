import type { Mdx2MdConfig } from '../mdx2md/src/types/index.js'
import { join } from 'path'

// Export a function that returns the config with dynamic values
// Note: Hono website uses custom solution, repo contains plain markdown
export function getConfig(repoPath: string, docsPath: string): Mdx2MdConfig {
  return {
    preset: undefined, // Plain markdown in repo
    source: join(repoPath, docsPath),
    output: '../output/hono',
    outputMode: 'tree',
    include: ['**/*.mdx', '**/*.md'],
    exclude: ['node_modules/**', '.git/**', '**/meta.json'],
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