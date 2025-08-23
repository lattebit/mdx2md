import type { Mdx2MdConfig } from '../mdx2md/src/types/index.js'
import { join } from 'path'

// Export a function that returns the config with dynamic values
// Note: Fastify website uses custom solution, repo contains plain markdown
export function getConfig(repoPath: string, docsPath: string): Mdx2MdConfig {
  return {
    preset: undefined, // Plain markdown documentation
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