import type { Mdx2MdConfig } from '../src/types'

const config: Mdx2MdConfig = {
  preset: 'fumadocs',
  source: '../../../test-docs/nextjs',
  output: '../../../output/nextjs-docs',
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

export default config