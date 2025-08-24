import type { Preset, Transformer, CorePassConfig, RenderOptions, VFile } from '../types/index.js'
import type { Root } from 'mdast'
import { commonPreprocess } from './common-preprocess.js'

export function createPreset(options: {
  name: string
  transformers?: Transformer[]
  corePassDefaults?: Partial<CorePassConfig>
  renderDefaults?: Partial<RenderOptions>
  skipCommonPreprocess?: boolean // Allow opting out if needed
}): Preset {
  // Add common preprocessing to all presets unless explicitly skipped
  let transformers = options.transformers || []
  
  if (!options.skipCommonPreprocess) {
    transformers = [
      {
        name: 'common-preprocess',
        phase: 'pre' as const,
        transform: (_tree: Root, file: VFile) => commonPreprocess(file)
      },
      ...transformers
    ]
  }
  
  return {
    name: options.name,
    transformers,
    corePassDefaults: options.corePassDefaults || {},
    renderDefaults: options.renderDefaults || {}
  }
}