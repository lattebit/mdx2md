import type { Mdx2MdConfig } from './types/index.js'
import { transform } from './transform.js'
import { cloneRepository, cleanupTemp } from './utils/git.js'
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
  configFile: string
  outputPath: string
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
  for (const [key, repoInfo] of Object.entries(meta.repositories)) {
    if ((repoInfo as any).configFile === configFileName) {
      return repoInfo as RepoMeta
    }
  }
  
  return null
}

export async function processRepository(options: RepoProcessOptions): Promise<void> {
  console.log(`Processing repository with config: ${options.configFile}`)
  
  // Load the repository configuration
  const configPath = resolve(options.configFile)
  if (!existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`)
  }
  
  // Load repository metadata from meta.json
  const repoMeta = loadRepoMeta(options.configFile)
  if (!repoMeta) {
    throw new Error(`Repository metadata not found for config: ${options.configFile}`)
  }
  
  // Import the TypeScript config
  const configModule = await import(configPath)
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
    
    // Use the getConfig function
    const adjustedConfig = configModule.getConfig(repoPath, repoMeta.docsPath)
    
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