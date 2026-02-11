/**
 * Client-side payload hash utility
 * Used to detect if Step 1 declaration changed since last save
 */

export function hashDeclaration(declaration) {
  // Create a stable string representation
  const stable = JSON.stringify(declaration, Object.keys(declaration).sort());
  
  // Simple hash (djb2)
  let hash = 5381;
  for (let i = 0; i < stable.length; i++) {
    hash = ((hash << 5) + hash) + stable.charCodeAt(i);
  }
  
  return hash.toString(36);
}