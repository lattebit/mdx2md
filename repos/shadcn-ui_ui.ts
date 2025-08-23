import type { Mdx2MdConfig } from '../src/types'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'

const require = createRequire(import.meta.url)

// Function to generate component mappings from registry
function generateComponentMappings() {
  const components: Record<string, string> = {}
  
  try {
    // Use dynamic require to load the registry
    const registryModule = require('../../../test-docs/shadcn-ui/registry/__index__.tsx')
    const Index = registryModule.Index
    
    if (Index && typeof Index === 'object') {
      // Iterate through all entries in the Index
      for (const [key, entry] of Object.entries(Index)) {
        if (entry && typeof entry === 'object' && 'name' in entry && 'files' in entry) {
          const { name, files } = entry as any
          
          // Get the first file path if available
          if (Array.isArray(files) && files.length > 0 && files[0].path) {
            components[name] = files[0].path
          }
        }
      }
    }
    
    console.log(`Successfully loaded ${Object.keys(components).length} component mappings from registry`)
  } catch (error) {
    console.error('Error loading registry:', error)
  }
  
  return components
}

// Generate the component mappings
const componentMappings = generateComponentMappings()

const config: Mdx2MdConfig = {
  preset: 'fumadocs',
  source: '../../../test-docs/shadcn-ui/content/docs',
  output: '../../../output/shadcn-docs',
  outputMode: 'tree',
  include: ['**/*.mdx', '**/*.md'],
  exclude: ['node_modules/**', '.git/**', '**/meta.json'],
  codeSource: {
    enabled: true,
    baseDir: '../../../test-docs/shadcn-ui',
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

export default config