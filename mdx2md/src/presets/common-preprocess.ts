import type { VFile } from '../types/index.js'

/**
 * Common preprocessing rules to fix MDX parsing issues
 * These rules are applied before the MDX parser runs
 */
export function commonPreprocess(file: VFile): void {
  if (typeof file.contents !== 'string') return
  
  let content = file.contents
  
  // 1. Handle {* ... *} include syntax (MkDocs, FastAPI docs)
  // Remove entirely to avoid MDX parsing issues - handles multiline patterns
  content = content.replace(/\{\*[\s\S]*?\*\}/g, '')
  
  // 2. Fix self-closing img tags - convert <img src="..."> to <img src="..." />
  content = content.replace(/<img([^>]*[^/])>/g, '<img$1 />')
  
  // 3. Handle {.class} attribute syntax (markdown-it-attrs)
  // Convert [text](url){.class target=_blank} to [text](url)
  content = content.replace(/(\[.*?\]\(.*?\))\{[^}]+\}/g, '$1')
  
  // 4. Fix problematic content in HTML tags
  // Fix <abbr> tags with problematic content
  content = content.replace(/<abbr([^>]*)>(.*?)<\/abbr>/g, (match, attrs, inner) => {
    // If the inner content has backticks or other problematic chars, escape them
    if (inner.includes('`') || inner.includes('<') || inner.includes('>')) {
      return `<abbr${attrs}>${inner.replace(/`/g, '\\`').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</abbr>`
    }
    return match
  })
  
  // 5. Fix version numbers in dependency lists that confuse MDX
  // Match patterns like >=0.23.0,<0.29.0 and escape them in certain contexts
  content = content.replace(/(\s)(>=?|<=?|~=?|==?)(\d+\.\d+\.\d+[^,\s]*),?(<|>|<=|>=)?(\d+\.\d+\.\d+)?(\s)/g, (match) => {
    // Only escape if not already in a code block or inline code
    return ` \`${match.trim()}\` `
  })
  
  // 5. Handle Jinja2/Liquid template syntax - remove entirely
  // These cause too many issues in MDX parsing
  content = content.replace(/\{%[\s\S]*?%\}/g, '')
  content = content.replace(/\{\{\s*(.*?)\s*\}\}/g, (match, inner) => `\`${inner}\``)
  
  // 6. Convert specific HTML comments to MDX comments
  // Only convert single-line HTML comments that might cause issues
  content = content.replace(/^<!--\s*(sponsors|contributors|backers)\s*-->$/gm, '{/* $1 */}')
  
  // 7. Fix // comments inside JSX expressions
  // Replace {// comment} with {/* comment */}
  content = content.replace(/\{([^}]*\/\/[^}]*)\}/g, (match, inner) => {
    if (inner.includes('//')) {
      const fixed = inner.replace(/\/\/(.*)$/m, '/* $1 */')
      return `{${fixed}}`
    }
    return match
  })
  
  // 5. Escape problematic JSX-like syntax that's not meant to be JSX
  // For example: <> in plain text contexts
  content = content.replace(/([^`])<>([^`])/g, '$1\\<\\>$2')
  content = content.replace(/([^`])<\/>([^`])/g, '$1\\</\\>$2')
  
  // 6. Fix common typos in JSX closing tags
  // <Component> ... <Component/> should be </Component>
  content = content.replace(/<(\w+)([^>]*)>[\s\S]*?<\1\/>/g, (match, tag) => {
    // Check if this looks like a typo (missing /)
    const corrected = match.replace(new RegExp(`<${tag}/>`, 'g'), `</${tag}>`)
    return corrected
  })
  
  // 7. Handle special characters in code fence info strings
  // ```js {1,3-5} should become ```js
  content = content.replace(/^```(\w+)\s*\{[^}]+\}/gm, '```$1')
  
  // 8. Fix unclosed braces in text (common in documentation)
  // Detect patterns like "use {" without closing
  const lines = content.split('\n')
  let braceDepth = 0
  let inCodeBlock = false
  let inJsx = false
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // Track code blocks
    if (line.startsWith('```')) {
      inCodeBlock = !inCodeBlock
      continue
    }
    
    if (inCodeBlock) continue
    
    // Count braces
    for (const char of line) {
      if (char === '{') braceDepth++
      if (char === '}') braceDepth--
    }
    
    // If we have unclosed braces at end of line, escape them
    if (braceDepth > 0 && !line.includes('</') && !line.includes('/>')) {
      lines[i] = line.replace(/\{/g, '\\{')
      braceDepth = 0
    }
  }
  
  content = lines.join('\n')
  
  // 9. Handle @mention syntax that might confuse JSX parser
  // @[text](url) is sometimes used in docs
  content = content.replace(/@\[([^\]]+)\]\(([^)]+)\)/g, '[@$1]($2)')
  
  // 10. Fix tab/space mixing in JSX (can cause parse errors)
  // Normalize tabs to spaces in JSX blocks
  content = content.replace(/(<[^>]+>)[\t]+/g, '$1  ')
  
  file.contents = content
}

/**
 * Analyze content for potential MDX issues and return warnings
 */
export function analyzeMdxIssues(content: string): string[] {
  const issues: string[] = []
  
  // Check for {* *} syntax
  if (content.includes('{*') && content.includes('*}')) {
    issues.push('Contains {* ... *} include syntax - will be converted to comments')
  }
  
  // Check for {.class} syntax
  if (/\]\([^)]+\)\{[^}]+\}/.test(content)) {
    issues.push('Contains markdown-it-attrs syntax {.class} - will be removed')
  }
  
  // Check for // comments in potential JSX
  if (/\{[^}]*\/\/[^}]*\}/.test(content)) {
    issues.push('Contains // comments in JSX expressions - will be converted to /* */')
  }
  
  // Check for unclosed JSX tags
  const openTags = content.match(/<(\w+)[^>]*>/g) || []
  const closeTags = content.match(/<\/(\w+)>/g) || []
  
  const openTagCounts = new Map<string, number>()
  const closeTagCounts = new Map<string, number>()
  
  for (const tag of openTags) {
    const name = tag.match(/<(\w+)/)?.[1]
    if (name) {
      openTagCounts.set(name, (openTagCounts.get(name) || 0) + 1)
    }
  }
  
  for (const tag of closeTags) {
    const name = tag.match(/<\/(\w+)/)?.[1]
    if (name) {
      closeTagCounts.set(name, (closeTagCounts.get(name) || 0) + 1)
    }
  }
  
  for (const [tag, count] of openTagCounts) {
    const closeCount = closeTagCounts.get(tag) || 0
    if (count !== closeCount) {
      issues.push(`Mismatched JSX tags: <${tag}> (${count} open, ${closeCount} close)`)
    }
  }
  
  return issues
}