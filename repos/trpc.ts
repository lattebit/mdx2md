import type { Mdx2MdConfig } from '../mdx2md/src/types/index.js'
import { join } from 'path'

// Export a function that returns the config with dynamic values
// tRPC uses Docusaurus for documentation
export function getConfig(repoPath: string, docsPath: string): Mdx2MdConfig {
  return {
    preset: 'docusaurus', // Confirmed: uses Docusaurus
    source: join(repoPath, docsPath),
    output: '../output/trpc',
    outputMode: 'tree',
    include: ['**/*.mdx', '**/*.md'],
    exclude: ['node_modules/**', '.git/**', '**/meta.json', '**/_*', '**/public/**'],
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