# Repository Configurations

This directory contains configuration files for repositories to be converted from MDX to Markdown.

## Structure

- `meta.json` - Central configuration file with repository metadata
- `*.ts` - Individual TypeScript configuration files for each repository

## Adding a New Repository

1. **Add repository metadata to `meta.json`:**

```json
{
  "repositories": {
    "your-repo-name": {
      "url": "https://github.com/owner/repo",
      "branch": "main",
      "docsPath": "path/to/docs",
      "configFile": "your-repo-name.ts",
      "outputPath": "output/your-repo-name"
    }
  }
}
```

2. **Create a configuration file `your-repo-name.ts`:**

```typescript
import type { Mdx2MdConfig } from '../mdx2md/src/types/index.js'
import { join } from 'path'

// Required: Export a function that returns the config with dynamic values
export function getConfig(repoPath: string, docsPath: string): Mdx2MdConfig {
  return {
    preset: 'fumadocs',  // or 'docusaurus', 'vitepress'
    source: join(repoPath, docsPath),
    output: 'output/your-repo-name',
    outputMode: 'tree',
    include: ['**/*.mdx', '**/*.md'],
    exclude: ['node_modules/**', '.git/**', '**/meta.json'],
    // Add any custom configuration here
  }
}
```

## Configuration Fields

### meta.json Fields

- `url` - GitHub repository URL
- `branch` - Branch to clone (default: main)
- `docsPath` - Path to documentation directory within the repository
- `configFile` - Name of the TypeScript configuration file
- `outputPath` - Output directory for converted Markdown files

### Config File Options

See the main documentation for all available configuration options.

## Custom Processing

The configuration file exports a `getConfig` function that receives:
- `repoPath`: The path to the cloned repository
- `docsPath`: The documentation directory path from meta.json

This allows you to:
1. Dynamically generate paths based on the cloned repository location
2. Load repository-specific data (like component registries)
3. Customize configuration based on repository contents

Example with custom logic (like shadcn-ui):
```typescript
export function getConfig(repoPath: string, docsPath: string): Mdx2MdConfig {
  // Load repository-specific data
  const componentMappings = loadComponentRegistry(repoPath)
  
  return {
    preset: 'fumadocs',
    source: join(repoPath, docsPath),
    output: 'output/shadcn-ui',
    codeSource: {
      enabled: true,
      baseDir: repoPath,
      components: componentMappings  // Dynamic component mappings
    },
    // ... other config
  }
}
```

This approach keeps the mdx2md package generic while allowing repository-specific extensions.

## Testing Locally

```bash
# Test matrix generation
node scripts/generate-matrix.js

# Process a specific repository
cd mdx2md
pnpm tsx src/cli.ts convert --repo-file ../repos/your-repo-name.ts
```