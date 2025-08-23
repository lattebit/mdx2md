import type { Mdx2MdConfig } from '../mdx2md/src/types/index.js'
import { join } from 'path'

// Export a function that returns the config with dynamic values
export function getConfig(repoPath: string, docsPath: string): Mdx2MdConfig {
  return {
    preset: 'fumadocs',
    source: join(repoPath, docsPath),
    output: '../output/fastify',
    outputMode: 'tree',
    include: ['**/*.md'],
    exclude: ['node_modules/**', '.git/**', '**/meta.json', 'benchmarks/**'],
    corePass: {
      stripEsm: false,
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