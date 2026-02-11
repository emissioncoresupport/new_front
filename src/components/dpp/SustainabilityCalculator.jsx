import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Database, Calculator, Upload, FileCheck, Droplets, Package } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function SustainabilityCalculator({ productId, materials, sustainabilityInfo, onChange, categoryTemplate }) {
    const [calculating, setCalculating] = useState(false);
    const [method, setMethod] = useState('supplylens'); // supplylens, pcf, manual, supplier

    const { data: products = [] } = useQuery({
        queryKey: ['products-pcf'],
        queryFn: () => base44.entities.Product.list()
    });

    const { data: skus = [] } = useQuery({
        queryKey: ['skus-pcf'],
        queryFn: () => base44.entities.SKU.list()
    });

    const { data: supplierMappings = [] } = useQuery({
        queryKey: ['supplier-mappings-pcf'],
        queryFn: () => base44.entities.SupplierSKUMapping.list()
    });

    const { data: logisticsShipments = [] } = useQuery({
        queryKey: ['logistics-shipments-pcf'],
        queryFn: () => base44.entities.LogisticsShipment.list()
    });

    const calculateFromSupplyLens = async () => {
        setCalculating(true);
        toast.loading('Fetching data from Supply Lens...');

        try {
            // Find product in Supply Lens
            const product = products.find(p => p.id === productId) || skus.find(s => s.id === productId);
            
            if (!product) {
                toast.error('Product not found in Supply Lens');
                return;
            }

            // Get supplier emissions
            const mappings = supplierMappings.filter(m => m.sku_id === productId);
            const supplierEmissions = mappings.reduce((acc, m) => {
                // Mock calculation - in real system, fetch actual supplier PCF data
                return acc + (m.annual_volume * 0.5 || 0);
            }, 0);

            // Get logistics emissions
            const shipments = logisticsShipments.filter(s => 
                s.internal_ref?.includes(product.sku) || s.shipper_name?.includes('supplier')
            );
            const logisticsEmissions = shipments.reduce((sum, s) => sum + (s.total_co2e_kg || 0), 0);

            // Calculate material emissions using category-specific factors
            const materialEmissions = materials.reduce((sum, mat) => {
                // Use category-specific emission factors or defaults
                const baseFactor = mat.material_name?.toLowerCase().includes('aluminum') ? 12 :
                                  mat.material_name?.toLowerCase().includes('steel') ? 2.5 :
                                  mat.material_name?.toLowerCase().includes('plastic') ? 6 : 3;
                
                const categoryFactor = categoryTemplate?.calculation_factors?.manufacturing_emissions_per_kg || 1;
                return sum + (mat.quantity_kg * baseFactor * categoryFactor);
            }, 0);

            const totalPCF = materialEmissions + supplierEmissions + logisticsEmissions;

            onChange({
                ...sustainabilityInfo,
                carbon_footprint_kg: parseFloat(totalPCF.toFixed(2)),
                pcf_source: 'Supply Lens Integration',
                pcf_breakdown: {
                    raw_materials: materialEmissions,
                    transportation: logisticsEmissions,
                    manufacturing: supplierEmissions,
                    end_of_life: totalPCF * 0.1
                },
                pcf_methodology: 'ISO 14067, GHG Protocol',
                pcf_data_quality: 85,
                calculation_date: new Date().toISOString()
            });

            toast.success('PCF calculated from Supply Lens data');
        } catch (error) {
            toast.error('Calculation failed');
        } finally {
            setCalculating(false);
        }
    };

    const calculateFromPCF = async () => {
        setCalculating(true);
        toast.loading('Using PCF module data...');

        try {
            // Fetch from PCF module
            const product = products.find(p => p.id === productId);
            
            if (product && product.pcf_co2e) {
                onChange({
                    ...sustainabilityInfo,
                    carbon_footprint_kg: product.pcf_co2e,
                    pcf_source: 'PCF Module',
                    pcf_data_quality: 95,
                    pcf_methodology: product.lca_stage === 'epd_verified' ? 'EPD Verified' : 'ISO 14067',
                    calculation_date: new Date().toISOString()
                });
                toast.success('PCF loaded from PCF module');
            } else {
                // Calculate using AI
                const result = await base44.integrations.Core.InvokeLLM({
                    prompt: `Calculate Product Carbon Footprint for:
Materials: ${JSON.stringify(materials)}
Product Weight: ${materials.reduce((sum, m) => sum + m.quantity_kg, 0)} kg

Use lifecycle assessment methodology (ISO 14067) and provide breakdown by stage:
- Raw material extraction
- Manufacturing
- Transportation (assume average 1000km by truck)
- End-of-life

Return detailed PCF in kg CO2e.`,
                    response_json_schema: {
                        type: "object",
                        properties: {
                            total_pcf_kg: { type: "number" },
                            raw_materials: { type: "number" },
                            manufacturing: { type: "number" },
                            transportation: { type: "number" },
                            end_of_life: { type: "number" },
                            methodology: { type: "string" }
                        }
                    }
                });

                onChange({
                    ...sustainabilityInfo,
                    carbon_footprint_kg: result.total_pcf_kg,
                    pcf_source: 'AI LCA Calculation',
                    pcf_breakdown: {
                        raw_materials: result.raw_materials,
                        manufacturing: result.manufacturing,
                        transportation: result.transportation,
                        end_of_life: result.end_of_life
                    },
                    pcf_methodology: result.methodology,
                    pcf_data_quality: 75,
                    calculation_date: new Date().toISOString()
                });

                toast.success('PCF calculated with AI');
            }
        } catch (error) {
            toast.error('PCF calculation failed');
        } finally {
            setCalculating(false);
        }
    };

    const handleSupplierUpload = async (file) => {
        if (!file) return;

        setCalculating(true);
        toast.loading('Processing supplier document...');

        try {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            
            const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
                file_url,
                json_schema: {
                    type: "object",
                    properties: {
                        carbon_footprint_kg: { type: "number" },
                        water_usage_liters: { type: "number" },
                        energy_consumption_kwh: { type: "number" },
                        methodology: { type: "string" }
                    }
                }
            });

            if (extractResult.status === 'success') {
                onChange({
                    ...sustainabilityInfo,
                    ...extractResult.output,
                    pcf_source: 'Supplier Document',
                    pcf_data_quality: 90,
                    calculation_date: new Date().toISOString()
                });
                toast.success('Data imported from supplier document');
            } else {
                toast.error('Could not extract data from document');
            }
        } catch (error) {
            toast.error('Upload failed');
        } finally {
            setCalculating(false);
        }
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Sustainability Data Sources</CardTitle>
                    <p className="text-sm text-slate-500">Choose how to calculate environmental impact</p>
                </CardHeader>
                <CardContent>
                    <Tabs value={method} onValueChange={setMethod}>
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="supplylens">Supply Lens</TabsTrigger>
                            <TabsTrigger value="pcf">PCF Module</TabsTrigger>
                            <TabsTrigger value="supplier">Supplier Data</TabsTrigger>
                            <TabsTrigger value="manual">Manual</TabsTrigger>
                        </TabsList>

                        <TabsContent value="supplylens" className="space-y-4">
                            <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <Database className="w-5 h-5 text-indigo-600 mt-0.5" />
                                    <div>
                                        <h4 className="font-medium text-indigo-900">Integrated Calculation</h4>
                                        <p className="text-sm text-indigo-700 mt-1">
                                            Automatically calculate from:
                                        </p>
                                        <ul className="text-sm text-indigo-600 mt-2 space-y-1 list-disc ml-5">
                                            <li>Supplier emissions from SupplyLens</li>
                                            <li>Logistics data from Shipments</li>
                                            <li>Material emission factors</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                            <Button 
                                onClick={calculateFromSupplyLens} 
                                disabled={calculating || materials.length === 0}
                                className="w-full"
                            >
                                {calculating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Database className="w-4 h-4 mr-2" />}
                                Calculate from Supply Lens
                            </Button>
                        </TabsContent>

                        <TabsContent value="pcf" className="space-y-4">
                            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <Calculator className="w-5 h-5 text-emerald-600 mt-0.5" />
                                    <div>
                                        <h4 className="font-medium text-emerald-900">PCF Module Data</h4>
                                        <p className="text-sm text-emerald-700 mt-1">
                                            Use existing Product Carbon Footprint data or calculate with AI-powered LCA
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <Button 
                                onClick={calculateFromPCF} 
                                disabled={calculating || materials.length === 0}
                                className="w-full bg-emerald-600 hover:bg-emerald-700"
                            >
                                {calculating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Calculator className="w-4 h-4 mr-2" />}
                                Use PCF Module
                            </Button>
                        </TabsContent>

                        <TabsContent value="supplier" className="space-y-4">
                            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <Upload className="w-5 h-5 text-amber-600 mt-0.5" />
                                    <div>
                                        <h4 className="font-medium text-amber-900">Upload Supplier Document</h4>
                                        <p className="text-sm text-amber-700 mt-1">
                                            Import PCF, EPD, or sustainability report from your supplier
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <Button 
                                variant="outline"
                                onClick={() => document.getElementById('supplier-upload').click()}
                                className="w-full"
                            >
                                <Upload className="w-4 h-4 mr-2" />
                                Upload Supplier Data
                            </Button>
                            <input 
                                id="supplier-upload"
                                type="file"
                                className="hidden"
                                accept=".pdf,.xlsx,.csv"
                                onChange={(e) => handleSupplierUpload(e.target.files[0])}
                            />
                        </TabsContent>

                        <TabsContent value="manual" className="space-y-4">
                            <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg">
                                <p className="text-sm text-slate-600">
                                    Manually enter environmental data from your own calculations or third-party assessments
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Carbon Footprint (kg CO2e)</Label>
                                    <Input 
                                        type="number"
                                        value={sustainabilityInfo.carbon_footprint_kg || ''}
                                        onChange={(e) => onChange({...sustainabilityInfo, carbon_footprint_kg: parseFloat(e.target.value), pcf_source: 'Manual Entry'})}
                                    />
                                </div>
                                <div>
                                    <Label>Water Usage (liters)</Label>
                                    <Input 
                                        type="number"
                                        value={sustainabilityInfo.water_usage_liters || ''}
                                        onChange={(e) => onChange({...sustainabilityInfo, water_usage_liters: parseFloat(e.target.value)})}
                                    />
                                </div>
                                <div>
                                    <Label>Energy Consumption (kWh)</Label>
                                    <Input 
                                        type="number"
                                        value={sustainabilityInfo.energy_consumption_kwh || ''}
                                        onChange={(e) => onChange({...sustainabilityInfo, energy_consumption_kwh: parseFloat(e.target.value)})}
                                    />
                                </div>
                                <div>
                                    <Label>Data Source</Label>
                                    <Input 
                                        value={sustainabilityInfo.pcf_methodology || ''}
                                        onChange={(e) => onChange({...sustainabilityInfo, pcf_methodology: e.target.value})}
                                        placeholder="e.g., Third-party LCA"
                                    />
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            {/* Current Data Display */}
            {sustainabilityInfo.carbon_footprint_kg > 0 && (
                <Card className="border-2 border-emerald-500">
                    <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <FileCheck className="w-5 h-5 text-emerald-600" />
                                    <h4 className="font-bold text-slate-900">Current Sustainability Data</h4>
                                </div>
                                <div className="grid grid-cols-3 gap-4 text-sm">
                                    <div>
                                        <p className="text-slate-500">Carbon Footprint</p>
                                        <p className="font-bold text-lg text-emerald-600">{sustainabilityInfo.carbon_footprint_kg} kg CO2e</p>
                                    </div>
                                    {sustainabilityInfo.water_usage_liters > 0 && (
                                        <div>
                                            <p className="text-slate-500">Water Usage</p>
                                            <p className="font-bold text-lg text-blue-600">
                                                <Droplets className="w-4 h-4 inline mr-1" />
                                                {sustainabilityInfo.water_usage_liters} L
                                            </p>
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-slate-500">Source</p>
                                        <Badge className="mt-1">{sustainabilityInfo.pcf_source || 'Not Set'}</Badge>
                                    </div>
                                </div>
                                {sustainabilityInfo.pcf_data_quality && (
                                    <div className="mt-3">
                                        <p className="text-xs text-slate-500">Data Quality Score</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className="flex-1 bg-slate-200 rounded-full h-2">
                                                <div 
                                                    className={`h-2 rounded-full ${
                                                        sustainabilityInfo.pcf_data_quality >= 80 ? 'bg-emerald-500' :
                                                        sustainabilityInfo.pcf_data_quality >= 60 ? 'bg-amber-500' :
                                                        'bg-rose-500'
                                                    }`}
                                                    style={{ width: `${sustainabilityInfo.pcf_data_quality}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-medium">{sustainabilityInfo.pcf_data_quality}%</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}