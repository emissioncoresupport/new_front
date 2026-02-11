import { XMLParser } from 'fast-xml-parser';

/**
 * Validate CBAM XML against EU schema requirements
 * Performs structural validation before registry submission
 */
export default async function validateCBAMXML(req, res) {
  try {
    const { xmlContent } = req.body;

    if (!xmlContent) {
      return res.status(400).json({ error: 'Missing XML content' });
    }

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_'
    });

    let parsed;
    try {
      parsed = parser.parse(xmlContent);
    } catch (parseError) {
      return res.json({
        valid: false,
        errors: ['Invalid XML structure: ' + parseError.message]
      });
    }

    const errors = [];
    const warnings = [];

    // Check required root element
    if (!parsed.CBAMReport) {
      errors.push('Missing root element: CBAMReport');
    }

    const report = parsed.CBAMReport;

    // Validate header information
    if (!report.Header) {
      errors.push('Missing Header section');
    } else {
      if (!report.Header.ReportingPeriod) errors.push('Missing ReportingPeriod');
      if (!report.Header.EORINumber) errors.push('Missing EORI Number');
      if (!report.Header.MemberState) errors.push('Missing Member State');
      if (!report.Header.DeclarantName) errors.push('Missing Declarant Name');
    }

    // Validate goods entries
    if (!report.GoodsEntries || !report.GoodsEntries.Entry) {
      warnings.push('No goods entries found in report');
    } else {
      const entries = Array.isArray(report.GoodsEntries.Entry) 
        ? report.GoodsEntries.Entry 
        : [report.GoodsEntries.Entry];

      entries.forEach((entry, idx) => {
        if (!entry.CNCode) errors.push(`Entry ${idx + 1}: Missing CN Code`);
        if (!entry.CountryOfOrigin) errors.push(`Entry ${idx + 1}: Missing Country of Origin`);
        if (!entry.Quantity) errors.push(`Entry ${idx + 1}: Missing Quantity`);
        if (!entry.DirectEmissions) errors.push(`Entry ${idx + 1}: Missing Direct Emissions`);
        
        // Check for placeholder values
        if (entry.CNCode === 'XXXXXXXX') {
          errors.push(`Entry ${idx + 1}: CN Code contains placeholder value`);
        }
        if (entry.CountryOfOrigin === 'XX') {
          errors.push(`Entry ${idx + 1}: Country of Origin contains placeholder value`);
        }
      });
    }

    // Validate totals
    if (!report.Totals) {
      warnings.push('Missing Totals section');
    } else {
      if (!report.Totals.TotalEmbeddedEmissions) {
        warnings.push('Missing Total Embedded Emissions');
      }
      if (!report.Totals.TotalImportsCount) {
        warnings.push('Missing Total Imports Count');
      }
    }

    // Check for signature (required for submission)
    if (!report.Signature) {
      warnings.push('XML not signed - signature will be added during submission');
    }

    return res.json({
      valid: errors.length === 0,
      errors,
      warnings,
      structure: {
        hasHeader: !!report.Header,
        entriesCount: report.GoodsEntries?.Entry 
          ? (Array.isArray(report.GoodsEntries.Entry) ? report.GoodsEntries.Entry.length : 1)
          : 0,
        hasTotals: !!report.Totals,
        isSigned: !!report.Signature
      }
    });

  } catch (error) {
    console.error('XML validation error:', error);
    return res.status(500).json({ 
      error: 'Validation failed',
      message: error.message 
    });
  }
}