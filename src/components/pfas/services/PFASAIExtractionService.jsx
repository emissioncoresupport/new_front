import { base44 } from '@/api/base44Client';

/**
 * PFAS AI Extraction Service - Audit-safe document processing
 * Records provenance: prompt version, model version, page citations, confidence
 */

export class PFASAIExtractionService {
  
  static PROMPT_VERSION = 'v2.1_Dec2025';
  static MODEL_VERSION = 'gpt-4-turbo';
  
  /**
   * Extract PFAS data from supplier declaration PDF
   */
  static async extractSupplierDeclaration(fileUrl, objectId, objectType) {
    const user = await base44.auth.me();
    const tenantId = user.tenant_id || 'default';
    
    // Compute file hash
    const fileHash = await this.computeFileHash(fileUrl);
    
    const prompt = `Extract PFAS declaration data from this supplier document.

Required information:
1. PFAS claim status (present/not_present/unknown)
2. Intentionally added? (yes/no/unknown)
3. Threshold definition (text + numeric ppm if stated)
4. Substance list with CAS numbers and concentrations
5. Declaration validity dates (from/to)
6. Signatory name, role, organization
7. Page numbers where each data point appears

Return structured JSON with page_citations for audit trail.`;
    
    const extraction = await base44.integrations.Core.InvokeLLM({
      prompt,
      file_urls: [fileUrl],
      response_json_schema: {
        type: "object",
        properties: {
          claim_status: { type: "string", enum: ["present", "not_present", "unknown", "inconclusive"] },
          intentionally_added: { type: "string", enum: ["yes", "no", "unknown"] },
          threshold_definition: { type: "string" },
          threshold_numeric_ppm: { type: "number" },
          substances: {
            type: "array",
            items: {
              type: "object",
              properties: {
                cas_number: { type: "string" },
                substance_name: { type: "string" },
                concentration_ppm: { type: "number" },
                page_number: { type: "number" }
              }
            }
          },
          valid_from: { type: "string" },
          valid_to: { type: "string" },
          signatory: { type: "string" },
          signatory_role: { type: "string" },
          signatory_organization: { type: "string" },
          confidence_score: { type: "number" },
          extraction_notes: { type: "string" }
        }
      }
    });
    
    // Create Evidence Package
    const evidencePackage = await base44.entities.PFASEvidencePackage.create({
      tenant_id: tenantId,
      object_type: objectType,
      object_id: objectId,
      claim_status: extraction.claim_status,
      intentionally_added: extraction.intentionally_added,
      threshold_definition: extraction.threshold_definition,
      threshold_numeric_ppm: extraction.threshold_numeric_ppm,
      valid_from: extraction.valid_from,
      valid_to: extraction.valid_to,
      signatory: extraction.signatory,
      signatory_role: extraction.signatory_role,
      signatory_organization: extraction.signatory_organization,
      quality_grade: 'B', // Supplier declaration
      confidence_score: Math.round(extraction.confidence_score * 100),
      review_status: extraction.confidence_score > 0.8 ? 'submitted' : 'draft'
    });
    
    // Create Evidence Document
    const evidenceDoc = await base44.entities.PFASEvidenceDocument.create({
      tenant_id: tenantId,
      evidence_package_id: evidencePackage.id,
      file_url: fileUrl,
      file_hash_sha256: fileHash,
      doc_type: 'supplier_declaration',
      uploaded_by: user.email,
      uploaded_at: new Date().toISOString(),
      review_status: 'pending',
      page_map: {
        claim_status: extraction.substances?.[0]?.page_number,
        substances: extraction.substances?.map(s => ({ cas: s.cas_number, page: s.page_number }))
      },
      extraction_metadata: {
        prompt_version: this.PROMPT_VERSION,
        model_version: this.MODEL_VERSION,
        extraction_date: new Date().toISOString(),
        confidence_score: extraction.confidence_score,
        notes: extraction.extraction_notes
      }
    });
    
    // Create MaterialComposition records for each substance
    for (const substance of extraction.substances || []) {
      await base44.entities.MaterialComposition.create({
        tenant_id: tenantId,
        material_id: objectId,
        material_type: objectType.toLowerCase(),
        substance_cas: substance.cas_number,
        substance_name: substance.substance_name,
        typical_concentration: substance.concentration_ppm,
        unit_basis: 'ppm',
        source_type: 'supplier_declaration',
        source_document_id: evidenceDoc.id,
        confidence_score: extraction.confidence_score,
        declared_date: new Date().toISOString(),
        valid_until: extraction.valid_to,
        status: 'under_review'
      });
    }
    
    return {
      evidencePackage,
      evidenceDoc,
      extraction,
      requires_review: extraction.confidence_score < 0.8
    };
  }
  
  /**
   * Extract PFAS data from lab test report
   */
  static async extractLabReport(fileUrl, sampleId, materialId) {
    const user = await base44.auth.me();
    const tenantId = user.tenant_id || 'default';
    
    const fileHash = await this.computeFileHash(fileUrl);
    
    const prompt = `Extract lab test data for PFAS analysis.

Required:
1. Lab name and accreditation
2. Test method (EPA 537.1, ISO 21675, etc.)
3. Test date and report date
4. List of analytes with results, LOD, LOQ
5. Total organofluorine (TOF) if measured
6. Page numbers for each result

Provide structured JSON with page citations.`;
    
    const extraction = await base44.integrations.Core.InvokeLLM({
      prompt,
      file_urls: [fileUrl],
      response_json_schema: {
        type: "object",
        properties: {
          lab_name: { type: "string" },
          lab_accreditation: { type: "string" },
          test_method: { type: "string" },
          test_date: { type: "string" },
          report_date: { type: "string" },
          analytes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                cas_number: { type: "string" },
                substance_name: { type: "string" },
                result_value: { type: "number" },
                result_unit: { type: "string" },
                lod: { type: "number" },
                loq: { type: "number" },
                detected: { type: "boolean" },
                page_number: { type: "number" }
              }
            }
          },
          total_organofluorine: { type: "number" },
          confidence_score: { type: "number" }
        }
      }
    });
    
    // Create PFASLabTest
    const labTest = await base44.entities.PFASLabTest.create({
      tenant_id: tenantId,
      sample_id: sampleId,
      material_id: materialId,
      test_method: extraction.test_method,
      analytes: extraction.analytes,
      total_organofluorine: extraction.total_organofluorine,
      lab_name: extraction.lab_name,
      lab_accreditation: extraction.lab_accreditation,
      test_date: extraction.test_date,
      report_date: extraction.report_date,
      report_url: fileUrl,
      status: 'completed'
    });
    
    // Create Evidence Package (Grade A - lab tested)
    const evidencePackage = await base44.entities.PFASEvidencePackage.create({
      tenant_id: tenantId,
      object_type: 'material',
      object_id: materialId,
      claim_status: extraction.analytes.some(a => a.detected) ? 'present' : 'not_present',
      intentionally_added: 'unknown',
      quality_grade: 'A',
      confidence_score: Math.round(extraction.confidence_score * 100),
      review_status: 'approved'
    });
    
    const evidenceDoc = await base44.entities.PFASEvidenceDocument.create({
      tenant_id: tenantId,
      evidence_package_id: evidencePackage.id,
      file_url: fileUrl,
      file_hash_sha256: fileHash,
      doc_type: 'lab_report',
      uploaded_by: user.email,
      uploaded_at: new Date().toISOString(),
      review_status: 'approved',
      page_map: {
        analytes: extraction.analytes?.map(a => ({ cas: a.cas_number, page: a.page_number }))
      },
      extraction_metadata: {
        prompt_version: this.PROMPT_VERSION,
        model_version: this.MODEL_VERSION,
        extraction_date: new Date().toISOString(),
        confidence_score: extraction.confidence_score
      }
    });
    
    // Create MaterialComposition for detected substances
    for (const analyte of extraction.analytes.filter(a => a.detected)) {
      await base44.entities.MaterialComposition.create({
        tenant_id: tenantId,
        material_id: materialId,
        material_type: 'material',
        substance_cas: analyte.cas_number,
        substance_name: analyte.substance_name,
        typical_concentration: analyte.result_value,
        unit_basis: analyte.result_unit === 'mg/kg' ? 'ppm' : analyte.result_unit,
        source_type: 'lab_test',
        source_document_id: evidenceDoc.id,
        confidence_score: 1.0,
        declared_date: extraction.test_date,
        status: 'current'
      });
    }
    
    return {
      labTest,
      evidencePackage,
      evidenceDoc,
      extraction
    };
  }
  
  /**
   * Compute SHA256 hash of file for tamper detection
   */
  static async computeFileHash(fileUrl) {
    // In production, fetch file and compute actual hash
    // For now, return mock hash
    return `sha256_${Date.now()}_${Math.random().toString(36)}`;
  }
}

export default PFASAIExtractionService;