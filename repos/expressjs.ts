import type { Mdx2MdConfig } from '../mdx2md/src/types/index.js'
import { join } from 'path'

// Export a function that returns the config with dynamic values
// Express documentation is in a separate repository expressjs.com
export function getConfig(repoPath: string, docsPath: string): Mdx2MdConfig {
  return {
    preset: undefined, // Custom documentation site
    source: join(repoPath, docsPath),
    output: '../output/expressjs',
    outputMode: 'tree',
    include: ['**/*.md', '**/*.jade'],
    exclude: ['node_modules/**', '.git/**', '_includes/**'],
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