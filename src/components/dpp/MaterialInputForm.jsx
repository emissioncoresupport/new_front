import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Upload, Database, Sparkles, FileText, Package } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function MaterialInputForm({ materials, onChange, productWeight, categoryTemplate }) {
    const [showImport, setShowImport] = useState(false);
    
    const { data: suppliers = [] } = useQuery({
        queryKey: ['suppliers-dpp'],
        queryFn: () => base44.entities.Supplier.list()
    });

    const addMaterial = () => {
        onChange([...materials, {
            material_name: '',
            quantity_kg: 0,
            percentage: 0,
            cas_number: '',
            recyclable: false,
            hazardous: false,
            recycling_code: '',
            supplier_id: '',
            data_source: 'manual',
            data_quality_score: 70
        }]);
    };

    const updateMaterial = (index, field, value) => {
        const updated = [...materials];
        updated[index][field] = value;
        
        // Auto-calculate percentage when quantity changes
        if (field === 'quantity_kg' && productWeight) {
            updated[index].percentage = ((value / productWeight) * 100).toFixed(2);
        }
        
        onChange(updated);
    };

    const removeMaterial = (index) => {
        onChange(materials.filter((_, i) => i !== index));
    };

    const handleBulkImport = async (file) => {
        if (!file) return;
        
        const loadingToast = toast.loading('Extracting material data from file...');
        
        try {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            
            const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
                file_url,
                json_schema: {
                    type: "object",
                    properties: {
                        materials: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    material_name: { type: "string" },
                                    quantity_kg: { type: "number" },
                                    percentage: { type: "number" },
                                    cas_number: { type: "string" },
                                    recyclable: { type: "boolean" },
                                    hazardous: { type: "boolean" },
                                    recycling_code: { type: "string" }
                                }
                            }
                        }
                    }
                }
            });

            toast.dismiss(loadingToast);

            if (extractResult.status === 'success' && extractResult.output.materials) {
                const imported = extractResult.output.materials.map(m => ({
                    ...m,
                    supplier_id: '',
                    data_source: 'supplier_upload',
                    data_quality_score: 85,
                    recycling_code: m.recycling_code || '',
                    evidence_file_url: file_url // Store reference to source document
                }));
                
                onChange([...materials, ...imported]);
                toast.success(`Imported ${imported.length} materials from document`, {
                    description: 'Evidence file linked to materials'
                });
            } else {
                toast.error('Could not extract material data from document');
            }
        } catch (error) {
            toast.dismiss(loadingToast);
            toast.error('Import failed');
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-lg">Material Composition</h3>
                    <p className="text-sm text-slate-500">Enter actual materials and quantities used</p>
                    {categoryTemplate && (
                        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                            <strong>Required for {categoryTemplate.required_materials[0] ? 'this category' : 'compliance'}:</strong>
                            <span className="ml-1">{categoryTemplate.required_materials.join(', ')}</span>
                        </div>
                    )}
                </div>
                <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => document.getElementById('material-file-upload').click()}>
                        <Upload className="w-4 h-4 mr-2" /> Import from File
                    </Button>
                    <input 
                        id="material-file-upload" 
                        type="file" 
                        className="hidden" 
                        accept=".csv,.xlsx,.pdf"
                        onChange={(e) => handleBulkImport(e.target.files[0])}
                    />
                    <Button size="sm" onClick={addMaterial}>
                        <Plus className="w-4 h-4 mr-2" /> Add Material
                    </Button>
                </div>
            </div>

            {productWeight && (
                <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-sm">
                    <strong>Total Product Weight:</strong> {productWeight} kg - Percentages will auto-calculate
                </div>
            )}

            <div className="space-y-3">
                {materials.map((mat, idx) => (
                    <Card key={idx} className="border-l-4 border-l-indigo-500">
                        <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-slate-700">Material #{idx + 1}</span>
                                    <Badge variant="outline" className="text-xs">
                                        {mat.data_source === 'supplylens' ? <Database className="w-3 h-3 mr-1" /> : 
                                         mat.data_source === 'supplier_upload' ? <Upload className="w-3 h-3 mr-1" /> : 
                                         <FileText className="w-3 h-3 mr-1" />}
                                        {mat.data_source}
                                    </Badge>
                                    {mat.data_quality_score && (
                                        <Badge variant="outline" className={`text-xs ${
                                            mat.data_quality_score >= 80 ? 'bg-emerald-50 text-emerald-700' :
                                            mat.data_quality_score >= 60 ? 'bg-amber-50 text-amber-700' :
                                            'bg-rose-50 text-rose-700'
                                        }`}>
                                            Quality: {mat.data_quality_score}%
                                        </Badge>
                                    )}
                                    {mat.evidence_file_url && (
                                        <a href={mat.evidence_file_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                                            <FileText className="w-3 h-3" />
                                            View Evidence
                                        </a>
                                    )}
                                </div>
                                <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    onClick={() => removeMaterial(idx)}
                                    className="h-8 w-8 text-rose-500 hover:text-rose-700"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="col-span-2">
                                    <Label className="text-xs">Material Name *</Label>
                                    <Input 
                                        value={mat.material_name}
                                        onChange={(e) => updateMaterial(idx, 'material_name', e.target.value)}
                                        placeholder="e.g., Aluminum 6061-T6"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">Quantity (kg) *</Label>
                                    <Input 
                                        type="number"
                                        value={mat.quantity_kg}
                                        onChange={(e) => updateMaterial(idx, 'quantity_kg', parseFloat(e.target.value))}
                                        placeholder="0.5"
                                        step="0.01"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">Percentage (%)</Label>
                                    <Input 
                                        type="number"
                                        value={mat.percentage}
                                        onChange={(e) => updateMaterial(idx, 'percentage', parseFloat(e.target.value))}
                                        placeholder="Auto"
                                        readOnly={productWeight}
                                        className={productWeight ? 'bg-slate-50' : ''}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                                <div>
                                    <Label className="text-xs">CAS Number</Label>
                                    <Input 
                                        value={mat.cas_number}
                                        onChange={(e) => updateMaterial(idx, 'cas_number', e.target.value)}
                                        placeholder="7429-90-5"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">Recycling Code</Label>
                                    <Input 
                                        value={mat.recycling_code}
                                        onChange={(e) => updateMaterial(idx, 'recycling_code', e.target.value)}
                                        placeholder="ALU 41"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">Supplier</Label>
                                    <Select value={mat.supplier_id} onValueChange={(v) => updateMaterial(idx, 'supplier_id', v)}>
                                        <SelectTrigger className="h-9">
                                            <SelectValue placeholder="Optional" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {suppliers.map(s => (
                                                <SelectItem key={s.id} value={s.id}>{s.legal_name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center gap-4 mt-5">
                                    <div className="flex items-center gap-2">
                                        <Checkbox 
                                            id={`recyclable-${idx}`}
                                            checked={mat.recyclable}
                                            onCheckedChange={(c) => updateMaterial(idx, 'recyclable', c)}
                                        />
                                        <label htmlFor={`recyclable-${idx}`} className="text-xs font-medium">♻️ Recyclable</label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Checkbox 
                                            id={`hazardous-${idx}`}
                                            checked={mat.hazardous}
                                            onCheckedChange={(c) => updateMaterial(idx, 'hazardous', c)}
                                        />
                                        <label htmlFor={`hazardous-${idx}`} className="text-xs font-medium">⚠️ Hazardous</label>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {materials.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
                    <Package className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500 text-sm">No materials added yet</p>
                    <p className="text-slate-400 text-xs">Click "Add Material" or "Import from File" to begin</p>
                </div>
            )}
        </div>
    );
}