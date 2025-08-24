import type { Mdx2MdConfig, VFile } from './types/index.js'
import { scanFiles, writeOutput } from './io/index.js'
import { getPreset } from './presets/index.js'
import { createProcessor } from './processor.js'

// Error detail extraction
interface ErrorDetails {
  type: string
  message: string
  line?: number
  column?: number
  context?: string
  suggestion?: string
  originalError?: any
}

function extractErrorDetails(error: any, file: { content: string; relativePath: string }): ErrorDetails {
  const details: ErrorDetails = {
    type: 'Unknown',
    message: 'Unknown error',
    originalError: error
  }
  
  // Handle different error types
  if (error?.reason) {
    details.message = error.reason
  } else if (error?.message) {
    details.message = error.message
  }
  
  // Extract position information
  if (error?.place || error?.line) {
    details.line = error.place?.line || error.line
    details.column = error.place?.column || error.column || 0
    
    // Get context from source
    if (details.line && file.content) {
      const lines = file.content.split('\n')
      const lineIndex = details.line - 1
      if (lines[lineIndex]) {
        details.context = lines[lineIndex].slice(0, 100) // Limit context length
        if (lines[lineIndex].length > 100) {
          details.context += '...'
        }
      }
    }
  }
  
  // Identify error type and provide suggestions
  if (details.message.includes('Could not parse expression with acorn')) {
    details.type = 'MDX Expression Parse Error'
    details.suggestion = analyzeAcornError(details.context || '', file.content, details.line)
  } else if (details.message.includes('Unexpected character')) {
    details.type = 'Syntax Error'
    details.suggestion = 'Check for special characters that need escaping in MDX'
  } else if (error?.ruleId === 'undefined-reference') {
    details.type = 'Undefined Reference'
    details.suggestion = 'Component or variable is not imported or defined'
  } else if (details.message.includes('Expected a closing tag')) {
    details.type = 'JSX Tag Error'
    details.suggestion = 'Ensure all JSX tags are properly closed'
  } else {
    details.type = error?.source || 'Parse Error'
  }
  
  return details
}

function analyzeAcornError(context: string, content: string, line?: number): string {
  const suggestions: string[] = []
  
  // Check for common problematic patterns
  if (context.includes('{*') && context.includes('*}')) {
    suggestions.push('Found {* ... *} syntax - this is MkDocs include syntax, not MDX')
  }
  
  if (context.match(/\{[^}]*\s+[^}]*\}/)) {
    const match = context.match(/\{([^}]+)\}/)
    if (match && match[1].includes('//')) {
      suggestions.push('Found // comment inside JSX expression - use {/* */} for comments in MDX')
    }
  }
  
  if (context.includes('<!--') && context.includes('{')) {
    suggestions.push('Mixed HTML comments with JSX expressions - this can cause parsing issues')
  }
  
  if (context.match(/\{\.[\w-]+\}/)) {
    suggestions.push('Found {.class} syntax - this might be markdown-it-attrs syntax, not MDX')
  }
  
  if (context.includes('<>') || context.includes('</>')) {
    suggestions.push('React fragments (<></>) might need wrapping or escaping')
  }
  
  // Analyze surrounding context if line is provided
  if (line && content) {
    const lines = content.split('\n')
    const prevLine = lines[line - 2] || ''
    const nextLine = lines[line] || ''
    
    if (prevLine.includes(':::') || nextLine.includes(':::')) {
      suggestions.push('Near container directive (:::) - ensure proper spacing and syntax')
    }
  }
  
  return suggestions.length > 0 
    ? suggestions.join('; ')
    : 'Check for unclosed braces, invalid JavaScript expressions, or special characters'
}

export async function transform(config: Mdx2MdConfig): Promise<void> {
  // Get preset
  const presetName = config.preset || 'fumadocs'
  const preset = getPreset(presetName)
  
  // Scan files
  const files = await scanFiles(config)
  console.log(`Found ${files.length} files to process`)
  
  // Create processor
  const processor = createProcessor({ preset, config })
  
  // Process files
  const results: Array<{ relativePath: string; content: string }> = []
  const errors: Array<{ file: string; error: any }> = []
  
  for (const file of files) {
    console.log(`Processing: ${file.relativePath}`)
    
    const vfile: VFile = {
      path: file.path,
      contents: file.content,
      data: {
        codeSource: config.codeSource
      }
    }
    
    try {
      const content = await processor(vfile)
      results.push({
        relativePath: file.relativePath,
        content
      })
    } catch (error: any) {
      // Extract detailed error information
      const errorDetails = extractErrorDetails(error, file)
      
      // Enhanced error logging
      console.error(`\n❌ Error in ${file.relativePath}:`)
      console.error(`   Type: ${errorDetails.type}`)
      console.error(`   Message: ${errorDetails.message}`)
      
      if (errorDetails.line) {
        console.error(`   Location: Line ${errorDetails.line}, Column ${errorDetails.column}`)
        console.error(`   Context: "${errorDetails.context}"`)
      }
      
      if (errorDetails.suggestion) {
        console.error(`   💡 Suggestion: ${errorDetails.suggestion}`)
      }
      
      errors.push({ file: file.relativePath, error: errorDetails })
      
      // Try to salvage what we can - return original content with detailed error info
      if (config.skipOnError !== false) {
        const warningHeader = `<!--
⚠️ MDX2MD Conversion Error
File: ${file.relativePath}
Error Type: ${errorDetails.type}
Message: ${errorDetails.message}
${errorDetails.line ? `Line: ${errorDetails.line}, Column: ${errorDetails.column}` : ''}
${errorDetails.context ? `Context: ${errorDetails.context}` : ''}
${errorDetails.suggestion ? `💡 Suggestion: ${errorDetails.suggestion}` : ''}
-->\n\n`
        results.push({
          relativePath: file.relativePath,
          content: warningHeader + file.content
        })
      }
    }
  }
  
  // Write output
  writeOutput(results, config)
  
  // Generate error report if there are errors
  if (errors.length > 0) {
    generateErrorReport(errors, config)
  }
  
  // Print summary
  console.log(`\n${'='.repeat(60)}`)
  console.log(`📊 Conversion Summary`)
  console.log(`${'='.repeat(60)}`)
  console.log(`✅ Successfully processed: ${results.length - errors.length} files`)
  
  if (errors.length > 0) {
    console.log(`⚠️  Failed/Partial: ${errors.length} files`)
    if (config.skipOnError !== false) {
      console.log(`   (Original content preserved with warning headers)`)
    }
    
    // Group errors by type
    const errorsByType = new Map<string, number>()
    for (const { error } of errors) {
      const type = error.type || 'Unknown'
      errorsByType.set(type, (errorsByType.get(type) || 0) + 1)
    }
    
    console.log(`\n📋 Error Types:`)
    for (const [type, count] of errorsByType) {
      console.log(`   - ${type}: ${count} occurrences`)
    }
    
    // Show most common error suggestions
    const suggestions = new Set<string>()
    for (const { error } of errors) {
      if (error.suggestion) {
        suggestions.add(error.suggestion)
      }
    }
    
    if (suggestions.size > 0) {
      console.log(`\n💡 Common Issues Found:`)
      let i = 1
      for (const suggestion of suggestions) {
        if (i > 5) break // Limit to top 5 suggestions
        console.log(`   ${i}. ${suggestion}`)
        i++
      }
    }
    
    console.log(`\n📄 Error details saved to: error-report.md`)
  }
  
  console.log(`📁 Total output: ${results.length} files`)
  console.log(`${'='.repeat(60)}`)
}

// Generate detailed error report
function generateErrorReport(errors: Array<{ file: string; error: ErrorDetails }>, config: Mdx2MdConfig): void {
  const reportPath = config.output ? `${config.output}/error-report.md` : 'error-report.md'
  
  let report = `# MDX2MD Conversion Error Report\n\n`
  report += `Generated: ${new Date().toISOString()}\n`
  report += `Total Errors: ${errors.length}\n\n`
  
  // Group errors by type
  const errorsByType = new Map<string, Array<{ file: string; error: ErrorDetails }>>()
  for (const item of errors) {
    const type = item.error.type || 'Unknown'
    if (!errorsByType.has(type)) {
      errorsByType.set(type, [])
    }
    errorsByType.get(type)!.push(item)
  }
  
  // Generate report sections
  for (const [type, items] of errorsByType) {
    report += `## ${type} (${items.length} occurrences)\n\n`
    
    for (const { file, error } of items.slice(0, 10)) { // Limit to 10 per type
      report += `### ${file}\n\n`
      
      if (error.line) {
        report += `- **Location**: Line ${error.line}, Column ${error.column}\n`
      }
      
      if (error.context) {
        report += `- **Context**: \`${error.context}\`\n`
      }
      
      report += `- **Message**: ${error.message}\n`
      
      if (error.suggestion) {
        report += `- **💡 Suggestion**: ${error.suggestion}\n`
      }
      
      report += `\n`
    }
    
    if (items.length > 10) {
      report += `*... and ${items.length - 10} more*\n\n`
    }
  }
  
  // Add solutions section
  report += `## Common Solutions\n\n`
  report += `### MDX Expression Parse Errors\n\n`
  report += `1. **{* ... *} syntax**: This is MkDocs include syntax. Consider using the MkDocs preset or preprocessing.\n`
  report += `2. **{.class} syntax**: This is markdown-it-attrs syntax, not MDX. Remove or escape these.\n`
  report += `3. **// comments in {}**: Use {/* */} for comments in MDX expressions.\n\n`
  
  report += `### Syntax Errors\n\n`
  report += `1. Check for unclosed JSX tags\n`
  report += `2. Escape special characters in JSX: < > { }\n`
  report += `3. Ensure proper spacing around container directives (:::)\n\n`
  
  report += `### Quick Fixes\n\n`
  report += `\`\`\`bash\n`
  report += `# Skip errors and preserve original content\n`
  report += `bun src/cli.ts convert --skip-on-error\n\n`
  report += `# Use a different preset\n`
  report += `bun src/cli.ts convert --preset [fumadocs|vitepress|docusaurus|mkdocs]\n`
  report += `\`\`\`\n`
  
  // Write report file
  const fs = require('fs')
  const path = require('path')
  
  try {
    const dir = path.dirname(reportPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(reportPath, report)
  } catch (e) {
    console.error(`Failed to write error report: ${e}`)
  }
}