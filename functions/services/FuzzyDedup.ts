/**
 * FUZZY DEDUPLICATION - Levenshtein distance + semantic matching
 * Production-ready duplicate detection
 */

export function calculateSimilarity(supplier1, supplier2) {
  // Weighted score: name (60%) + country (20%) + vat (20%)
  const nameScore = levenshteinSimilarity(
    (supplier1.legal_name || '').toLowerCase(),
    (supplier2.legal_name || '').toLowerCase()
  );
  
  const countryMatch = supplier1.country === supplier2.country ? 1.0 : 0.0;
  
  const vatMatch = supplier1.vat_number && supplier2.vat_number
    ? supplier1.vat_number === supplier2.vat_number ? 1.0 : 0.0
    : 0.5; // neutral if one/both missing

  const combined = (nameScore * 0.6) + (countryMatch * 0.2) + (vatMatch * 0.2);
  return Math.min(1.0, combined);
}

function levenshteinSimilarity(str1, str2) {
  const distance = levenshteinDistance(str1, str2);
  const maxLen = Math.max(str1.length, str2.length);
  return maxLen === 0 ? 1.0 : 1.0 - (distance / maxLen);
}

function levenshteinDistance(str1, str2) {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(0));

  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }

  return matrix[str2.length][str1.length];
}

export function findDuplicateCandidates(supplierData, existingSuppliers, threshold = 0.85) {
  return existingSuppliers
    .map(existing => ({
      id: existing.id,
      legal_name: existing.legal_name,
      country: existing.country,
      similarity_score: calculateSimilarity(supplierData, existing),
      vat_match: supplierData.vat_number && existing.vat_number
        ? supplierData.vat_number === existing.vat_number
        : null
    }))
    .filter(candidate => candidate.similarity_score >= threshold)
    .sort((a, b) => b.similarity_score - a.similarity_score);
}