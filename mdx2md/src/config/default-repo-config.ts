import type { Mdx2MdConfig } from '../types/index.js'
import { join } from 'path'

// Default configuration generator for standard repositories
export function getConfig(repoPath: string, docsPath: string, preset?: string): Mdx2MdConfig {
  return {
    preset: preset as any, // Will be undefined for plain markdown, or specific preset
    source: join(repoPath, docsPath),
    output: '../output/default', // Will be overridden by meta.json
    outputMode: 'tree',
    include: ['**/*.mdx', '**/*.md'],
    exclude: ['node_modules/**', '.git/**', '**/meta.json', '**/_*', '**/dist/**', '**/public/**'],
    corePass: {
      stripEsm: preset ? true : false, // Strip ESM for framework-based docs
      frontmatterTitle: true,
      normalizeFences: true,
      groupCodeTabs: preset ? true : false, // Group tabs for framework-based docs
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