/**
 * Safely extract attributes from JSX nodes
 */
export function getJsxAttributes(node: any): Record<string, any> {
  const attrs: Record<string, any> = {}
  
  if (!node || !node.attributes) {
    return attrs
  }
  
  // Ensure attributes is an array
  const attributes = Array.isArray(node.attributes) 
    ? node.attributes 
    : (typeof node.attributes[Symbol.iterator] === 'function' 
        ? Array.from(node.attributes) 
        : [])
  
  for (const attr of attributes) {
    if (!attr || attr.type !== 'mdxJsxAttribute') {
      continue
    }
    
    const name = attr.name
    const value = attr.value
    
    if (!name) continue
    
    if (typeof value === 'string') {
      attrs[name] = value
    } else if (value && value.type === 'mdxJsxAttributeValueExpression') {
      if (value.value && typeof value.value === 'string') {
        try {
          // Try to parse as JSON first
          attrs[name] = JSON.parse(value.value)
        } catch {
          // If not JSON, use as string
          attrs[name] = value.value
        }
      }
    } else if (value === null || value === true) {
      attrs[name] = true
    }
  }
  
  // Also check for directive labels
  if (node.label) {
    attrs.label = node.label
  }
  
  return attrs
}