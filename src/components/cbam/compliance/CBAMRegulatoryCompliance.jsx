/**
 * CBAM REGULATORY COMPLIANCE MODULE
 * Based on EU Regulation 2023/956 and Commission Implementing Regulation (EU) 2023/1773
 * 
 * KEY REGULATIONS:
 * - Regulation (EU) 2023/956 (Main CBAM Regulation)
 * - Implementing Regulation (EU) 2023/1773 (Reporting methodology)
 * - Commission Decision on default values (22 Dec 2023)
 * 
 * COMPLIANCE REQUIREMENTS:
 * 1. Transitional Period: 1 Oct 2023 - 31 Dec 2025 (Reporting only, no financial obligation)
 * 2. Definitive Period: From 1 Jan 2026 (Certificate surrender obligation)
 * 3. Quarterly CBAM Reports mandatory via EU Transitional Registry
 * 4. Authorized CBAM Declarant required (Art. 5)
 * 5. Default values permitted until 31 Jul 2024, then 20% limit for complex goods
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, FileText, ExternalLink, Book } from "lucide-react";

// Official EU CN Codes from Annex I of Regulation 2023/956
export const EU_CBAM_CN_CODES = {
  // IRON & STEEL (Chapter 72 except ferro-alloys 7202 2, 7202 30 00)
  'IRON_STEEL': [
    '2601', // Iron ores and concentrates
    '7201', // Pig iron and spiegeleisen
    '7203', // Ferrous products obtained by direct reduction
    '7206', // Iron and non-alloy steel in ingots
    '7207', // Semi-finished products of iron/steel
    '7208', '7209', '7210', '7211', '7212', // Flat-rolled products
    '7213', '7214', '7215', '7216', '7217', // Bars, rods, wire
    '7218', '7219', '7220', '7221', '7222', '7223', // Stainless steel
    '7224', '7225', '7226', '7227', '7228', '7229', // Other alloy steel
    '7301', '7302', '7303', '7304', '7305', '7306', // Iron/steel structures
    '7307', '7308', '7309', '7310', '7311', // Tubes, pipes, fittings
    '7326' // Other articles of iron/steel
  ],
  
  // CEMENT (Chapter 25)
  'CEMENT': [
    '2507', // Clays and kaolin
    '2523', // Portland cement, aluminous cement, slag cement
    '2530' // Mineral substances not elsewhere specified
  ],
  
  // ALUMINIUM (Chapter 76)
  'ALUMINIUM': [
    '7601', // Aluminium unwrought
    '7603', '7604', '7605', '7606', '7607', '7608', // Aluminium products
    '7609', '7610', '7611', '7612', '7613', '7614', '7616' // Aluminium structures
  ],
  
  // FERTILIZERS (Chapter 31)
  'FERTILIZERS': [
    '3102', // Mineral or chemical fertilisers, nitrogenous
    '3105' // Mineral or chemical fertilisers with multiple nutrients
  ],
  
  // HYDROGEN (Chapter 28)
  'HYDROGEN': [
    '2804' // Hydrogen, rare gases and other non-metals
  ],
  
  // ELECTRICITY (Chapter 27)
  'ELECTRICITY': [
    '2716' // Electrical energy
  ]
};

// Default values per EU Commission Decision 22 Dec 2023
export const EU_DEFAULT_VALUES_TRANSITIONAL = {
  // Iron & Steel (tCO2e/tonne)
  '260112': { direct: 0.31, indirect: 0.05, total: 0.36, description: 'Sintered ore' },
  '7201': { direct: 1.90, indirect: 0.17, total: 2.07, description: 'Pig iron' },
  '72021': { direct: 1.44, indirect: 2.08, total: 3.51, description: 'Ferro-manganese' },
  '72024': { direct: 2.076, indirect: 3.38, total: 5.45, description: 'Ferro-chromium' },
  '72026': { direct: 3.486, indirect: 2.81, total: 6.26, description: 'Ferro-nickel' },
  '7203': { direct: 4.81, indirect: 0.00, total: 4.81, description: 'DRI/Sponge iron' },
  '720610': { direct: 2.52, indirect: 0.23, total: 2.75, description: 'Crude steel ingots' },
  '720690': { direct: 1.97, indirect: 0.23, total: 2.20, description: 'Crude steel other' },
  '7207': { direct: 1.54, indirect: 0.25, total: 1.79, description: 'Semi-finished steel' },
  '7208': { direct: 1.48, indirect: 0.31, total: 1.79, description: 'Flat-rolled products hot' },
  '7209': { direct: 1.52, indirect: 0.31, total: 1.83, description: 'Flat-rolled products cold' },
  
  // Aluminium (tCO2e/tonne)
  '760110': { direct: 5.63, indirect: 11.61, total: 17.24, description: 'Aluminium unwrought, not alloyed' },
  '760120': { direct: 4.50, indirect: 11.61, total: 16.11, description: 'Aluminium unwrought, alloyed' },
  '7603': { direct: 0.48, indirect: 1.60, total: 2.08, description: 'Aluminium powders/flakes' },
  '7604': { direct: 0.48, indirect: 1.60, total: 2.08, description: 'Aluminium bars/rods' },
  '7606': { direct: 0.48, indirect: 1.60, total: 2.08, description: 'Aluminium plates/sheets' },
  
  // Fertilizers (tCO2e/tonne)
  '310210': { direct: 2.52, indirect: 0.20, total: 2.72, description: 'Urea' },
  '310221': { direct: 1.72, indirect: 0.20, total: 1.92, description: 'Ammonium sulphate' },
  '310230': { direct: 2.18, indirect: 0.20, total: 2.38, description: 'Ammonium nitrate' },
  '310240': { direct: 1.72, indirect: 0.20, total: 1.92, description: 'Ammonium nitrate + calcium' },
  '310250': { direct: 1.50, indirect: 0.20, total: 1.70, description: 'Sodium nitrate' },
  '310260': { direct: 1.72, indirect: 0.20, total: 1.92, description: 'Calcium + ammonium nitrate' },
  '310280': { direct: 2.52, indirect: 0.20, total: 2.72, description: 'Urea + ammonium nitrate' },
  '310290': { direct: 2.18, indirect: 0.20, total: 2.38, description: 'Other nitrogenous fertilizers' },
  
  // Cement (tCO2e/tonne)
  '252310': { direct: 0.766, indirect: 0.019, total: 0.785, description: 'Portland cement' },
  '252320': { direct: 0.766, indirect: 0.019, total: 0.785, description: 'Aluminous cement' },
  '252329': { direct: 0.679, indirect: 0.017, total: 0.696, description: 'Portland cement, grey' },
  '252330': { direct: 0.766, indirect: 0.019, total: 0.785, description: 'Slag cement' },
  
  // Hydrogen (tCO2e/tonne)
  '280410': { direct: 9.27, indirect: 0.40, total: 9.67, description: 'Hydrogen (grey)' }
};

// Mandatory fields per Article 6 and Implementing Regulation 2023/1773
export const MANDATORY_CBAM_FIELDS = {
  IMPORTER_DATA: [
    'eori_number', // EORI of authorized CBAM declarant
    'name',
    'address',
    'contact_details'
  ],
  
  GOODS_DATA: [
    'cn_code', // 8-digit CN code
    'goods_nomenclature', // Description from Annex I
    'country_of_origin',
    'quantity', // Net mass in tonnes
    'total_emissions', // Total embedded emissions in tCO2e
    'direct_emissions', // Specific direct emissions
    'indirect_emissions' // Specific indirect emissions (if applicable)
  ],
  
  INSTALLATION_DATA: [
    'installation_id', // UN/LOCODE or equivalent
    'installation_name',
    'operator_name',
    'country'
  ],
  
  PRODUCTION_PROCESS: [
    'production_route', // e.g., BF-BOF, EAF-Scrap for steel
    'production_year',
    'calculation_method', // EU method / Equivalent method / Default values
    'monitoring_methodology' // Reference to specific methodology used
  ]
};

// Reporting deadlines per Article 6(2)
export const CBAM_REPORTING_DEADLINES = {
  'Q4-2023': '2024-01-31',
  'Q1-2024': '2024-04-30',
  'Q2-2024': '2024-07-31',
  'Q3-2024': '2024-10-31',
  'Q4-2024': '2025-01-31',
  'Q1-2025': '2025-04-30',
  'Q2-2025': '2025-07-31',
  'Q3-2025': '2025-10-31',
  'Q4-2025': '2026-01-31' // Final transitional report
};

// Phase-in schedule per Article 31 and Annex II
export const CBAM_PHASE_IN_SCHEDULE = {
  2026: { rate: 0.025, description: '2.5% of allowances', free_allocation: 1.0 },
  2027: { rate: 0.025, description: '2.5% of allowances', free_allocation: 0.975 },
  2028: { rate: 0.025, description: '2.5% of allowances', free_allocation: 0.95 },
  2029: { rate: 0.025, description: '2.5% of allowances', free_allocation: 0.90 },
  2030: { rate: 0.025, description: '2.5% of allowances', free_allocation: 0.775 },
  2031: { rate: 0.025, description: '2.5% of allowances', free_allocation: 0.65 },
  2032: { rate: 0.025, description: '2.5% of allowances', free_allocation: 0.525 },
  2033: { rate: 0.025, description: '2.5% of allowances', free_allocation: 0.40 },
  2034: { rate: 0.025, description: '2.5% of allowances', free_allocation: 0.00 }
};

export default function CBAMRegulatoryCompliance() {
  return (
    <div className="space-y-6">
      <Card className="border-[#02a1e8]/20 bg-[#02a1e8]/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Book className="w-5 h-5 text-[#02a1e8]" />
            EU CBAM Regulatory Framework
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-white rounded-lg border border-slate-200">
              <h4 className="font-bold text-slate-900 mb-2">Primary Legislation</h4>
              <a 
                href="https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R0956"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#02a1e8] hover:underline flex items-center gap-1"
              >
                Regulation (EU) 2023/956 <ExternalLink className="w-3 h-3" />
              </a>
              <p className="text-xs text-slate-600 mt-1">Main CBAM regulation establishing the mechanism</p>
            </div>
            
            <div className="p-4 bg-white rounded-lg border border-slate-200">
              <h4 className="font-bold text-slate-900 mb-2">Implementing Regulation</h4>
              <a 
                href="https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R1773"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#02a1e8] hover:underline flex items-center gap-1"
              >
                Regulation (EU) 2023/1773 <ExternalLink className="w-3 h-3" />
              </a>
              <p className="text-xs text-slate-600 mt-1">Reporting methodology and technical specifications</p>
            </div>

            <div className="p-4 bg-white rounded-lg border border-[#86b027]/30">
              <h4 className="font-bold text-slate-900 mb-2">Simplification Amendment</h4>
              <a 
                href="https://eur-lex.europa.eu/eli/reg/2025/2083/oj/eng"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#86b027] hover:underline flex items-center gap-1"
              >
                Regulation (EU) 2025/2083 <ExternalLink className="w-3 h-3" />
              </a>
              <p className="text-xs text-slate-600 mt-1">De minimis threshold & simplified procedures (Oct 2025)</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-amber-900 mb-1">Transitional Period: 1 Oct 2023 - 31 Dec 2025</p>
                  <p className="text-amber-800">
                    Reporting obligation only. No financial payment or certificate surrender required.
                    Quarterly CBAM reports must be submitted via EU Transitional Registry within one month after end of quarter.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-[#86b027]/10 border border-[#86b027]/30 rounded-lg">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#86b027] mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-slate-900 mb-1">Simplification 2025/2083 (Oct 2025)</p>
                  <p className="text-slate-700">
                    50-tonne de minimis threshold exempts small importers (~90% of declarants). 
                    Country-specific defaults with 10-30% mark-ups. Production route benchmarks finalized Dec 10, 2025.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Compliance Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-slate-900">Authorized CBAM Declarant Status</p>
                <p className="text-sm text-slate-600">Must be authorized per Article 5. Apply through national customs authority.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-slate-400 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-slate-900">CBAM Transitional Registry Access</p>
                <p className="text-sm text-slate-600">Request access via National Competent Authority (NCA)</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-slate-400 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-slate-900">Quarterly Reporting Process Established</p>
                <p className="text-sm text-slate-600">Implement process to collect embedded emissions data from suppliers</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-slate-400 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-slate-900">Calculation Methodology Defined</p>
                <p className="text-sm text-slate-600">Choose between EU method, equivalent method, or default values (conditions apply)</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Official Resources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Button variant="outline" className="w-full justify-start" asChild>
              <a href="https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism_en" target="_blank">
                <FileText className="w-4 h-4 mr-2" />
                EU Commission CBAM Portal
                <ExternalLink className="w-3 h-3 ml-auto" />
              </a>
            </Button>
            
            <Button variant="outline" className="w-full justify-start" asChild>
              <a href="https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism/cbam-registry-and-reporting_en" target="_blank">
                <FileText className="w-4 h-4 mr-2" />
                CBAM Registry & Reporting Guide
                <ExternalLink className="w-3 h-3 ml-auto" />
              </a>
            </Button>

            <Button variant="outline" className="w-full justify-start" asChild>
              <a href="https://taxation-customs.ec.europa.eu/system/files/2023-12/Default%20values%20transitional%20period.pdf" target="_blank">
                <FileText className="w-4 h-4 mr-2" />
                Default Values - Transitional (Dec 2023)
                <ExternalLink className="w-3 h-3 ml-auto" />
              </a>
            </Button>

            <Button variant="outline" className="w-full justify-start" asChild>
              <a href="https://eurometal.net/eu-commission-finalizes-cbam-benchmarks-default-values-ahead-of-january-2026-launch/" target="_blank">
                <FileText className="w-4 h-4 mr-2" />
                Final Benchmarks 2026+ (Dec 10, 2025)
                <ExternalLink className="w-3 h-3 ml-auto" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}