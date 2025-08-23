import type { Mdx2MdConfig } from '../mdx2md/src/types/index.js'
import { join } from 'path'

// Export a function that returns the config with dynamic values
// Django uses Sphinx for documentation (RST files)
export function getConfig(repoPath: string, docsPath: string): Mdx2MdConfig {
  return {
    preset: 'fumadocs',
    source: join(repoPath, docsPath),
    output: '../output/django',
    outputMode: 'tree',
    include: ['**/*.txt', '**/*.rst', '**/*.md'],
    exclude: ['node_modules/**', '.git/**', '**/meta.json', '**/_build/**', '**/conf.py'],
    corePass: {
      stripEsm: false,
      frontmatterTitle: true,
      normalizeFences: true,
      groupCodeTabs: false,
      normalizeWhitespace: true,
      rewriteLinks: {
        extensions: { '.mdx': '.md', '.rst': '.md', '.txt': '.md' },
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