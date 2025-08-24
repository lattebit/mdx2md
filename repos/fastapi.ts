import type { Mdx2MdConfig } from '../mdx2md/src/types/index.js'
import { join } from 'path'

// Export a function that returns the config with dynamic values
export function getConfig(repoPath: string, docsPath: string): Mdx2MdConfig {
  return {
    preset: 'mkdocs',
    source: join(repoPath, docsPath, 'docs'), // MkDocs stores docs in 'docs' subdirectory
    output: 'output/fastapi',
    outputMode: 'tree',
    include: ['**/*.md'],
    exclude: [
      'node_modules/**', 
      '.git/**', 
      '**/meta.json',
      '**/img/**',
      '**/css/**',
      '**/js/**'
    ],
    corePass: {
      stripEsm: false,
      frontmatterTitle: true,
      normalizeFences: true,
      groupCodeTabs: false,
      normalizeWhitespace: true,
      rewriteLinks: {
        extensions: {},
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