import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Save, FileText, Zap, RefreshCw, Box, Send, Download, Layers, RefreshCcw, Edit2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import BOMManager from './BOMManager';
import PCFAuditTrail from './PCFAuditTrail';
import LifecycleBreakdown from './LifecycleBreakdown';
import ProductScenarioModeler from './ProductScenarioModeler';
import ISO14067ReportGenerator from './ISO14067ReportGenerator';
import DPPPublisher from './DPPPublisher';
import CalculationEngine from './CalculationEngine';
import BOMCollaborationPanel from './BOMCollaborationPanel';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Microscope } from "lucide-react";

function DataRequestButton({ product }) {
    const [open, setOpen] = useState(false);
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSend = async () => {
        setLoading(true);
        try {
            await base44.integrations.Core.SendEmail({
                to: email,
                subject: `Data Request: Carbon Footprint for ${product.name}`,
                body: message || `Dear Supplier,\n\nPlease provide the Bill of Materials and emission data for ${product.name} (SKU: ${product.sku || 'N/A'}).\n\nYou can upload documents directly via the portal.\n\nThank you.`
            });
            toast.success("Request sent to supplier");
            setOpen(false);
        } catch (e) {
            toast.error("Failed to send email");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Button variant="ghost" size="sm" className="h-6 p-0 text-[#02a1e8] hover:bg-transparent hover:underline" onClick={() => setOpen(true)}>
                <Send className="w-3 h-3 mr-1" /> Send Invite
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="bg-gradient-to-br from-white/80 via-white/60 to-white/40 backdrop-blur-3xl border border-white/50 shadow-[0_16px_48px_rgba(0,0,0,0.16)]">
                    <DialogHeader>
                        <DialogTitle>Request Supplier Data</DialogTitle>
                        <DialogDescription>Send an automated email notification to request BOM or PCF data.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Supplier Email</Label>
                            <Input placeholder="supplier@example.com" value={email} onChange={e => setEmail(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Message</Label>
                            <Textarea 
                                placeholder="Optional custom message..." 
                                value={message} 
                                onChange={e => setMessage(e.target.value)}
                                className="h-24"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl border-white/50 backdrop-blur-sm hover:bg-white/10">Cancel</Button>
                        <Button onClick={handleSend} disabled={!email || loading} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.12)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.16)] hover:-translate-y-0.5 transition-all">
                            {loading ? "Sending..." : "Send Request"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

export default function ProductDetail({ productId, onBack }) {
    const queryClient = useQueryClient();
    const [isEditProductOpen, setIsEditProductOpen] = useState(false);
    const [editProductData, setEditProductData] = useState({});
    const [uploadingImage, setUploadingImage] = useState(false);
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [isDPPOpen, setIsDPPOpen] = useState(false);

    const { data: product, isLoading } = useQuery({
        queryKey: ['product', productId],
        queryFn: async () => {
            const list = await base44.entities.Product.list();
            return list.find(p => p.id === productId);
        }
    });

    const updateProductMutation = useMutation({
        mutationFn: (updates) => base44.entities.Product.update(productId, updates),
        onSuccess: () => {
            queryClient.invalidateQueries(['product', productId]);
            setIsEditProductOpen(false);
            toast.success("Product updated successfully");
        }
    });

    const handleEditProduct = () => {
        setEditProductData({
            name: product.name,
            sku: product.sku,
            description: product.description,
            quantity_amount: product.quantity_amount,
            unit: product.unit,
            system_boundary: product.system_boundary,
            version: product.version,
            image_url: product.image_url
        });
        setIsEditProductOpen(true);
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadingImage(true);
        try {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            setEditProductData(prev => ({ ...prev, image_url: file_url }));
            toast.success("Image uploaded");
        } catch (err) {
            console.error(err);
            toast.error("Failed to upload image");
        } finally {
            setUploadingImage(false);
        }
    };

    const { data: components = [] } = useQuery({
        queryKey: ['product-components', productId],
        queryFn: async () => {
            const all = await base44.entities.ProductComponent.list();
            return all.filter(c => c.product_id === productId);
        }
    });

    const calculateMutation = useMutation({
        mutationFn: async () => {
            toast.loading('Calculating carbon footprint...');
            
            // Calculate emissions per lifecycle stage
            const stageEmissions = {
                'Raw Material Acquisition': 0,
                'Production': 0,
                'Distribution': 0,
                'Usage': 0,
                'End-of-Life': 0
            };
            
            let total = 0;
            let calculatedCount = 0;
            
            for (const comp of components) {
                const emission = (comp.quantity || 0) * (comp.emission_factor || 0);
                
                // Update component with calculated value
                await base44.entities.ProductComponent.update(comp.id, {
                    co2e_kg: emission
                });
                
                total += emission;
                if (emission > 0) calculatedCount++;
                
                // Aggregate by lifecycle stage
                const stage = comp.lifecycle_stage || 'Production';
                if (stageEmissions[stage] !== undefined) {
                    stageEmissions[stage] += emission;
                }
            }
            
            // Calculate audit readiness based on data completeness
            const totalComponents = components.length;
            const componentsWithData = components.filter(c => c.emission_factor).length;
            const componentsWithVerification = components.filter(c => c.verification_status === 'Verified').length;
            const readinessScore = totalComponents > 0 
                ? Math.round(((componentsWithData * 0.6) + (componentsWithVerification * 0.4)) / totalComponents * 100)
                : 0;
            
            // Update product with all calculated values
            await base44.entities.Product.update(productId, {
                total_co2e_kg: total,
                raw_material_co2e: stageEmissions['Raw Material Acquisition'],
                production_co2e: stageEmissions['Production'],
                distribution_co2e: stageEmissions['Distribution'],
                usage_co2e: stageEmissions['Usage'],
                eol_co2e: stageEmissions['End-of-Life'],
                status: calculatedCount === totalComponents ? 'Completed' : 'In Progress',
                audit_readiness_score: readinessScore,
                last_calculated_date: new Date().toISOString()
            });

            // Track usage for billing
            const UsageMeteringService = (await import('@/components/billing/UsageMeteringService')).default;
            await UsageMeteringService.trackPCFCalculation({ productId });
            
            return { total, calculatedCount, totalComponents };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries(['product', productId]);
            queryClient.invalidateQueries(['product-components', productId]);
            toast.dismiss();
            toast.success(`PCF calculated: ${data.calculatedCount}/${data.totalComponents} components with data`);
        },
        onError: () => {
            toast.dismiss();
            toast.error('Calculation failed');
        }
    });

    if (isLoading || !product) return <div className="p-10 text-center">Loading...</div>;

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Clean Header with Product Info */}
            <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-transparent to-transparent pointer-events-none"></div>
                <div className="relative flex items-center justify-between p-6">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl hover:bg-white/20 backdrop-blur-sm">
                            <ArrowLeft className="w-5 h-5 text-slate-600" />
                        </Button>
                        <div className="flex items-center gap-4">
                            {product.image_url ? (
                                <img src={product.image_url} alt={product.name} className="w-14 h-14 object-contain rounded-xl bg-white/40 backdrop-blur-sm p-2 border border-white/50" />
                            ) : (
                                <div className="w-14 h-14 bg-white/40 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/50">
                                    <Box className="w-7 h-7 text-slate-400" />
                                </div>
                            )}
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h1 className="text-2xl font-extralight tracking-tight text-slate-900">{product.name}</h1>
                                    <Badge variant="outline" className={
                                        product.status === 'Completed' ? 'bg-emerald-50/80 text-emerald-700 border-emerald-200/60 font-light' : 
                                        'bg-slate-50/80 text-slate-600 border-slate-200/60 font-light'
                                    }>
                                        {product.status}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-slate-500 font-light">
                                    <span>{product.quantity_amount} {product.unit}</span>
                                    <span className="text-slate-300">•</span>
                                    <span>{product.system_boundary}</span>
                                    <span className="text-slate-300">•</span>
                                    <span>SKU: {product.sku || 'N/A'}</span>
                                    <span className="text-slate-300">•</span>
                                    <span>v{product.version}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setIsDPPOpen(true)} className="rounded-xl hover:bg-white/20 backdrop-blur-sm text-slate-600 font-light">
                            <ExternalLink className="w-4 h-4 mr-1.5" /> DPP
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setIsReportOpen(true)} className="rounded-xl hover:bg-white/20 backdrop-blur-sm text-slate-600 font-light">
                            <Download className="w-4 h-4 mr-1.5" /> Report
                        </Button>
                        <Button size="sm" variant="ghost" onClick={handleEditProduct} className="rounded-xl hover:bg-white/20 backdrop-blur-sm text-slate-600 font-light">
                            <Edit2 className="w-4 h-4 mr-1.5" /> Edit
                        </Button>
                    </div>
                </div>

                {/* Key Metrics Row */}
                <div className="relative grid grid-cols-4 divide-x divide-white/20 bg-white/20 backdrop-blur-sm">
                    <div className="p-5">
                        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-light mb-2">Total PCF</p>
                        <p className="text-3xl font-extralight text-slate-900">{(product.total_co2e_kg || 0).toFixed(2)}</p>
                        <p className="text-xs text-slate-400 font-light mt-0.5">kg CO₂e</p>
                    </div>
                    <div className="p-5">
                        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-light mb-2">Per Unit</p>
                        <p className="text-2xl font-extralight text-slate-900">
                            {product.quantity_amount > 0 ? ((product.total_co2e_kg || 0) / product.quantity_amount).toFixed(3) : '0.000'}
                        </p>
                        <p className="text-xs text-slate-400 font-light mt-0.5">kg CO₂e/{product.unit}</p>
                    </div>
                    <div className="p-5">
                        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-light mb-2">Data Completeness</p>
                        <div className="flex items-baseline gap-2 mb-2">
                            <p className="text-2xl font-extralight text-slate-900">
                                {components.length > 0 ? Math.round((components.filter(c => c.emission_factor).length / components.length) * 100) : 0}%
                            </p>
                        </div>
                        <div className="w-full h-1 bg-slate-200/60 rounded-full overflow-hidden backdrop-blur-sm">
                            <div className="h-full bg-[#86b027] transition-all" style={{ width: `${components.length > 0 ? (components.filter(c => c.emission_factor).length / components.length) * 100 : 0}%` }} />
                        </div>
                    </div>
                    <div className="p-5">
                        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-light mb-2">Audit Readiness</p>
                        <div className="flex items-baseline gap-2 mb-2">
                            <p className="text-2xl font-extralight text-slate-900">{product.audit_readiness_score || 0}%</p>
                        </div>
                        <div className="w-full h-1 bg-slate-200/60 rounded-full overflow-hidden backdrop-blur-sm">
                            <div className="h-full bg-[#86b027] transition-all" style={{ width: `${product.audit_readiness_score || 0}%` }} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-6">

                {/* Main Content with Sidebar */}
                <div className="col-span-9 space-y-6">
                    {/* BOM Management */}
                    <BOMManager productId={productId} components={components} product={product} />

                    {/* Analysis Tabs */}
                    <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
                        <Tabs defaultValue="scenarios" className="w-full">
                            <TabsList className="relative bg-white/30 backdrop-blur-md border-b border-white/30 rounded-none h-auto p-0 w-full justify-start">
                                <TabsTrigger value="scenarios" className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-[#86b027] data-[state=active]:bg-white/20 data-[state=active]:text-slate-900 hover:bg-white/10 px-8 py-4 text-sm font-extralight text-slate-600 transition-all tracking-wide backdrop-blur-sm gap-2">
                                    <Microscope className="w-4 h-4" /> What-If Analysis
                                </TabsTrigger>
                                <TabsTrigger value="audit" className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-[#86b027] data-[state=active]:bg-white/20 data-[state=active]:text-slate-900 hover:bg-white/10 px-8 py-4 text-sm font-extralight text-slate-600 transition-all tracking-wide backdrop-blur-sm">
                                    Audit Trail
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="scenarios" className="mt-0 p-6">
                                <ProductScenarioModeler product={product} components={components} />
                            </TabsContent>

                            <TabsContent value="audit" className="mt-0 p-6">
                                <PCFAuditTrail productId={productId} />
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>

                {/* Sticky Sidebar */}
                <div className="col-span-3 space-y-6">
                    <div className="sticky top-6 space-y-6">
                        {/* Lifecycle Breakdown */}
                        {components.length > 0 && components.some(c => c.co2e_kg) && (
                            <LifecycleBreakdown components={components} systemBoundary={product.system_boundary} />
                        )}

                        {/* Collaboration Panel */}
                        <BOMCollaborationPanel productId={productId} />
                    </div>
                </div>
            </div>
            
            {/* ISO 14067 Report Generator Modal */}
            <ISO14067ReportGenerator 
                product={product} 
                components={components} 
                isOpen={isReportOpen} 
                onClose={() => setIsReportOpen(false)} 
            />

            <DPPPublisher
                product={product}
                components={components}
                isOpen={isDPPOpen}
                onClose={() => setIsDPPOpen(false)}
            />

            {/* Action Bar */}
            {/* Edit Product Modal */}
            <Dialog open={isEditProductOpen} onOpenChange={setIsEditProductOpen}>
                <DialogContent className="sm:max-w-[600px] bg-gradient-to-br from-white/80 via-white/60 to-white/40 backdrop-blur-3xl border border-white/50 shadow-[0_16px_48px_rgba(0,0,0,0.16)]">
                    <DialogHeader>
                        <DialogTitle>Edit Product Details</DialogTitle>
                        <DialogDescription>Update product metadata and system boundaries.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Product Name</Label>
                                <Input value={editProductData.name} onChange={(e) => setEditProductData({...editProductData, name: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                                <Label>SKU / ID</Label>
                                <Input value={editProductData.sku} onChange={(e) => setEditProductData({...editProductData, sku: e.target.value})} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea value={editProductData.description} onChange={(e) => setEditProductData({...editProductData, description: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Quantity Amount</Label>
                                <Input type="number" value={editProductData.quantity_amount} onChange={(e) => setEditProductData({...editProductData, quantity_amount: parseFloat(e.target.value)})} />
                            </div>
                            <div className="space-y-2">
                                <Label>Unit (ISO 14067)</Label>
                                <Select value={editProductData.unit} onValueChange={(v) => setEditProductData({...editProductData, unit: v})}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="piece">Piece</SelectItem>
                                        <SelectItem value="kg">Kilogram (kg)</SelectItem>
                                        <SelectItem value="ton">Tonne</SelectItem>
                                        <SelectItem value="liter">Liter</SelectItem>
                                        <SelectItem value="meter">Meter</SelectItem>
                                        <SelectItem value="m2">Square Meter (m²)</SelectItem>
                                        <SelectItem value="m3">Cubic Meter (m³)</SelectItem>
                                        <SelectItem value="kWh">Kilowatt-hour (kWh)</SelectItem>
                                        <SelectItem value="MWh">Megawatt-hour (MWh)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Version</Label>
                                <Input value={editProductData.version} onChange={(e) => setEditProductData({...editProductData, version: e.target.value})} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>System Boundary</Label>
                            <Select value={editProductData.system_boundary} onValueChange={(v) => setEditProductData({...editProductData, system_boundary: v})}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Cradle-to-Gate">Cradle-to-Gate</SelectItem>
                                    <SelectItem value="Cradle-to-Grave">Cradle-to-Grave</SelectItem>
                                    <SelectItem value="Gate-to-Gate">Gate-to-Gate</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Product Image</Label>
                            <div className="flex items-center gap-4">
                                {editProductData.image_url && (
                                    <img src={editProductData.image_url} alt="Preview" className="h-16 w-16 object-cover rounded-md border" />
                                )}
                                <Input 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={handleImageUpload} 
                                    disabled={uploadingImage}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditProductOpen(false)} className="rounded-xl border-white/50 backdrop-blur-sm hover:bg-white/10">Cancel</Button>
                        <Button onClick={() => updateProductMutation.mutate(editProductData)} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.12)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.16)] hover:-translate-y-0.5 transition-all">
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}