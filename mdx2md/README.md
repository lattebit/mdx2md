# @repo/mdx2md

Universal MDX to Markdown converter for LLM-friendly documentation.

## Features

- 🎯 **Framework Presets**: Built-in support for Fumadocs, Docusaurus, and VitePress
- 🔄 **UMR (Unified Markdown Representation)**: Semantic intermediate representation for consistent output
- 🛠️ **Configurable Passes**: Fine-tune transformation behavior
- 📁 **Flexible Output**: Tree structure or single file output
- 🚀 **CLI & API**: Use as command-line tool or programmatically

## Installation

```bash
pnpm add @repo/mdx2md
```

## Usage

### CLI

```bash
# Convert with default settings
npx mdx2md --source ./docs --output ./output

# Use specific preset
npx mdx2md --source ./docs --output ./output --preset fumadocs

# Single file output
npx mdx2md --source ./docs --output ./output/combined.md --output-mode single

# Initialize config file
npx mdx2md init
```

### Programmatic API

```typescript
import { transform } from '@repo/mdx2md'

await transform({
  preset: 'fumadocs',
  source: './docs',
  output: './output',
  outputMode: 'tree'
})
```

### Configuration File

Create `mdx2md.config.ts`:

```typescript
import type { Mdx2MdConfig } from '@repo/mdx2md'

const config: Mdx2MdConfig = {
  preset: 'fumadocs',
  source: './docs',
  output: './output',
  outputMode: 'tree',
  include: ['**/*.mdx', '**/*.md'],
  exclude: ['node_modules/**'],
  previewProvider: {
    enabled: true,
    sourceDir: './examples',
    mapping: {
      'button-demo': 'components/button.tsx'
    }
  }
}

export default config
```

## Architecture

The package follows the architecture defined in `docs/compile-mdx.md`:

1. **Parser Layer**: Unified remark chain for MDX/Markdown parsing
2. **UMR Layer**: Semantic representation for framework-agnostic processing
3. **Core Passes**: Configurable transformations (ESM stripping, frontmatter, etc.)
4. **Preset Layer**: Framework-specific component mappings
5. **Renderer Layer**: UMR to Markdown conversion
6. **I/O Layer**: File scanning and output generation

## Presets

### Fumadocs
- Handles: `<Callout>`, `<Tabs>`, `<Cards>`, `<Steps>`, `<Preview>`, etc.
- Full support for Next.js and shadcn-ui documentation

### Docusaurus
- Container directives
- Admonitions
- Code tabs

### VitePress
- Custom containers
- Code groups
- Component embedding

## Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Build
pnpm build

# Development mode
pnpm dev
```

## License

MIT