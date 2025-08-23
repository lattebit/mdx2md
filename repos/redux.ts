import type { Mdx2MdConfig } from '../mdx2md/src/types/index.js'
import { join } from 'path'

// Export a function that returns the config with dynamic values
// Redux uses Docusaurus for its documentation
export function getConfig(repoPath: string, docsPath: string): Mdx2MdConfig {
  return {
    preset: 'docusaurus',
    source: join(repoPath, docsPath),
    output: '../output/redux',
    outputMode: 'tree',
    include: ['**/*.mdx', '**/*.md'],
    exclude: ['node_modules/**', '.git/**', 'versioned_docs/**', 'blog/**'],
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