import { XMLBuilder } from 'fast-xml-parser';

/**
 * CBAM XML Template Generator
 * Generates schema-compliant XML per EU Implementing Regulation 2023/1773
 * Based on official CBAM Transitional Registry schema structure
 */

export function generateCBAMXML(report, entries) {
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    format: true,
    indentBy: "  ",
    suppressEmptyNode: true
  });

  // Build XML structure per EU schema
  const xmlStructure = {
    '?xml': {
      '@_version': '1.0',
      '@_encoding': 'UTF-8'
    },
    'CBAMDeclaration': {
      '@_xmlns': 'urn:eu:cbam:transitional:v1',
      '@_xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      '@_xsi:schemaLocation': 'urn:eu:cbam:transitional:v1 cbam-schema.xsd',
      
      'DeclarationHeader': {
        'DeclarationID': `CBAM-${report.reporting_year}${report.reporting_quarter}-${Date.now()}`,
        'ReportingPeriod': {
          'Year': report.reporting_year,
          'Quarter': report.reporting_quarter
        },
        'SubmissionDate': new Date().toISOString().split('T')[0],
        'DeclarantInfo': {
          'EORINumber': report.eori_number || 'REQUIRED',
          'DeclarantName': report.declarant_name || 'REQUIRED',
          'MemberState': report.member_state || 'REQUIRED'
        },
        'TotalImports': report.total_imports_count || entries.length,
        'DeclarationType': 'Quarterly'
      },

      'GoodsCategories': {
        'GoodsCategory': entries.map(entry => ({
          'ImportID': entry.import_id || `IMP-${entry.id}`,
          'ImportDate': entry.import_date,
          'CNCode': entry.cn_code,
          'GoodsNomenclature': entry.goods_nomenclature || entry.product_name,
          'AggregatedCategory': entry.aggregated_goods_category,
          
          'OriginCountry': {
            'CountryCode': entry.country_of_origin,
            'InstallationID': entry.installation_id || 'N/A'
          },
          
          'QuantityData': {
            'NetMass': entry.quantity,
            'Unit': 'tonnes'
          },
          
          'EmissionData': {
            'DirectEmissions': {
              'Value': entry.direct_emissions_specific || 0,
              'Unit': 'tCO2e/tonne'
            },
            'IndirectEmissions': {
              'Value': entry.indirect_emissions_specific || 0,
              'Unit': 'tCO2e/tonne'
            },
            'TotalEmbeddedEmissions': {
              'Value': entry.total_embedded_emissions || 0,
              'Unit': 'tCO2e'
            }
          },
          
          'CalculationMethod': {
            'Method': entry.calculation_method || 'Default_values',
            'ProductionRoute': entry.production_route || 'Not_specified',
            'DataQuality': entry.data_quality_rating || 'medium'
          },
          
          'CarbonPricePaid': {
            'Amount': entry.carbon_price_due_paid || 0,
            'Currency': 'EUR',
            'Country': entry.carbon_price_country || entry.country_of_origin,
            'SchemeName': entry.carbon_price_scheme_name || 'None'
          },
          
          'VerificationStatus': entry.verification_status || 'not_verified'
        }))
      },

      'AggregatedTotals': {
        'TotalDirectEmissions': report.total_direct_emissions || 0,
        'TotalIndirectEmissions': report.total_indirect_emissions || 0,
        'TotalEmbeddedEmissions': report.total_embedded_emissions || 0,
        'TotalQuantity': report.total_goods_quantity || 0
      },

      'MethodologyBreakdown': {
        'EUMethod': report.calculation_methods_used?.eu_method || 0,
        'EquivalentMethods': report.calculation_methods_used?.equivalent_methods || 0,
        'DefaultValues': report.calculation_methods_used?.default_values || report.default_values_percentage || 0
      },

      'CategoryBreakdown': Object.entries(report.breakdown_by_category || {}).map(([cat, val]) => ({
        'Category': cat,
        'Emissions': val
      })),

      'DeclarationFooter': {
        'DeclarantSignature': 'DIGITAL_SIGNATURE_PLACEHOLDER',
        'Timestamp': new Date().toISOString(),
        'SchemaVersion': '1.0'
      }
    }
  };

  return builder.build(xmlStructure);
}

export function validateCBAMXML(xmlString) {
  const errors = [];
  const warnings = [];

  // Basic validation checks
  if (!xmlString.includes('CBAMDeclaration')) {
    errors.push('Missing root element: CBAMDeclaration');
  }

  if (!xmlString.includes('EORINumber')) {
    errors.push('Missing required field: EORI Number');
  }

  if (!xmlString.includes('ReportingPeriod')) {
    errors.push('Missing required field: Reporting Period');
  }

  if (!xmlString.includes('GoodsCategories')) {
    warnings.push('No goods categories declared');
  }

  // Check for placeholder values
  if (xmlString.includes('REQUIRED')) {
    errors.push('Contains placeholder values - complete all mandatory fields');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}