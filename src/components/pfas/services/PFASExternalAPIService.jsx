import { base44 } from '@/api/base44Client';

/**
 * PFAS External API Service - Production Grade
 * Direct API integration with chemical databases + cross-reference verification
 * 
 * Data Sources:
 * 1. PubChem (NCBI) - Primary chemical identity
 * 2. ChemSpider (RSC) - Verification + additional data
 * 3. ECHA REACH - Regulatory status
 * 4. Cross-reference layer - Validates consistency across sources
 */

export class PFASExternalAPIService {
  
  /**
   * UNIFIED SUBSTANCE LOOKUP - Multi-source verification
   * Fetches from all sources and cross-references before storing
   */
  static async lookupAndStoreSubstance(casNumber) {
    const user = await base44.auth.me();
    const tenantId = user.tenant_id || 'default';
    
    // Check cache (substances updated within 30 days)
    const existing = await base44.entities.PFASSubstance.filter({ cas_number: casNumber });
    
    if (existing.length > 0 && existing[0].last_updated) {
      const lastUpdate = new Date(existing[0].last_updated);
      const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceUpdate < 30) {
        return existing[0];
      }
    }
    
    // Fetch from multiple sources in parallel
    const [pubchemData, chemspiderData, echaData] = await Promise.allSettled([
      this.fetchFromPubChem(casNumber),
      this.fetchFromChemSpider(casNumber),
      this.checkECHAStatus(casNumber)
    ]);
    
    // Extract results
    const pubchem = pubchemData.status === 'fulfilled' ? pubchemData.value : null;
    const chemspider = chemspiderData.status === 'fulfilled' ? chemspiderData.value : null;
    const echa = echaData.status === 'fulfilled' ? echaData.value : null;
    
    // Verify data consistency
    const verification = this.verifyDataConsistency(pubchem, chemspider);
    
    if (!verification.verified) {
      throw new Error(`Data verification failed: ${verification.reason}`);
    }
    
    // Build comprehensive substance record
    const substanceData = {
      tenant_id: tenantId,
      cas_number: casNumber,
      name: verification.consensus_name,
      synonyms: this.mergeSynonyms(pubchem?.synonyms, chemspider?.synonyms),
      pfas_flag: echa?.pfas_restricted || false,
      pfas_definition_basis: echa?.pfas_restricted ? 'ECHA' : 'unknown',
      external_ids: {
        pubchem_cid: pubchem?.pubchem_cid,
        chemspider_id: chemspider?.chemspider_id,
        echa_substance_id: echa?.echa_substance_id
      },
      molecular_formula: verification.consensus_formula,
      molecular_weight: verification.consensus_weight,
      svhc_status: echa?.is_svhc || false,
      restricted_status: echa?.is_restricted || false,
      restriction_date: echa?.restriction_effective_date,
      restriction_threshold_ppm: echa?.restriction_threshold_ppm,
      last_updated: new Date().toISOString(),
      source: 'multi_source_verified',
      verification_metadata: {
        sources_checked: ['PubChem', 'ChemSpider', 'ECHA'],
        verification_score: verification.score,
        consistency_checks: verification.checks
      }
    };
    
    if (existing.length > 0) {
      await base44.entities.PFASSubstance.update(existing[0].id, substanceData);
      return { ...existing[0], ...substanceData };
    } else {
      return await base44.entities.PFASSubstance.create(substanceData);
    }
  }
  
  /**
   * Fetch from PubChem via backend function
   */
  static async fetchFromPubChem(casNumber) {
    try {
      const { data } = await base44.functions.invoke('pubchemAPI', { casNumber });
      return data.found ? data : null;
    } catch (error) {
      console.error('PubChem API failed:', error);
      return null;
    }
  }
  
  /**
   * Fetch from ChemSpider via backend function
   */
  static async fetchFromChemSpider(casNumber) {
    try {
      const { data } = await base44.functions.invoke('chemSpiderAPI', { casNumber });
      return data.found ? data : null;
    } catch (error) {
      console.error('ChemSpider API failed:', error);
      return null;
    }
  }
  
  /**
   * Check ECHA REACH status via backend function
   */
  static async checkECHAStatus(casNumber) {
    try {
      const { data } = await base44.functions.invoke('echaREACHChecker', { casNumber });
      return data;
    } catch (error) {
      console.error('ECHA REACH check failed:', error);
      return null;
    }
  }
  
  /**
   * VERIFICATION LAYER - Cross-reference data from multiple sources
   */
  static verifyDataConsistency(pubchem, chemspider) {
    const checks = [];
    let score = 0;
    
    // Check 1: Both sources found the substance
    if (pubchem && chemspider) {
      checks.push({ check: 'both_sources_found', pass: true });
      score += 40;
    } else if (pubchem || chemspider) {
      checks.push({ check: 'single_source_found', pass: true });
      score += 20;
    } else {
      return { 
        verified: false, 
        reason: 'Substance not found in any database',
        score: 0,
        checks
      };
    }
    
    // Check 2: Molecular formula consistency
    if (pubchem?.molecular_formula && chemspider?.molecular_formula) {
      const formulaMatch = pubchem.molecular_formula === chemspider.molecular_formula;
      checks.push({ check: 'formula_match', pass: formulaMatch });
      if (formulaMatch) score += 30;
    }
    
    // Check 3: Molecular weight consistency (within 0.1%)
    if (pubchem?.molecular_weight && chemspider?.molecular_weight) {
      const weightDiff = Math.abs(pubchem.molecular_weight - chemspider.molecular_weight);
      const weightMatch = weightDiff / pubchem.molecular_weight < 0.001;
      checks.push({ check: 'weight_match', pass: weightMatch });
      if (weightMatch) score += 30;
    }
    
    // Determine consensus values
    const consensus_name = pubchem?.name || chemspider?.name;
    const consensus_formula = pubchem?.molecular_formula || chemspider?.molecular_formula;
    const consensus_weight = pubchem?.molecular_weight || chemspider?.molecular_weight;
    
    return {
      verified: score >= 50, // Require at least 50% confidence
      score,
      checks,
      consensus_name,
      consensus_formula,
      consensus_weight,
      reason: score >= 50 ? 'Data verified across sources' : 'Insufficient data consistency'
    };
  }
  
  /**
   * Merge synonyms from multiple sources, deduplicate
   */
  static mergeSynonyms(pubchemSynonyms = [], chemspiderSynonyms = []) {
    const allSynonyms = [...pubchemSynonyms, ...chemspiderSynonyms];
    const uniqueSynonyms = [...new Set(allSynonyms.map(s => s.toLowerCase()))];
    return uniqueSynonyms.slice(0, 50); // Top 50 unique synonyms
  }
  

}

export default PFASExternalAPIService;