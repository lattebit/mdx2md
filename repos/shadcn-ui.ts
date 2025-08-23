import type { Mdx2MdConfig } from '../mdx2md/src/types/index.js'
import { createRequire } from 'module'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'
import { existsSync, writeFileSync, readFileSync, unlinkSync } from 'fs'
import { tmpdir } from 'os'

const __filename = fileURLToPath(import.meta.url)

// Function to generate component mappings from registry  
function generateComponentMappings(repoPath: string): Record<string, string> {
  const components: Record<string, string> = {}
  
  try {
    // Also check for examples directory in www registry
    const examplesDir = join(repoPath, 'apps/www/registry/new-york/examples')
    if (existsSync(examplesDir)) {
      const files = readFileSync(join(repoPath, 'apps/www/registry/index.ts'), 'utf-8')
      // Load example components separately since they're not in the v4 registry
      const exampleFiles = execSync(`find ${examplesDir} -name "*-demo.tsx" -o -name "*-example.tsx"`, {
        encoding: 'utf-8'
      }).trim().split('\n').filter(Boolean)
      
      for (const file of exampleFiles) {
        const name = file.split('/').pop()?.replace('.tsx', '') || ''
        if (name) {
          const relativePath = file.replace(repoPath + '/', '')
          components[name] = relativePath
        }
      }
      console.log(`Found ${exampleFiles.length} example components`)
    }
    
    // Create a temporary script that will be run with tsx
    const tempScript = join(tmpdir(), `load-registry-${Date.now()}.mjs`)
    const scriptContent = `
import { createRequire } from 'module'
import Module from 'module'

// Create a custom require that mocks React
const require = createRequire('${join(repoPath, 'package.json').replace(/\\/g, '\\\\')}')

// Override Module._load to mock React
const originalLoad = Module._load
Module._load = function(request, parent, isMain) {
  if (request === 'react' || request.startsWith('react/')) {
    return {
      lazy: () => null,
      createElement: () => null,
      Fragment: null
    }
  }
  if (request.startsWith('@/')) {
    return {}
  }
  try {
    return originalLoad.apply(this, arguments)
  } catch (e) {
    return {}
  }
}

try {
  // Try to load the v4 registry first, then fallback to www registry
  const registryPaths = [
    './apps/v4/registry/__index__.tsx',
    './apps/www/registry/__index__.tsx'
  ]
  
  let registryModule = null
  let loadedPath = ''
  
  for (const path of registryPaths) {
    try {
      registryModule = require(path)
      loadedPath = path
      break
    } catch (e) {
      continue
    }
  }
  
  if (!registryModule) {
    console.log(JSON.stringify({ error: 'Registry module not found' }))
    process.exit(0)
  }
  
  const Index = registryModule.Index
  const components = {}
  
  if (Index && typeof Index === 'object') {
    for (const [key, entry] of Object.entries(Index)) {
      if (entry && typeof entry === 'object' && 'name' in entry && 'files' in entry) {
        const { name, files } = entry
        
        if (Array.isArray(files) && files.length > 0) {
          const file = files[0]
          if (typeof file === 'string') {
            // Add apps/v4 prefix if the path starts with registry/
            components[name] = file.startsWith('registry/') ? 'apps/v4/' + file : file
          } else if (file && typeof file === 'object' && file.path) {
            // Add apps/v4 prefix if the path starts with registry/
            const path = file.path
            components[name] = path.startsWith('registry/') ? 'apps/v4/' + path : path
          }
        }
      }
    }
  }
  
  console.log(JSON.stringify({ components, count: Object.keys(components).length, loadedPath }))
} catch (error) {
  console.log(JSON.stringify({ error: error.message }))
}
`
    
    // Write the temporary script
    writeFileSync(tempScript, scriptContent)
    
    try {
      // Execute the script with tsx
      const result = execSync(`npx tsx ${tempScript}`, {
        cwd: repoPath,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      })
      
      // Parse the result
      const output = JSON.parse(result.trim())
      
      if (output.error) {
        console.log('Error loading registry:', output.error)
        return components
      }
      
      if (output.components) {
        Object.assign(components, output.components)
        console.log(`Successfully loaded ${output.count} component mappings from registry`)
        
        // Log a few examples for debugging
        const sampleKeys = Object.keys(components).slice(0, 5)
        if (sampleKeys.length > 0) {
          console.log('Sample mappings:')
          sampleKeys.forEach(key => {
            console.log(`  ${key} -> ${components[key]}`)
          })
        }
      }
    } finally {
      // Clean up the temporary script
      if (existsSync(tempScript)) {
        unlinkSync(tempScript)
      }
    }
    
  } catch (error) {
    console.error('Error loading registry:', error)
  }
  
  return components
}

// Export a function that returns the config with dynamic values
export function getConfig(repoPath: string, docsPath: string): Mdx2MdConfig {
  // Generate component mappings from the cloned repository
  const componentMappings = generateComponentMappings(repoPath)
  
  return {
    preset: 'fumadocs',
    source: join(repoPath, docsPath),
    output: '../output/shadcn-ui',
    outputMode: 'tree',
    include: ['**/*.mdx', '**/*.md'],
    exclude: ['node_modules/**', '.git/**', '**/meta.json'],
    codeSource: {
      enabled: true,
      baseDir: repoPath,
      components: componentMappings
    },
    corePass: {
      stripEsm: true,
      frontmatterTitle: true,
      normalizeFences: true,
      groupCodeTabs: true,
      normalizeWhitespace: true,
      rewriteLinks: {
        extensions: { '.mdx': '.md' },
        removeExtension: false
      }
    },
    renderOptions: {
      listMarker: '-',
      listIndent: 'one',
      emphasis: '_',
      strong: '**',
      fence: '`',
      fenceLength: 3
    }
  }
}