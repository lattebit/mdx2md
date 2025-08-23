import type { Mdx2MdConfig, VFile } from './types/index.js'
import { scanFiles, writeOutput } from './io/index.js'
import { getPreset } from './presets/index.js'
import { createProcessor } from './processor.js'

export async function transform(config: Mdx2MdConfig): Promise<void> {
  // Get preset
  const presetName = config.preset || 'fumadocs'
  const preset = getPreset(presetName)
  
  // Scan files
  const files = await scanFiles(config)
  console.log(`Found ${files.length} files to process`)
  
  // Create processor
  const processor = createProcessor({ preset, config })
  
  // Process files
  const results: Array<{ relativePath: string; content: string }> = []
  
  for (const file of files) {
    console.log(`Processing: ${file.relativePath}`)
    
    const vfile: VFile = {
      path: file.path,
      contents: file.content,
      data: {
        codeSource: config.codeSource
      }
    }
    
    try {
      const content = await processor(vfile)
      results.push({
        relativePath: file.relativePath,
        content
      })
    } catch (error) {
      console.error(`Error processing ${file.relativePath}:`, error)
    }
  }
  
  // Write output
  writeOutput(results, config)
  console.log(`✓ Processed ${results.length} files`)
}