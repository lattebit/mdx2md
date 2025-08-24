import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync, readFileSync } from 'fs'
import { transform } from './transform.js'
import { cloneRepository, cleanupTemp } from './utils/git.js'
import { getConfig as getDefaultConfig } from './config/default-repo-config.js'
import type { Mdx2MdConfig } from './types/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export interface ProcessByNameOptions {
  name: string
  clonePath?: string
  keepTemp?: boolean
}

interface RepoMeta {
  url: string
  branch: string
  docsPath: string
  configFile?: string
  outputPath: string
  preset?: string
}

export async function processRepositoryByName(options: ProcessByNameOptions): Promise<void> {
  console.log(`Processing repository by name: ${options.name}`)
  
  // Load meta.json - go up from src to project root
  const metaPath = resolve(dirname(dirname(__dirname)), 'repos', 'meta.json')
  if (!existsSync(metaPath)) {
    throw new Error('repos/meta.json not found')
  }
  
  const metaContent = readFileSync(metaPath, 'utf-8')
  const meta = JSON.parse(metaContent)
  
  // Find repository by name
  const repoInfo: RepoMeta = meta.repositories[options.name]
  if (!repoInfo) {
    const availableRepos = Object.keys(meta.repositories).join(', ')
    throw new Error(`Repository '${options.name}' not found. Available repositories: ${availableRepos}`)
  }
  
  // If it has a custom config file, delegate to processRepository
  if (repoInfo.configFile) {
    const { processRepository } = await import('./repo-processor.js')
    await processRepository({
      configFile: repoInfo.configFile,
      clonePath: options.clonePath,
      keepTemp: options.keepTemp
    })
    return
  }
  
  // Handle repositories without custom config
  let repoPath: string
  let shouldCleanup = false
  
  if (options.clonePath && existsSync(options.clonePath)) {
    // Use provided clone path
    repoPath = options.clonePath
    console.log(`Using existing repository at: ${repoPath}`)
  } else {
    // Clone the repository
    console.log(`Cloning repository: ${repoInfo.url} (branch: ${repoInfo.branch})`)
    repoPath = await cloneRepository({
      url: repoInfo.url,
      branch: repoInfo.branch,
      shallow: true
    })
    shouldCleanup = !options.keepTemp
  }
  
  try {
    // Use the default config
    const config: Mdx2MdConfig = getDefaultConfig(repoPath, repoInfo.docsPath, repoInfo.preset)
    
    console.log(`Default output: ${config.output}`)
    console.log(`Repo outputPath: ${repoInfo.outputPath}`)
    
    // Override output path from meta.json if specified
    if (repoInfo.outputPath) {
      config.output = repoInfo.outputPath
    }
    
    console.log(`Source: ${config.source}`)
    console.log(`Final output: ${config.output}`)
    
    // Verify source directory exists
    if (!existsSync(config.source)) {
      throw new Error(`Source directory not found: ${config.source}`)
    }
    
    // Run the transformation
    await transform(config)
    
    console.log(`✓ Successfully processed repository ${options.name} from ${repoInfo.url}`)
  } finally {
    // Cleanup temporary directory if needed
    if (shouldCleanup && repoPath.includes('mdx2md-')) {
      await cleanupTemp(repoPath)
    }
  }
}