import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Enhanced CBAM XML Generator
 * Generates compliant XML per C(2025) 8151, 8552, 8560, 8150
 * Includes all mandatory elements for national registry submission
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { report_id, include_ets_prices = true } = await req.json();
    
    if (!report_id) {
      return Response.json({ error: 'report_id required' }, { status: 400 });
    }
    
    console.log('[XML Gen] Generating for report:', report_id);
    
    // Fetch report
    const reports = await base44.asServiceRole.entities.CBAMReport.list();
    const report = reports.find(r => r.id === report_id);
    
    if (!report) {
      return Response.json({ error: 'Report not found' }, { status: 404 });
    }
    
    // Fetch linked entries
    const allEntries = await base44.asServiceRole.entities.CBAMEmissionEntry.list();
    const entries = allEntries.filter(e => report.linked_entries?.includes(e.id));
    
    console.log('[XML Gen] Processing', entries.length, 'entries');
    
    // Get ETS price if requested
    let etsPrice = 88;
    if (include_ets_prices) {
      const prices = await base44.asServiceRole.entities.CBAMPriceHistory.list('-date', 1);
      if (prices.length > 0) {
        etsPrice = prices[0].cbam_certificate_price;
      }
    }
    
    // Generate XML
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<CBAMQuarterlyDeclaration xmlns="urn:eu:cbam:2026" version="2026.1">
  <Header>
    <DeclarationID>${report.id}</DeclarationID>
    <ReportingPeriod>
      <Year>${report.reporting_year}</Year>
      <Quarter>${report.reporting_quarter}</Quarter>
      <Period>${report.reporting_period}</Period>
    </ReportingPeriod>
    <SubmissionDate>${new Date().toISOString()}</SubmissionDate>
    <Language>en</Language>
    <RegulatoryBasis>C(2025) 8151, C(2025) 8552, C(2025) 8560, C(2025) 8150</RegulatoryBasis>
  </Header>
  
  <Declarant>
    <EORINumber>${report.eori_number}</EORINumber>
    <Name>${report.declarant_name}</Name>
    <MemberState>${report.member_state}</MemberState>
    <CBAMAccount>${report.cbam_account_number || ''}</CBAMAccount>
  </Declarant>
  
  <EmissionsSummary>
    <TotalImports>${report.total_imports_count}</TotalImports>
    <TotalQuantity unit="tonnes">${(report.total_goods_quantity_tonnes || 0).toFixed(3)}</TotalQuantity>
    <DirectEmissions unit="tCO2e">${(report.total_direct_emissions || 0).toFixed(3)}</DirectEmissions>
    <IndirectEmissions unit="tCO2e">${(report.total_indirect_emissions || 0).toFixed(3)}</IndirectEmissions>
    <TotalEmbedded unit="tCO2e">${(report.total_embedded_emissions || 0).toFixed(3)}</TotalEmbedded>
  </EmissionsSummary>
  
  <FreeAllocationAdjustment>
    <Total unit="tCO2e">${(report.free_allocation_adjustment_total || 0).toFixed(3)}</Total>
    <CBAMFactor>${report.cbam_factor_applied || 0.025}</CBAMFactor>
    <Year>${report.reporting_year}</Year>
    <Methodology>Production route-specific benchmarks per C(2025) 8151</Methodology>
  </FreeAllocationAdjustment>
  
  <CertificateObligation>
    <Required>${report.certificates_required || 0}</Required>
    <Surrendered>${report.certificates_surrendered || 0}</Surrendered>
    <AveragePrice unit="EUR">${(report.certificate_price_avg || etsPrice).toFixed(2)}</AveragePrice>
    <TotalCost unit="EUR">${((report.certificates_required || 0) * (report.certificate_price_avg || etsPrice)).toFixed(2)}</TotalCost>
    <PricingBasis>${report.reporting_year === 2026 ? 'Quarterly' : 'Weekly'}</PricingBasis>
  </CertificateObligation>
  
  <CalculationMethods>
    <ActualValues percentage="${(report.calculation_methods_used?.actual_values || 0).toFixed(1)}" />
    <DefaultValues percentage="${(report.calculation_methods_used?.default_values || 0).toFixed(1)}" />
    <Combined percentage="${(report.calculation_methods_used?.combined || 0).toFixed(1)}" />
  </CalculationMethods>
  
  <ImportEntries count="${entries.length}">
${entries.map((entry, idx) => `    <Entry id="${idx + 1}">
      <ImportID>${entry.import_id}</ImportID>
      <ImportDate>${entry.import_date}</ImportDate>
      <CNCode>${entry.cn_code}</CNCode>
      <GoodsDescription>${entry.product_name || entry.goods_nomenclature || 'N/A'}</GoodsDescription>
      <CountryOfOrigin>${entry.country_of_origin}</CountryOfOrigin>
      <Quantity unit="tonnes">${(entry.quantity || 0).toFixed(3)}</Quantity>
      <ProductionRoute>${entry.production_route || 'Not_specified'}</ProductionRoute>
      <CalculationMethod>${entry.calculation_method}</CalculationMethod>
      <Emissions>
        <Direct unit="tCO2e">${((entry.direct_emissions_specific || 0) * (entry.quantity || 0)).toFixed(3)}</Direct>
        <Indirect unit="tCO2e">${((entry.indirect_emissions_specific || 0) * (entry.quantity || 0)).toFixed(3)}</Indirect>
        <Precursors unit="tCO2e">${(entry.precursor_emissions_embedded || 0).toFixed(3)}</Precursors>
        <Total unit="tCO2e">${(entry.total_embedded_emissions || 0).toFixed(3)}</Total>
      </Emissions>
      <FreeAllocation unit="tCO2e">${(entry.free_allocation_adjustment || 0).toFixed(3)}</FreeAllocation>
      <CarbonPricePaid unit="EUR/tCO2e">${entry.carbon_price_due_paid || 0}</CarbonPricePaid>
      ${entry.verification_status ? `<VerificationStatus>${entry.verification_status}</VerificationStatus>` : ''}
    </Entry>`).join('\n')}
  </ImportEntries>
  
  <GoodsCategories>
${Object.entries(report.breakdown_by_category || {}).map(([cat, emissions]) => `    <Category>
      <Name>${cat}</Name>
      <Emissions unit="tCO2e">${emissions.toFixed(3)}</Emissions>
    </Category>`).join('\n')}
  </GoodsCategories>
  
  <VerificationData>
    <MonitoringPlans>${report.monitoring_plans_submitted || 0}</MonitoringPlans>
    <OperatorReports>${report.operator_reports_verified || 0}</OperatorReports>
    <VerificationOpinions>
      <Satisfactory>${report.verification_opinions?.satisfactory || 0}</Satisfactory>
      <SatisfactoryWithComments>${report.verification_opinions?.satisfactory_with_comments || 0}</SatisfactoryWithComments>
      <Unsatisfactory>${report.verification_opinions?.unsatisfactory || 0}</Unsatisfactory>
    </VerificationOpinions>
  </VerificationData>
  
  <ComplianceDeclaration>
    <Text>This report complies with Regulation (EU) 2023/956 as amended by C(2025) 8151, 8552, 8560, and 8150.</Text>
    <SignedBy>${user.email}</SignedBy>
    <SignatureDate>${new Date().toISOString()}</SignatureDate>
  </ComplianceDeclaration>
</CBAMQuarterlyDeclaration>`;
    
    // Upload XML
    const xmlBlob = new Blob([xml], { type: 'application/xml' });
    const xmlFile = new File([xmlBlob], `CBAM_${report.reporting_period}_${report.eori_number}.xml`, { type: 'application/xml' });
    
    const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file: xmlFile });
    
    // Update report
    await base44.asServiceRole.entities.CBAMReport.update(report_id, {
      xml_file_url: uploadResult.file_url,
      certificate_price_avg: etsPrice,
      total_cbam_cost_eur: (report.certificates_required || 0) * etsPrice
    });
    
    console.log('[XML Gen] Generated:', uploadResult.file_url);
    
    return Response.json({
      success: true,
      xml_file_url: uploadResult.file_url,
      xml_content: xml,
      metadata: {
        entries_count: entries.length,
        total_emissions: report.total_embedded_emissions,
        certificates_required: report.certificates_required,
        ets_price_used: etsPrice
      }
    });
    
  } catch (error) {
    console.error('[XML Gen] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});