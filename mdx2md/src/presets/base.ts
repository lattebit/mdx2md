import type { Preset, Transformer, CorePassConfig, RenderOptions } from '../types/index.js'

export function createPreset(options: {
  name: string
  transformers?: Transformer[]
  corePassDefaults?: Partial<CorePassConfig>
  renderDefaults?: Partial<RenderOptions>
}): Preset {
  return {
    name: options.name,
    transformers: options.transformers || [],
    corePassDefaults: options.corePassDefaults || {},
    renderDefaults: options.renderDefaults || {}
  }
}