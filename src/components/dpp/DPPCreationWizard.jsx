import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ChevronRight, Check, Package, Factory, Leaf, Scale, FileCheck, QrCode, Sparkles, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { suggestMaterialComposition, calculateRecyclabilityScore, suggestComplianceDeclarations, fetchPCFData } from './DPPAIService';
import { validateDPPData, validateMaterialComposition } from './DPPValidationService';
import { calculateProductCarbonFootprint, calculateEnvironmentalFootprint, calculateCircularityIndex } from './DPPCalculationEngine';
import { calculateDataQualityScore, validateField } from './DPPDataQualityService';
import { getPublicationReadiness, AUTO_PUBLISH_THRESHOLDS } from './DPPAutoPublishService';
import DPPValidationPanel from './DPPValidationPanel';
import DPPAnomalyDetector from './DPPAnomalyDetector';
import DPPDataQualityPanel from './DPPDataQualityPanel';
import ECGTComplianceValidator from './ECGTComplianceValidator';
import DPPAutoPublishPrompt from './DPPAutoPublishPrompt';
import DPPScheduledPublisher from './DPPScheduledPublisher';
import MaterialInputForm from './MaterialInputForm';
import SustainabilityCalculator from './SustainabilityCalculator';
import CircularityCalculator from './CircularityCalculator';
import DPPEvidenceVault from './DPPEvidenceVault';
import DPPBlockchainTracker from './DPPBlockchainTracker';
import { DPP_CATEGORIES, getCategoryTemplate } from './DPPCategoryTemplates';
import { createDPPAuditLog } from './BlockchainService';

export default function DPPCreationWizard({ open, onOpenChange, product, existingDPP }) {
  const [step, setStep] = useState(0);
  const [dppData, setDppData] = useState({
    general_info: {},
    category: product?.category || '',
    material_composition: [],
    supply_chain_info: {},
    sustainability_info: {},
    circularity_metrics: {},
    compliance_declarations: [],
    eol_instructions: ''
  });
  const [categoryTemplate, setCategoryTemplate] = useState(null);
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [dataQualityResult, setDataQualityResult] = useState(null);
  const [showAutoPublishPrompt, setShowAutoPublishPrompt] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [publicationReadiness, setPublicationReadiness] = useState(null);

  const queryClient = useQueryClient();

  // Fetch related data
  const { data: components = [] } = useQuery({
    queryKey: ['product-components', product?.id],
    queryFn: () => base44.entities.ProductComponent.list(),
    enabled: !!product
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list()
  });

  const { data: supplierMappings = [] } = useQuery({
    queryKey: ['supplier-sku-mappings'],
    queryFn: () => base44.entities.SupplierSKUMapping.list()
  });

  const { data: pcfData = [] } = useQuery({
    queryKey: ['pcf-data', product?.id],
    queryFn: () => base44.entities.Product.list(),
    enabled: !!product
  });

  useEffect(() => {
    if (product && open) {
      initializeDPPData();
    }
  }, [product, open, components, suppliers, supplierMappings]);

  useEffect(() => {
    if (dppData.category) {
      const template = getCategoryTemplate(dppData.category);
      setCategoryTemplate(template);
      
      // Apply template defaults
      setDppData(prev => ({
        ...prev,
        eol_instructions: prev.eol_instructions || template.eol_instructions_template,
        circularity_metrics: {
          ...prev.circularity_metrics,
          expected_lifetime_years: prev.circularity_metrics.expected_lifetime_years || template.typical_lifetime_years
        }
      }));

      // Calculate data quality on category change
      calculateQuality({ ...dppData, category: dppData.category }, template);
    }
  }, [dppData.category]);

  // Calculate quality when navigating to quality check step
  useEffect(() => {
    if (step === 6 && categoryTemplate) {
      calculateQuality(dppData, categoryTemplate);
    }
  }, [step]);

  const calculateQuality = (data, template) => {
    try {
      const qualityResult = calculateDataQualityScore(data, template);
      setDataQualityResult(qualityResult);

      // Check publication readiness and trigger auto-publish prompt
      const readiness = getPublicationReadiness(data, qualityResult);
      setPublicationReadiness(readiness);

      // Show auto-publish prompt if quality threshold met and not already shown
      if (readiness.can_publish && 
          qualityResult.overall_score >= AUTO_PUBLISH_THRESHOLDS.GOOD &&
          step >= 6 && 
          !showAutoPublishPrompt) {
        setShowAutoPublishPrompt(true);
      }
    } catch (error) {
      console.error('Quality calculation error:', error);
    }
  };

  const initializeDPPData = async () => {
    const productComponents = components.filter(c => c.product_id === product.id);
    const productMappings = supplierMappings.filter(m => m.sku_id === product.id);
    
    // Extract material composition
    const materials = productComponents.map(comp => ({
      material: comp.material_type || comp.name,
      percentage: comp.weight_kg ? (comp.weight_kg / (product.weight_kg || 1)) * 100 : 0,
      recyclable: comp.recyclable || false,
      hazardous: comp.contains_hazardous || false,
      cas_number: comp.cas_number
    }));

    // Get suppliers from mappings
    const linkedSuppliers = productMappings.map(m => {
      const supplier = suppliers.find(s => s.id === m.supplier_id);
      return {
        name: supplier?.legal_name,
        country: supplier?.country,
        role: m.relationship_type
      };
    });

    // Fetch PCF data
    const pcfData = await fetchPCFData(product.id);

    setDppData({
      category: product.category || '',
      general_info: {
        product_name: product.name,
        sku: product.sku,
        gtin: product.gtin,
        manufacturer: linkedSuppliers.find(s => s.role === 'manufacturer')?.name || product.manufacturer || 'Unknown',
        category: product.category,
        description: product.description
      },
      material_composition: materials,
      supply_chain_info: {
        suppliers: linkedSuppliers,
        manufacturing_country: linkedSuppliers[0]?.country || 'Unknown'
      },
      sustainability_info: {
        carbon_footprint_kg: pcfData.carbon_footprint_kg,
        water_usage_liters: 0,
        energy_consumption_kwh: 0,
        pcf_source: pcfData.source
      },
      circularity_metrics: {
        recyclability_score: materials.length > 0 ? calculateRecyclabilityScore(materials) : 0,
        recycled_content_percentage: 0,
        repairability_index: 0,
        expected_lifetime_years: product.expected_lifetime || 5
      },
      compliance_declarations: [],
      eol_instructions: ''
    });
  };

  const handleAISuggestMaterials = async () => {
    if (!product) return;
    
    setIsAIProcessing(true);
    toast.loading('AI analyzing product for material composition...');
    
    try {
      const productMappings = supplierMappings.filter(m => m.sku_id === product.id);
      const linkedSuppliers = productMappings.map(m => suppliers.find(s => s.id === m.supplier_id)).filter(Boolean);
      const productComponents = components.filter(c => c.product_id === product.id);
      
      const suggestedMaterials = await suggestMaterialComposition(product, linkedSuppliers, productComponents);
      
      const recyclabilityScore = calculateRecyclabilityScore(suggestedMaterials);
      
      setDppData({
        ...dppData,
        material_composition: suggestedMaterials,
        circularity_metrics: {
          ...dppData.circularity_metrics,
          recyclability_score: recyclabilityScore
        }
      });
      
      toast.success('Material composition suggested by AI!');
    } catch (error) {
      toast.error('Failed to generate suggestions');
    } finally {
      setIsAIProcessing(false);
    }
  };

  const handleAISuggestCompliance = async () => {
    if (dppData.material_composition.length === 0) {
      toast.error('Please add materials first');
      return;
    }
    
    setIsAIProcessing(true);
    toast.loading('AI analyzing compliance requirements...');
    
    try {
      const declarations = await suggestComplianceDeclarations(
        dppData.material_composition,
        product.category || 'General'
      );
      
      setDppData({
        ...dppData,
        compliance_declarations: declarations
      });
      
      toast.success('Compliance declarations suggested!');
    } catch (error) {
      toast.error('Failed to generate compliance suggestions');
    } finally {
      setIsAIProcessing(false);
    }
  };

  const recalculateRecyclability = () => {
    const score = calculateRecyclabilityScore(dppData.material_composition);
    setDppData({
      ...dppData,
      circularity_metrics: {
        ...dppData.circularity_metrics,
        recyclability_score: score
      }
    });
    toast.success(`Recyclability score calculated: ${score}/10`);
  };

  const saveDPPMutation = useMutation({
    mutationFn: async (finalData) => {
      // Ensure user is available
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Use GTIN as DPP ID if available, otherwise generate
      const dppId = existingDPP?.dpp_id || dppData.general_info.gtin || `DPP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Generate QR Code
      const qrPrompt = `Generate a QR code image for Digital Product Passport ID: ${dppId}`;
      const qrResult = await base44.integrations.Core.GenerateImage({ prompt: qrPrompt });
      
      const payload = {
        product_id: product.id,
        dpp_id: dppId,
        gtin: dppData.general_info.gtin,
        status: finalData.publish ? 'published' : 'draft',
        data_carrier_type: 'QR',
        version: existingDPP?.version ? (parseFloat(existingDPP.version) + 0.1).toFixed(1) : '1.0',
        qr_code_url: qrResult.url,
        publication_url: finalData.publish ? `${window.location.origin}/public-dpp?id=${dppId}` : null,
        last_updated: new Date().toISOString(),
        is_public: finalData.publish,
        category: dppData.category,
        ...dppData
      };

      let result;
      if (existingDPP) {
        result = await base44.entities.DPPRecord.update(existingDPP.id, payload);
        // Create blockchain audit log for update
        try {
          await createDPPAuditLog(dppId, product.id, 'updated', { previous: existingDPP, new: payload }, user);
        } catch (error) {
          console.warn('Audit log creation failed, continuing...', error);
        }
      } else {
        result = await base44.entities.DPPRecord.create(payload);
        // Create blockchain audit log for creation
        try {
          await createDPPAuditLog(dppId, product.id, 'created', { data: payload }, user);
        } catch (error) {
          console.warn('Audit log creation failed, continuing...', error);
        }
      }

      if (finalData.publish) {
        try {
          await createDPPAuditLog(dppId, product.id, 'published', { publication_url: payload.publication_url }, user);
        } catch (error) {
          console.warn('Audit log creation failed, continuing...', error);
        }
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dpp-records'] });
      toast.success('Digital Product Passport created successfully!');
      onOpenChange(false);
    },
    onError: () => {
      toast.error('Failed to create DPP');
    }
  });

  const handleValidate = async () => {
    setIsAIProcessing(true);
    toast.loading('Validating DPP data...');
    
    try {
      const result = await validateDPPData(dppData, product);
      setValidationResult(result);
      
      if (result.is_compliant) {
        toast.success('DPP data is compliant!');
      } else {
        toast.warning(`Validation score: ${result.overall_score}/100`);
      }
    } catch (error) {
      toast.error('Validation failed');
    } finally {
      setIsAIProcessing(false);
    }
  };

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const steps = [
    { id: 0, name: 'Product Info', icon: Package },
    { id: 1, name: 'Materials', icon: Factory },
    { id: 2, name: 'Sustainability', icon: Leaf },
    { id: 3, name: 'Circularity', icon: Scale },
    { id: 4, name: 'Compliance', icon: FileCheck },
    { id: 5, name: 'Evidence', icon: FileCheck },
    { id: 6, name: 'Quality Check', icon: ShieldCheck },
    { id: 7, name: 'Publish', icon: QrCode }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Digital Product Passport - {product?.name}</DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            const isActive = step === idx;
            const isCompleted = step > idx;
            return (
              <div key={s.id} className="flex items-center flex-1">
                <div className={`flex flex-col items-center gap-2 ${idx < steps.length - 1 ? 'flex-1' : ''}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                    isCompleted ? 'bg-emerald-500 border-emerald-500' :
                    isActive ? 'bg-[#86b027] border-[#86b027]' : 'bg-white border-slate-300'
                  }`}>
                    {isCompleted ? <Check className="w-5 h-5 text-white" /> : <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />}
                  </div>
                  <span className={`text-xs font-medium ${isActive ? 'text-[#86b027]' : 'text-slate-500'}`}>{s.name}</span>
                </div>
                {idx < steps.length - 1 && (
                  <div className={`h-0.5 flex-1 ${isCompleted ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Real-time Data Quality Indicator */}
        {dataQualityResult && step > 0 && step < 7 && (
          <div className="mb-4 p-3 bg-gradient-to-r from-slate-50 to-white border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`text-2xl font-bold ${
                  dataQualityResult.overall_score >= 90 ? 'text-emerald-600' :
                  dataQualityResult.overall_score >= 80 ? 'text-green-600' :
                  dataQualityResult.overall_score >= 70 ? 'text-yellow-600' :
                  dataQualityResult.overall_score >= 60 ? 'text-orange-600' :
                  'text-red-600'
                }`}>
                  {dataQualityResult.overall_score}%
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">Data Quality Score</div>
                  <div className="text-xs text-slate-500">
                    Grade {dataQualityResult.grade.grade} - {dataQualityResult.grade.label}
                  </div>
                </div>
              </div>
              <div className="text-right text-xs">
                {dataQualityResult.recommendations.critical_issues.length > 0 && (
                  <div className="text-red-600 font-medium">
                    {dataQualityResult.recommendations.critical_issues.length} critical issue{dataQualityResult.recommendations.critical_issues.length > 1 ? 's' : ''}
                  </div>
                )}
                {dataQualityResult.recommendations.warning_issues.length > 0 && (
                  <div className="text-yellow-600">
                    {dataQualityResult.recommendations.warning_issues.length} warning{dataQualityResult.recommendations.warning_issues.length > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Auto-Publish Prompt */}
        {showAutoPublishPrompt && publicationReadiness && step === 6 && (
          <div className="mb-4">
            <DPPAutoPublishPrompt
              qualityScore={dataQualityResult?.overall_score}
              readinessStatus={publicationReadiness}
              onPublishNow={() => {
                setShowAutoPublishPrompt(false);
                setStep(7);
              }}
              onSchedule={() => {
                setShowAutoPublishPrompt(false);
                setShowScheduleDialog(true);
              }}
              onDismiss={() => setShowAutoPublishPrompt(false)}
            />
          </div>
        )}

        {/* Step Content */}
        <div className="min-h-[400px]">
          {step === 0 && (
            <div className="space-y-4">
              <h3 className="font-bold text-lg">General Product Information</h3>

              {/* CRITICAL: Category Selection FIRST */}
              <div className="bg-gradient-to-r from-rose-50 to-orange-50 border-2 border-rose-300 p-4 rounded-lg">
                <Label className="text-base font-bold text-rose-900 mb-2 block flex items-center gap-2">
                  <span className="text-rose-600">⚠️</span> Product Category * (Required)
                </Label>
                <Select 
                  value={dppData.category} 
                  onValueChange={(v) => setDppData({...dppData, category: v})}
                >
                  <SelectTrigger className={`bg-white ${!dppData.category ? 'border-rose-400 border-2' : ''}`}>
                    <SelectValue placeholder="⚠️ SELECT CATEGORY FIRST - This is mandatory!" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(DPP_CATEGORIES).map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-rose-700 mt-2 font-medium">
                  🔴 MANDATORY: Category determines required data fields, calculations, compliance requirements, and data quality scoring methodology
                </p>

                {!dppData.category && (
                  <div className="mt-3 p-3 bg-rose-100 rounded border border-rose-200">
                    <p className="text-xs font-bold text-rose-800">⚠️ Please select a category before proceeding</p>
                  </div>
                )}

                {categoryTemplate && (
                  <div className="mt-3 p-3 bg-white rounded border border-emerald-200">
                    <p className="text-xs font-bold text-emerald-800 mb-1">✅ Template Applied:</p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                      <div>✓ {categoryTemplate.compliance.length} compliance checks</div>
                      <div>✓ {categoryTemplate.required_materials.length} material fields</div>
                      <div>✓ Lifetime: {categoryTemplate.typical_lifetime_years}y</div>
                      <div>✓ {categoryTemplate.sustainability_metrics.length} metrics</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Product Name</Label>
                  <Input value={dppData.general_info.product_name} readOnly />
                </div>
                <div>
                  <Label>SKU</Label>
                  <Input value={dppData.general_info.sku} readOnly />
                </div>
                <div>
                  <Label>GTIN / Barcode *</Label>
                  <Input 
                    value={dppData.general_info.gtin || ''} 
                    onChange={(e) => setDppData({...dppData, general_info: {...dppData.general_info, gtin: e.target.value}})}
                    placeholder="Enter Global Trade Item Number (e.g., 5901234123457)"
                  />
                  <p className="text-xs text-blue-600 mt-1">
                    💡 GTIN is the unique global identifier (barcode) for this product
                  </p>
                </div>
                <div>
                  <Label>Manufacturer</Label>
                  <Input 
                    value={dppData.general_info.manufacturer} 
                    onChange={(e) => setDppData({...dppData, general_info: {...dppData.general_info, manufacturer: e.target.value}})}
                  />
                </div>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-sm mt-4">
                ✅ Product information extracted from SupplyLens. Update as needed.
              </div>
            </div>
          )}

          {step === 1 && (
            <MaterialInputForm 
              materials={dppData.material_composition}
              onChange={(materials) => setDppData({...dppData, material_composition: materials})}
              productWeight={product?.weight_kg}
              categoryTemplate={categoryTemplate}
            />
          )}

          {step === 2 && (
            <SustainabilityCalculator 
              productId={product?.id}
              materials={dppData.material_composition}
              sustainabilityInfo={dppData.sustainability_info}
              onChange={(info) => setDppData({...dppData, sustainability_info: info})}
              categoryTemplate={categoryTemplate}
            />
          )}

          {step === 3 && (
            <div className="space-y-4">
              <CircularityCalculator 
                materials={dppData.material_composition}
                circularityMetrics={dppData.circularity_metrics}
                onChange={(metrics) => setDppData({...dppData, circularity_metrics: metrics})}
                categoryTemplate={categoryTemplate}
              />
              <div>
                <Label>End-of-Life Instructions for Consumers & Recyclers</Label>
                <textarea 
                  className="w-full p-3 border rounded-lg text-sm"
                  rows="6"
                  placeholder="Detailed instructions:&#10;• How to return the product&#10;• Recycling locations&#10;• Material separation guidelines&#10;• Partner recycling programs&#10;• Incentives or deposit return schemes"
                  value={dppData.eol_instructions}
                  onChange={(e) => setDppData({...dppData, eol_instructions: e.target.value})}
                />
                <p className="text-xs text-blue-600 mt-2">
                  💡 These instructions will be displayed on the public DPP for consumers and waste management partners
                </p>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <DPPEvidenceVault 
                dppId={existingDPP?.dpp_id}
                productId={product?.id}
              />
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg">Compliance & Certifications</h3>
                  <p className="text-sm text-slate-600">Declare compliance with ESPR and other regulations</p>
                </div>
                <Button 
                  onClick={handleAISuggestCompliance} 
                  disabled={isAIProcessing}
                  size="sm"
                  variant="outline"
                  className="gap-2"
                >
                  {isAIProcessing ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>
                  ) : (
                    <><Sparkles className="w-4 h-4" /> AI Suggest</>
                  )}
                </Button>
              </div>
              {dppData.compliance_declarations.length > 0 ? (
                <div className="space-y-3">
                  {dppData.compliance_declarations.map((dec, idx) => (
                    <div key={idx} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold">{dec.regulation}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          dec.status === 'Compliant' ? 'bg-emerald-100 text-emerald-700' : 
                          dec.status === 'Requires Testing' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>{dec.status}</span>
                      </div>
                      <p className="text-sm text-slate-600">{dec.description}</p>
                      {dec.testing_required && (
                        <p className="text-xs text-amber-600 mt-2">⚠️ Testing required</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {['ESPR', 'REACH', 'RoHS', 'WEEE', 'Energy Label'].map(reg => (
                    <div key={reg} className="flex items-center justify-between p-4 border rounded-lg">
                      <span className="font-medium">{reg}</span>
                      <span className="text-sm text-slate-400">No declaration</span>
                    </div>
                  ))}
                  <p className="text-center text-slate-400 text-sm">Click "AI Suggest" to analyze compliance</p>
                </div>
              )}
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <DPPEvidenceVault 
                dppId={existingDPP?.dpp_id}
                productId={product?.id}
              />
            </div>
          )}

          {step === 6 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg">Data Quality Assessment</h3>
              </div>

              <p className="text-sm text-slate-600">
                Real-time data quality scoring with completeness, accuracy, consistency, and recency checks
              </p>

              {dataQualityResult && (
                <DPPDataQualityPanel qualityResult={dataQualityResult} />
              )}

              <div className="mt-6">
                <h4 className="font-bold text-base mb-3">ESPR Compliance Validation</h4>
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm text-slate-600">Run comprehensive validation against ESPR and Cirpass standards</p>
                  <Button onClick={handleValidate} disabled={isAIProcessing} variant="outline" size="sm">
                    {isAIProcessing ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Validating...</>
                    ) : (
                      <><ShieldCheck className="w-4 h-4 mr-2" /> Run Deep Validation</>
                    )}
                  </Button>
                </div>

                {validationResult ? (
                  <DPPValidationPanel validationResult={validationResult} />
                ) : (
                  <div className="text-center py-6 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
                    <ShieldCheck className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                    <p className="text-sm text-slate-500">Click "Run Deep Validation" for AI-powered compliance check</p>
                  </div>
                )}
              </div>

              <DPPAnomalyDetector dppData={dppData} productCategory={product?.category || 'General'} />
            </div>
          )}

          {step === 7 && (
            <div className="space-y-4">
              <h3 className="font-bold text-lg">Review & Publish</h3>

              {/* Publication Readiness Status */}
              {publicationReadiness && dataQualityResult && (
                <div className={`p-4 rounded-lg border-2 ${
                  publicationReadiness.can_publish 
                    ? 'bg-green-50 border-green-300' 
                    : 'bg-orange-50 border-orange-300'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {publicationReadiness.can_publish ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-orange-600" />
                    )}
                    <span className="font-bold text-lg">
                      {publicationReadiness.message}
                    </span>
                  </div>
                  <div className="text-sm text-slate-700">
                    Data Quality: <strong>{dataQualityResult.overall_score}%</strong> (Grade {dataQualityResult.grade.grade})
                  </div>
                </div>
              )}

              {existingDPP && (
                <DPPBlockchainTracker dppId={existingDPP.dpp_id} />
              )}

              <div className="bg-slate-50 p-6 rounded-lg border space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-600">Product:</span>
                  <span className="font-bold">{dppData.general_info.product_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Category:</span>
                  <span className="font-bold">{dppData.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Materials Traced:</span>
                  <span className="font-bold">{dppData.material_composition.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Carbon Footprint:</span>
                  <span className="font-bold">{dppData.sustainability_info.carbon_footprint_kg} kg CO2e</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Circularity Score:</span>
                  <span className="font-bold">{dppData.circularity_metrics.recyclability_score}/10</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Data Quality:</span>
                  <span className="font-bold">{dataQualityResult?.overall_score}%</span>
                </div>
              </div>
              <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded">
                ⚠️ Once published, this DPP will be publicly accessible via QR code
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-6 border-t">
          <Button variant="outline" onClick={() => step > 0 && setStep(step - 1)} disabled={step === 0}>
            Back
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => saveDPPMutation.mutate({ publish: false })}>
              Save as Draft
            </Button>
            {step < 7 ? (
              <Button 
                className="bg-[#86b027] hover:bg-[#769c22]" 
                onClick={() => setStep(step + 1)}
                disabled={step === 0 && !dppData.category}
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <>
                <Button 
                  variant="outline"
                  onClick={() => setShowScheduleDialog(true)}
                  className="border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Schedule
                </Button>
                <Button 
                  className="bg-emerald-500 hover:bg-emerald-600" 
                  onClick={() => saveDPPMutation.mutate({ publish: true })}
                  disabled={!publicationReadiness?.can_publish}
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  Publish Now
                </Button>
              </>
            )}
          </div>
        </div>
        </DialogContent>

        {/* Scheduled Publisher Dialog */}
        <DPPScheduledPublisher
        open={showScheduleDialog}
        onOpenChange={setShowScheduleDialog}
        dppId={existingDPP?.dpp_id || `DPP-${Date.now()}`}
        productId={product?.id}
        qualityScore={dataQualityResult?.overall_score || 0}
        onScheduled={() => {
          toast.success('Publication scheduled. You can close the wizard.');
          onOpenChange(false);
        }}
        />
        </Dialog>
        );
        }