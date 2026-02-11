/**
 * CBAM CONSTANTS - DECEMBER 2025 COMPLIANT
 * Based on:
 * - Regulation (EU) 2023/956 (Base CBAM Regulation)
 * - Regulation (EU) 2025/2083 (Simplification - Oct 2025)
 * - Commission Implementing Regulation (EU) 2023/1773 (Reporting methodology)
 * - EC Default Values (Dec 2023) + Final Benchmarks (Dec 10, 2025)
 * 
 * LAST UPDATED: December 13, 2025
 */

// ============================================================================
// REGULATORY THRESHOLDS (Regulation 2025/2083 - Oct 2025)
// ============================================================================

/**
 * DE MINIMIS THRESHOLD - Article 2a of Regulation 2025/2083
 * Importers with total annual imports ≤ 50 tonnes of CBAM goods are EXEMPT
 * Cumulative across all CBAM sectors (iron/steel, aluminium, fertilizers, cement)
 * Exempts ~90% of importers while covering 99% of emissions
 */
export const CBAM_DE_MINIMIS_THRESHOLD = 50; // tonnes per year

// ============================================================================
// OFFICIAL EU CBAM SCOPE - Annex I of Regulation 2023/956
// ============================================================================

export const CBAM_SCOPE_CODES = {
  // IRON & STEEL - IRON ORES
  '26011100': 'Iron ores and concentrates - Non-agglomerated',
  '26011200': 'Iron ores and concentrates - Agglomerated',
  
  // IRON & STEEL - PIG IRON AND CRUDE FORMS
  '72011000': 'Pig iron - Non-alloy, containing by weight ≤ 0.5% phosphorus',
  '72015000': 'Pig iron - Alloy; spiegeleisen',
  '72021100': 'Ferro-manganese - containing by weight > 2% carbon',
  '72021900': 'Ferro-manganese - other',
  '72022100': 'Ferro-silicon - containing by weight > 55% silicon',
  '72022900': 'Ferro-silicon - other',
  '72023000': 'Ferro-silico-manganese',
  '72024100': 'Ferro-chromium - containing by weight > 4% carbon',
  '72024900': 'Ferro-chromium - other',
  '72025000': 'Ferro-silico-chromium',
  '72026000': 'Ferro-nickel',
  '72027000': 'Ferro-molybdenum',
  '72028000': 'Ferro-tungsten and ferro-silico-tungsten',
  '72029100': 'Ferro-titanium and ferro-silico-titanium',
  '72029200': 'Ferro-vanadium',
  '72029300': 'Ferro-niobium',
  '72029900': 'Other ferro-alloys',
  '72031000': 'Ferrous products - sponge iron or pellets',
  '72039000': 'Ferrous products - other direct-reduced iron',
  
  // CRUDE STEEL
  '72061000': 'Ingots - iron or non-alloy steel',
  '72069000': 'Other primary forms - iron or non-alloy steel',
  
  // SEMI-FINISHED STEEL
  '72071100': 'Semi-finished - iron/non-alloy steel, rectangular cross-section, < 0.25% C',
  '72071200': 'Semi-finished - iron/non-alloy steel, rectangular, 0.25-0.6% C',
  '72071900': 'Semi-finished - iron/non-alloy steel, other cross-section',
  '72072000': 'Semi-finished - iron/non-alloy steel, 0.25% C or more',
  
  // HOT-ROLLED FLAT PRODUCTS
  '72081000': 'Flat-rolled - iron/non-alloy steel, coils, hot-rolled, pickled, width ≥ 600mm',
  '72082500': 'Flat-rolled - iron/non-alloy steel, coils, acid-treated, thickness ≥ 4.75mm',
  '72082600': 'Flat-rolled - iron/non-alloy steel, coils, acid-treated, 3mm ≤ thickness < 4.75mm',
  '72082700': 'Flat-rolled - iron/non-alloy steel, coils, acid-treated, thickness < 3mm',
  '72083600': 'Flat-rolled - iron/non-alloy steel, coils, not acid-treated, thickness > 10mm',
  '72083700': 'Flat-rolled - iron/non-alloy steel, coils, 4.75mm ≤ thickness ≤ 10mm',
  '72083800': 'Flat-rolled - iron/non-alloy steel, coils, 3mm ≤ thickness < 4.75mm',
  '72083900': 'Flat-rolled - iron/non-alloy steel, coils, thickness < 3mm',
  '72084000': 'Flat-rolled - iron/non-alloy steel, not in coils, not further worked, width > 150mm',
  '72085100': 'Flat-rolled - iron/non-alloy steel, not in coils, thickness > 10mm',
  '72085200': 'Flat-rolled - iron/non-alloy steel, not in coils, 4.75mm ≤ thickness ≤ 10mm',
  '72085300': 'Flat-rolled - iron/non-alloy steel, not in coils, 3mm ≤ thickness < 4.75mm',
  '72085400': 'Flat-rolled - iron/non-alloy steel, not in coils, thickness < 3mm',
  '72089000': 'Flat-rolled - iron/non-alloy steel, other width',
  
  // COLD-ROLLED FLAT PRODUCTS
  '72091500': 'Flat-rolled - iron/non-alloy steel, coils, cold-rolled, thickness ≥ 3mm',
  '72091600': 'Flat-rolled - iron/non-alloy steel, coils, 1mm < thickness < 3mm',
  '72091700': 'Flat-rolled - iron/non-alloy steel, coils, 0.5mm ≤ thickness ≤ 1mm',
  '72091800': 'Flat-rolled - iron/non-alloy steel, coils, thickness < 0.5mm',
  '72092500': 'Flat-rolled - iron/non-alloy steel, not in coils, thickness ≥ 3mm',
  '72092600': 'Flat-rolled - iron/non-alloy steel, not in coils, 1mm < thickness < 3mm',
  '72092700': 'Flat-rolled - iron/non-alloy steel, not in coils, 0.5mm ≤ thickness ≤ 1mm',
  '72092800': 'Flat-rolled - iron/non-alloy steel, not in coils, thickness < 0.5mm',
  
  // PLATED/COATED FLAT PRODUCTS
  '72101100': 'Flat-rolled - iron/non-alloy steel, tin-plated, thickness ≥ 0.5mm',
  '72101200': 'Flat-rolled - iron/non-alloy steel, tin-plated, thickness < 0.5mm',
  '72102000': 'Flat-rolled - iron/non-alloy steel, lead-plated',
  '72103000': 'Flat-rolled - iron/non-alloy steel, electrolytically zinc-coated',
  '72104100': 'Flat-rolled - iron/non-alloy steel, otherwise zinc-coated, corrugated',
  '72104900': 'Flat-rolled - iron/non-alloy steel, otherwise zinc-coated, other',
  '72106100': 'Flat-rolled - iron/non-alloy steel, aluminium-zinc alloy coated',
  '72106900': 'Flat-rolled - iron/non-alloy steel, aluminium-coated',
  '72107000': 'Flat-rolled - iron/non-alloy steel, painted/varnished/plastic coated',
  '72109000': 'Flat-rolled - iron/non-alloy steel, otherwise plated/coated',
  
  // BARS AND RODS
  '72131000': 'Bars and rods - hot-rolled, in irregularly wound coils',
  '72132000': 'Bars and rods - other, free-cutting steel',
  '72139100': 'Bars and rods - circular cross-section, diameter < 14mm',
  '72139900': 'Bars and rods - other',
  '72142000': 'Bars and rods - indented/ribbed from rolling',
  '72143000': 'Bars and rods - other free-cutting steel',
  '72149100': 'Bars and rods - rectangular cross-section',
  '72149900': 'Bars and rods - other',
  
  // ANGLES, SHAPES AND SECTIONS
  '72161000': 'Angles, shapes, sections - U/I/H, not further worked, height < 80mm',
  '72162100': 'Angles, shapes, sections - L, not further worked, height < 80mm',
  '72162200': 'Angles, shapes, sections - T, not further worked, height < 80mm',
  '72163100': 'Angles, shapes, sections - U, not further worked, height ≥ 80mm',
  '72163200': 'Angles, shapes, sections - I, not further worked, height ≥ 80mm',
  '72163300': 'Angles, shapes, sections - H, not further worked, height ≥ 80mm',
  '72164000': 'Angles, shapes, sections - L or T, height ≥ 80mm',
  '72165000': 'Angles, shapes, sections - other, not further worked',
  '72166100': 'Angles, shapes, sections - cold-formed from flat-rolled products',
  '72166900': 'Angles, shapes, sections - other',
  
  // WIRE
  '72171000': 'Wire - iron or non-alloy steel, not plated/coated',
  '72172000': 'Wire - iron or non-alloy steel, zinc-plated',
  '72173000': 'Wire - iron or non-alloy steel, plated/coated with other base metals',
  '72179000': 'Wire - iron or non-alloy steel, other',
  
  // STAINLESS STEEL
  '72181000': 'Stainless steel - ingots and other primary forms',
  '72189100': 'Stainless steel - semi-finished, rectangular cross-section',
  '72189900': 'Stainless steel - semi-finished, other',
  '72191100': 'Flat-rolled - stainless steel, coils, hot-rolled, width ≥ 600mm, thickness > 10mm',
  '72191200': 'Flat-rolled - stainless steel, coils, 4.75mm ≤ thickness ≤ 10mm',
  '72191300': 'Flat-rolled - stainless steel, coils, 3mm ≤ thickness < 4.75mm',
  '72191400': 'Flat-rolled - stainless steel, coils, thickness < 3mm',
  '72192100': 'Flat-rolled - stainless steel, not in coils, thickness > 10mm',
  '72192200': 'Flat-rolled - stainless steel, not in coils, 4.75mm ≤ thickness ≤ 10mm',
  '72192300': 'Flat-rolled - stainless steel, not in coils, 3mm ≤ thickness < 4.75mm',
  '72192400': 'Flat-rolled - stainless steel, not in coils, thickness < 3mm',
  
  // ALLOY STEEL
  '72241000': 'Alloy steel - ingots and other primary forms',
  '72249000': 'Alloy steel - semi-finished',
  '72251100': 'Flat-rolled - silicon-electrical steel, grain-oriented',
  '72251900': 'Flat-rolled - silicon-electrical steel, other',
  '72253000': 'Flat-rolled - high-speed steel',
  '72254000': 'Flat-rolled - other alloy steel, not further worked',
  
  // TUBES, PIPES AND HOLLOW PROFILES
  '73011000': 'Sheet piling - iron or steel',
  '73012000': 'Angles, shapes and sections - welded',
  '73021000': 'Railway or tramway track construction material - rails',
  '73029000': 'Railway or tramway track construction material - other',
  '73030000': 'Tubes, pipes and hollow profiles - cast iron',
  '73041100': 'Line pipe - seamless, stainless steel',
  '73041900': 'Line pipe - seamless, other',
  '73042200': 'Casing and tubing - seamless, stainless steel',
  '73042300': 'Casing and tubing - seamless, other',
  '73043100': 'Other tubes - seamless, cold-drawn, circular',
  '73043900': 'Other tubes - seamless, other circular',
  '73044100': 'Other tubes - seamless, stainless steel',
  '73044900': 'Other tubes - seamless, other',
  '73051100': 'Line pipe - longitudinally welded',
  '73051200': 'Casing - longitudinally welded',
  '73051900': 'Other tubes - longitudinally welded',
  '73052000': 'Casing - other welded',
  '73053100': 'Other tubes - welded, circular, stainless steel',
  '73053900': 'Other tubes - welded, circular, other',
  '73059000': 'Other tubes - welded, non-circular',
  '73061100': 'Other tubes - welded, stainless steel',
  '73061900': 'Other tubes - welded, other',
  '73062100': 'Casing and tubing - welded, stainless steel',
  '73062900': 'Casing and tubing - welded, other',
  '73063000': 'Other tubes - welded',
  '73064000': 'Other tubes - stainless steel',
  '73065000': 'Other tubes - other alloy steel',
  '73066000': 'Other tubes - other',
  '73069000': 'Other hollow profiles',
  '73071100': 'Tube or pipe fittings - cast iron',
  '73071900': 'Tube or pipe fittings - cast steel',
  '73072100': 'Tube or pipe fittings - stainless steel flanges',
  '73072200': 'Tube or pipe fittings - stainless steel threaded elbows/bends',
  '73072300': 'Tube or pipe fittings - stainless steel butt welding fittings',
  '73072900': 'Tube or pipe fittings - stainless steel other',
  '73079100': 'Tube or pipe fittings - other flanges',
  '73079200': 'Tube or pipe fittings - other threaded elbows/bends',
  '73079300': 'Tube or pipe fittings - other butt welding fittings',
  '73079900': 'Tube or pipe fittings - other',
  
  // STRUCTURES AND ARTICLES
  '73081000': 'Structures - bridges and bridge sections',
  '73082000': 'Structures - towers and lattice masts',
  '73083000': 'Structures - doors, windows and frames',
  '73084000': 'Structures - equipment for scaffolding',
  '73089000': 'Structures - other',
  '73090010': 'Reservoirs, tanks, vats - capacity > 300L, not fitted with mechanical equipment',
  '73090090': 'Reservoirs, tanks, vats - other',
  '73101000': 'Tanks, casks, drums - capacity ≥ 50L',
  '73102100': 'Cans - closed by soldering or crimping',
  '73102900': 'Cans - other',
  '73110000': 'Containers for compressed or liquefied gas',
  '73261100': 'Grinding balls and similar articles - forged or stamped',
  '73261900': 'Grinding balls - other',
  '73262000': 'Articles of iron wire',
  '73269010': 'Ladders and steps',
  '73269030': 'Pallets and similar platforms',
  '73269090': 'Other articles - iron or steel',
  
  // ALUMINIUM
  '76011010': 'Aluminium unwrought - not alloyed, minimum 99.95% Al',
  '76011090': 'Aluminium unwrought - not alloyed, other',
  '76012010': 'Aluminium unwrought - alloys, primary',
  '76012090': 'Aluminium unwrought - alloys, secondary/remelted',
  '76020000': 'Aluminium waste and scrap',
  '76031000': 'Aluminium powders - non-lamellar structure',
  '76032000': 'Aluminium powders - lamellar structure; flakes',
  '76041010': 'Aluminium bars and rods - not alloyed',
  '76041090': 'Aluminium bars and rods - alloyed',
  '76042100': 'Aluminium profiles - hollow, not alloyed',
  '76042910': 'Aluminium profiles - other, not alloyed',
  '76042990': 'Aluminium profiles - alloyed',
  '76051100': 'Aluminium wire - not alloyed, maximum cross-section > 7mm',
  '76051900': 'Aluminium wire - not alloyed, other',
  '76052100': 'Aluminium wire - alloyed, maximum cross-section > 7mm',
  '76052900': 'Aluminium wire - alloyed, other',
  '76061100': 'Aluminium plates/sheets - not alloyed, rectangular, thickness > 0.2mm',
  '76061200': 'Aluminium plates/sheets - alloyed, rectangular, thickness > 0.2mm',
  '76069100': 'Aluminium plates/sheets - not alloyed, other',
  '76069200': 'Aluminium plates/sheets - alloyed, other',
  '76071100': 'Aluminium foil - not backed, rolled not further worked, thickness ≤ 0.2mm',
  '76071900': 'Aluminium foil - not backed, other',
  '76072010': 'Aluminium foil - backed, thickness ≤ 0.021mm',
  '76072090': 'Aluminium foil - backed, other',
  '76081000': 'Aluminium tubes and pipes - not alloyed',
  '76082000': 'Aluminium tubes and pipes - alloyed',
  '76090000': 'Aluminium tube or pipe fittings',
  '76101000': 'Aluminium structures - doors, windows and frames',
  '76109000': 'Aluminium structures - other',
  '76110000': 'Aluminium reservoirs, tanks, vats - capacity > 300L',
  '76121000': 'Aluminium collapsible tubular containers',
  '76129010': 'Aluminium casks, drums, cans, boxes - capacity < 50L',
  '76129090': 'Aluminium casks, drums, cans, boxes - capacity 50-300L',
  '76130000': 'Aluminium containers for compressed or liquefied gas',
  '76141000': 'Aluminium stranded wire, cables - steel core',
  '76149000': 'Aluminium stranded wire, cables - other',
  '76161000': 'Aluminium nails, tacks, staples',
  '76169100': 'Aluminium cloth, grill, netting',
  '76169900': 'Other articles of aluminium',
  
  // FERTILIZERS
  '31021010': 'Urea - with nitrogen content ≤ 45% by weight',
  '31021090': 'Urea - with nitrogen content > 45% by weight',
  '31022100': 'Ammonium sulphate',
  '31022900': 'Double salts and mixtures of ammonium sulphate and nitrate',
  '31023010': 'Ammonium nitrate - in aqueous solution',
  '31023090': 'Ammonium nitrate - other',
  '31024010': 'Ammonium nitrate with calcium carbonate - nitrogen ≤ 28%',
  '31024090': 'Ammonium nitrate with calcium carbonate - other',
  '31025000': 'Sodium nitrate',
  '31026000': 'Double salts and mixtures of calcium nitrate and ammonium nitrate',
  '31027000': 'Calcium cyanamide',
  '31028000': 'Mixtures of urea and ammonium nitrate',
  '31029000': 'Other nitrogenous mineral or chemical fertilizers',
  '31051000': 'Fertilizers - goods in tablets or similar forms, packages ≤ 10kg',
  '31052010': 'Fertilizers - with nitrogen, phosphorus and potassium',
  '31052090': 'Fertilizers - with nitrogen and phosphorus',
  '31053000': 'Diammonium hydrogenorthophosphate',
  '31054000': 'Ammonium dihydrogenorthophosphate and mixtures',
  '31055100': 'Fertilizers - with nitrates and phosphates',
  '31055900': 'Fertilizers - other mineral or chemical, with nitrogen and phosphorus',
  '31056000': 'Fertilizers - with phosphorus and potassium',
  '31059000': 'Other fertilizers',
  
  // CEMENT AND CLINKER
  '25070010': 'Kaolin',
  '25070080': 'Other kaolinic clays',
  '25230010': 'Cement clinkers',
  '25231000': 'Portland cement - white',
  '25232100': 'Portland cement - grey, < 20 MPa',
  '25232900': 'Portland cement - grey, ≥ 20 MPa',
  '25233000': 'Aluminous cement',
  '25239000': 'Other hydraulic cements',
  '25301000': 'Vermiculite, perlite and chlorites, unexpanded',
  '25309010': 'Kieserite, epsomite',
  '25309030': 'Leucite; nepheline and nepheline syenite',
  '25309090': 'Other mineral substances',
  
  // HYDROGEN
  '28041000': 'Hydrogen',
  '28042100': 'Argon',
  '28042900': 'Other rare gases',
  '28043000': 'Nitrogen',
  '28044000': 'Oxygen',
  '28045000': 'Boron; tellurium',
  '28046100': 'Silicon - containing by weight ≥ 99.99% silicon',
  '28046900': 'Silicon - other',
  '28047000': 'Phosphorus',
  '28048000': 'Arsenic',
  '28049000': 'Selenium',
  
  // ELECTRICITY
  '27160000': 'Electrical energy'
};

export const isCBAMScope = (cnCode) => {
  if (!cnCode) return false;
  const prefix = cnCode.toString().substring(0, 4);
  return CBAM_SCOPE_CODES.hasOwnProperty(prefix);
};

export const getCBAMCategory = (cnCode) => {
  if (!cnCode) return null;
  const prefix = cnCode.toString().substring(0, 2);
  
  if (prefix === '72' || (prefix === '26' && cnCode.startsWith('2601'))) return 'Iron & Steel';
  if (prefix === '76') return 'Aluminium';
  if (prefix === '31') return 'Fertilizers';
  if (prefix === '25' && (cnCode.startsWith('2507') || cnCode.startsWith('2523') || cnCode.startsWith('2530'))) return 'Cement';
  if (prefix === '28' && cnCode.startsWith('2804')) return 'Hydrogen';
  if (prefix === '27' && cnCode.startsWith('2716')) return 'Electricity';
  
  return null;
};

// ============================================================================
// 2026 BENCHMARKS - FINAL (Approved Dec 10, 2025)
// Production route-specific benchmarks for Free Allocation Adjustment
// ============================================================================

export const CBAM_2026_BENCHMARKS = {
  // STEEL - Production route specific (tCO2e/tonne) - Dec 2025 Final
  'steel_hrc_bf_bof': { value: 1.370, route: 'BF-BOF', product: 'Hot-rolled coil', cn: '72081000', description: 'Integrated blast furnace - basic oxygen furnace' },
  'steel_hrc_dri_eaf': { value: 0.481, route: 'DRI-EAF', product: 'Hot-rolled coil', cn: '72081000', description: 'Direct reduced iron - electric arc furnace' },
  'steel_hrc_scrap_eaf': { value: 0.072, route: 'Scrap-EAF', product: 'Hot-rolled coil', cn: '72081000', description: 'Scrap-based electric arc furnace' },
  
  'steel_crc_bf_bof': { value: 1.458, route: 'BF-BOF', product: 'Cold-rolled coil', cn: '72091500', description: 'Cold-rolled from BF-BOF route' },
  'steel_crc_dri_eaf': { value: 0.533, route: 'DRI-EAF', product: 'Cold-rolled coil', cn: '72091500', description: 'Cold-rolled from DRI-EAF route' },
  'steel_crc_scrap_eaf': { value: 0.108, route: 'Scrap-EAF', product: 'Cold-rolled coil', cn: '72091500', description: 'Cold-rolled from Scrap-EAF route' },
  
  'steel_hdg_bf_bof': { value: 1.491, route: 'BF-BOF', product: 'Hot-dip galvanized coil', cn: '72104100', description: 'Zinc-coated from BF-BOF route' },
  'steel_hdg_dri_eaf': { value: 0.567, route: 'DRI-EAF', product: 'Hot-dip galvanized coil', cn: '72104100', description: 'Zinc-coated from DRI-EAF route' },
  'steel_hdg_scrap_eaf': { value: 0.141, route: 'Scrap-EAF', product: 'Hot-dip galvanized coil', cn: '72104100', description: 'Zinc-coated from Scrap-EAF route' },
  
  'steel_slab_bf_bof': { value: 1.364, route: 'BF-BOF', product: 'Steel slab', cn: '72071100', description: 'Semi-finished slab BF-BOF' },
  'steel_slab_dri_eaf': { value: 0.475, route: 'DRI-EAF', product: 'Steel slab', cn: '72071100', description: 'Semi-finished slab DRI-EAF' },
  'steel_slab_scrap_eaf': { value: 0.066, route: 'Scrap-EAF', product: 'Steel slab', cn: '72071100', description: 'Semi-finished slab Scrap-EAF' },
  
  'steel_rebar_bf_bof': { value: 1.335, route: 'BF-BOF', product: 'Rebar', cn: '72142000', description: 'Reinforcing bars BF-BOF' },
  'steel_rebar_dri_eaf': { value: 0.505, route: 'DRI-EAF', product: 'Rebar', cn: '72142000', description: 'Reinforcing bars DRI-EAF' },
  'steel_rebar_scrap_eaf': { value: 0.099, route: 'Scrap-EAF', product: 'Rebar', cn: '72142000', description: 'Reinforcing bars Scrap-EAF' },
  
  'steel_wire_rod_bf_bof': { value: 1.413, route: 'BF-BOF', product: 'Wire rod', cn: '72131000', description: 'Wire rod in coils BF-BOF' },
  'steel_wire_rod_dri_eaf': { value: 0.522, route: 'DRI-EAF', product: 'Wire rod', cn: '72131000', description: 'Wire rod in coils DRI-EAF' },
  'steel_wire_rod_scrap_eaf': { value: 0.110, route: 'Scrap-EAF', product: 'Wire rod', cn: '72131000', description: 'Wire rod in coils Scrap-EAF' },
  
  // ALUMINIUM - Production route specific
  'aluminium_primary': { value: 8.50, route: 'Primary electrolysis', product: 'Aluminium unwrought', cn: '76011010', description: 'Primary aluminium production via electrolysis' },
  'aluminium_secondary': { value: 0.45, route: 'Secondary (scrap)', product: 'Aluminium unwrought', cn: '76012090', description: 'Secondary aluminium from scrap melting' },
  
  // CEMENT - Process specific
  'cement_dry_process': { value: 0.766, route: 'Dry process', product: 'Portland cement', cn: '25232900', description: 'Dry kiln process' },
  'cement_wet_process': { value: 0.885, route: 'Wet process', product: 'Portland cement', cn: '25232900', description: 'Wet kiln process' },
  'cement_clinker': { value: 0.830, route: 'Clinker production', product: 'Cement clinker', cn: '25230010', description: 'Intermediate clinker product' },
  
  // FERTILIZERS - Process specific
  'urea': { value: 2.52, route: 'Haber-Bosch', product: 'Urea', cn: '31021010', description: 'Urea production via ammonia synthesis' },
  'ammonium_nitrate': { value: 2.18, route: 'Nitric acid', product: 'Ammonium nitrate', cn: '31023090', description: 'Ammonium nitrate production' },
  
  // HYDROGEN - Production route specific
  'hydrogen_grey': { value: 9.27, route: 'Grey (SMR)', product: 'Hydrogen', cn: '28041000', description: 'Steam methane reforming without CCS' },
  'hydrogen_blue': { value: 2.15, route: 'Blue (SMR+CCS)', product: 'Hydrogen', cn: '28041000', description: 'SMR with carbon capture (85-90%)' },
  'hydrogen_green': { value: 0.40, route: 'Green (electrolysis)', product: 'Hydrogen', cn: '28041000', description: 'Water electrolysis with renewable energy' }
};

// ============================================================================
// COUNTRY-SPECIFIC DEFAULT VALUES (2026+)
// With 10% mark-up in 2026, 20% in 2027, 30% in 2028+
// Source: EC Final Decision December 10, 2025
// ============================================================================

export const COUNTRY_DEFAULT_VALUES_2026 = {
  // STEEL HRC (tCO2e/tonne) - Base values before mark-up
  'China': { steel_hrc: 2.88, steel_slab: 3.167, aluminium_primary: 14.2 },
  'India': { steel_hrc: 3.12, steel_slab: 3.45, aluminium_primary: 15.8 },
  'Turkey': { steel_hrc: 1.95, steel_slab: 2.20, aluminium_primary: 11.5 },
  'Brazil': { steel_hrc: 1.78, steel_slab: 1.85, aluminium_primary: 9.8 },
  'Indonesia': { steel_hrc: 3.25, steel_slab: 3.50, aluminium_primary: 16.1 },
  'Russia': { steel_hrc: 2.65, steel_slab: 2.90, aluminium_primary: 13.5 },
  'Ukraine': { steel_hrc: 2.45, steel_slab: 2.70, aluminium_primary: 12.8 },
  'South Korea': { steel_hrc: 1.85, steel_slab: 2.05, aluminium_primary: 10.2 },
  'USA': { steel_hrc: 1.72, steel_slab: 1.90, aluminium_primary: 9.5 },
  'Japan': { steel_hrc: 1.68, steel_slab: 1.82, aluminium_primary: 8.9 },
  'Other': { steel_hrc: 2.50, steel_slab: 2.75, aluminium_primary: 12.0 } // Fallback
};

/**
 * Apply mark-up to default values based on year
 * 2026: +10%, 2027: +20%, 2028+: +30%
 */
export const getDefaultValueWithMarkup = (baseValue, year) => {
  const markups = {
    2026: 1.10,
    2027: 1.20,
    2028: 1.30,
    2029: 1.30,
    2030: 1.30
  };
  const markup = markups[year] || 1.30;
  return baseValue * markup;
};

// ============================================================================
// TRANSITIONAL PERIOD DEFAULT VALUES (Oct 2023 - Dec 2025)
// EC Decision 22 December 2023 - Still valid for transitional reports
// ============================================================================

export const EU_DEFAULT_VALUES_TRANSITIONAL = {
  // IRON & STEEL - Comprehensive 8-digit codes
  '26011100': { direct: 0.31, indirect: 0.05, total: 0.36, description: 'Iron ore - non-agglomerated', category: 'Iron & Steel' },
  '26011200': { direct: 0.31, indirect: 0.05, total: 0.36, description: 'Iron ore - agglomerated', category: 'Iron & Steel' },
  '72011000': { direct: 1.90, indirect: 0.17, total: 2.07, description: 'Pig iron (≤0.5% P)', category: 'Iron & Steel' },
  '72015000': { direct: 1.90, indirect: 0.17, total: 2.07, description: 'Pig iron - alloy; spiegeleisen', category: 'Iron & Steel' },
  '72021100': { direct: 1.44, indirect: 2.08, total: 3.51, description: 'Ferro-manganese (>2% C)', category: 'Iron & Steel' },
  '72021900': { direct: 1.44, indirect: 2.08, total: 3.51, description: 'Ferro-manganese (other)', category: 'Iron & Steel' },
  '72024100': { direct: 2.076, indirect: 3.38, total: 5.45, description: 'Ferro-chromium (>4% C)', category: 'Iron & Steel' },
  '72024900': { direct: 2.076, indirect: 3.38, total: 5.45, description: 'Ferro-chromium (other)', category: 'Iron & Steel' },
  '72026000': { direct: 3.486, indirect: 2.81, total: 6.26, description: 'Ferro-nickel', category: 'Iron & Steel' },
  '72031000': { direct: 4.81, indirect: 0.00, total: 4.81, description: 'Sponge iron or pellets', category: 'Iron & Steel' },
  '72039000': { direct: 4.81, indirect: 0.00, total: 4.81, description: 'DRI - other', category: 'Iron & Steel' },
  '72061000': { direct: 2.52, indirect: 0.23, total: 2.75, description: 'Crude steel ingots', category: 'Iron & Steel' },
  '72069000': { direct: 1.97, indirect: 0.23, total: 2.20, description: 'Crude steel - other primary forms', category: 'Iron & Steel' },
  '72071100': { direct: 1.54, indirect: 0.25, total: 1.79, description: 'Semi-finished - rectangular (<0.25% C)', category: 'Iron & Steel' },
  '72071200': { direct: 1.54, indirect: 0.25, total: 1.79, description: 'Semi-finished - rectangular (0.25-0.6% C)', category: 'Iron & Steel' },
  '72071900': { direct: 1.54, indirect: 0.25, total: 1.79, description: 'Semi-finished - other cross-section', category: 'Iron & Steel' },
  '72081000': { direct: 1.48, indirect: 0.31, total: 1.79, description: 'Hot-rolled coil - pickled', category: 'Iron & Steel' },
  '72082500': { direct: 1.48, indirect: 0.31, total: 1.79, description: 'Hot-rolled coil - acid-treated (≥4.75mm)', category: 'Iron & Steel' },
  '72082600': { direct: 1.48, indirect: 0.31, total: 1.79, description: 'Hot-rolled coil - acid-treated (3-4.75mm)', category: 'Iron & Steel' },
  '72082700': { direct: 1.48, indirect: 0.31, total: 1.79, description: 'Hot-rolled coil - acid-treated (<3mm)', category: 'Iron & Steel' },
  '72083600': { direct: 1.48, indirect: 0.31, total: 1.79, description: 'Hot-rolled coil - not acid (>10mm)', category: 'Iron & Steel' },
  '72083700': { direct: 1.48, indirect: 0.31, total: 1.79, description: 'Hot-rolled coil - not acid (4.75-10mm)', category: 'Iron & Steel' },
  '72083800': { direct: 1.48, indirect: 0.31, total: 1.79, description: 'Hot-rolled coil - not acid (3-4.75mm)', category: 'Iron & Steel' },
  '72083900': { direct: 1.48, indirect: 0.31, total: 1.79, description: 'Hot-rolled coil - not acid (<3mm)', category: 'Iron & Steel' },
  '72091500': { direct: 1.52, indirect: 0.31, total: 1.83, description: 'Cold-rolled coil (≥3mm)', category: 'Iron & Steel' },
  '72091600': { direct: 1.52, indirect: 0.31, total: 1.83, description: 'Cold-rolled coil (1-3mm)', category: 'Iron & Steel' },
  '72091700': { direct: 1.52, indirect: 0.31, total: 1.83, description: 'Cold-rolled coil (0.5-1mm)', category: 'Iron & Steel' },
  '72091800': { direct: 1.52, indirect: 0.31, total: 1.83, description: 'Cold-rolled coil (<0.5mm)', category: 'Iron & Steel' },
  '72101100': { direct: 1.58, indirect: 0.33, total: 1.91, description: 'Tin-plated (≥0.5mm)', category: 'Iron & Steel' },
  '72103000': { direct: 1.60, indirect: 0.34, total: 1.94, description: 'Electrolytically zinc-coated', category: 'Iron & Steel' },
  '72104100': { direct: 1.61, indirect: 0.35, total: 1.96, description: 'Otherwise zinc-coated - corrugated', category: 'Iron & Steel' },
  '72104900': { direct: 1.61, indirect: 0.35, total: 1.96, description: 'Otherwise zinc-coated - other', category: 'Iron & Steel' },
  '72131000': { direct: 1.53, indirect: 0.29, total: 1.82, description: 'Bars/rods - hot-rolled in coils', category: 'Iron & Steel' },
  '72142000': { direct: 1.51, indirect: 0.28, total: 1.79, description: 'Bars/rods - indented/ribbed (rebar)', category: 'Iron & Steel' },
  '73041900': { direct: 1.72, indirect: 0.32, total: 2.04, description: 'Line pipe - seamless', category: 'Iron & Steel' },
  '73061100': { direct: 1.68, indirect: 0.30, total: 1.98, description: 'Tubes - welded, stainless steel', category: 'Iron & Steel' },
  
  // ALUMINIUM - Comprehensive codes
  '76011010': { direct: 5.63, indirect: 11.61, total: 17.24, description: 'Aluminium unwrought - not alloyed (≥99.95%)', category: 'Aluminium' },
  '76011090': { direct: 5.63, indirect: 11.61, total: 17.24, description: 'Aluminium unwrought - not alloyed (other)', category: 'Aluminium' },
  '76012010': { direct: 4.50, indirect: 11.61, total: 16.11, description: 'Aluminium unwrought - alloyed, primary', category: 'Aluminium' },
  '76012090': { direct: 0.45, indirect: 1.20, total: 1.65, description: 'Aluminium unwrought - alloyed, secondary', category: 'Aluminium' },
  '76031000': { direct: 0.48, indirect: 1.60, total: 2.08, description: 'Aluminium powders - non-lamellar', category: 'Aluminium' },
  '76032000': { direct: 0.48, indirect: 1.60, total: 2.08, description: 'Aluminium powders - lamellar; flakes', category: 'Aluminium' },
  '76041010': { direct: 0.48, indirect: 1.60, total: 2.08, description: 'Aluminium bars/rods - not alloyed', category: 'Aluminium' },
  '76041090': { direct: 0.48, indirect: 1.60, total: 2.08, description: 'Aluminium bars/rods - alloyed', category: 'Aluminium' },
  '76061100': { direct: 0.48, indirect: 1.60, total: 2.08, description: 'Aluminium plates/sheets - not alloyed', category: 'Aluminium' },
  '76061200': { direct: 0.48, indirect: 1.60, total: 2.08, description: 'Aluminium plates/sheets - alloyed', category: 'Aluminium' },
  '76071100': { direct: 0.52, indirect: 1.75, total: 2.27, description: 'Aluminium foil - not backed (≤0.2mm)', category: 'Aluminium' },
  '76081000': { direct: 0.50, indirect: 1.65, total: 2.15, description: 'Aluminium tubes/pipes - not alloyed', category: 'Aluminium' },
  '76082000': { direct: 0.50, indirect: 1.65, total: 2.15, description: 'Aluminium tubes/pipes - alloyed', category: 'Aluminium' },
  
  // FERTILIZERS - Comprehensive codes
  '31021010': { direct: 2.52, indirect: 0.20, total: 2.72, description: 'Urea (≤45% N)', category: 'Fertilizers' },
  '31021090': { direct: 2.52, indirect: 0.20, total: 2.72, description: 'Urea (>45% N)', category: 'Fertilizers' },
  '31022100': { direct: 1.72, indirect: 0.20, total: 1.92, description: 'Ammonium sulphate', category: 'Fertilizers' },
  '31023010': { direct: 2.18, indirect: 0.20, total: 2.38, description: 'Ammonium nitrate - aqueous solution', category: 'Fertilizers' },
  '31023090': { direct: 2.18, indirect: 0.20, total: 2.38, description: 'Ammonium nitrate - other', category: 'Fertilizers' },
  '31024010': { direct: 2.05, indirect: 0.18, total: 2.23, description: 'AN with calcium carbonate (≤28% N)', category: 'Fertilizers' },
  '31028000': { direct: 2.35, indirect: 0.20, total: 2.55, description: 'Mixtures of urea and ammonium nitrate', category: 'Fertilizers' },
  '31051000': { direct: 2.20, indirect: 0.19, total: 2.39, description: 'Fertilizers in tablets (≤10kg)', category: 'Fertilizers' },
  '31052010': { direct: 2.10, indirect: 0.18, total: 2.28, description: 'NPK fertilizers', category: 'Fertilizers' },
  '31053000': { direct: 1.95, indirect: 0.17, total: 2.12, description: 'Diammonium hydrogenorthophosphate', category: 'Fertilizers' },
  
  // CEMENT - Comprehensive codes
  '25070010': { direct: 0.10, indirect: 0.02, total: 0.12, description: 'Kaolin', category: 'Cement' },
  '25230010': { direct: 0.83, indirect: 0.02, total: 0.85, description: 'Cement clinkers', category: 'Cement' },
  '25231000': { direct: 0.766, indirect: 0.019, total: 0.785, description: 'Portland cement - white', category: 'Cement' },
  '25232100': { direct: 0.679, indirect: 0.017, total: 0.696, description: 'Portland cement - grey (<20 MPa)', category: 'Cement' },
  '25232900': { direct: 0.766, indirect: 0.019, total: 0.785, description: 'Portland cement - grey (≥20 MPa)', category: 'Cement' },
  '25233000': { direct: 0.845, indirect: 0.021, total: 0.866, description: 'Aluminous cement', category: 'Cement' },
  '25239000': { direct: 0.766, indirect: 0.019, total: 0.785, description: 'Other hydraulic cements', category: 'Cement' },
  
  // HYDROGEN
  '28041000': { direct: 9.27, indirect: 0.40, total: 9.67, description: 'Hydrogen (grey - SMR)', category: 'Hydrogen' },
  
  // ELECTRICITY
  '27160000': { direct: 0.40, indirect: 0.00, total: 0.40, description: 'Electrical energy (grid mix)', category: 'Electricity' }
};

/**
 * Get default benchmark for CN code
 * For 2026+: Should use country-specific values with mark-up
 * For transitional: Use global defaults
 */
export const getDefaultBenchmark = (cnCode, country = null, year = 2026) => {
  if (!cnCode) return 2.0;
  
  // For definitive period (2026+), use country-specific
  if (year >= 2026 && country) {
    const countryDefaults = COUNTRY_DEFAULT_VALUES_2026[country] || COUNTRY_DEFAULT_VALUES_2026['Other'];
    const category = getCBAMCategory(cnCode);
    
    if (category === 'Iron & Steel') {
      const baseValue = countryDefaults.steel_hrc || 2.50;
      return getDefaultValueWithMarkup(baseValue, year);
    }
    if (category === 'Aluminium') {
      const baseValue = countryDefaults.aluminium_primary || 12.0;
      return getDefaultValueWithMarkup(baseValue, year);
    }
  }
  
  // Transitional period or no country - use global defaults
  if (EU_DEFAULT_VALUES_TRANSITIONAL[cnCode]) {
    return EU_DEFAULT_VALUES_TRANSITIONAL[cnCode].total;
  }
  
  const prefix6 = cnCode.substring(0, 6);
  if (EU_DEFAULT_VALUES_TRANSITIONAL[prefix6]) {
    return EU_DEFAULT_VALUES_TRANSITIONAL[prefix6].total;
  }
  
  const prefix4 = cnCode.substring(0, 4);
  if (EU_DEFAULT_VALUES_TRANSITIONAL[prefix4]) {
    return EU_DEFAULT_VALUES_TRANSITIONAL[prefix4].total;
  }
  
  // Category fallback
  const category = getCBAMCategory(cnCode);
  const categoryDefaults = {
    'Iron & Steel': 1.79,
    'Aluminium': 2.08,
    'Fertilizers': 2.38,
    'Cement': 0.785,
    'Hydrogen': 9.67
  };
  
  return categoryDefaults[category] || 2.0;
};

// ============================================================================
// 2026+ PHASE-IN SCHEDULE
// ⚠️ DEPRECATED: Use CBAMPhaseInReference.js instead
// This table is kept for backward compatibility only
// ============================================================================

/**
 * @deprecated Import from CBAMPhaseInReference.js instead
 * CORRECT FORMULA: Certificates = Chargeable Emissions (1:1)
 * Free Allocation (adjusted) = Benchmark × Quantity × free_allocation_remaining
 * Chargeable = Emissions - Free Allocation (adjusted)
 */
export const CBAM_PHASE_IN_SCHEDULE = {
  2026: { 
    free_allocation_remaining: 0.975,
    certificates_chargeable: 0.025,
    default_markup: 0.10,
    description: 'First definitive year - 97.5% free allocation remains'
  },
  2027: { 
    free_allocation_remaining: 0.95,
    certificates_chargeable: 0.05,
    default_markup: 0.20,
    description: '95% free allocation'
  },
  2028: { 
    free_allocation_remaining: 0.90,
    certificates_chargeable: 0.10,
    default_markup: 0.30,
    description: '90% free allocation'
  },
  2029: { 
    free_allocation_remaining: 0.775,
    certificates_chargeable: 0.225,
    default_markup: 0.30,
    description: '77.5% free allocation'
  },
  2030: { 
    free_allocation_remaining: 0.4875,
    certificates_chargeable: 0.5125,
    default_markup: 0.30,
    description: '48.75% free allocation'
  },
  2031: { 
    free_allocation_remaining: 0.29,
    certificates_chargeable: 0.71,
    default_markup: 0.30,
    description: '29% free allocation'
  },
  2032: { 
    free_allocation_remaining: 0.1225,
    certificates_chargeable: 0.8775,
    default_markup: 0.30,
    description: '12.25% free allocation'
  },
  2033: { 
    free_allocation_remaining: 0.05,
    certificates_chargeable: 0.95,
    default_markup: 0.30,
    description: '5% free allocation'
  },
  2034: { 
    free_allocation_remaining: 0.0,
    certificates_chargeable: 1.0,
    default_markup: 0.30,
    description: 'Full CBAM - no free allocation'
  }
};

// ============================================================================
// PRODUCTION ROUTES (for benchmark application)
// ============================================================================

export const PRODUCTION_ROUTES = {
  STEEL: ['BF-BOF', 'DRI-EAF', 'Scrap-EAF'],
  ALUMINIUM: ['Primary electrolysis', 'Secondary (scrap)'],
  CEMENT: ['Dry process', 'Wet process'],
  HYDROGEN: ['Grey (SMR)', 'Blue (SMR+CCS)', 'Green (electrolysis)']
};

// ============================================================================
// EU COUNTRIES (CBAM does NOT apply - Article 2)
// ============================================================================

export const EU_COUNTRIES = [
  'Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Cyprus', 'Czech Republic', 'Czechia',
  'Denmark', 'Estonia', 'Finland', 'France', 'Germany', 'Greece', 'Hungary',
  'Ireland', 'Italy', 'Latvia', 'Lithuania', 'Luxembourg', 'Malta', 'Netherlands',
  'Poland', 'Portugal', 'Romania', 'Slovakia', 'Slovenia', 'Spain', 'Sweden'
];

export const isEUCountry = (country) => {
  if (!country) return false;
  return EU_COUNTRIES.some(eu => country.toLowerCase().includes(eu.toLowerCase()));
};

// ============================================================================
// MAJOR NON-EU TRADING PARTNERS
// ============================================================================

export const COMMON_NON_EU_COUNTRIES = [
  'China', 'India', 'Turkey', 'USA', 'Russia', 'Brazil', 'South Africa',
  'Vietnam', 'Indonesia', 'Thailand', 'Malaysia', 'South Korea', 'Japan',
  'Ukraine', 'Mexico', 'Saudi Arabia', 'UAE', 'Egypt', 'Pakistan', 'Bangladesh',
  'United Kingdom', 'Norway', 'Switzerland', 'Serbia', 'Bosnia and Herzegovina'
];

export const COUNTRY_FLAGS = {
  'China': '🇨🇳', 'India': '🇮🇳', 'Turkey': '🇹🇷', 'Russia': '🇷🇺',
  'Ukraine': '🇺🇦', 'USA': '🇺🇸', 'Brazil': '🇧🇷', 'South Africa': '🇿🇦',
  'Vietnam': '🇻🇳', 'South Korea': '🇰🇷', 'Japan': '🇯🇵', 
  'United Kingdom': '🇬🇧', 'Switzerland': '🇨🇭', 'Norway': '🇳🇴',
  'Indonesia': '🇮🇩', 'Thailand': '🇹🇭', 'Malaysia': '🇲🇾',
  'Serbia': '🇷🇸', 'Mexico': '🇲🇽', 'Saudi Arabia': '🇸🇦', 'UAE': '🇦🇪'
};

// ============================================================================
// REPORTING DEADLINES (Article 6)
// ============================================================================

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

// ============================================================================
// DATA QUALITY & VALIDATION
// ============================================================================

export const VALIDATION_STATUS = {
  pending: { label: 'Pending Review', color: 'amber', icon: 'Clock' },
  validated: { label: 'Validated', color: 'emerald', icon: 'CheckCircle2' },
  flagged: { label: 'Flagged for Review', color: 'orange', icon: 'AlertTriangle' },
  rejected: { label: 'Rejected', color: 'red', icon: 'XCircle' }
};

export const DATA_QUALITY_RATINGS = {
  high: { 
    label: 'High Quality', 
    color: 'emerald', 
    description: 'Verified actual emissions from installation operator' 
  },
  medium: { 
    label: 'Medium Quality', 
    color: 'amber', 
    description: 'Default values or equivalent method' 
  },
  low: { 
    label: 'Low Quality', 
    color: 'red', 
    description: 'Estimated or incomplete data' 
  }
};

// ============================================================================
// CALCULATION METHODS (Article 7, Implementing Regulation 2023/1773)
// ============================================================================

export const CALCULATION_METHODS = {
  EU_METHOD: {
    code: 'EU_method',
    label: 'EU Method',
    description: 'Full monitoring methodology per Annex IV',
    allowed_from: '2023-10-01',
    allowed_until: null
  },
  EQUIVALENT_A: {
    code: 'Equivalent_method_A',
    label: 'Equivalent Method A',
    description: 'ISO 14064-1 or GHG Protocol',
    allowed_from: '2023-10-01',
    allowed_until: '2024-12-31'
  },
  EQUIVALENT_B: {
    code: 'Equivalent_method_B',
    label: 'Equivalent Method B',
    description: 'EU ETS monitoring',
    allowed_from: '2023-10-01',
    allowed_until: '2024-12-31'
  },
  EQUIVALENT_C: {
    code: 'Equivalent_method_C',
    label: 'Equivalent Method C',
    description: 'MRV schemes in third countries',
    allowed_from: '2023-10-01',
    allowed_until: '2024-12-31'
  },
  DEFAULT_VALUES: {
    code: 'Default_values',
    label: 'Default Values',
    description: 'EC-published default values',
    allowed_from: '2023-10-01',
    allowed_until: '2024-07-31', // Only until Q2 2024 fully
    limit_after: 0.20 // 20% max from Q3 2024 for complex goods
  }
};

// ============================================================================
// REGULATORY PHASES
// ============================================================================

export const CBAM_PHASES = {
  TRANSITIONAL: {
    start: '2023-10-01',
    end: '2025-12-31',
    description: 'Reporting only - no financial obligation',
    obligations: [
      'Quarterly CBAM reports via Transitional Registry',
      'Embedded emissions data collection (direct + indirect)',
      'Optional third-party verification'
    ],
    key_flexibilities: [
      'Choice of calculation method (until end 2024)',
      'Default values permitted (with limits from Q3 2024)',
      'No certificate purchase required'
    ]
  },
  DEFINITIVE: {
    start: '2026-01-01',
    end: null,
    description: 'Full implementation - certificate surrender required',
    obligations: [
      'Authorized CBAM declarant status (apply by March 31, 2026 for grace period)',
      'Certificate purchase at weekly EU ETS average price',
      'Annual CBAM declaration by May 31',
      'Certificate surrender by May 31',
      'Mandatory verification for actual data'
    ],
    key_rules: [
      '50-tonne de minimis threshold (annual, cumulative)',
      'Country-specific default values with penalties (10-30%)',
      'Production route-specific benchmarks for FAA',
      'Carbon price paid abroad can be deducted'
    ]
  }
};