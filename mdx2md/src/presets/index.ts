import type { Preset } from '../types/index.js'
import { fumadocsPreset } from './fumadocs.js'
import { docusaurusPreset } from './docusaurus.js'
import { vitepressPreset } from './vitepress.js'
import { mkdocsPreset } from './mkdocs.js'

export { fumadocsPreset } from './fumadocs.js'
export { docusaurusPreset } from './docusaurus.js'
export { vitepressPreset } from './vitepress.js'
export { mkdocsPreset } from './mkdocs.js'
export { createPreset } from './base.js'

const presets: Record<string, Preset> = {
  fumadocs: fumadocsPreset,
  docusaurus: docusaurusPreset,
  vitepress: vitepressPreset,
  mkdocs: mkdocsPreset
}

export function getPreset(name: string): Preset {
  const preset = presets[name]
  
  if (!preset) {
    throw new Error(`Unknown preset: ${name}. Available presets: ${Object.keys(presets).join(', ')}`)
  }
  
  return preset
}

export function registerPreset(name: string, preset: Preset): void {
  presets[name] = preset
}