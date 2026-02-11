import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Battery, Shirt, Footprints, Cpu, Package } from "lucide-react";

/**
 * DPP Category-Specific Templates
 * Compliant with product category regulations
 */

export const DPP_CATEGORIES = {
  BATTERY: 'EV Batteries',
  TEXTILE: 'Textile & Apparel',
  ELECTRONICS: 'Electronics',
  PACKAGING: 'Packaging',
  FOOTWEAR: 'Footwear',
  FURNITURE: 'Furniture'
};

const CATEGORY_TEMPLATES = {
  battery: {
    icon: Battery,
    color: 'blue',
    required_fields: [
      'battery_chemistry',
      'capacity_wh',
      'voltage_v',
      'expected_lifetime_cycles',
      'carbon_footprint_kg',
      'recycled_content_pct',
      'critical_raw_materials',
      'hazardous_substances',
      'dismantling_instructions',
      'collection_symbols'
    ],
    regulations: ['Battery Regulation (EU) 2023/1542', 'DPP Annex XIII'],
    integrations: ['PCF for lifecycle carbon', 'LCA for environmental impact']
  },
  textile: {
    icon: Shirt,
    color: 'purple',
    required_fields: [
      'fiber_composition',
      'country_of_origin',
      'production_process',
      'water_consumption_liters',
      'carbon_footprint_kg',
      'chemical_substances_used',
      'recycled_content_pct',
      'care_instructions',
      'repair_services_available',
      'end_of_life_recyclability'
    ],
    regulations: ['Ecodesign for Sustainable Products Regulation (ESPR)', 'Textile Labeling Regulation'],
    integrations: ['PCF for carbon', 'LCA for water/chemical impact']
  },
  electronics: {
    icon: Cpu,
    color: 'cyan',
    required_fields: [
      'product_model',
      'energy_efficiency_class',
      'expected_lifespan_years',
      'repairability_index',
      'spare_parts_availability_years',
      'carbon_footprint_kg',
      'critical_raw_materials',
      'hazardous_substances',
      'recycling_instructions',
      'software_update_support_years'
    ],
    regulations: ['Ecodesign Directive 2009/125/EC', 'WEEE Directive'],
    integrations: ['PCF for manufacturing carbon', 'LCA for full lifecycle']
  },
  packaging: {
    icon: Package,
    color: 'green',
    required_fields: [
      'material_composition',
      'recyclability_score',
      'recycled_content_pct',
      'reusability',
      'compostability',
      'carbon_footprint_kg',
      'intended_use_cycles',
      'collection_instructions',
      'end_of_life_options'
    ],
    regulations: ['PPWR (EU) 2024/XXXX', 'Packaging Waste Directive'],
    integrations: ['PCF for material carbon', 'PPWR for compliance']
  }
};

export const getCategoryTemplate = (category) => {
  const key = category.toLowerCase().includes('battery') ? 'battery' :
              category.toLowerCase().includes('textile') || category.toLowerCase().includes('apparel') ? 'textile' :
              category.toLowerCase().includes('electronic') ? 'electronics' :
              category.toLowerCase().includes('packaging') ? 'packaging' : 'electronics';
  
  const template = CATEGORY_TEMPLATES[key];
  
  return {
    ...template,
    compliance: template.regulations,
    required_materials: template.required_fields.filter(f => f.includes('material') || f.includes('composition')),
    typical_lifetime_years: 5,
    sustainability_metrics: template.required_fields.filter(f => f.includes('carbon') || f.includes('water') || f.includes('energy')),
    eol_instructions_template: `Return instructions:\n1. Contact manufacturer for collection\n2. Drop at designated recycling center\n3. Follow local waste regulations`
  };
};

export default function DPPCategoryTemplates({ onSelectTemplate }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {Object.entries(CATEGORY_TEMPLATES).map(([key, template]) => {
        const Icon = template.icon;
        return (
          <Card key={key} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => onSelectTemplate(key)}>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-3 rounded-lg bg-${template.color}-100`}>
                  <Icon className={`w-6 h-6 text-${template.color}-600`} />
                </div>
                <div>
                  <h3 className="font-bold text-lg capitalize">{key}</h3>
                  <Badge className={`bg-${template.color}-500`}>
                    {template.required_fields.length} fields
                  </Badge>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="font-bold text-slate-700">Regulations:</p>
                  <ul className="text-xs text-slate-600 list-disc list-inside">
                    {template.regulations.map((reg, i) => (
                      <li key={i}>{reg}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-bold text-slate-700">Auto-Integrations:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {template.integrations.map((int, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{int}</Badge>
                    ))}
                  </div>
                </div>
              </div>
              <Button className="w-full mt-4 bg-[#86b027] hover:bg-[#769c22]">
                Use Template
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}