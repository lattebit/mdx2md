import type { Preset } from '../types/index.js'
import { createPreset } from './base.js'

export const docusaurusPreset: Preset = createPreset({
  name: 'docusaurus',
  transformers: [
    // TODO: Implement Docusaurus-specific transformations
  ],
  corePassDefaults: {
    stripEsm: true,
    frontmatterTitle: true,
    normalizeFences: true,
    groupCodeTabs: true,
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