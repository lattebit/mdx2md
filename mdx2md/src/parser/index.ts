import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkMdx from 'remark-mdx'
import remarkGfm from 'remark-gfm'
import remarkFrontmatter from 'remark-frontmatter'
import remarkDirective from 'remark-directive'
import type { Root } from 'mdast'
import type { VFile } from '../types/index.js'

export function createParser() {
  return unified()
    .use(remarkParse)
    .use(remarkMdx)
    .use(remarkGfm)
    .use(remarkFrontmatter, ['yaml', 'toml'])
    .use(remarkDirective) // Support ::: container syntax
}

export async function parse(content: string, path?: string): Promise<Root> {
  const parser = createParser()
  const result = await parser.parse(content)
  return result as Root
}

export function parseSync(content: string, path?: string): Root {
  const parser = createParser()
  const result = parser.parse(content)
  return result as Root
}