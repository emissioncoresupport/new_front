import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Loader2, Recycle, Info, FileText, Calculator } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function CircularityCalculator({ materials, circularityMetrics, onChange, categoryTemplate }) {
    const [calculating, setCalculating] = useState(false);
    const [weighting, setWeighting] = useState({
        recyclability: categoryTemplate?.recyclability_weight || 30,
        recycled_content: 25,
        repairability: categoryTemplate?.repairability_weight || 20,
        lifetime: 15,
        material_health: 10
    });

    const calculateCircularityIndex = async () => {
        if (materials.length === 0) {
            toast.error('Add materials first');
            return;
        }

        setCalculating(true);
        toast.loading('Calculating circularity index...');

        try {
            // Calculate recyclability score
            const recyclableCount = materials.filter(m => m.recyclable).length;
            const recyclabilityScore = (recyclableCount / materials.length) * 10;

            // Calculate material health score (hazardous materials reduce score)
            const hazardousCount = materials.filter(m => m.hazardous).length;
            const materialHealthScore = Math.max(0, 10 - (hazardousCount / materials.length) * 10);

            // Use AI to calculate repairability based on materials and product type
            const aiResult = await base44.integrations.Core.InvokeLLM({
                prompt: `Assess circularity and repairability for a product with these materials:
${JSON.stringify(materials.map(m => ({ name: m.material_name, qty: m.quantity_kg, recyclable: m.recyclable })))}

Provide scores (0-10) for:
1. Repairability Index (based on material types and quantities)
2. Durability/Expected Lifetime (years)
3. Design for Disassembly score

Consider material compatibility, joining methods, and ease of separation.`,
                response_json_schema: {
                    type: "object",
                    properties: {
                        repairability_index: { type: "number" },
                        expected_lifetime_years: { type: "number" },
                        disassembly_score: { type: "number" },
                        recommendations: { type: "string" }
                    }
                }
            });

            // Calculate weighted circularity index (0-100)
            const circularityIndex = (
                (recyclabilityScore * weighting.recyclability / 10) +
                ((circularityMetrics.recycled_content_percentage || 0) / 10 * weighting.recycled_content / 10) +
                (aiResult.repairability_index * weighting.repairability / 10) +
                (Math.min(aiResult.expected_lifetime_years / 2, 10) * weighting.lifetime / 10) +
                (materialHealthScore * weighting.material_health / 10)
            );

            onChange({
                recyclability_score: parseFloat(recyclabilityScore.toFixed(2)),
                recycled_content_percentage: circularityMetrics.recycled_content_percentage || 0,
                repairability_index: aiResult.repairability_index,
                expected_lifetime_years: aiResult.expected_lifetime_years,
                circularity_index: parseFloat(circularityIndex.toFixed(2)),
                calculation_method: 'Material Circularity Indicator (MCI) + AI Analysis',
                weighting: weighting,
                evidence_urls: circularityMetrics.evidence_urls || [],
                disassembly_score: aiResult.disassembly_score,
                ai_recommendations: aiResult.recommendations
            });

            toast.success(`Circularity Index: ${circularityIndex.toFixed(1)}/100`);
        } catch (error) {
            toast.error('Calculation failed');
        } finally {
            setCalculating(false);
        }
    };

    const handleEvidenceUpload = async (file) => {
        if (!file) return;

        try {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            const evidenceUrls = [...(circularityMetrics.evidence_urls || []), file_url];
            
            onChange({
                ...circularityMetrics,
                evidence_urls: evidenceUrls
            });

            toast.success('Evidence document uploaded');
        } catch (error) {
            toast.error('Upload failed');
        }
    };

    return (
        <div className="space-y-6">
            {/* Weighting Configuration */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        Circularity Weighting Configuration
                    </CardTitle>
                    <p className="text-sm text-slate-500">Adjust weights for different circularity factors</p>
                </CardHeader>
                <CardContent className="space-y-4">
                    {Object.entries(weighting).map(([key, value]) => (
                        <div key={key} className="space-y-2">
                            <div className="flex justify-between">
                                <Label className="text-sm capitalize">{key.replace('_', ' ')}</Label>
                                <span className="text-sm font-medium">{value}%</span>
                            </div>
                            <Slider 
                                value={[value]}
                                onValueChange={([v]) => setWeighting({...weighting, [key]: v})}
                                min={0}
                                max={50}
                                step={5}
                                className="w-full"
                            />
                        </div>
                    ))}
                    <div className="bg-slate-50 p-3 rounded-lg text-sm">
                        <strong>Total:</strong> {Object.values(weighting).reduce((a, b) => a + b, 0)}% 
                        {Object.values(weighting).reduce((a, b) => a + b, 0) !== 100 && (
                            <span className="text-amber-600 ml-2">⚠️ Should total 100%</span>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Calculate Button */}
            <Button 
                onClick={calculateCircularityIndex}
                disabled={calculating || materials.length === 0}
                className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700"
            >
                {calculating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Calculator className="w-4 h-4 mr-2" />}
                Calculate Circularity Index
            </Button>

            {/* Results Display */}
            {circularityMetrics.circularity_index > 0 && (
                <Card className="border-2 border-emerald-500">
                    <CardHeader className="bg-gradient-to-r from-emerald-50 to-green-50">
                        <CardTitle className="flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <Recycle className="w-5 h-5 text-emerald-600" />
                                Circularity Results
                            </span>
                            <Badge className={`text-lg ${
                                circularityMetrics.circularity_index >= 70 ? 'bg-emerald-500' :
                                circularityMetrics.circularity_index >= 40 ? 'bg-amber-500' :
                                'bg-rose-500'
                            }`}>
                                {circularityMetrics.circularity_index}/100
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center p-3 bg-slate-50 rounded-lg">
                                <p className="text-xs text-slate-500 mb-1">Recyclability</p>
                                <p className="text-2xl font-bold text-emerald-600">{circularityMetrics.recyclability_score}/10</p>
                            </div>
                            <div className="text-center p-3 bg-slate-50 rounded-lg">
                                <p className="text-xs text-slate-500 mb-1">Recycled Content</p>
                                <p className="text-2xl font-bold text-blue-600">{circularityMetrics.recycled_content_percentage}%</p>
                            </div>
                            <div className="text-center p-3 bg-slate-50 rounded-lg">
                                <p className="text-xs text-slate-500 mb-1">Repairability</p>
                                <p className="text-2xl font-bold text-purple-600">{circularityMetrics.repairability_index}/10</p>
                            </div>
                            <div className="text-center p-3 bg-slate-50 rounded-lg">
                                <p className="text-xs text-slate-500 mb-1">Lifetime</p>
                                <p className="text-2xl font-bold text-amber-600">{circularityMetrics.expected_lifetime_years}y</p>
                            </div>
                        </div>

                        {circularityMetrics.disassembly_score && (
                            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                                <p className="text-sm font-medium text-blue-900">Design for Disassembly: {circularityMetrics.disassembly_score}/10</p>
                            </div>
                        )}

                        {circularityMetrics.ai_recommendations && (
                            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                                <p className="text-xs font-bold text-amber-900 mb-1">AI Recommendations:</p>
                                <p className="text-sm text-amber-800">{circularityMetrics.ai_recommendations}</p>
                            </div>
                        )}

                        <div className="border-t pt-4">
                            <p className="text-xs text-slate-500 mb-2">Methodology: {circularityMetrics.calculation_method}</p>
                            
                            {/* Evidence Documents */}
                            <div className="space-y-2">
                                <Label className="text-xs">Supporting Evidence</Label>
                                <div className="flex flex-wrap gap-2">
                                    {circularityMetrics.evidence_urls?.map((url, idx) => (
                                        <a key={idx} href={url} target="_blank" rel="noreferrer" className="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded flex items-center gap-1">
                                            <FileText className="w-3 h-3" />
                                            Document {idx + 1}
                                        </a>
                                    ))}
                                    <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => document.getElementById('evidence-upload').click()}
                                        className="h-6 text-xs"
                                    >
                                        + Add Evidence
                                    </Button>
                                    <input 
                                        id="evidence-upload"
                                        type="file"
                                        className="hidden"
                                        onChange={(e) => handleEvidenceUpload(e.target.files[0])}
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Manual Inputs */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Additional Circularity Data</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-sm">Recycled Content (%)</Label>
                            <Input 
                                type="number"
                                min="0"
                                max="100"
                                value={circularityMetrics.recycled_content_percentage || 0}
                                onChange={(e) => onChange({...circularityMetrics, recycled_content_percentage: parseFloat(e.target.value)})}
                            />
                        </div>
                        <div>
                            <Label className="text-sm">Expected Lifetime (years)</Label>
                            <Input 
                                type="number"
                                value={circularityMetrics.expected_lifetime_years || 5}
                                onChange={(e) => onChange({...circularityMetrics, expected_lifetime_years: parseFloat(e.target.value)})}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}