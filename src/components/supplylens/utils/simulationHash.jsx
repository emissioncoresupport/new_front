/**
 * Deterministic simulation hash generation for client-side UI testing.
 * NOT for actual compliance — strictly for UI review when backend is unavailable.
 */

export function generateSimulationHash(file) {
  if (!file) return 'SIM_HASH_MISSING';
  
  // Deterministic input: filename + size + type
  const input = `${file.name || 'unknown'}|${file.size || 0}|${file.type || 'application/octet-stream'}`;
  
  // Simple string hash (for UI only, not cryptographic)
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Generate a 64-char hex string that looks like SHA256
  const hexPart = Math.abs(hash).toString(16).padStart(16, '0');
  const repeatCount = Math.ceil(64 / hexPart.length);
  return (hexPart.repeat(repeatCount) + input.split('').map(c => c.charCodeAt(0).toString(16)).join('')).substring(0, 64);
}

export function generateSimulatedDigest(seedString) {
  if (!seedString) return 'SIM0000000000000000000000000000000000000000000000000000000000000';
  
  // Simple string hash (for UI only, not cryptographic)
  let hash = 0;
  for (let i = 0; i < seedString.length; i++) {
    const char = seedString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Generate a 64-char hex string that looks like SHA256
  const hexPart = Math.abs(hash).toString(16).padStart(16, '0');
  const repeatCount = Math.ceil(64 / hexPart.length);
  return 'SIM' + (hexPart.repeat(repeatCount)).substring(0, 61);
}