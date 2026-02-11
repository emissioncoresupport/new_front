import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const templates = [
      {
        name: 'CBAM Minimal',
        description: 'Minimal evidence package for CBAM compliance',
        originating_module: 'CBAM',
        is_system_template: true,
        items: [
          {
            evidence_type: 'SUPPLIER_MASTER',
            context_type: 'SUPPLIER',
            required_fields_json: {
              fields: ['supplier_legal_name', 'country', 'installation_identifier']
            },
            description: 'Supplier master data with installation info'
          },
          {
            evidence_type: 'CERTIFICATE',
            context_type: 'SITE',
            required_fields_json: {
              files: ['emissions_methodology_doc', 'supporting_calculations']
            },
            description: 'Installation emissions methodology documents'
          },
          {
            evidence_type: 'TRANSACTION_LOG',
            context_type: 'SHIPMENT',
            required_fields_json: {
              fields: ['import_period', 'cn_codes', 'quantities']
            },
            description: 'Import transaction records'
          }
        ]
      },
      {
        name: 'PCF/LCA Minimal',
        description: 'Product Carbon Footprint and Life Cycle Assessment evidence',
        originating_module: 'PCF_LCA',
        is_system_template: true,
        items: [
          {
            evidence_type: 'BOM',
            context_type: 'SKU',
            required_fields_json: {
              files: ['bom_file'],
              fields: ['bom_lines_structured']
            },
            description: 'Bill of Materials'
          },
          {
            evidence_type: 'TEST_REPORT',
            context_type: 'PRODUCT_FAMILY',
            required_fields_json: {
              files: ['material_composition', 'lab_results']
            },
            description: 'Material composition and lab test results'
          },
          {
            evidence_type: 'CERTIFICATE',
            context_type: 'SUPPLIER',
            required_fields_json: {
              files: ['iso14067_epd_certificate']
            },
            description: 'ISO 14067 or EPD certificate'
          }
        ]
      },
      {
        name: 'EUDR Minimal',
        description: 'EU Deforestation Regulation compliance evidence',
        originating_module: 'EUDR',
        is_system_template: true,
        items: [
          {
            evidence_type: 'CERTIFICATE',
            context_type: 'SUPPLIER',
            required_fields_json: {
              files: ['chain_of_custody_doc']
            },
            description: 'Chain of custody documentation'
          },
          {
            evidence_type: 'OTHER',
            context_type: 'SHIPMENT',
            required_fields_json: {
              files: ['geolocation_dataset'],
              fields: ['due_diligence_inputs']
            },
            description: 'Geolocation data and due diligence statement'
          }
        ]
      },
      {
        name: 'PPWR Minimal',
        description: 'Packaging and Packaging Waste Regulation evidence',
        originating_module: 'PPWR',
        is_system_template: true,
        items: [
          {
            evidence_type: 'PRODUCT_MASTER',
            context_type: 'PRODUCT_FAMILY',
            required_fields_json: {
              fields: ['packaging_components', 'weights']
            },
            description: 'Packaging components and weights'
          },
          {
            evidence_type: 'CERTIFICATE',
            context_type: 'SUPPLIER',
            required_fields_json: {
              files: ['recycled_content_cert']
            },
            description: 'Recycled content certification'
          }
        ]
      },
      {
        name: 'CSRD Minimal',
        description: 'Corporate Sustainability Reporting Directive evidence',
        originating_module: 'CSRD',
        is_system_template: true,
        items: [
          {
            evidence_type: 'OTHER',
            context_type: 'LEGAL_ENTITY',
            required_fields_json: {
              files: ['policies_procedures', 'energy_activity_data']
            },
            description: 'Sustainability policies and energy data'
          }
        ]
      },
      {
        name: 'PFAS Minimal',
        description: 'PFAS compliance evidence package',
        originating_module: 'PFAS',
        is_system_template: true,
        items: [
          {
            evidence_type: 'CERTIFICATE',
            context_type: 'PRODUCT_FAMILY',
            required_fields_json: {
              files: ['compliance_declaration']
            },
            description: 'PFAS compliance declaration'
          },
          {
            evidence_type: 'TEST_REPORT',
            context_type: 'PRODUCT_FAMILY',
            required_fields_json: {
              files: ['lab_test_results']
            },
            description: 'Lab test results for PFAS substances'
          }
        ]
      },
      {
        name: 'EUDAMED Minimal',
        description: 'EU Medical Device Database evidence',
        originating_module: 'EUDAMED',
        is_system_template: true,
        items: [
          {
            evidence_type: 'PRODUCT_MASTER',
            context_type: 'SKU',
            required_fields_json: {
              fields: ['device_identifiers'],
              files: ['conformity_docs']
            },
            description: 'Device identifiers and conformity documentation'
          }
        ]
      }
    ];

    const results = [];

    for (const tmpl of templates) {
      // Check if template exists
      const existing = await base44.asServiceRole.entities.RequestTemplate.filter({
        name: tmpl.name,
        originating_module: tmpl.originating_module
      });

      let template;
      if (existing.length > 0) {
        template = existing[0];
        results.push({ template: tmpl.name, status: 'already_exists', id: template.id });
      } else {
        // Create template
        template = await base44.asServiceRole.entities.RequestTemplate.create({
          tenant_id: null, // System template
          name: tmpl.name,
          description: tmpl.description,
          originating_module: tmpl.originating_module,
          is_system_template: tmpl.is_system_template,
          active: true
        });

        // Create items
        for (const item of tmpl.items) {
          await base44.asServiceRole.entities.RequestTemplateItem.create({
            template_id: template.id,
            evidence_type: item.evidence_type,
            context_type: item.context_type,
            required_fields_json: item.required_fields_json,
            description: item.description
          });
        }

        results.push({ template: tmpl.name, status: 'created', id: template.id, items: tmpl.items.length });
      }
    }

    return Response.json({ 
      success: true,
      templates_seeded: results.length,
      results
    });

  } catch (error) {
    console.error('Template seeding error:', error);
    return Response.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
});