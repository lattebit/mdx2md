#!/usr/bin/env bun

import { commonPreprocess } from './src/presets/common-preprocess.js'

const testContent = `# Test File

Some text here

{* ../../docs_src/behind_a_proxy/tutorial001.py hl[6] *}

More text

{* ../../docs_src/behind_a_proxy/tutorial001.py hl[8] *}

End of file`

const file = {
  contents: testContent,
  path: 'test.md'
} as any

console.log('=== BEFORE PREPROCESSING ===')
console.log(file.contents)

commonPreprocess(file)

console.log('\n=== AFTER PREPROCESSING ===')
console.log(file.contents)

// Test the regex directly
const regex = /\{\*\s+(.*?)\s+\*\}/g
const matches = testContent.matchAll(regex)
console.log('\n=== REGEX MATCHES ===')
for (const match of matches) {
  console.log('Match:', match[0])
  console.log('Captured:', match[1])
}