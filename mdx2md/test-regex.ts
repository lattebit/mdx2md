#!/usr/bin/env bun

const testContent = `# Test

Some text

{* ../../docs_src/behind_a_proxy/tutorial001.py hl[6] *}

More text

{*
  ../../docs_src/test.py
  hl[1:5]
*}

End`

console.log('=== Original ===')
console.log(testContent)

console.log('\n=== Testing single-line regex ===')
const regex1 = /\{\*\s+(.*?)\s+\*\}/g
const matches1 = testContent.match(regex1)
console.log('Matches:', matches1)

const result1 = testContent.replace(regex1, '')
console.log('\n=== After replacement ===')
console.log(result1)
console.log('Still has {*?', result1.includes('{*'))

console.log('\n=== Testing multiline regex ===')
const regex2 = /\{\*[\s\S]*?\*\}/g
const matches2 = testContent.match(regex2)
console.log('Matches:', matches2)

const result2 = testContent.replace(regex2, '')
console.log('\n=== After multiline replacement ===')
console.log(result2)
console.log('Still has {*?', result2.includes('{*'))