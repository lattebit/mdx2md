import { exec } from 'child_process'
import { promisify } from 'util'
import { mkdtemp, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { existsSync } from 'fs'

const execAsync = promisify(exec)

export interface CloneOptions {
  url: string
  branch?: string
  shallow?: boolean
  targetDir?: string
}

export async function cloneRepository(options: CloneOptions): Promise<string> {
  const targetDir = options.targetDir || await mkdtemp(join(tmpdir(), 'mdx2md-'))
  
  const cloneArgs = [
    'git clone',
    options.shallow !== false ? '--depth 1' : '',
    options.branch ? `-b ${options.branch}` : '',
    `"${options.url}"`,
    `"${targetDir}"`
  ].filter(Boolean).join(' ')
  
  console.log(`Cloning repository: ${options.url}`)
  console.log(`Target directory: ${targetDir}`)
  
  try {
    const { stdout, stderr } = await execAsync(cloneArgs)
    if (stderr && !stderr.includes('Cloning into')) {
      console.warn('Clone warning:', stderr)
    }
    console.log('Repository cloned successfully')
    return targetDir
  } catch (error) {
    console.error('Failed to clone repository:', error)
    throw error
  }
}

export async function cleanupTemp(dir: string): Promise<void> {
  if (!dir.includes('mdx2md-')) {
    console.warn('Skipping cleanup of non-temp directory:', dir)
    return
  }
  
  try {
    if (existsSync(dir)) {
      await rm(dir, { recursive: true, force: true })
      console.log('Cleaned up temporary directory:', dir)
    }
  } catch (error) {
    console.error('Failed to cleanup directory:', dir, error)
  }
}

export function parseRepoUrl(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com[:/]([^/]+)\/([^/.]+)(\.git)?$/)
  if (match) {
    return {
      owner: match[1],
      repo: match[2]
    }
  }
  return null
}