#!/usr/bin/env tsx

import { transform } from '../src/transform.js'
import { existsSync, readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import nextjsConfig from './nextjs-site.config.js'
import shadcnConfig from './shadcn-site.config.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Test configuration interface
interface TestConfig {
  name: string
  config: any
  sampleFiles?: string[]
}

// Define test configurations
const tests: TestConfig[] = [
  {
    name: 'Next.js Documentation',
    config: nextjsConfig,
    sampleFiles: [
      '01-app/01-getting-started/index.md',
      '01-app/02-guides/authentication.md',
      '02-pages/01-getting-started/01-installation.md'
    ]
  },
  {
    name: 'shadcn-ui Documentation',
    config: shadcnConfig,
    sampleFiles: [
      'components/accordion.md',
      'components/alert-dialog.md',
      'components/button.md',
      'installation/next.md'
    ]
  }
]

// Utility function to count files
function countFiles(dir: string, count = 0): number {
  if (!existsSync(dir)) return count
  
  const entries = readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.isDirectory()) {
      count = countFiles(join(dir, entry.name), count)
    } else if (entry.name.endsWith('.md')) {
      count++
    }
  }
  return count
}

// Run tests
async function runTests() {
  console.log('🧪 Running MDX2MD Tests\n')
  console.log('=' .repeat(60))
  
  for (const [index, test] of tests.entries()) {
    console.log(`\n📚 Test ${index + 1}: ${test.name}`)
    console.log('-'.repeat(40))
    
    // Resolve paths relative to examples directory
    const resolvedConfig = {
      ...test.config,
      source: join(__dirname, test.config.source),
      output: join(__dirname, test.config.output)
    }
    
    console.log(`Source: ${resolvedConfig.source}`)
    console.log(`Output: ${resolvedConfig.output}`)
    
    try {
      // Run transformation
      await transform(resolvedConfig)
      
      // Check output
      if (existsSync(resolvedConfig.output)) {
        const files = countFiles(resolvedConfig.output)
        console.log(`✅ Successfully converted ${files} files`)
        
        // Sample output files
        if (test.sampleFiles && test.sampleFiles.length > 0) {
          console.log('\n📄 Sample outputs:')
          for (const file of test.sampleFiles) {
            const path = join(resolvedConfig.output, file)
            if (existsSync(path)) {
              const content = readFileSync(path, 'utf-8')
              console.log(`\n  ${file}:`)
              console.log(`    Size: ${content.length} chars`)
              console.log(`    First line: ${content.split('\n')[0].substring(0, 60)}...`)
              
              // Check for specific conversions
              const hasJSX = content.includes('<') && content.includes('>')
              const hasImports = content.includes('import ')
              console.log(`    JSX removed: ${!hasJSX}`)
              console.log(`    Imports removed: ${!hasImports}`)
            } else {
              console.log(`\n  ${file}: Not found`)
            }
          }
        }
      }
    } catch (error) {
      console.error(`❌ Error: ${error}`)
    }
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('✅ Tests Complete!')
}

// Run the tests
runTests().catch(console.error)