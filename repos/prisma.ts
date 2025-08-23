import type { Mdx2MdConfig } from '../mdx2md/src/types/index.js'
import { join } from 'path'

// Export a function that returns the config with dynamic values
// Prisma has a dedicated docs repository at https://github.com/prisma/docs
export function getConfig(repoPath: string, docsPath: string): Mdx2MdConfig {
  return {
    preset: undefined, // Custom documentation site
    source: join(repoPath, docsPath),
    output: '../output/prisma',
    outputMode: 'tree',
    include: ['**/*.mdx', '**/*.md'],
    exclude: ['node_modules/**', '.git/**', '**/meta.json', 'examples/**'],
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