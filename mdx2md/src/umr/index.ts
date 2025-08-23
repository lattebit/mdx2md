import type { Node } from 'unist'
import type { Content, Root } from 'mdast'
import type {
  UMRNode,
  UMRKind,
  AdmonitionUMR,
  TabsUMR,
  CodeGroupUMR,
  CardsUMR,
  StepsUMR,
  PreviewUMR,
  IncludeUMR
} from '../types/index.js'

export function createUMRNode(
  kind: UMRKind,
  props: Record<string, any>,
  children?: Content[]
): UMRNode {
  const node: UMRNode = {
    type: 'umr',
    data: {
      umr: {
        kind,
        props
      }
    }
  }
  
  if (children) {
    (node as any).children = children
  }
  
  return node
}

export function isUMRNode(node: Node): node is UMRNode {
  return node.type === 'umr' && node.data?.umr !== undefined
}

export function getUMRKind(node: Node): UMRKind | null {
  if (!isUMRNode(node)) return null
  return node.data.umr.kind
}

export function createAdmonition(
  type: 'note' | 'tip' | 'warning' | 'danger' | 'info',
  title: string | undefined,
  children: Content[]
): AdmonitionUMR {
  return {
    type: 'umr',
    data: {
      umr: {
        kind: 'admonition',
        props: { type, title }
      }
    },
    children
  } as AdmonitionUMR
}

export function createTabs(items: Array<{
  label: string
  value: string
  content: Content[]
}>): TabsUMR {
  return {
    type: 'umr',
    data: {
      umr: {
        kind: 'tabs',
        props: { items }
      }
    }
  } as TabsUMR
}

export function createCodeGroup(items: Array<{
  label: string
  language: string
  code: string
}>): CodeGroupUMR {
  return {
    type: 'umr',
    data: {
      umr: {
        kind: 'code-group',
        props: { items }
      }
    }
  } as CodeGroupUMR
}

export function createCards(items: Array<{
  title: string
  description?: string
  href?: string
}>): CardsUMR {
  return {
    type: 'umr',
    data: {
      umr: {
        kind: 'cards',
        props: { items }
      }
    }
  } as CardsUMR
}

export function createSteps(items: Array<{
  title?: string
  content: Content[]
}>): StepsUMR {
  return {
    type: 'umr',
    data: {
      umr: {
        kind: 'steps',
        props: { items }
      }
    }
  } as StepsUMR
}

export function createPreview(
  name: string,
  options?: {
    description?: string
    align?: 'left' | 'center' | 'right'
    files?: Array<{ path: string; content: string }>
  }
): PreviewUMR {
  return {
    type: 'umr',
    data: {
      umr: {
        kind: 'preview',
        props: {
          name,
          ...options
        }
      }
    }
  } as PreviewUMR
}

export function createInclude(
  path: string,
  expanded?: boolean,
  content?: string
): IncludeUMR {
  return {
    type: 'umr',
    data: {
      umr: {
        kind: 'include',
        props: { path, expanded, content }
      }
    }
  } as IncludeUMR
}

export function createUnknownComponent(
  componentName: string,
  props: Record<string, any>,
  children?: Content[]
): UMRNode {
  return createUMRNode('unknown', { componentName, ...props }, children)
}