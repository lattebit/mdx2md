# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `pnpm dev` - Run CLI in watch mode
- `pnpm build` - Build the project with TypeScript
- `pnpm typecheck` - Type-check without emitting files
- `pnpm lint` - Run Biome linter
- `pnpm lint:fix` - Fix linting issues automatically

### Testing
- `pnpm test` - Run tests with Vitest
- `pnpm test:watch` - Run tests in watch mode

## Architecture

### Processing Pipeline
The MDX to Markdown conversion follows a multi-layered architecture:

1. **Parser Layer** (`src/parser/`): Unified remark chain for parsing MDX/Markdown
2. **UMR Layer** (`src/umr/`): Unified Markdown Representation - semantic intermediate format
3. **Core Passes** (`src/core/`): Configurable transformations
   - `strip-esm.ts` - Remove ESM imports/exports
   - `expand-includes.ts` - Expand include directives
   - `frontmatter-title.ts` - Extract titles from frontmatter
   - `group-code-tabs.ts` - Group code blocks into tabs
   - `heading-offset.ts` - Adjust heading levels
   - `normalize-fences.ts` - Normalize code fence syntax
   - `normalize-whitespace.ts` - Clean up whitespace
   - `rewrite-links.ts` - Transform MDX links
   - `code-source.ts` - Handle code source references
4. **Preset Layer** (`src/presets/`): Framework-specific component mappings
   - `fumadocs.ts` - Fumadocs components (Callout, Tabs, Cards, etc.)
   - `docusaurus.ts` - Docusaurus container directives
   - `vitepress.ts` - VitePress custom containers
5. **Renderer Layer** (`src/renderer/`): Convert UMR back to Markdown
6. **I/O Layer** (`src/io/`): File scanning and output generation

### Main Entry Points
- `src/index.ts` - Package exports
- `src/cli.ts` - CLI implementation
- `src/transform.ts` - Main transformation function
- `src/processor.ts` - Creates the processing pipeline

### Configuration
Configuration can be provided via:
- CLI arguments
- `mdx2md.config.ts` file
- Programmatic API

The configuration type is defined in `src/types/index.ts` as `Mdx2MdConfig`.