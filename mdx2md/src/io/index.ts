import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs'
import { join, dirname, relative, basename, extname } from 'path'
import micromatch from 'micromatch'
import type { Mdx2MdConfig } from '../types/index.js'

export interface FileInfo {
  path: string
  relativePath: string
  content: string
}

export async function scanFiles(config: Mdx2MdConfig): Promise<FileInfo[]> {
  const files: FileInfo[] = []
  const { source, include = ['**/*.mdx', '**/*.md'], exclude = ['node_modules/**', '.git/**'] } = config
  
  function scan(dir: string) {
    const entries = readdirSync(dir)
    
    for (const entry of entries) {
      const fullPath = join(dir, entry)
      const relativePath = relative(source, fullPath)
      
      if (micromatch.isMatch(relativePath, exclude)) {
        continue
      }
      
      const stat = statSync(fullPath)
      
      if (stat.isDirectory()) {
        scan(fullPath)
      } else if (stat.isFile() && micromatch.isMatch(relativePath, include)) {
        const content = readFileSync(fullPath, 'utf-8')
        files.push({
          path: fullPath,
          relativePath,
          content
        })
      }
    }
  }
  
  if (existsSync(source)) {
    scan(source)
  } else {
    throw new Error(`Source directory does not exist: ${source}`)
  }
  
  return files
}

export function writeOutput(
  files: Array<{ relativePath: string; content: string }>,
  config: Mdx2MdConfig
): void {
  const { output, outputMode = 'tree' } = config
  
  if (outputMode === 'single') {
    writeSingleFile(files, output)
  } else {
    writeTreeStructure(files, output)
  }
}

function writeSingleFile(
  files: Array<{ relativePath: string; content: string }>,
  outputPath: string
): void {
  const merged: string[] = []
  
  merged.push('# Combined Documentation\n')
  merged.push('This file contains all documentation merged into a single document.\n')
  merged.push('---\n')
  
  for (const file of files) {
    merged.push(`\n## File: ${file.relativePath}\n`)
    merged.push(file.content)
    merged.push('\n---\n')
  }
  
  const dir = dirname(outputPath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  
  writeFileSync(outputPath, merged.join('\n'))
}

function writeTreeStructure(
  files: Array<{ relativePath: string; content: string }>,
  outputDir: string
): void {
  for (const file of files) {
    const outputPath = join(outputDir, file.relativePath.replace(/\.mdx?$/, '.md'))
    const dir = dirname(outputPath)
    
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    
    writeFileSync(outputPath, file.content)
  }
}

export function watchFiles(
  config: Mdx2MdConfig,
  onChange: (file: FileInfo) => void
): void {
  // Implementation would use chokidar here
  // Simplified for now
  console.log('Watch mode not yet implemented')
}