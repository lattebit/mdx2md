#!/usr/bin/env node

import { program } from 'commander'
import { transform } from './transform.js'
import { processRepository } from './repo-processor.js'
import { loadConfig, mergeConfig, validateConfig } from './config/index.js'
import type { Mdx2MdConfig } from './types/index.js'
import { version } from '../package.json' assert { type: 'json' }

program
  .name('mdx2md')
  .description('Universal MDX to Markdown converter for LLM-friendly documentation')
  .version(version)

program
  .command('convert', { isDefault: true })
  .description('Convert MDX files to Markdown')
  .option('-s, --source <dir>', 'Source directory containing MDX files')
  .option('-o, --output <dir>', 'Output directory for converted files')
  .option('-p, --preset <name>', 'Preset to use (fumadocs, docusaurus, vitepress)', 'fumadocs')
  .option('-m, --output-mode <mode>', 'Output mode (tree, single)', 'tree')
  .option('-c, --config <path>', 'Path to config file')
  .option('-w, --watch', 'Watch for file changes')
  .option('--include <patterns...>', 'File patterns to include')
  .option('--exclude <patterns...>', 'File patterns to exclude')
  .option('--repo-file <path>', 'Repository configuration file (.ts)')
  .option('--clone-path <path>', 'Path to cloned repository (skip cloning if provided)')
  .option('--keep-temp', 'Keep temporary clone directory after processing')
  .action(async (options) => {
    try {
      // Handle repository file processing
      if (options.repoFile) {
        await processRepository({
          configFile: options.repoFile,
          clonePath: options.clonePath,
          keepTemp: options.keepTemp
        })
        return
      }
      
      // Load config file if specified
      let fileConfig: Mdx2MdConfig | null = null
      if (options.config) {
        fileConfig = await loadConfig(options.config)
      } else {
        fileConfig = await loadConfig()
      }
      
      // Build config from CLI options
      const cliConfig: Partial<Mdx2MdConfig> = {
        source: options.source,
        output: options.output,
        preset: options.preset,
        outputMode: options.outputMode,
        watch: options.watch,
        include: options.include,
        exclude: options.exclude
      }
      
      // Remove undefined values
      Object.keys(cliConfig).forEach(key => {
        if (cliConfig[key as keyof Mdx2MdConfig] === undefined) {
          delete cliConfig[key as keyof Mdx2MdConfig]
        }
      })
      
      // Merge configs (CLI overrides file)
      const config = fileConfig 
        ? mergeConfig(fileConfig, cliConfig)
        : cliConfig as Mdx2MdConfig
      
      // Validate config
      const errors = validateConfig(config)
      if (errors.length > 0) {
        console.error('Configuration errors:')
        errors.forEach(error => console.error(`  - ${error}`))
        process.exit(1)
      }
      
      // Run transformation
      console.log('Starting MDX to Markdown conversion...')
      console.log(`Source: ${config.source}`)
      console.log(`Output: ${config.output}`)
      console.log(`Preset: ${config.preset || 'fumadocs'}`)
      console.log(`Mode: ${config.outputMode || 'tree'}`)
      
      await transform(config)
      
      if (config.watch) {
        console.log('Watching for changes... (Press Ctrl+C to stop)')
        // Watch implementation would go here
      }
    } catch (error) {
      console.error('Error:', error)
      process.exit(1)
    }
  })

program
  .command('init')
  .description('Initialize a configuration file')
  .action(async () => {
    const { writeFileSync } = await import('fs')
    
    const configTemplate = `import type { Mdx2MdConfig } from '@repo/mdx2md'

const config: Mdx2MdConfig = {
  preset: 'fumadocs',
  source: './docs',
  output: './output',
  outputMode: 'tree',
  include: ['**/*.mdx', '**/*.md'],
  exclude: ['node_modules/**', '.git/**'],
  previewProvider: {
    enabled: false,
    sourceDir: './examples',
    mapping: {}
  },
  corePass: {
    stripEsm: true,
    frontmatterTitle: true,
    normalizeFences: true,
    groupCodeTabs: true,
    normalizeWhitespace: true,
    rewriteLinks: true
  },
  renderOptions: {
    listMarker: '-',
    listIndent: 'one',
    emphasis: '_',
    strong: '**',
    fence: '\`',
    fenceLength: 3
  }
}

export default config
`
    
    writeFileSync('mdx2md.config.ts', configTemplate)
    console.log('✓ Created mdx2md.config.ts')
  })

program.parse()