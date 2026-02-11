/**
 * CBAM Auto-Validator
 * Validates CBAM reports before submission using AI and rule-based checks
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { report_id } = await req.json();

  const reports = await base44.entities.CBAMReport.list();
  const report = reports.find(r => r.id === report_id);
  if (!report) {
    return Response.json({ error: "Report not found" }, { status: 404 });
  }

  const allEntries = await base44.entities.CBAMEmissionEntry.list();
  const entries = allEntries.filter(e => report.linked_entries?.includes(e.id));

  const errors = [];
  const warnings = [];

  // Rule-based validation
  if (entries.length === 0) {
    errors.push("No emission entries found in report");
  }

  for (const entry of entries) {
    if (!entry.cn_code || entry.cn_code.length < 8) {
      errors.push(`Invalid CN code for entry ${entry.id}`);
    }
    
    if (!entry.direct_emissions_specific || entry.direct_emissions_specific <= 0) {
      warnings.push(`Entry ${entry.id}: Direct emissions missing or zero`);
    }
  }

  // AI-powered validation
  const aiValidation = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `Review this CBAM quarterly report for compliance with EU CBAM Regulation (EU) 2023/956.

Report Period: ${report.reporting_period}
Total Entries: ${entries.length}
Entries Summary: ${JSON.stringify(entries.slice(0, 5))}

Check for:
1. Data completeness (all required fields present)
2. Logical consistency (emissions correlate with quantities)
3. CN code validity for CBAM-covered goods
4. Emission factor reasonableness
5. Reporting period accuracy

Return validation results with specific issues found.`,
    response_json_schema: {
      type: "object",
      properties: {
        is_valid: { type: "boolean" },
        critical_issues: { type: "array", items: { type: "string" } },
        warnings: { type: "array", items: { type: "string" } },
        recommendations: { type: "array", items: { type: "string" } },
        compliance_score: { type: "number" }
      }
    }
  });

  // Combine validations
  const allErrors = [...errors, ...aiValidation.critical_issues];
  const allWarnings = [...warnings, ...aiValidation.warnings];

  // Update report status
  const newStatus = allErrors.length > 0 ? 'requires_correction' : 'validated';
  
  await base44.asServiceRole.entities.CBAMReport.update(report_id, {
    status: newStatus,
    notes: `Validation: ${allErrors.length} errors, ${allWarnings.length} warnings`
  });

  return Response.json({
    success: allErrors.length === 0,
    status: newStatus,
    is_valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
    recommendations: aiValidation.recommendations,
    compliance_score: aiValidation.compliance_score
  });

  } catch (error) {
    console.error('Validation error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});