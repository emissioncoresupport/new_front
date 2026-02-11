/**
 * MappingEngine.js
 * AI-driven entity mapping engine for SupplyLens Contract 2
 */

export const mappingEngine = {
  AUTO_APPROVE_THRESHOLD: 0.92,
  HIGH_CONFIDENCE_THRESHOLD: 0.85,
  MEDIUM_CONFIDENCE_THRESHOLD: 0.70,

  learnFromApprovedMappings(approvedMappings) {
    return [
      { attribute: 'vat_number', weight: 0.95, matchType: 'EXACT' },
      { attribute: 'legal_name', weight: 0.85, matchType: 'FUZZY' },
      { attribute: 'country_code', weight: 0.60, matchType: 'EXACT' },
      { attribute: 'sku_code', weight: 0.90, matchType: 'EXACT' },
      { attribute: 'product_name', weight: 0.75, matchType: 'SEMANTIC' },
      { attribute: 'supplier_id_external', weight: 0.88, matchType: 'EXACT' },
      { attribute: 'email', weight: 0.82, matchType: 'EXACT' }
    ];
  },

  calculateSimilarity(str1, str2, matchType) {
    if (!str1 || !str2) return 0;

    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    if (matchType === 'EXACT') {
      return s1 === s2 ? 1.0 : 0.0;
    }

    if (matchType === 'FUZZY') {
      const maxLen = Math.max(s1.length, s2.length);
      if (maxLen === 0) return 1.0;
      
      const distance = this.levenshteinDistance(s1, s2);
      return 1 - distance / maxLen;
    }

    if (matchType === 'SEMANTIC') {
      const tokens1 = new Set(s1.split(/\s+/));
      const tokens2 = new Set(s2.split(/\s+/));
      const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
      const union = new Set([...tokens1, ...tokens2]);
      return intersection.size / union.size;
    }

    return 0;
  },

  levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  },

  async generateSuggestions(evidence, existingEntities, patterns) {
    const suggestions = [];
    const claims = evidence.claims || evidence.summary_fields || {};
    
    for (const entity of existingEntities) {
      const matchScore = this.calculateMatchScore(claims, entity, patterns);
      
      if (matchScore.score > this.MEDIUM_CONFIDENCE_THRESHOLD) {
        suggestions.push({
          suggestion_id: `SUG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          source_type: 'EVIDENCE',
          source_id: evidence.record_id,
          source_name: claims.supplier_name || claims.sku_name || claims.name || 'Unknown',
          target_type: entity.type,
          target_id: entity.entity_id,
          target_name: entity.name,
          confidence_score: matchScore.score,
          reasoning: matchScore.reasoning,
          matched_attributes: matchScore.matchedAttributes,
          auto_approve_eligible: matchScore.score >= this.AUTO_APPROVE_THRESHOLD,
          evidence_refs: [evidence.record_id],
          status: 'PENDING'
        });
      }
    }

    if (suggestions.length === 0 || suggestions[0].confidence_score < this.HIGH_CONFIDENCE_THRESHOLD) {
      suggestions.push({
        suggestion_id: `SUG-NEW-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        source_type: 'EVIDENCE',
        source_id: evidence.record_id,
        source_name: claims.supplier_name || claims.sku_name || 'New Entity',
        target_type: this.inferEntityType(evidence),
        target_id: undefined,
        target_name: undefined,
        confidence_score: 0.75,
        reasoning: 'No high-confidence match found. Suggest creating new entity.',
        matched_attributes: [],
        auto_approve_eligible: false,
        evidence_refs: [evidence.record_id],
        status: 'PENDING'
      });
    }

    return suggestions.sort((a, b) => b.confidence_score - a.confidence_score);
  },

  calculateMatchScore(claims, entity, patterns) {
    let totalScore = 0;
    let totalWeight = 0;
    const matchedAttributes = [];
    const reasons = [];

    for (const pattern of patterns) {
      const claimValue = claims[pattern.attribute];
      const entityValue = entity.canonical_fields?.[pattern.attribute] || entity[pattern.attribute];

      if (claimValue && entityValue) {
        const similarity = this.calculateSimilarity(
          String(claimValue),
          String(entityValue),
          pattern.matchType
        );

        if (similarity > 0.7) {
          totalScore += similarity * pattern.weight;
          totalWeight += pattern.weight;
          matchedAttributes.push(pattern.attribute);
          reasons.push(`${pattern.attribute} match: ${(similarity * 100).toFixed(0)}%`);
        }
      }
    }

    const finalScore = totalWeight > 0 ? totalScore / totalWeight : 0;

    return {
      score: finalScore,
      reasoning: reasons.length > 0 ? reasons.join(', ') : 'No significant matches found',
      matchedAttributes
    };
  },

  inferEntityType(evidence) {
    const dataset = evidence.dataset_type || '';
    
    if (dataset.includes('SUPPLIER')) return 'SUPPLIER';
    if (dataset.includes('SKU') || dataset.includes('PRODUCT')) return 'SKU';
    if (dataset.includes('BOM')) return 'BOM';
    
    return 'SUPPLIER';
  },

  async autoApproveMappings(suggestions, demoStore) {
    const approved = [];
    const needsReview = [];

    for (const suggestion of suggestions) {
      if (suggestion.auto_approve_eligible && suggestion.target_id) {
        suggestion.status = 'AUTO_APPROVED';
        
        const evidence = demoStore.getEvidenceByRecordId(suggestion.source_id);
        if (evidence) {
          if (!evidence.linked_entities) {
            evidence.linked_entities = [];
          }
          evidence.linked_entities.push({
            type: suggestion.target_type,
            id: suggestion.target_id
          });
        }

        demoStore.addDecision({
          decision_type: 'AUTO_MAPPING',
          actor: 'SYSTEM_AI',
          reason_code: 'HIGH_CONFIDENCE_AUTO_APPROVE',
          comment: `Auto-approved: ${suggestion.reasoning}`,
          evidence_refs: suggestion.evidence_refs,
          entity_refs: [suggestion.target_id]
        });

        demoStore.addAuditEvent({
          event_type: 'MAPPING_AUTO_APPROVED',
          object_type: 'mapping_suggestion',
          object_id: suggestion.suggestion_id,
          actor: 'SYSTEM_AI',
          metadata: {
            confidence: suggestion.confidence_score,
            target_entity: suggestion.target_id
          }
        });

        approved.push(suggestion);
      } else {
        suggestion.status = 'PENDING';
        
        demoStore.createWorkItem({
          type: 'MAPPING',
          priority: suggestion.confidence_score > this.HIGH_CONFIDENCE_THRESHOLD ? 'MEDIUM' : 'HIGH',
          title: `Map ${suggestion.source_name} to ${suggestion.target_type}`,
          required_action_text: `Review AI suggestion: ${suggestion.reasoning}`,
          linked_evidence_record_ids: suggestion.evidence_refs
        });

        needsReview.push(suggestion);
      }
    }

    return { approved, needsReview };
  },

  async processBatchMappings(demoStore) {
    const evidence = demoStore.listEvidence();
    const entities = [
      ...demoStore.listEntities('SUPPLIER'),
      ...demoStore.listEntities('SKU'),
      ...demoStore.listEntities('BOM')
    ];

    const approvedMappings = demoStore.listDecisions().filter(
      d => d.decision_type === 'CANONICAL_SOURCE' || d.decision_type === 'MAPPING_APPROVED'
    );
    const patterns = this.learnFromApprovedMappings(approvedMappings);

    const unmappedEvidence = evidence.filter(e => 
      !e.linked_entities || e.linked_entities.length === 0
    );

    let allSuggestions = [];

    for (const ev of unmappedEvidence) {
      const suggestions = await this.generateSuggestions(ev, entities, patterns);
      allSuggestions = [...allSuggestions, ...suggestions];
    }

    const { approved, needsReview } = await this.autoApproveMappings(allSuggestions, demoStore);

    return {
      total: allSuggestions.length,
      autoApproved: approved.length,
      needsReview: needsReview.length,
      suggestions: allSuggestions
    };
  }
};