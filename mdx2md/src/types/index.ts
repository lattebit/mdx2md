import type { Node } from 'unist'
import type { Root, Content } from 'mdast'

export interface Mdx2MdConfig {
  preset?: string
  source: string
  output: string
  outputMode?: 'tree' | 'single'
  watch?: boolean
  include?: string[]
  exclude?: string[]
  codeSource?: CodeSourceConfig
  corePass?: CorePassConfig
  renderOptions?: RenderOptions
}

export interface CodeSourceConfig {
  enabled: boolean
  baseDir: string
  components: Record<string, string>
}

export interface CorePassConfig {
  codeSource?: boolean
  stripEsm?: boolean
  frontmatterTitle?: boolean
  normalizeFences?: boolean
  groupCodeTabs?: boolean
  headingOffset?: number
  normalizeWhitespace?: boolean
  rewriteLinks?: boolean | LinkRewriteOptions
}

export interface LinkRewriteOptions {
  extensions?: Record<string, string>
  removeExtension?: boolean
}

export interface RenderOptions {
  listMarker?: '-' | '*' | '+'
  listIndent?: 'tab' | 'one' | 'mixed'
  emphasis?: '_' | '*'
  strong?: '__' | '**'
  fence?: '`' | '~'
  fenceLength?: number
  lineWidth?: number
}

export interface ProcessorOptions {
  preset: Preset
  config: Mdx2MdConfig
}

export interface Preset {
  name: string
  transformers: Transformer[]
  corePassDefaults?: Partial<CorePassConfig>
  renderDefaults?: Partial<RenderOptions>
}

export interface Transformer {
  name: string
  phase: 'pre' | 'main' | 'post'
  transform: (tree: Root, file: VFile) => void | Promise<void>
}

export interface VFile {
  path: string
  contents: string
  data: Record<string, any>
}

export interface UMRNode extends Node {
  type: string
  data?: {
    umr?: UMRData
  }
}

export interface UMRData {
  kind: UMRKind
  props?: Record<string, any>
}

export type UMRKind =
  | 'admonition'
  | 'tabs'
  | 'code-group'
  | 'cards'
  | 'steps'
  | 'preview'
  | 'include'
  | 'unknown'

export interface AdmonitionUMR extends UMRNode {
  data: {
    umr: {
      kind: 'admonition'
      props: {
        type: 'note' | 'tip' | 'warning' | 'danger' | 'info'
        title?: string
      }
    }
  }
  children: Content[]
}

export interface TabsUMR extends UMRNode {
  data: {
    umr: {
      kind: 'tabs'
      props: {
        items: Array<{
          label: string
          value: string
          content: Content[]
        }>
      }
    }
  }
}

export interface CodeGroupUMR extends UMRNode {
  data: {
    umr: {
      kind: 'code-group'
      props: {
        items: Array<{
          label: string
          language: string
          code: string
        }>
      }
    }
  }
}

export interface CardsUMR extends UMRNode {
  data: {
    umr: {
      kind: 'cards'
      props: {
        items: Array<{
          title: string
          description?: string
          href?: string
        }>
      }
    }
  }
}

export interface StepsUMR extends UMRNode {
  data: {
    umr: {
      kind: 'steps'
      props: {
        items: Array<{
          title?: string
          content: Content[]
        }>
      }
    }
  }
}

export interface PreviewUMR extends UMRNode {
  data: {
    umr: {
      kind: 'preview'
      props: {
        name: string
        description?: string
        align?: 'left' | 'center' | 'right'
        files?: Array<{
          path: string
          content: string
        }>
      }
    }
  }
}

export interface IncludeUMR extends UMRNode {
  data: {
    umr: {
      kind: 'include'
      props: {
        path: string
        expanded?: boolean
        content?: string
      }
    }
  }
}