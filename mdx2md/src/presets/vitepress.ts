import type { Preset } from '../types/index.js'
import { createPreset } from './base.js'

export const vitepressPreset: Preset = createPreset({
  name: 'vitepress',
  transformers: [
    // TODO: Implement VitePress-specific transformations
  ],
  corePassDefaults: {
    stripEsm: true,
    frontmatterTitle: true,
    normalizeFences: true,
    groupCodeTabs: false, // VitePress uses different syntax
    normalizeWhitespace: true,
    rewriteLinks: true
  },
  renderDefaults: {
    listMarker: '-',
    listIndent: 'one',
    emphasis: '_',
    strong: '**',
    fence: '`',
    fenceLength: 3
  }
})