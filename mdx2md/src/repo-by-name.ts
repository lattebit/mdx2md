import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync, readFileSync } from 'fs'
import { processRepository } from './repo-processor.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export interface ProcessByNameOptions {
  name: string
  clonePath?: string
  keepTemp?: boolean
}

export async function processRepositoryByName(options: ProcessByNameOptions): Promise<void> {
  // Load meta.json
  const metaPath = resolve(dirname(dirname(__dirname)), 'repos', 'meta.json')
  if (!existsSync(metaPath)) {
    throw new Error('repos/meta.json not found')
  }
  
  const metaContent = readFileSync(metaPath, 'utf-8')
  const meta = JSON.parse(metaContent)
  
  // Find repository by name
  const repoInfo = meta.repositories[options.name]
  if (!repoInfo) {
    const availableRepos = Object.keys(meta.repositories).join(', ')
    throw new Error(`Repository '${options.name}' not found. Available repositories: ${availableRepos}`)
  }
  
  // Create a fake config file path that includes the repo name
  // This will be parsed by loadRepoMeta to find the correct repository
  const fakeConfigPath = repoInfo.configFile || `${options.name}.ts`
  
  // Process the repository
  await processRepository({
    configFile: fakeConfigPath,
    clonePath: options.clonePath,
    keepTemp: options.keepTemp
  })
}