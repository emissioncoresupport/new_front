import React, { useState } from 'react';
import DraggableDashboard from '@/components/layout/DraggableDashboard';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";
import { Package, Upload, FileText, Sparkles, Database, Info, Search, CheckCircle, XCircle, Eye, ShieldAlert, AlertTriangle } from 'lucide-react';

export default function MaterialCreationModal({ open, onOpenChange, supplierId, onSuccess }) {
    const [mode, setMode] = useState('manual');
    const [isProcessing, setIsProcessing] = useState(false);
    const [extractedMaterials, setExtractedMaterials] = useState([]);
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [selectedFilePreview, setSelectedFilePreview] = useState(null);
    const [pfasCheckResult, setPfasCheckResult] = useState(null);
    const [isCheckingPfas, setIsCheckingPfas] = useState(false);
    const [selectedMaterials, setSelectedMaterials] = useState([]);
    const [showBulkEdit, setShowBulkEdit] = useState(false);
    const [bulkEditData, setBulkEditData] = useState({
        field: '',
        value: '',
        operation: 'set'
    });
    const [formData, setFormData] = useState({
        internal_sku: '',
        supplier_sku: '',
        material_name: '',
        description: '',
        category: 'component',
        weight_kg: '',
        uom: 'kg',
        pfas_content: false,
        recycled_content_percentage: 0,
        pcf_co2e_per_unit: ''
    });

    const handleSubmit = async () => {
        if (!formData.material_name || !formData.internal_sku) {
            toast.error('Material name and internal SKU are required');
            return;
        }

        try {
            const user = await base44.auth.me();
            const tenant_id = user.company_id || user.tenant_id || user.id;
            
            const created = await base44.entities.MaterialSKU.create({
                tenant_id,
                supplier_id: supplierId,
                ...formData,
                weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : null,
                pcf_co2e_per_unit: formData.pcf_co2e_per_unit ? parseFloat(formData.pcf_co2e_per_unit) : null,
                active: true,
                status: 'active'
            });

            // Auto-create mapping
            if (formData.supplier_sku) {
                await base44.entities.SupplierSKUMapping.create({
                    tenant_id,
                    supplier_id: supplierId,
                    sku_id: created.id,
                    relationship_type: 'manufacturer',
                    is_primary_supplier: true,
                    mapping_confidence: 100,
                    source_system: 'manual_entry',
                    active: true
                });
            }

            // Trigger orchestration event
            window.dispatchEvent(new CustomEvent('materialCreated', {
                detail: { materialId: created.id, material: created }
            }));
            
            toast.success('✓ Material created with mapping');
            resetForm();
            if (onSuccess) onSuccess();
            onOpenChange(false);
        } catch (error) {
            toast.error('Failed to create material: ' + error.message);
        }
    };

    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files || []);
        console.log('=== FILE UPLOAD STARTED ===');
        console.log('Files selected:', files.length, files.map(f => f.name));
        
        if (files.length === 0) {
            console.log('No files - aborting');
            return;
        }

        setIsProcessing(true);
        const toastId = toast.loading(`Processing ${files.length} file(s)...`);

        try {
            const user = await base44.auth.me();
            console.log('User authenticated:', user);
            
            // Get tenant_id from user or fallback
            const tenant_id = user.company_id || user.tenant_id || user.id;
            console.log('Using tenant_id:', tenant_id);
            
            const allExtractedMaterials = [];
            const uploadedFileData = [];

            for (const file of files) {
                console.log(`\n--- Processing file: ${file.name} ---`);
                
                // Upload file
                toast.loading(`Uploading ${file.name}...`, { id: toastId });
                const uploadResult = await base44.integrations.Core.UploadFile({ file });
                console.log('File uploaded, URL:', uploadResult.file_url);

                // Hash file
                const arrayBuffer = await file.arrayBuffer();
                const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                const file_hash_sha256 = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
                console.log('File hash:', file_hash_sha256.substring(0, 16) + '...');

                // Create document record
                const docRecord = await base44.entities.Document.create({
                    tenant_id,
                    object_type: 'Supplier',
                    object_id: supplierId,
                    file_name: file.name,
                    file_url: uploadResult.file_url,
                    file_hash_sha256,
                    file_size_bytes: file.size,
                    document_type: 'datasheet',
                    uploaded_by: user.email,
                    uploaded_at: new Date().toISOString(),
                    status: 'processing'
                });
                console.log('Document record created:', docRecord.id);

                // AI Extraction
                toast.loading(`AI extracting from ${file.name}...`, { id: toastId });
                console.log('Starting AI extraction...');
                
                const extractionResult = await base44.integrations.Core.InvokeLLM({
                    prompt: `Extract ALL materials/components from this datasheet. Return JSON with materials array. Each material must have: material_name (required), internal_sku (generate MAT-XXX if missing), supplier_sku, description, category (raw_material/component/packaging/chemical/other), weight_kg, uom (kg/ton/liter/piece/meter), pcf_co2e_per_unit, pfas_content (boolean), recycled_content_percentage (0-100).`,
                    file_urls: [uploadResult.file_url],
                    response_json_schema: {
                        type: "object",
                        properties: {
                            materials: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        material_name: { type: "string" },
                                        internal_sku: { type: "string" },
                                        supplier_sku: { type: "string" },
                                        description: { type: "string" },
                                        category: { type: "string" },
                                        weight_kg: { type: "number" },
                                        uom: { type: "string" },
                                        pcf_co2e_per_unit: { type: "number" },
                                        pfas_content: { type: "boolean" },
                                        recycled_content_percentage: { type: "number" }
                                    }
                                }
                            }
                        }
                    }
                });

                console.log('AI extraction complete. Raw result:', extractionResult);
                const materialsExtracted = extractionResult?.materials || [];
                console.log(`Extracted ${materialsExtracted.length} materials:`, materialsExtracted);

                // Update document status
                await base44.entities.Document.update(docRecord.id, {
                    status: materialsExtracted.length > 0 ? 'verified' : 'pending_review',
                    metadata: {
                        materials_extracted: materialsExtracted.length,
                        extraction_completed_at: new Date().toISOString()
                    }
                });
                console.log('Document status updated');

                // Store extracted materials
                if (materialsExtracted.length > 0) {
                    const enrichedMaterials = materialsExtracted.map(m => ({
                        ...m,
                        source_document_id: docRecord.id,
                        source_file_name: file.name,
                        uom: m.uom || 'kg',
                        category: m.category || 'component'
                    }));
                    allExtractedMaterials.push(...enrichedMaterials);
                    console.log('Added to allExtractedMaterials:', enrichedMaterials.length);
                }

                uploadedFileData.push({
                    id: docRecord.id,
                    name: file.name,
                    url: uploadResult.file_url,
                    materials_count: materialsExtracted.length
                });
                console.log('Added to uploadedFileData');
            }

            console.log('\n=== UPLOAD COMPLETE ===');
            console.log('Total materials extracted:', allExtractedMaterials.length);
            console.log('Total files uploaded:', uploadedFileData.length);

            // Update state
            setUploadedFiles(prev => {
                const updated = [...prev, ...uploadedFileData];
                console.log('Updated uploadedFiles state:', updated);
                return updated;
            });
            setExtractedMaterials(prev => {
                const updated = [...prev, ...allExtractedMaterials];
                console.log('Updated extractedMaterials state:', updated);
                return updated;
            });
            
            toast.dismiss(toastId);
            
            if (allExtractedMaterials.length > 0) {
                toast.success(`✓ Extracted ${allExtractedMaterials.length} materials from ${files.length} file(s)`, {
                    description: 'Switch to Review tab to verify and create',
                    duration: 6000
                });
                setMode('review');
                console.log('Switched to review mode');
            } else {
                toast.warning(`✓ Uploaded ${uploadedFileData.length} file(s) - No materials auto-detected`, {
                    description: 'Files saved. Use Manual Entry or try different format.',
                    duration: 6000
                });
            }
        } catch (error) {
            console.error('=== UPLOAD ERROR ===');
            console.error('Error details:', error);
            console.error('Error stack:', error.stack);
            toast.dismiss(toastId);
            toast.error('Upload failed: ' + error.message);
        } finally {
            setIsProcessing(false);
            if (e.target) e.target.value = '';
            console.log('=== UPLOAD PROCESS FINISHED ===\n');
        }
    };

    const handleBulkCreate = async () => {
        if (extractedMaterials.length === 0) return;

        setIsProcessing(true);
        const toastId = toast.loading(`Creating ${extractedMaterials.length} materials...`);

        try {
            const user = await base44.auth.me();
            const tenant_id = user.company_id || user.tenant_id || user.id;
            
            const createdMaterials = [];
            for (const material of extractedMaterials) {
                const created = await base44.entities.MaterialSKU.create({
                    tenant_id,
                    supplier_id: supplierId,
                    ...material,
                    active: true,
                    status: 'active'
                });
                createdMaterials.push(created);
            }

            // Auto-create supplier mappings
            for (const material of createdMaterials) {
                if (material.supplier_sku) {
                    await base44.entities.SupplierSKUMapping.create({
                        tenant_id,
                        supplier_id: supplierId,
                        sku_id: material.id,
                        relationship_type: 'manufacturer',
                        is_primary_supplier: true,
                        mapping_confidence: 100,
                        source_system: 'datasheet_upload',
                        active: true
                    });
                }
            }

            // Trigger orchestration events for each material
            createdMaterials.forEach(material => {
                window.dispatchEvent(new CustomEvent('materialCreated', {
                    detail: { materialId: material.id, material }
                }));
            });
            
            toast.dismiss(toastId);
            toast.success(`✓ Created ${extractedMaterials.length} materials with mappings`);
            resetForm();
            if (onSuccess) onSuccess();
            onOpenChange(false);
        } catch (error) {
            toast.dismiss(toastId);
            toast.error('Failed to create materials: ' + error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleBulkEdit = () => {
        if (selectedMaterials.length === 0) {
            toast.error('Please select materials to edit');
            return;
        }

        const { field, value, operation } = bulkEditData;
        if (!field || value === '') {
            toast.error('Please select field and value');
            return;
        }

        const updated = extractedMaterials.map((material, idx) => {
            if (!selectedMaterials.includes(idx)) return material;

            if (field === 'uom') {
                return { ...material, uom: value };
            } else if (field === 'pfas_content') {
                return { ...material, pfas_content: value === 'true' };
            } else if (field === 'recycled_content_percentage') {
                return { ...material, recycled_content_percentage: parseInt(value) || 0 };
            } else if (field === 'category') {
                return { ...material, category: value };
            } else {
                // Custom field
                return { ...material, [field]: value };
            }
        });

        setExtractedMaterials(updated);
        toast.success(`Updated ${selectedMaterials.length} materials`);
        setShowBulkEdit(false);
        setBulkEditData({ field: '', value: '', operation: 'set' });
        setSelectedMaterials([]);
    };

    const handleSelectAll = () => {
        if (selectedMaterials.length === extractedMaterials.length) {
            setSelectedMaterials([]);
        } else {
            setSelectedMaterials(extractedMaterials.map((_, idx) => idx));
        }
    };

    const handlePfasCheck = async () => {
        if (!formData.material_name) {
            toast.error('Please enter material name first');
            return;
        }

        setIsCheckingPfas(true);
        setPfasCheckResult(null);

        try {
            const result = await base44.integrations.Core.InvokeLLM({
                prompt: `Check if this material contains PFAS (Per- and Polyfluoroalkyl Substances):
                
Material: ${formData.material_name}
Description: ${formData.description || 'Not provided'}
Category: ${formData.category}

PFAS are "forever chemicals" including:
- PTFE (Teflon), PFOA, PFOS, PFHxA, GenX
- Fluoropolymers, fluoroelastomers
- Water/stain resistant coatings
- Non-stick surfaces

Check against:
1. ECHA SCIP database knowledge
2. Common PFAS-containing materials
3. Material description keywords

Return assessment:`,
                add_context_from_internet: true,
                response_json_schema: {
                    type: "object",
                    properties: {
                        contains_pfas: { type: "boolean" },
                        confidence: { type: "number", description: "0-100" },
                        reasoning: { type: "string" },
                        pfas_substances: { type: "array", items: { type: "string" } },
                        recommendation: { type: "string" }
                    }
                }
            });

            setPfasCheckResult(result);
            setFormData({ ...formData, pfas_content: result.contains_pfas });
            
            if (result.contains_pfas) {
                toast.warning(`PFAS detected with ${result.confidence}% confidence`);
            } else {
                toast.success(`No PFAS detected (${result.confidence}% confidence)`);
            }
        } catch (error) {
            toast.error('PFAS check failed: ' + error.message);
        } finally {
            setIsCheckingPfas(false);
        }
    };

    const resetForm = () => {
        setFormData({
            internal_sku: '',
            supplier_sku: '',
            material_name: '',
            description: '',
            category: 'component',
            weight_kg: '',
            uom: 'kg',
            pfas_content: false,
            recycled_content_percentage: 0,
            pcf_co2e_per_unit: ''
        });
        setExtractedMaterials([]);
        setMode('manual');
        setPfasCheckResult(null);
    };

    return (
        <DraggableDashboard
            open={open}
            onClose={() => onOpenChange(false)}
            title="Add Materials"
            icon={Package}
            width="800px"
            height="85vh"
            defaultPosition="center"
        >
            <div className="p-6 h-full overflow-y-auto">
                <Tabs value={mode} onValueChange={setMode} className="w-full">
                    <TabsList className="bg-white/30 backdrop-blur-xl border-b border-white/20 rounded-none h-auto p-0 w-full justify-start mb-6">
                        <TabsTrigger value="manual" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#86b027] data-[state=active]:bg-transparent data-[state=active]:text-[#86b027] hover:bg-white/40 px-6 py-3 text-sm font-medium text-slate-600 transition-all">
                            <FileText className="w-4 h-4 mr-2" />
                            Manual Entry
                        </TabsTrigger>
                        <TabsTrigger value="ai" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#86b027] data-[state=active]:bg-transparent data-[state=active]:text-[#86b027] hover:bg-white/40 px-6 py-3 text-sm font-medium text-slate-600 transition-all">
                            <Sparkles className="w-4 h-4 mr-2" />
                            AI Extract
                        </TabsTrigger>
                        <TabsTrigger value="review" disabled={extractedMaterials.length === 0} className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#86b027] data-[state=active]:bg-transparent data-[state=active]:text-[#86b027] hover:bg-white/40 px-6 py-3 text-sm font-medium text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                            <Database className="w-4 h-4 mr-2" />
                            Review ({extractedMaterials.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="manual" className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-medium uppercase tracking-wider">Material Name *</Label>
                                <Input 
                                    value={formData.material_name}
                                    onChange={(e) => setFormData({...formData, material_name: e.target.value})}
                                    placeholder="Steel Rod 316L"
                                    className="bg-white/50 backdrop-blur-md border-white/40"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-medium uppercase tracking-wider">Category</Label>
                                <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                                    <SelectTrigger className="bg-white/50 backdrop-blur-md border-white/40"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="raw_material">Raw Material</SelectItem>
                                        <SelectItem value="component">Component</SelectItem>
                                        <SelectItem value="packaging">Packaging</SelectItem>
                                        <SelectItem value="chemical">Chemical</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-medium uppercase tracking-wider">Internal SKU *</Label>
                                <Input 
                                    value={formData.internal_sku}
                                    onChange={(e) => setFormData({...formData, internal_sku: e.target.value})}
                                    placeholder="MAT-001"
                                    className="bg-white/50 backdrop-blur-md border-white/40"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-medium uppercase tracking-wider">Supplier SKU</Label>
                                <Input 
                                    value={formData.supplier_sku}
                                    onChange={(e) => setFormData({...formData, supplier_sku: e.target.value})}
                                    placeholder="SUP-XYZ-123"
                                    className="bg-white/50 backdrop-blur-md border-white/40"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-medium uppercase tracking-wider">Description</Label>
                            <Textarea 
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                placeholder="Detailed material description..."
                                className="h-20 bg-white/50 backdrop-blur-md border-white/40"
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-medium uppercase tracking-wider">Weight</Label>
                                <Input 
                                    type="number"
                                    step="0.001"
                                    value={formData.weight_kg}
                                    onChange={(e) => setFormData({...formData, weight_kg: e.target.value})}
                                    placeholder="1.5"
                                    className="bg-white/50 backdrop-blur-md border-white/40"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-medium uppercase tracking-wider">Unit</Label>
                                <Select value={formData.uom} onValueChange={(v) => setFormData({...formData, uom: v})}>
                                    <SelectTrigger className="bg-white/50 backdrop-blur-md border-white/40"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="kg">Kilogram (kg)</SelectItem>
                                        <SelectItem value="ton">Tonne</SelectItem>
                                        <SelectItem value="liter">Liter</SelectItem>
                                        <SelectItem value="piece">Piece</SelectItem>
                                        <SelectItem value="meter">Meter</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-medium uppercase tracking-wider">PCF (kgCO₂e/unit)</Label>
                                <Input 
                                    type="number"
                                    step="0.0001"
                                    value={formData.pcf_co2e_per_unit}
                                    onChange={(e) => setFormData({...formData, pcf_co2e_per_unit: e.target.value})}
                                    placeholder="0.25"
                                    className="bg-white/50 backdrop-blur-md border-white/40"
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="bg-white/40 backdrop-blur-xl rounded-lg border border-white/30 p-4">
                                <div className="flex items-start justify-between gap-4 mb-3">
                                    <div className="flex items-center gap-2 flex-1">
                                        <Checkbox 
                                            checked={formData.pfas_content}
                                            onCheckedChange={(checked) => {
                                                setFormData({...formData, pfas_content: checked});
                                                if (!checked) setPfasCheckResult(null);
                                            }}
                                        />
                                        <Label className="cursor-pointer text-sm font-medium">Contains PFAS</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-5 w-5 p-0 hover:bg-[#86b027]/10 rounded-full"
                                                >
                                                    <Info className="w-4 h-4 text-slate-400 hover:text-[#86b027]" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-80 p-4 bg-white shadow-xl border border-slate-200" side="right">
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-2">
                                                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                                                        <p className="font-semibold text-sm text-slate-900">PFAS = "Forever Chemicals"</p>
                                                    </div>
                                                    <p className="text-xs text-slate-600">Per- and Polyfluoroalkyl Substances - persistent chemicals used in:</p>
                                                    <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside">
                                                        <li>Non-stick coatings (PTFE/Teflon)</li>
                                                        <li>Water/stain resistant fabrics & textiles</li>
                                                        <li>Firefighting foams (AFFF)</li>
                                                        <li>Food packaging & paper treatments</li>
                                                        <li>Industrial surfactants & lubricants</li>
                                                    </ul>
                                                    <div className="pt-2 border-t border-slate-200">
                                                        <p className="text-xs text-amber-700 font-medium flex items-center gap-1">
                                                            <ShieldAlert className="w-3 h-3" />
                                                            EU REACH restriction (effective 2025)
                                                        </p>
                                                        <p className="text-xs text-slate-500 mt-1">Manufacturers must phase out or obtain authorization</p>
                                                    </div>
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handlePfasCheck}
                                        disabled={!formData.material_name || isCheckingPfas}
                                        className="text-xs h-8 px-3"
                                    >
                                        <Search className="w-3 h-3 mr-1.5" />
                                        {isCheckingPfas ? 'Checking...' : 'Quick Check'}
                                    </Button>
                                </div>

                                {pfasCheckResult && (
                                    <div className={`p-3 rounded-lg border ${
                                        pfasCheckResult.contains_pfas 
                                            ? 'bg-amber-50 border-amber-200' 
                                            : 'bg-green-50 border-green-200'
                                    }`}>
                                        <div className="flex items-start gap-2">
                                            {pfasCheckResult.contains_pfas ? (
                                                <XCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                            ) : (
                                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                            )}
                                            <div className="flex-1">
                                                <p className={`text-sm font-medium ${
                                                    pfasCheckResult.contains_pfas ? 'text-amber-900' : 'text-green-900'
                                                }`}>
                                                    {pfasCheckResult.contains_pfas ? 'PFAS Detected' : 'No PFAS Detected'}
                                                    <span className="text-xs ml-2">({pfasCheckResult.confidence}% confidence)</span>
                                                </p>
                                                <p className="text-xs text-slate-700 mt-1">{pfasCheckResult.reasoning}</p>
                                                {pfasCheckResult.pfas_substances?.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                        {pfasCheckResult.pfas_substances.map((substance, i) => (
                                                            <span key={i} className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                                                                {substance}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                                {pfasCheckResult.recommendation && (
                                                    <p className="text-xs text-slate-600 mt-2 italic">💡 {pfasCheckResult.recommendation}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <Label className="text-sm font-medium min-w-[140px]">Recycled Content:</Label>
                                <Input 
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={formData.recycled_content_percentage}
                                    onChange={(e) => setFormData({...formData, recycled_content_percentage: parseInt(e.target.value) || 0})}
                                    className="w-24 h-8 bg-white/50 backdrop-blur-md border-white/40"
                                />
                                <span className="text-sm text-slate-500">%</span>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <Button variant="outline" onClick={() => onOpenChange(false)} className="border-slate-200/80 text-slate-700 hover:bg-slate-50">
                                Cancel
                            </Button>
                            <Button onClick={handleSubmit} className="bg-slate-900 hover:bg-slate-800 text-white">
                                Add Material
                            </Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="ai" className="space-y-4">
                        <div className="bg-white/40 backdrop-blur-xl rounded-2xl border border-white/30 p-8 text-center">
                            <Upload className="w-16 h-16 mx-auto mb-4 text-[#86b027]" />
                            <h3 className="text-lg font-medium text-slate-900 mb-2">Upload Material Datasheets</h3>
                            <p className="text-sm text-slate-600 mb-6">
                                Upload single datasheets or bulk files with thousands of materials. AI will automatically extract all data.
                            </p>
                            
                            <input
                                type="file"
                                id="material-upload-input"
                                className="hidden"
                                accept=".pdf,.xlsx,.xls,.csv,.doc,.docx"
                                multiple
                                onChange={handleFileUpload}
                                disabled={isProcessing}
                            />
                            <Button
                                type="button"
                                onClick={() => {
                                    console.log('Upload button clicked');
                                    const input = document.getElementById('material-upload-input');
                                    console.log('File input element:', input);
                                    if (input) {
                                        input.click();
                                        console.log('File input clicked');
                                    } else {
                                        console.error('File input not found!');
                                        toast.error('Upload button error - check console');
                                    }
                                }}
                                disabled={isProcessing}
                                className="bg-[#86b027] hover:bg-[#86b027]/90 text-white h-10 px-6"
                            >
                                <Upload className="w-4 h-4 mr-2" />
                                {isProcessing ? 'Processing...' : 'Upload Files'}
                            </Button>
                            
                            <p className="text-xs text-slate-500 mt-4">
                                Supports: PDF, Excel, CSV, Word • Single or bulk uploads
                            </p>
                        </div>

                        {uploadedFiles.length > 0 && (
                            <div className="bg-white/40 backdrop-blur-xl rounded-2xl border border-white/30 p-4">
                                <h4 className="text-sm font-medium text-slate-900 mb-3">Uploaded Files ({uploadedFiles.length})</h4>
                                <div className="space-y-2">
                                    {uploadedFiles.map((file) => (
                                        <div key={file.id} className="bg-white/30 backdrop-blur-md rounded-lg border border-white/40 p-3">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-3 flex-1">
                                                    <FileText className="w-5 h-5 text-[#86b027]" />
                                                    <div className="flex-1">
                                                        <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                                                        <p className="text-xs text-slate-600">
                                                            {file.materials_count > 0 
                                                                ? `✓ ${file.materials_count} materials extracted` 
                                                                : '⚠ No materials detected'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => window.open(file.url, '_blank')}
                                                    className="text-xs"
                                                >
                                                    <Eye className="w-3 h-3 mr-1" />
                                                    View PDF
                                                </Button>
                                            </div>
                                            {file.url && (
                                                <iframe
                                                    src={file.url}
                                                    className="w-full h-64 rounded-lg border border-white/40"
                                                    title={file.name}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                                {extractedMaterials.length > 0 && (
                                    <Button
                                        onClick={() => setMode('review')}
                                        className="w-full mt-4 bg-slate-900 hover:bg-slate-800 text-white"
                                    >
                                        Review {extractedMaterials.length} Extracted Materials →
                                    </Button>
                                )}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="review" className="space-y-4">
                        <div className="bg-white/40 backdrop-blur-xl rounded-2xl border border-white/30 p-4">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-medium text-slate-900">Extracted Materials ({extractedMaterials.length})</h3>
                                    <p className="text-xs text-slate-600 mt-1">Review AI-extracted data before creating materials</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button 
                                        variant="outline"
                                        onClick={() => setShowBulkEdit(!showBulkEdit)}
                                        disabled={extractedMaterials.length === 0}
                                        className="border-slate-200/80 text-slate-700 hover:bg-slate-50"
                                    >
                                        <FileText className="w-4 h-4 mr-2" />
                                        Bulk Edit ({selectedMaterials.length})
                                    </Button>
                                    <Button 
                                        onClick={handleBulkCreate}
                                        disabled={isProcessing || extractedMaterials.length === 0}
                                        className="bg-[#86b027] hover:bg-[#86b027]/90 text-white"
                                    >
                                        <Database className="w-4 h-4 mr-2" />
                                        Create All Materials
                                    </Button>
                                </div>
                            </div>

                            {showBulkEdit && (
                                <div className="mb-4 p-4 bg-white/60 backdrop-blur-md rounded-lg border border-[#86b027]/30">
                                    <h4 className="text-sm font-medium text-slate-900 mb-3">Bulk Edit Options</h4>
                                    <div className="grid grid-cols-3 gap-3 mb-3">
                                        <div>
                                            <Label className="text-xs">Field to Update</Label>
                                            <Select value={bulkEditData.field} onValueChange={(v) => setBulkEditData({...bulkEditData, field: v, value: ''})}>
                                                <SelectTrigger className="h-8 text-xs bg-white/80">
                                                    <SelectValue placeholder="Select field..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="uom">Unit of Measure</SelectItem>
                                                    <SelectItem value="category">Category</SelectItem>
                                                    <SelectItem value="pfas_content">PFAS Content</SelectItem>
                                                    <SelectItem value="recycled_content_percentage">Recycled Content %</SelectItem>
                                                    <SelectItem value="custom_field">Custom Field</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label className="text-xs">New Value</Label>
                                            {bulkEditData.field === 'uom' ? (
                                                <Select value={bulkEditData.value} onValueChange={(v) => setBulkEditData({...bulkEditData, value: v})}>
                                                    <SelectTrigger className="h-8 text-xs bg-white/80"><SelectValue placeholder="Select unit..." /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="kg">Kilogram (kg)</SelectItem>
                                                        <SelectItem value="ton">Tonne</SelectItem>
                                                        <SelectItem value="liter">Liter</SelectItem>
                                                        <SelectItem value="piece">Piece</SelectItem>
                                                        <SelectItem value="meter">Meter</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            ) : bulkEditData.field === 'category' ? (
                                                <Select value={bulkEditData.value} onValueChange={(v) => setBulkEditData({...bulkEditData, value: v})}>
                                                    <SelectTrigger className="h-8 text-xs bg-white/80"><SelectValue placeholder="Select category..." /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="raw_material">Raw Material</SelectItem>
                                                        <SelectItem value="component">Component</SelectItem>
                                                        <SelectItem value="packaging">Packaging</SelectItem>
                                                        <SelectItem value="chemical">Chemical</SelectItem>
                                                        <SelectItem value="other">Other</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            ) : bulkEditData.field === 'pfas_content' ? (
                                                <Select value={bulkEditData.value} onValueChange={(v) => setBulkEditData({...bulkEditData, value: v})}>
                                                    <SelectTrigger className="h-8 text-xs bg-white/80"><SelectValue placeholder="Select..." /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="true">Contains PFAS</SelectItem>
                                                        <SelectItem value="false">No PFAS</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <Input 
                                                    className="h-8 text-xs bg-white/80"
                                                    value={bulkEditData.value}
                                                    onChange={(e) => setBulkEditData({...bulkEditData, value: e.target.value})}
                                                    placeholder={bulkEditData.field === 'recycled_content_percentage' ? '0-100' : 'Enter value...'}
                                                    type={bulkEditData.field === 'recycled_content_percentage' ? 'number' : 'text'}
                                                />
                                            )}
                                        </div>
                                        <div className="flex items-end gap-2">
                                            <Button 
                                                onClick={handleBulkEdit}
                                                className="h-8 px-3 text-xs bg-[#86b027] hover:bg-[#86b027]/90"
                                            >
                                                Apply to Selected
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                                        <p className="text-xs text-slate-600">{selectedMaterials.length} of {extractedMaterials.length} selected</p>
                                        <Button 
                                            variant="outline" 
                                            size="sm"
                                            onClick={handleSelectAll}
                                            className="h-7 text-xs"
                                        >
                                            {selectedMaterials.length === extractedMaterials.length ? 'Deselect All' : 'Select All'}
                                        </Button>
                                    </div>
                                </div>
                            )}
                            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                                {extractedMaterials.map((material, idx) => (
                                    <div key={idx} className={`bg-white/30 backdrop-blur-md rounded-lg border p-4 hover:border-[#86b027]/40 transition-colors ${
                                        selectedMaterials.includes(idx) ? 'border-[#86b027] bg-[#86b027]/5' : 'border-white/40'
                                    }`}>
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-start gap-3 flex-1">
                                                <Checkbox 
                                                    checked={selectedMaterials.includes(idx)}
                                                    onCheckedChange={(checked) => {
                                                        if (checked) {
                                                            setSelectedMaterials([...selectedMaterials, idx]);
                                                        } else {
                                                            setSelectedMaterials(selectedMaterials.filter(i => i !== idx));
                                                        }
                                                    }}
                                                    className="mt-1"
                                                />
                                                <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <p className="font-medium text-slate-900">{material.material_name}</p>
                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#86b027]/10 text-[#86b027] border border-[#86b027]/20">
                                                        {material.category || 'component'}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                                                    <div><span className="font-medium">Internal SKU:</span> {material.internal_sku}</div>
                                                    {material.supplier_sku && (
                                                        <div><span className="font-medium">Supplier SKU:</span> {material.supplier_sku}</div>
                                                    )}
                                                    {material.weight_kg && (
                                                        <div><span className="font-medium">Weight:</span> {material.weight_kg} {material.uom}</div>
                                                    )}
                                                    {material.pcf_co2e_per_unit && (
                                                        <div><span className="font-medium">PCF:</span> {material.pcf_co2e_per_unit} kgCO₂e</div>
                                                    )}
                                                    {material.source_file_name && (
                                                        <div className="col-span-2"><span className="font-medium">Source:</span> {material.source_file_name}</div>
                                                    )}
                                                </div>
                                                {material.description && (
                                                    <p className="text-xs text-slate-600 mt-2 italic">{material.description}</p>
                                                )}
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    const updated = extractedMaterials.filter((_, i) => i !== idx);
                                                    setExtractedMaterials(updated);
                                                }}
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-2"
                                            >
                                                Remove
                                            </Button>
                                        </div>
                                        {(material.pfas_content || material.recycled_content_percentage > 0) && (
                                            <div className="flex gap-2 pt-2 border-t border-white/40">
                                                {material.pfas_content && (
                                                    <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-700 border border-purple-200">
                                                        Contains PFAS
                                                    </span>
                                                )}
                                                {material.recycled_content_percentage > 0 && (
                                                    <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 border border-green-200">
                                                        {material.recycled_content_percentage}% Recycled
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>

                {/* Document Preview Modal */}
                {selectedFilePreview && (
                    <DraggableDashboard
                        open={!!selectedFilePreview}
                        onClose={() => setSelectedFilePreview(null)}
                        title={selectedFilePreview.name}
                        icon={FileText}
                        width="900px"
                        height="90vh"
                        defaultPosition="center"
                    >
                        <div className="h-full flex flex-col bg-slate-50">
                            <div className="flex-1 p-4">
                                {selectedFilePreview.url.toLowerCase().endsWith('.pdf') ? (
                                    <iframe
                                        src={selectedFilePreview.url}
                                        className="w-full h-full border-0 rounded-lg bg-white"
                                        title={selectedFilePreview.name}
                                    />
                                ) : (
                                    <iframe
                                        src={`https://docs.google.com/viewer?url=${encodeURIComponent(selectedFilePreview.url)}&embedded=true`}
                                        className="w-full h-full border-0 rounded-lg bg-white"
                                        title={selectedFilePreview.name}
                                    />
                                )}
                            </div>
                            <div className="border-t border-slate-200 p-4 bg-white">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-slate-900">{selectedFilePreview.name}</p>
                                        <p className="text-xs text-slate-600">
                                            {selectedFilePreview.materials_count > 0 
                                                ? `${selectedFilePreview.materials_count} materials extracted` 
                                                : 'No materials detected'}
                                        </p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => window.open(selectedFilePreview.url, '_blank')}
                                        className="text-xs"
                                    >
                                        Open in New Tab
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </DraggableDashboard>
                )}
            </div>
        </DraggableDashboard>
    );
}