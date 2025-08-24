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
  // Extract the directory from the config file path
  const configDir = dirname(configFile)
  const metaPath = resolve(configDir, 'meta.json')
  
  if (!existsSync(metaPath)) {
    console.error(`meta.json not found in ${configDir}`)
    return null
  }
  
  const metaContent = readFileSync(metaPath, 'utf-8')
  const repoMeta = JSON.parse(metaContent) as RepoMeta
  
  return repoMeta
}

export async function processRepository(options: RepoProcessOptions): Promise<void> {
  console.log(`Processing repository with config: ${options.configFile}`)
  
  // Try to load repository metadata from meta.json
  const repoMeta = loadRepoMeta(options.configFile)
  
  // If no metadata found and we have a clone path, use default config directly
  if (!repoMeta && options.clonePath) {
    console.log('No repository metadata found, using default configuration')
    
    if (!existsSync(options.clonePath)) {
      throw new Error(`Clone path does not exist: ${options.clonePath}`)
    }
    
    // Use default config with sensible defaults
    const config = getDefaultConfig(options.clonePath, 'docs', 'fumadocs')
    
    console.log(`Source: ${config.source}`)
    console.log(`Output: ${config.output}`)
    
    // Verify source directory exists
    if (!existsSync(config.source)) {
      // Try common documentation directories
      const possibleDirs = ['docs', '.', 'documentation', 'doc']
      let foundDir = null
      
      for (const dir of possibleDirs) {
        const testPath = join(options.clonePath, dir)
        if (existsSync(testPath)) {
          foundDir = dir
          break
        }
      }
      
      if (foundDir) {
        const adjustedConfig = getDefaultConfig(options.clonePath, foundDir, 'fumadocs')
        console.log(`Adjusted source: ${adjustedConfig.source}`)
        await transform(adjustedConfig)
        console.log(`✓ Successfully processed repository`)
      } else {
        throw new Error(`Source directory not found. Tried: ${possibleDirs.join(', ')}`)
      }
    } else {
      await transform(config)
      console.log(`✓ Successfully processed repository`)
    }
    
    return
  }
  
  if (!repoMeta) {
    throw new Error(`Repository metadata not found for config: ${options.configFile}`)
  }
  
  let configModule: any
  
  // Check if a custom config file is specified
  if (repoMeta.configFile && repoMeta.configFile !== 'default-config.ts') {
    // Config file path is already absolute (passed from repo-by-name.ts)
    const configPath = options.configFile
    if (!existsSync(configPath)) {
      throw new Error(`Config file not found: ${configPath}`)
    }
    // Convert absolute path to file:// URL for dynamic import
    const fileUrl = new URL(`file://${configPath}`).href
    configModule = await import(fileUrl)
  } else {
    // Use the internal default config
    configModule = { getConfig: getDefaultConfig }
  }
  
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