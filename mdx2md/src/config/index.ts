import type { Mdx2MdConfig } from '../types/index.js'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { pathToFileURL } from 'url'

export async function loadConfig(configPath?: string): Promise<Mdx2MdConfig | null> {
  const possiblePaths = configPath ? [configPath] : [
    'mdx2md.config.ts',
    'mdx2md.config.js',
    'mdx2md.config.mjs',
    '.mdx2mdrc.js',
    '.mdx2mdrc.mjs'
  ]
  
  for (const path of possiblePaths) {
    const fullPath = join(process.cwd(), path)
    
    if (existsSync(fullPath)) {
      try {
        if (path.endsWith('.ts')) {
          // For TypeScript config, we'll need tsx or similar to load it
          // For now, just return null and rely on CLI args
          console.warn('TypeScript config files require tsx runtime')
          return null
        }
        
        const fileUrl = pathToFileURL(fullPath).href
        const module = await import(fileUrl)
        return module.default || module.config
      } catch (error) {
        console.error(`Failed to load config from ${path}:`, error)
      }
    }
  }
  
  return null
}

export function mergeConfig(
  base: Partial<Mdx2MdConfig>,
  override: Partial<Mdx2MdConfig>
): Mdx2MdConfig {
  return {
    ...base,
    ...override,
    previewProvider: {
      ...base.previewProvider,
      ...override.previewProvider
    },
    corePass: {
      ...base.corePass,
      ...override.corePass
    },
    renderOptions: {
      ...base.renderOptions,
      ...override.renderOptions
    }
  } as Mdx2MdConfig
}

export function validateConfig(config: Partial<Mdx2MdConfig>): string[] {
  const errors: string[] = []
  
  if (!config.source) {
    errors.push('source directory is required')
  }
  
  if (!config.output) {
    errors.push('output directory is required')
  }
  
  if (config.outputMode && !['tree', 'single'].includes(config.outputMode)) {
    errors.push('outputMode must be either "tree" or "single"')
  }
  
  return errors
}