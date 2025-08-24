# @repo/mdx2md

Universal MDX to Markdown converter for LLM-friendly documentation.

## Features

- 🎯 **Framework Presets**: Built-in support for Fumadocs, Docusaurus, VitePress, and MkDocs
- 🔄 **UMR (Unified Markdown Representation)**: Semantic intermediate representation for consistent output
- 🛠️ **Configurable Passes**: Fine-tune transformation behavior
- 📁 **Flexible Output**: Tree structure or single file output
- 🚀 **CLI & API**: Use as command-line tool or programmatically
- ⚡ **Bun Runtime**: Fast execution with native TypeScript support, no compilation needed

## Prerequisites

- [Bun](https://bun.sh) v1.0 or higher

## Installation

```bash
bun install
```

## Usage

### CLI

```bash
# Convert with default settings
./cli convert --source ./docs --output ./output

# Or using bun run
bun run cli convert --source ./docs --output ./output

# Use specific preset (fumadocs, docusaurus, vitepress, mkdocs)
bun run cli convert --source ./docs --output ./output --preset mkdocs

# Single file output
bun run cli convert --source ./docs --output ./output/combined.md --output-mode single

# Watch mode
bun run cli convert --source ./docs --output ./output --watch

# Initialize config file
bun run cli init
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

### MkDocs
- Admonitions with `///` syntax
- Code blocks with titles and highlighting
- Tab components
- Standard MkDocs extensions

## Development

```bash
# Install dependencies
bun install

# Run tests
bun test

# Type check
bun run typecheck

# Lint
bun run lint

# Development mode with watch
bun run dev
```

## License

MIT