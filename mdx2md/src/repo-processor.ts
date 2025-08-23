import type { Mdx2MdConfig } from './types/index.js'
import { transform } from './transform.js'
import { cloneRepository, cleanupTemp } from './utils/git.js'
import { getConfig as getDefaultConfig } from './config/default-repo-config.js'
import { join, resolve, dirname, basename } from 'path'
import { fileURLToPath } from 'url'
import { existsSync, readFileSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export interface RepoProcessOptions {
  configFile: string
  clonePath?: string
  keepTemp?: boolean
}

interface RepoMeta {
  url: string
  branch: string
  docsPath: string
  configFile?: string // Optional, defaults to 'default-config.ts'
  outputPath: string
  preset?: string
}

function loadRepoMeta(configFile: string): RepoMeta | null {
  // Load meta.json
  const metaPath = resolve(dirname(dirname(__dirname)), 'repos', 'meta.json')
  if (!existsSync(metaPath)) {
    console.error('repos/meta.json not found')
    return null
  }
  
  const metaContent = readFileSync(metaPath, 'utf-8')
  const meta = JSON.parse(metaContent)
  
  // Find repository info by config file
  const configFileName = basename(configFile)
  
  // First try to match by explicit configFile
  for (const [key, repoInfo] of Object.entries(meta.repositories)) {
    if ((repoInfo as any).configFile === configFileName) {
      return repoInfo as RepoMeta
    }
  }
  
  // Then try to match by repository name (for default configs)
  const nameFromFile = configFileName.replace('.ts', '')
  if (meta.repositories[nameFromFile]) {
    return meta.repositories[nameFromFile] as RepoMeta
  }
  
  return null
}

export async function processRepository(options: RepoProcessOptions): Promise<void> {
  console.log(`Processing repository with config: ${options.configFile}`)
  
  // Load repository metadata from meta.json
  const repoMeta = loadRepoMeta(options.configFile)
  if (!repoMeta) {
    throw new Error(`Repository metadata not found for config: ${options.configFile}`)
  }
  
  let configModule: any
  
  // Check if a custom config file is specified
  if (repoMeta.configFile && repoMeta.configFile !== 'default-config.ts') {
    const configPath = resolve(dirname(dirname(__dirname)), 'repos', repoMeta.configFile)
    if (!existsSync(configPath)) {
      throw new Error(`Config file not found: ${configPath}`)
    }
    configModule = await import(configPath)
  } else {
    // Use the internal default config
    configModule = { getConfig: getDefaultConfig }
  }
  
  const config: Mdx2MdConfig = configModule.default
  
  let repoPath: string
  let shouldCleanup = false
  
  if (options.clonePath && existsSync(options.clonePath)) {
    // Use provided clone path
    repoPath = options.clonePath
    console.log(`Using existing repository at: ${repoPath}`)
  } else {
    // Clone the repository
    console.log(`Cloning repository: ${repoMeta.url} (branch: ${repoMeta.branch})`)
    repoPath = await cloneRepository({
      url: repoMeta.url,
      branch: repoMeta.branch,
      shallow: true
    })
    shouldCleanup = !options.keepTemp
  }
  
  try {
    // Check if the config module exports a getConfig function
    if (!configModule.getConfig || typeof configModule.getConfig !== 'function') {
      throw new Error(`Config file ${options.configFile} must export a getConfig function`)
    }
    
    // Use the getConfig function with preset from meta.json if available
    const adjustedConfig = configModule.getConfig(repoPath, repoMeta.docsPath, repoMeta.preset)
    
    // Override output path from meta.json if specified
    if (repoMeta.outputPath) {
      adjustedConfig.output = repoMeta.outputPath
    }
    
    console.log(`Source: ${adjustedConfig.source}`)
    console.log(`Output: ${adjustedConfig.output}`)
    
    // Verify source directory exists
    if (!existsSync(adjustedConfig.source)) {
      throw new Error(`Source directory not found: ${adjustedConfig.source}`)
    }
    
    // Run the transformation
    await transform(adjustedConfig)
    
    console.log(`✓ Successfully processed repository from ${repoMeta.url}`)
  } finally {
    // Cleanup temporary directory if needed
    if (shouldCleanup && repoPath.includes('mdx2md-')) {
      await cleanupTemp(repoPath)
    }
  }
}