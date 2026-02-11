/**
 * CBAM Registry XML Generator
 * Generates official XML declarations per EU CBAM Registry specification
 * For quarterly report submission to national competent authorities
 */

export class CBAMRegistryXMLGenerator {
  
  /**
   * Generate complete quarterly declaration XML
   * Per CBAM Registry Technical Specification v2.0
   */
  static generateQuarterlyDeclaration(reportData, entries) {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<CBAMDeclaration xmlns="urn:eu:cbam:registry:v2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <DeclarationHeader>
    ${this.generateHeader(reportData)}
  </DeclarationHeader>
  <Declarant>
    ${this.generateDeclarant(reportData)}
  </Declarant>
  <ReportingPeriod>
    ${this.generateReportingPeriod(reportData)}
  </ReportingPeriod>
  <ImportedGoods>
    ${entries.map(entry => this.generateGoodsEntry(entry)).join('\n    ')}
  </ImportedGoods>
  <Summary>
    ${this.generateSummary(reportData, entries)}
  </Summary>
  <Certificates>
    ${this.generateCertificatesSurrender(reportData)}
  </Certificates>
</CBAMDeclaration>`;
    
    return xml;
  }
  
  /**
   * Generate declaration header
   */
  static generateHeader(reportData) {
    const declarationID = this.generateDeclarationID(reportData);
    const timestamp = new Date().toISOString();
    
    return `<DeclarationID>${declarationID}</DeclarationID>
    <SubmissionDate>${timestamp}</SubmissionDate>
    <DeclarationType>QUARTERLY</DeclarationType>
    <Version>2.0</Version>
    <Language>EN</Language>`;
  }
  
  /**
   * Generate unique declaration ID
   * Format: MS-EORI-YYYY-QX-SEQUENCE
   */
  static generateDeclarationID(reportData) {
    const ms = reportData.member_state || 'XX';
    const eori = reportData.eori_number || 'UNKNOWN';
    const year = reportData.reporting_year;
    const quarter = reportData.reporting_quarter;
    const sequence = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    return `${ms}-${eori}-${year}-Q${quarter}-${sequence}`;
  }
  
  /**
   * Generate declarant information
   */
  static generateDeclarant(reportData) {
    return `<EORINumber>${this.escapeXML(reportData.eori_number)}</EORINumber>
    <Name>${this.escapeXML(reportData.declarant_name || 'N/A')}</Name>
    <MemberState>${reportData.member_state}</MemberState>
    <CBAMAccountNumber>${this.escapeXML(reportData.cbam_account_number || 'N/A')}</CBAMAccountNumber>`;
  }
  
  /**
   * Generate reporting period
   */
  static generateReportingPeriod(reportData) {
    const year = reportData.reporting_year;
    const quarter = reportData.reporting_quarter;
    
    const startMonth = (quarter - 1) * 3 + 1;
    const endMonth = quarter * 3;
    const endDay = new Date(year, endMonth, 0).getDate();
    
    return `<Year>${year}</Year>
    <Quarter>${quarter}</Quarter>
    <StartDate>${year}-${String(startMonth).padStart(2, '0')}-01</StartDate>
    <EndDate>${year}-${String(endMonth).padStart(2, '0')}-${endDay}</EndDate>`;
  }
  
  /**
   * Generate individual goods entry
   */
  static generateGoodsEntry(entry) {
    return `<Good>
      <EntryID>${this.escapeXML(entry.id)}</EntryID>
      <CNCode>${entry.cn_code}</CNCode>
      <GoodsDescription>${this.escapeXML(entry.goods_nomenclature || 'N/A')}</GoodsDescription>
      <CountryOfOrigin>${entry.country_of_origin}</CountryOfOrigin>
      <Quantity unit="${entry.functional_unit || 'tonnes'}">${entry.quantity}</Quantity>
      <ImportDate>${entry.import_date || 'N/A'}</ImportDate>
      <CustomsDeclarationMRN>${this.escapeXML(entry.customs_declaration_mrn || 'N/A')}</CustomsDeclarationMRN>
      <CustomsProcedureCode>${this.escapeXML(entry.customs_procedure_code || 'N/A')}</CustomsProcedureCode>
      <Installation>
        ${this.generateInstallation(entry)}
      </Installation>
      <Emissions>
        ${this.generateEmissions(entry)}
      </Emissions>
      <Methodology>
        ${this.generateMethodology(entry)}
      </Methodology>
      <CertificatesRequired>${entry.certificates_required || 0}</CertificatesRequired>
    </Good>`;
  }
  
  /**
   * Generate installation data
   */
  static generateInstallation(entry) {
    return `<InstallationID>${this.escapeXML(entry.installation_id || 'N/A')}</InstallationID>
        <InstallationName>${this.escapeXML(entry.installation_name || 'N/A')}</InstallationName>
        <OperatorName>${this.escapeXML(entry.operator_name || 'N/A')}</OperatorName>
        <ProductionRoute>${this.escapeXML(entry.production_route || 'Not_specified')}</ProductionRoute>`;
  }
  
  /**
   * Generate emissions data
   */
  static generateEmissions(entry) {
    return `<DirectEmissions unit="tCO2e">${entry.direct_emissions_specific || 0}</DirectEmissions>
        <IndirectEmissions unit="tCO2e">${entry.indirect_emissions_specific || 0}</IndirectEmissions>
        <PrecursorEmissions unit="tCO2e">${entry.precursor_emissions_embedded || 0}</PrecursorEmissions>
        <TotalEmbeddedEmissions unit="tCO2e">${entry.total_embedded_emissions || 0}</TotalEmbeddedEmissions>
        <FreeAllocationAdjustment unit="tCO2e">${entry.free_allocation_adjustment || 0}</FreeAllocationAdjustment>
        <ChargeableEmissions unit="tCO2e">${entry.chargeable_emissions || 0}</ChargeableEmissions>`;
  }
  
  /**
   * Generate methodology
   */
  static generateMethodology(entry) {
    const method = entry.calculation_method === 'actual_values' ? 'ACTUAL' : 'DEFAULT';
    
    return `<CalculationMethod>${method}</CalculationMethod>
        <DefaultValueUsed>${entry.default_value_used || false}</DefaultValueUsed>
        <MarkUpApplied percentage="${entry.mark_up_percentage_applied || 0}">${entry.default_value_with_markup || 0}</MarkUpApplied>
        <VerificationStatus>${this.escapeXML(entry.verification_status || 'not_verified')}</VerificationStatus>
        <MonitoringPlanID>${this.escapeXML(entry.monitoring_plan_id || 'N/A')}</MonitoringPlanID>`;
  }
  
  /**
   * Generate summary section
   */
  static generateSummary(reportData, entries) {
    const totalQuantity = entries.reduce((sum, e) => sum + (e.quantity || 0), 0);
    const totalEmissions = entries.reduce((sum, e) => sum + (e.total_embedded_emissions || 0), 0);
    const totalCertificates = entries.reduce((sum, e) => sum + (e.certificates_required || 0), 0);
    
    return `<TotalImports>${entries.length}</TotalImports>
    <TotalQuantity unit="tonnes">${totalQuantity.toFixed(3)}</TotalQuantity>
    <TotalEmbeddedEmissions unit="tCO2e">${totalEmissions.toFixed(3)}</TotalEmbeddedEmissions>
    <TotalCertificatesRequired>${Math.ceil(totalCertificates)}</TotalCertificatesRequired>
    <ByCategory>
      ${this.generateCategoryBreakdown(entries)}
    </ByCategory>`;
  }
  
  /**
   * Generate category breakdown
   */
  static generateCategoryBreakdown(entries) {
    const categories = {};
    
    for (const entry of entries) {
      const cat = entry.aggregated_goods_category || 'Other';
      if (!categories[cat]) {
        categories[cat] = {
          count: 0,
          quantity: 0,
          emissions: 0,
          certificates: 0
        };
      }
      categories[cat].count++;
      categories[cat].quantity += entry.quantity || 0;
      categories[cat].emissions += entry.total_embedded_emissions || 0;
      categories[cat].certificates += entry.certificates_required || 0;
    }
    
    return Object.entries(categories).map(([cat, data]) => `
      <Category name="${cat}">
        <Count>${data.count}</Count>
        <Quantity>${data.quantity.toFixed(3)}</Quantity>
        <Emissions>${data.emissions.toFixed(3)}</Emissions>
        <Certificates>${Math.ceil(data.certificates)}</Certificates>
      </Category>`).join('');
  }
  
  /**
   * Generate certificates surrender section
   */
  static generateCertificatesSurrender(reportData) {
    return `<CertificatesToSurrender>${reportData.certificates_required || 0}</CertificatesToSurrender>
    <CertificatesSurrendered>${reportData.certificates_surrendered || 0}</CertificatesSurrendered>
    <Shortfall>${Math.max(0, (reportData.certificates_required || 0) - (reportData.certificates_surrendered || 0))}</Shortfall>`;
  }
  
  /**
   * Validate XML structure
   */
  static validateXML(xml) {
    const errors = [];
    
    // Basic structure checks
    if (!xml.includes('<?xml version="1.0"')) {
      errors.push('Missing XML declaration');
    }
    
    if (!xml.includes('<CBAMDeclaration')) {
      errors.push('Missing root element');
    }
    
    if (!xml.includes('<DeclarationHeader>')) {
      errors.push('Missing declaration header');
    }
    
    if (!xml.includes('<Declarant>')) {
      errors.push('Missing declarant information');
    }
    
    // Check for unclosed tags
    const openTags = xml.match(/<([a-zA-Z][a-zA-Z0-9]*)/g) || [];
    const closeTags = xml.match(/<\/([a-zA-Z][a-zA-Z0-9]*)/g) || [];
    
    if (openTags.length !== closeTags.length) {
      errors.push('Unclosed XML tags detected');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Escape XML special characters
   */
  static escapeXML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
  
  /**
   * Generate XML for verification report
   */
  static generateVerificationReportXML(report) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<VerificationReport xmlns="urn:eu:cbam:verification:v1">
  <ReportID>${this.escapeXML(report.id)}</ReportID>
  <VerificationDate>${report.verification_date}</VerificationDate>
  <Verifier>
    <VerifierID>${this.escapeXML(report.verifier_id)}</VerifierID>
    <VerifierName>${this.escapeXML(report.verifier_name)}</VerifierName>
    <AccreditationNumber>${this.escapeXML(report.verifier_accreditation)}</AccreditationNumber>
  </Verifier>
  <Opinion>${report.verification_opinion}</Opinion>
  <Findings>
    ${(report.findings || []).map(f => `<Finding severity="${f.severity}">${this.escapeXML(f.message)}</Finding>`).join('\n    ')}
  </Findings>
  <Signature>${this.escapeXML(report.verifier_signature)}</Signature>
</VerificationReport>`;
  }
}

export default CBAMRegistryXMLGenerator;