import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileUp, Loader2, CheckCircle, AlertCircle, Sparkles, Plus, Eye, XCircle } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function BOMDocumentScanner({ productId, onComponentsExtracted, isOpen, onClose }) {
    const queryClient = useQueryClient();
    const [uploadedFile, setUploadedFile] = useState(null);
    const [extractedData, setExtractedData] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showPDFViewer, setShowPDFViewer] = useState(false);

    const uploadMutation = useMutation({
        mutationFn: async (file) => {
            setIsProcessing(true);
            try {
                // Step 1: Upload file
                const { file_url } = await base44.integrations.Core.UploadFile({ file });
                
                // Step 2: Extract data using AI with file context
                const prompt = `You are analyzing a supplier Environmental Product Declaration (EPD) or material datasheet. Extract structured data to create Bill of Materials components.

Extract the following for EACH material/component mentioned:
- Component name (specific material or product name)
- Material type (e.g., Steel, Concrete, Plastic - be specific)
- Quantity (numerical value, default to 1 if not specified)
- Unit (kg, ton, m3, piece, etc.)
- Emission factor (kgCO2e per unit - THIS IS CRITICAL, look for GWP, carbon footprint, CO2e values)
- Geographic origin (country code or region)
- Data quality (rate 1-5: 5=Primary verified, 4=Secondary verified, 3=Secondary, 2=Generic, 1=Estimated)
- Lifecycle stage (Raw Material Acquisition, Production, Distribution, Usage, End-of-Life)
- Supplier name (if mentioned)
- Reference standard (e.g., ISO 14025, EN 15804)

IMPORTANT: 
- For emission factors, look for terms like "GWP", "carbon footprint", "CO2 equivalent", "kgCO2e"
- If the document provides cradle-to-gate values, use those
- Extract multiple components if the document covers multiple materials
- Be precise with units and numeric values`;

                const response = await base44.integrations.Core.InvokeLLM({
                    prompt: prompt,
                    file_urls: [file_url],
                    response_json_schema: {
                        type: "object",
                        properties: {
                            document_type: { type: "string" },
                            supplier_name: { type: "string" },
                            components: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        name: { type: "string" },
                                        material_type: { type: "string" },
                                        quantity: { type: "number" },
                                        unit: { type: "string" },
                                        emission_factor: { type: "number" },
                                        geographic_origin: { type: "string" },
                                        data_quality_rating: { type: "number" },
                                        lifecycle_stage: { 
                                            type: "string",
                                            enum: ["Raw Material Acquisition", "Production", "Distribution", "Usage", "End-of-Life"]
                                        },
                                        supplier_name: { type: "string" },
                                        reference_standard: { type: "string" },
                                        notes: { type: "string" }
                                    },
                                    required: ["name", "emission_factor"]
                                }
                            }
                        }
                    }
                });

                const data = typeof response === 'string' ? JSON.parse(response) : response;
                
                // Track usage for billing
                const UsageMeteringService = (await import('@/components/billing/UsageMeteringService')).default;
                await UsageMeteringService.trackDocumentAnalysis({
                    module: 'PCF',
                    documentUrl: file_url,
                    entityType: 'Product',
                    entityId: productId
                });

                return { data, file_url };
            } finally {
                setIsProcessing(false);
            }
        },
        onSuccess: ({ data, file_url }) => {
            setExtractedData({ ...data, file_url });
            toast.success(`Extracted ${data.components?.length || 0} components from document`);
        },
        onError: (error) => {
            toast.error("Failed to process document");
            console.error(error);
        }
    });

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setUploadedFile(file);
            uploadMutation.mutate(file);
        }
    };

    const createComponentsMutation = useMutation({
        mutationFn: async (components) => {
            const created = [];
            for (const comp of components) {
                const newComp = await base44.entities.ProductComponent.create({
                    product_id: productId,
                    name: comp.name,
                    material_type: comp.material_type || 'Unknown',
                    quantity: comp.quantity || 1,
                    unit: comp.unit || 'kg',
                    emission_factor: comp.emission_factor,
                    co2e_kg: (comp.quantity || 1) * comp.emission_factor,
                    geographic_origin: comp.geographic_origin || 'Global',
                    data_quality_rating: comp.data_quality_rating || 3,
                    lifecycle_stage: comp.lifecycle_stage || 'Production',
                    node_type: 'Component',
                    assigned_dataset_name: comp.reference_standard || 'Supplier EPD',
                    emission_factor_source: extractedData.file_url,
                    verification_status: 'Pending Review'
                });
                created.push(newComp);
            }
            return created;
        },
        onSuccess: (created) => {
            queryClient.invalidateQueries(['product-components', productId]);
            toast.success(`Added ${created.length} components to BOM`);
            if (onComponentsExtracted) onComponentsExtracted(created);
            handleClose();
        }
    });

    const handleClose = () => {
        setUploadedFile(null);
        setExtractedData(null);
        setShowPDFViewer(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
            {/* Main Scanner Window */}
            <DraggableWindow
                title="AI Document Scanner"
                icon={<Sparkles className="w-5 h-5 text-[#86b027]" />}
                onClose={handleClose}
                defaultPosition={{ x: showPDFViewer ? -350 : 0, y: 0 }}
            >
                <div className="bg-gradient-to-br from-white/95 via-white/90 to-white/85 backdrop-blur-3xl h-full overflow-y-auto">

                <div className="space-y-6 py-4">
                    {/* Upload Section */}
                    {!extractedData && (
                        <div className="relative border-2 border-dashed border-white/50 bg-white/20 backdrop-blur-sm rounded-2xl overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-transparent to-transparent pointer-events-none"></div>
                            <div className="relative p-8">
                                <div className="text-center space-y-4">
                                    <div className="p-4 bg-white/40 backdrop-blur-xl rounded-full w-fit mx-auto border border-white/60 shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                                        <FileUp className="w-8 h-8 text-[#86b027]" />
                                    </div>
                                    <div>
                                        <h4 className="font-light text-slate-900 mb-2">Upload EPD or Datasheet</h4>
                                        <p className="text-sm text-slate-600 mb-4 font-light">
                                            PDF, PNG, JPG - AI will extract emission factors and component details
                                        </p>
                                        <Label htmlFor="file-upload" className="cursor-pointer">
                                            <div className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-[0_4px_16px_rgba(0,0,0,0.12)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.16)] hover:-translate-y-0.5 font-light">
                                                {isProcessing ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        Processing...
                                                    </>
                                                ) : (
                                                    <>
                                                        <FileUp className="w-4 h-4" />
                                                        Choose File
                                                    </>
                                                )}
                                            </div>
                                        </Label>
                                        <Input
                                            id="file-upload"
                                            type="file"
                                            accept=".pdf,.png,.jpg,.jpeg"
                                            onChange={handleFileUpload}
                                            className="hidden"
                                            disabled={isProcessing}
                                        />
                                        {uploadedFile && (
                                            <p className="text-xs text-slate-500 mt-2 font-light">
                                                {uploadedFile.name}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Extracted Data Preview */}
                    {extractedData && (
                        <div className="space-y-4">
                            <div className="relative bg-gradient-to-br from-[#86b027]/10 via-[#86b027]/5 to-white/30 backdrop-blur-sm p-4 rounded-xl border border-[#86b027]/30 overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-[#86b027]/5 via-transparent to-transparent pointer-events-none"></div>
                                <div className="relative flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle className="w-5 h-5 text-[#86b027]" />
                                        <div>
                                            <p className="font-light text-slate-900">Extraction Complete</p>
                                            <p className="text-sm text-slate-600 font-light">
                                                Found {extractedData.components?.length || 0} component{extractedData.components?.length !== 1 ? 's' : ''}
                                                {extractedData.supplier_name && ` from ${extractedData.supplier_name}`}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button 
                                            size="sm" 
                                            variant="ghost"
                                            onClick={() => setShowPDFViewer(true)}
                                            className="rounded-lg hover:bg-white/20 backdrop-blur-sm text-slate-600 font-light h-8"
                                        >
                                            <Eye className="w-3 h-3 mr-1.5" /> View
                                        </Button>
                                        <Badge variant="outline" className="bg-white/60 backdrop-blur-sm border-white/50 font-light">
                                            {extractedData.document_type || 'Document'}
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            <ScrollArea className="h-[400px] pr-4">
                                <div className="space-y-3">
                                    {extractedData.components?.map((comp, idx) => (
                                        <div key={idx} className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-xl border border-white/50 shadow-[0_4px_16px_rgba(0,0,0,0.08)] overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-transparent to-transparent pointer-events-none"></div>
                                            <div className="relative p-4">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div>
                                                        <h4 className="font-light text-slate-900">{comp.name}</h4>
                                                        <p className="text-sm text-slate-600 font-light">{comp.material_type}</p>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        {Array.from({ length: comp.data_quality_rating || 3 }).map((_, i) => (
                                                            <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#86b027]" />
                                                        ))}
                                                    </div>
                                                </div>
                                                
                                                <div className="grid grid-cols-3 gap-4 text-sm">
                                                    <div>
                                                        <p className="text-[10px] text-slate-500 font-light">Quantity</p>
                                                        <p className="font-light text-slate-900">{comp.quantity} {comp.unit}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-slate-500 font-light">Emission Factor</p>
                                                        <p className="font-light text-[#86b027]">
                                                            {comp.emission_factor} kgCO₂e/{comp.unit}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-slate-500 font-light">Total Impact</p>
                                                        <p className="font-light text-slate-900">
                                                            {((comp.quantity || 1) * comp.emission_factor).toFixed(3)} kgCO₂e
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 mt-3 flex-wrap">
                                                    {comp.geographic_origin && (
                                                        <Badge variant="outline" className="text-[10px] font-light border-slate-200/60 bg-white/40">{comp.geographic_origin}</Badge>
                                                    )}
                                                    {comp.lifecycle_stage && (
                                                        <Badge variant="outline" className="text-[10px] bg-[#86b027]/10 text-[#86b027] border-[#86b027]/30 font-light">
                                                            {comp.lifecycle_stage}
                                                        </Badge>
                                                    )}
                                                    {comp.reference_standard && (
                                                        <Badge variant="outline" className="text-[10px] bg-slate-100/80 text-slate-600 border-slate-200/60 font-light">
                                                            {comp.reference_standard}
                                                        </Badge>
                                                    )}
                                                </div>

                                                {comp.notes && (
                                                    <p className="text-xs text-slate-600 mt-2 bg-white/40 backdrop-blur-sm p-2 rounded-lg font-light">
                                                        {comp.notes}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-white/30 bg-white/10 backdrop-blur-sm flex justify-end gap-2">
                    <Button variant="ghost" onClick={handleClose} className="rounded-xl hover:bg-white/20 backdrop-blur-sm font-light">Cancel</Button>
                    {extractedData && (
                        <>
                            <Button 
                                variant="ghost"
                                onClick={() => {
                                    setExtractedData(null);
                                    setUploadedFile(null);
                                }}
                                className="rounded-xl hover:bg-white/20 backdrop-blur-sm font-light"
                            >
                                <FileUp className="w-4 h-4 mr-2" /> Upload Another
                            </Button>
                            <Button 
                                onClick={() => createComponentsMutation.mutate(extractedData.components)}
                                className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.12)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.16)] hover:-translate-y-0.5 transition-all font-light"
                                disabled={createComponentsMutation.isLoading}
                            >
                                {createComponentsMutation.isLoading ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Plus className="w-4 h-4 mr-2" />
                                )}
                                Add All to BOM
                            </Button>
                        </>
                    )}
                </div>
                </div>
            </DraggableWindow>

            {/* PDF Viewer Window - Side by Side */}
            {showPDFViewer && extractedData?.file_url && (
                <DraggableWindow
                    title="Document Viewer"
                    subtitle={uploadedFile?.name || 'Document Preview'}
                    icon={<Eye className="w-5 h-5 text-[#86b027]" />}
                    onClose={() => setShowPDFViewer(false)}
                    defaultPosition={{ x: 450, y: 0 }}
                    width="900px"
                    height="90vh"
                >
                    <div className="w-full h-full bg-slate-100">
                        {uploadedFile?.type === 'application/pdf' ? (
                            <iframe 
                                src={extractedData.file_url} 
                                className="w-full h-full"
                                title="PDF Preview"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center p-4">
                                <img 
                                    src={extractedData.file_url} 
                                    alt="Document" 
                                    className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                                />
                            </div>
                        )}
                    </div>
                </DraggableWindow>
            )}
        </div>
    );
}

// Draggable Window Component
function DraggableWindow({ 
    title, 
    subtitle, 
    icon, 
    children, 
    onClose, 
    defaultPosition = { x: 0, y: 0 },
    width = "800px",
    height = "90vh"
}) {
    const [position, setPosition] = useState(defaultPosition);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const handleMouseDown = (e) => {
        if (e.target.closest('[data-draggable-handle]')) {
            setIsDragging(true);
            setDragStart({
                x: e.clientX - position.x,
                y: e.clientY - position.y
            });
        }
    };

    const handleMouseMove = (e) => {
        if (isDragging) {
            setPosition({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y
            });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, dragStart, position]);

    return (
        <div 
            className="absolute bg-gradient-to-br from-white/95 via-white/90 to-white/85 backdrop-blur-3xl border border-white/50 shadow-[0_16px_48px_rgba(0,0,0,0.16)] rounded-2xl overflow-hidden flex flex-col"
            style={{
                width,
                maxHeight: height,
                transform: `translate(${position.x}px, ${position.y}px)`,
                cursor: isDragging ? 'grabbing' : 'auto',
                top: '5vh',
                left: '50%',
                marginLeft: `-${parseInt(width) / 2}px`
            }}
            onMouseDown={handleMouseDown}
        >
            <div 
                data-draggable-handle
                className="px-6 py-4 border-b border-white/30 bg-white/20 backdrop-blur-sm cursor-grab active:cursor-grabbing flex items-center justify-between"
            >
                <div>
                    <div className="flex items-center gap-2 font-extralight text-lg tracking-tight text-slate-900">
                        {icon}
                        {title}
                    </div>
                    {subtitle && (
                        <p className="text-xs text-slate-500 font-light mt-0.5">{subtitle}</p>
                    )}
                </div>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={onClose}
                    className="rounded-lg hover:bg-white/20 h-8 w-8"
                >
                    <XCircle className="w-4 h-4 text-slate-400" />
                </Button>
            </div>
            <div className="flex-1 overflow-hidden">
                {children}
            </div>
        </div>
    );
}