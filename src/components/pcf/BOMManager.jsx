import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit2, Database, Leaf, Search, Check, Sparkles, Download, Loader2, ChevronRight, ChevronDown, Network, Box, ArrowRight, Layers, BrainCircuit, Flag, ShieldAlert, ShieldCheck, Expand, Minimize, MailQuestion, Zap, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import DatasetSelector from './DatasetSelector';
import DataQualityEngine from './DataQualityEngine';
import AIComponentSuggester from './AIComponentSuggester';
import AIDataQualityValidator from './AIDataQualityValidator';
import PredictiveLCAEstimator from './PredictiveLCAEstimator';
import BOMDocumentScanner from './BOMDocumentScanner';
import SupplierPCFAutoLinker from './SupplierPCFAutoLinker';

// Helper for Audit Logging
const logAudit = async (productId, entityId, action, details) => {
    try {
        const user = await base44.auth.me();
        await base44.entities.PCFAuditLog.create({
            product_id: productId,
            entity_id: entityId,
            entity_type: 'ProductComponent',
            action: action,
            changes: JSON.stringify(details),
            performed_by: user?.email || 'system',
            timestamp: new Date().toISOString()
        });
    } catch (e) {
        console.error("Failed to log audit", e);
    }
};

export default function BOMManager({ productId, components, product }) {
    const queryClient = useQueryClient();
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isDatasetOpen, setIsDatasetOpen] = useState(false);
    const [isAIProcessing, setIsAIProcessing] = useState(false);
    const [isCompletenessCheck, setIsCompletenessCheck] = useState(false);
    const [editingComponent, setEditingComponent] = useState(null);
    const [expandedNodes, setExpandedNodes] = useState({});
    const [isManualEditOpen, setIsManualEditOpen] = useState(false);
    const [manualEditData, setManualEditData] = useState({});
    const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
    const [reviewData, setReviewData] = useState({ id: null, status: '', notes: '' });
    const [isValidatorOpen, setIsValidatorOpen] = useState(true);
    const [requestDataOpen, setRequestDataOpen] = useState(false);
    const [requestTarget, setRequestTarget] = useState(null);
    const [requestNote, setRequestNote] = useState("");
    const [showAISuggester, setShowAISuggester] = useState(true);
    const [showPredictive, setShowPredictive] = useState(false);
    const [isDocScannerOpen, setIsDocScannerOpen] = useState(false);

    // Calculate data completeness for predictive estimator
    const dataCompleteness = components.length > 0 
      ? (components.filter(c => c.emission_factor && c.co2e_kg).length / components.length) * 100
      : 0;
    
    const [newItem, setNewItem] = useState({
        name: "",
        material_type: "",
        quantity: 1,
        unit: "kg",
        lifecycle_stage: "Production",
        node_type: "Component",
        parent_component_id: null,
        geographic_origin: "Global"
    });

    // Toggle Tree Node
    const toggleNode = (id) => {
        setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const expandAll = () => {
        const allIds = { 'product-root': true };
        components.forEach(c => allIds[c.id] = true);
        setExpandedNodes(allIds);
    };

    const collapseAll = () => {
        setExpandedNodes({ 'product-root': true }); // Keep product root expanded
    };

    // Tree Construction - Product as Root with Lifecycle Stages
    const treeData = useMemo(() => {
        // Group components by lifecycle stage for better hierarchy
        const stageOrder = ['Raw Material Acquisition', 'Production', 'Distribution', 'Usage', 'End-of-Life'];
        
        const buildTree = (parentId = null) => {
            return components
                .filter(c => c.parent_component_id === parentId || (!parentId && !c.parent_component_id))
                .sort((a, b) => {
                    // Sort by created date to maintain insertion order (newest last)
                    const dateA = new Date(a.created_date || 0).getTime();
                    const dateB = new Date(b.created_date || 0).getTime();
                    return dateA - dateB;
                })
                .map(node => ({
                    ...node,
                    children: buildTree(node.id)
                }));
        };
        
        // Group root-level components by lifecycle stage
        const rootComponents = buildTree(null);
        const stageGroups = {};
        
        rootComponents.forEach(comp => {
            const stage = comp.lifecycle_stage || 'Production';
            if (!stageGroups[stage]) stageGroups[stage] = [];
            stageGroups[stage].push(comp);
        });
        
        // Create stage nodes with processes as children
        const stageNodes = stageOrder
            .filter(stage => stageGroups[stage] && stageGroups[stage].length > 0)
            .map(stage => {
                const stageComponents = stageGroups[stage];
                const stageCO2e = stageComponents.reduce((sum, c) => sum + (c.co2e_kg || 0), 0);
                
                return {
                    id: `stage-${stage}`,
                    name: stage,
                    node_type: 'Stage',
                    quantity: '-',
                    unit: '',
                    co2e_kg: stageCO2e,
                    lifecycle_stage: stage,
                    children: stageComponents,
                    isStage: true
                };
            });
        
        // Return product as root with stage hierarchy
        return [{
            id: 'product-root',
            name: product?.name || 'Product',
            node_type: 'Product',
            quantity: product?.quantity_amount || 1,
            unit: product?.unit || 'piece',
            co2e_kg: product?.total_co2e_kg || 0,
            lifecycle_stage: product?.system_boundary || 'Cradle-to-Gate',
            children: stageNodes,
            isProductRoot: true
        }];
    }, [components, product]);

    const createDataRequestMutation = useMutation({
        mutationFn: async () => {
            if (!requestTarget) return;
            // In a real app, we'd pick a supplier. Here we assume one is assigned or we create a generic request.
            // If no supplier_id on component, we might need to prompt for one. 
            // For this demo, we'll assume we can create a request even if supplier is TBD, or we use a placeholder.
            
            const targetSupplierId = requestTarget.supplier_id;
            
            if (!targetSupplierId) {
                // If no supplier, we can't really send it. 
                // For UX, let's assume we prompt user to pick one, but for now we'll just fail gracefully or mock it.
                 throw new Error("Please assign a supplier to this component first.");
            }

            await base44.entities.DataRequest.create({
                request_id: `REQ-${Date.now()}`,
                supplier_id: targetSupplierId,
                related_entity_id: requestTarget.id,
                related_entity_type: 'ProductComponent',
                title: `Data Request for ${requestTarget.name}`,
                description: requestNote || `Please provide emission data for ${requestTarget.name}.`,
                request_type: "PCF Data",
                status: "Pending",
                due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days
                requested_by: "system"
            });
        },
        onSuccess: () => {
            toast.success("Request sent to supplier");
            setRequestDataOpen(false);
            setRequestNote("");
            setRequestTarget(null);
        },
        onError: (err) => {
            toast.error(err.message || "Failed to send request");
        }
    });

    const createMutation = useMutation({
        mutationFn: async (data) => {
            const comp = await base44.entities.ProductComponent.create({ ...data, product_id: productId });
            await logAudit(productId, comp.id, 'Created', { name: comp.name, quantity: comp.quantity });
            return comp;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['product-components', productId]);
            setIsAddOpen(false);
            setNewItem({ name: "", material_type: "", quantity: 1, unit: "kg", lifecycle_stage: "Production", node_type: "Component", parent_component_id: null, geographic_origin: "Global" });
            toast.success("Added to BOM");
        }
    });

    const updateMutation = useMutation({
        mutationFn: async (data) => {
            await base44.entities.ProductComponent.update(data.id, data.updates);
            await logAudit(productId, data.id, 'Updated', data.updates);
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries(['product-components', productId]);
            queryClient.invalidateQueries(['product', productId]);
            setIsDatasetOpen(false);
            setEditingComponent(null);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            await base44.entities.ProductComponent.delete(id);
            await logAudit(productId, id, 'Deleted', { id });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['product-components', productId]);
            toast.success("Removed");
        }
    });

    const aiCompletenessMutation = useMutation({
        mutationFn: async () => {
            setIsCompletenessCheck(true);
            try {
                const structure = components.map(c => `${c.name} (${c.node_type})`).join(', ');
                const prompt = `Review this BOM structure for completeness based on industry standards (ISO 14067):
                Structure: ${structure}
                
                Identify 3 potentially missing process steps, transport legs, or material inputs.
                Return JSON: { "suggestions": [{ "name": "string", "type": "Process|Transport|Material", "reason": "string" }] }`;

                const response = await base44.integrations.Core.InvokeLLM({
                    prompt: prompt,
                    response_json_schema: {
                        type: "object",
                        properties: {
                            suggestions: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        name: { type: "string" },
                                        type: { type: "string" },
                                        reason: { type: "string" }
                                    }
                                }
                            }
                        }
                    }
                });
                const result = typeof response === 'string' ? JSON.parse(response) : response;
                return result.suggestions;
            } finally {
                setIsCompletenessCheck(false);
            }
        }
    });

    const aiSuggestMutation = useMutation({
        mutationFn: async () => {
            setIsAIProcessing(true);
            try {
                const prompt = `Suggest technical details for a BOM component:
                Name: ${newItem.name}
                Type: ${newItem.node_type}
                
                Return JSON with:
                - material_type (e.g. Steel, Plastic, Electricity)
                - unit (e.g. kg, kWh, tkm)
                - geographic_origin (ISO 2-letter code, e.g. CN, DE. Guess based on typical supply chains or return 'Global')
                - lifecycle_stage (ISO 14067 stage)`;

                const response = await base44.integrations.Core.InvokeLLM({
                    prompt: prompt,
                    response_json_schema: {
                        type: "object",
                        properties: {
                            material_type: { type: "string" },
                            unit: { type: "string" },
                            geographic_origin: { type: "string" },
                            lifecycle_stage: { type: "string", enum: ["Raw Material Acquisition", "Production", "Distribution", "Usage", "End-of-Life"] }
                        }
                    }
                });
                return typeof response === 'string' ? JSON.parse(response) : response;
            } finally {
                setIsAIProcessing(false);
            }
        },
        onSuccess: (data) => {
            setNewItem(prev => ({
                ...prev,
                material_type: data.material_type || prev.material_type,
                unit: data.unit || prev.unit,
                geographic_origin: data.geographic_origin || prev.geographic_origin,
                lifecycle_stage: data.lifecycle_stage || prev.lifecycle_stage
            }));
            toast.success("Auto-filled with AI suggestions");
        }
    });

    const handleAssignDataset = (component) => {
        setEditingComponent(component);
        setIsDatasetOpen(true);
    };

    // Auto-check for supplier PCF data on component mount
    React.useEffect(() => {
        const checkSupplierPCF = async () => {
            if (!productId) return;

            const comps = await base44.entities.ProductComponent.filter({ product_id: productId });
            const suppliersWithComponents = [...new Set(comps.map(c => c.supplier_id).filter(Boolean))];

            // Check if any suppliers have PCF data
            for (const supplierId of suppliersWithComponents) {
                const pcfData = await base44.entities.SupplierPCF.filter({ 
                    supplier_id: supplierId,
                    status: 'verified' 
                });

                if (pcfData.length > 0) {
                    // Auto-link PCF to components
                    await SupplierPCFAutoLinker.linkPCFToComponents(pcfData[0].id);
                    queryClient.invalidateQueries(['product-components', productId]);
                }
            }
        };

        checkSupplierPCF();
    }, [productId]);

    // Auto-recalculate product totals when components change
    const recalculateProductTotals = async () => {
        const allComponents = await base44.entities.ProductComponent.filter({ product_id: productId });
        
        const stageEmissions = {
            'Raw Material Acquisition': 0,
            'Production': 0,
            'Distribution': 0,
            'Usage': 0,
            'End-of-Life': 0
        };
        
        let total = 0;
        allComponents.forEach(comp => {
            const emission = comp.co2e_kg || 0;
            total += emission;
            const stage = comp.lifecycle_stage || 'Production';
            if (stageEmissions[stage] !== undefined) {
                stageEmissions[stage] += emission;
            }
        });
        
        const componentsWithData = allComponents.filter(c => c.emission_factor).length;
        const readinessScore = allComponents.length > 0 
            ? Math.round((componentsWithData / allComponents.length) * 100 * 0.7 + 
                (allComponents.filter(c => c.verification_status === 'Verified').length / allComponents.length) * 30)
            : 0;
        
        await base44.entities.Product.update(productId, {
            total_co2e_kg: total,
            raw_material_co2e: stageEmissions['Raw Material Acquisition'],
            production_co2e: stageEmissions['Production'],
            distribution_co2e: stageEmissions['Distribution'],
            usage_co2e: stageEmissions['Usage'],
            eol_co2e: stageEmissions['End-of-Life'],
            status: componentsWithData === allComponents.length ? 'Completed' : 'In Progress',
            audit_readiness_score: readinessScore,
            last_calculated_date: new Date().toISOString()
        });
        
        queryClient.invalidateQueries(['product', productId]);
        queryClient.invalidateQueries(['product-components', productId]);
    };

    const handleDatasetSelected = async (dataset) => {
        if (editingComponent) {
            // Edit existing component assignment and auto-calculate impact
            const co2e = (editingComponent.quantity || 0) * dataset.factor;
            
            await updateMutation.mutateAsync({
                id: editingComponent.id,
                updates: {
                    assigned_dataset_id: dataset.id,
                    assigned_dataset_name: dataset.name,
                    emission_factor: dataset.factor,
                    emission_factor_source: dataset.source,
                    data_quality_rating: dataset.dqr || 3,
                    geographic_origin: dataset.region || editingComponent.geographic_origin,
                    co2e_kg: co2e
                }
            });
            
            // Auto-recalculate product totals after component update
            await recalculateProductTotals();
            
            toast.success(`Impact calculated: ${co2e.toFixed(3)} kg CO₂e`);
        } else {
            // Selected from 'Add Item' or 'Manual Edit' context
            if (isAddOpen) {
                setNewItem(prev => ({
                    ...prev,
                    emission_factor: dataset.factor,
                    geographic_origin: dataset.region || prev.geographic_origin,
                    data_quality_rating: dataset.dqr || 3,
                    unit: dataset.unit || prev.unit // Optional: adopt unit
                }));
            } else if (isManualEditOpen) {
                setManualEditData(prev => ({
                    ...prev,
                    emission_factor: dataset.factor,
                    geographic_origin: dataset.region || prev.geographic_origin,
                    data_quality_rating: dataset.dqr || 3
                }));
            }
            setIsDatasetOpen(false);
        }
    };

    const handleManualEdit = (component) => {
        setManualEditData({
            id: component.id,
            name: component.name,
            quantity: component.quantity,
            emission_factor: component.emission_factor,
            co2e_kg: component.co2e_kg,
            geographic_origin: component.geographic_origin,
            data_quality_rating: component.data_quality_rating,
            allocation_method: component.allocation_method || 'None',
            lifecycle_stage: component.lifecycle_stage || 'Production'
        });
        setIsManualEditOpen(true);
    };

    const saveManualEdit = async () => {
        // Auto-calculate impact from quantity × emission factor
        const updates = { ...manualEditData };
        const calculatedImpact = (updates.quantity || 0) * (updates.emission_factor || 0);
        updates.co2e_kg = calculatedImpact;
        
        // Remove the manual co2e_kg input if it exists (should always be calculated)
        delete updates.id;

        await updateMutation.mutateAsync({
            id: manualEditData.id,
            updates: updates
        });
        
        // Auto-recalculate product totals after update
        await recalculateProductTotals();
        
        toast.success(`Impact updated: ${calculatedImpact.toFixed(3)} kg CO₂e`);
        setIsManualEditOpen(false);
    };

    // Recursive Row Renderer
    const renderRow = (node, level = 0) => {
        const hasChildren = node.children && node.children.length > 0;
        const isExpanded = expandedNodes[node.id] !== undefined ? expandedNodes[node.id] : true; // Default expanded
        const isProductRoot = node.isProductRoot;
        const isStage = node.isStage;
        
        // Data Quality Rating: Primary=5, Secondary Verified=4, Secondary=3, Default=2, Estimated=1
        const getDQRColor = (rating) => {
            if (rating >= 4) return 'bg-emerald-500';
            if (rating === 3) return 'bg-yellow-500';
            if (rating === 2) return 'bg-orange-500';
            return 'bg-red-500';
        };
        const dqrColor = getDQRColor(node.data_quality_rating || 2);

        return (
            <React.Fragment key={node.id}>
                <TableRow className={`group hover:bg-white/40 backdrop-blur-sm transition-all ${isProductRoot ? 'bg-[#86b027]/10 border-t border-b border-[#86b027]/30' : isStage ? 'bg-white/20' : node.verification_status === 'Flagged' ? 'bg-red-50/30' : ''}`}>
                    <TableCell className="py-4">
                        <div className="flex items-center" style={{ paddingLeft: `${level * 24}px` }}>
                            {hasChildren ? (
                                <button onClick={() => toggleNode(node.id)} className="mr-2 text-slate-400 hover:text-[#86b027] transition-colors">
                                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                </button>
                            ) : (
                                <span className="w-6 mr-2"></span>
                            )}
                            
                            {isProductRoot && <Box className="w-5 h-5 mr-2 text-[#86b027]" />}
                            {isStage && <Layers className="w-5 h-5 mr-2 text-[#86b027]" />}
                            {node.node_type === 'Process' && <Layers className="w-4 h-4 mr-2 text-slate-500" />}
                            {node.node_type === 'Transport' && <ArrowRight className="w-4 h-4 mr-2 text-slate-500" />}
                            {node.node_type === 'Component' && <Box className="w-4 h-4 mr-2 text-slate-500" />}
                            {node.node_type === 'Energy' && <Zap className="w-4 h-4 mr-2 text-slate-500" />}
                            
                            <div className="flex flex-col">
                                <span className={`flex items-center gap-2 ${isProductRoot ? 'font-light text-slate-900 text-base' : isStage ? 'font-light text-slate-900 text-sm' : 'text-slate-700 text-sm font-light'}`}>
                                    {node.name}
                                    {isProductRoot && <Badge variant="outline" className="text-[9px] bg-[#86b027]/10 border-[#86b027]/30 text-[#86b027] font-light">Final Product</Badge>}
                                    {isStage && <Badge variant="outline" className="text-[9px] bg-[#86b027]/10 border-[#86b027]/30 text-[#86b027] font-light">Lifecycle Stage</Badge>}
                                    {node.verification_status === 'Verified' && <ShieldCheck className="w-3 h-3 text-[#86b027]" />}
                                    {node.verification_status === 'Flagged' && <Flag className="w-3 h-3 text-red-500" />}
                                </span>
                                {!isProductRoot && !isStage && (
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[10px] text-slate-400 font-light">{node.material_type || node.node_type}</span>
                                        {node.geographic_origin && <span className="text-[10px] text-slate-400 font-light">• {node.geographic_origin}</span>}
                                    </div>
                                )}
                            </div>
                        </div>
                    </TableCell>
                    <TableCell>
                        {!isStage && (
                            <div className="flex flex-col">
                                <span className={`text-sm font-light ${isProductRoot ? 'text-slate-900' : 'text-slate-700'}`}>{node.quantity} {node.unit}</span>
                            </div>
                        )}
                    </TableCell>
                    <TableCell>
                        {isProductRoot || isStage ? (
                            <Badge variant="outline" className="text-xs text-slate-500 font-light border-slate-200/60 bg-white/40">Sum of components</Badge>
                        ) : node.assigned_dataset_name ? (
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="bg-[#86b027]/10 text-[#86b027] hover:bg-[#86b027]/20 border border-[#86b027]/30 text-[10px] truncate max-w-[150px] font-light" title={node.assigned_dataset_name}>
                                        <Database className="w-3 h-3 mr-1" />
                                        {node.assigned_dataset_name.substring(0, 15)}...
                                    </Badge>
                                    <div title={`Data Quality: ${node.data_quality_rating || 2}/5 (5=Primary, 4=Verified, 3=Secondary, 2=Default, 1=Estimate)`} className={`flex-shrink-0 h-2 w-2 rounded-full ${dqrColor}`} />
                                </div>
                                <span className="text-[10px] text-slate-400 font-light">EF: {node.emission_factor} kgCO₂e/{node.unit}</span>
                            </div>
                        ) : (
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-amber-600 hover:bg-amber-50/50 font-light backdrop-blur-sm rounded-lg border border-amber-200/30" onClick={() => handleAssignDataset(node)}>
                                <Search className="w-3 h-3 mr-1" /> Assign Factor
                            </Button>
                        )}
                    </TableCell>
                    <TableCell>
                        {node.co2e_kg !== undefined && node.co2e_kg !== null && node.co2e_kg > 0 ? (
                            <div className={`${isProductRoot ? 'text-[#86b027] text-lg font-light' : isStage ? 'text-slate-900 text-base font-light' : 'text-slate-700 font-light'}`}>
                                {node.co2e_kg.toFixed(3)} <span className="text-[10px] font-light text-slate-400">kg CO₂e</span>
                            </div>
                        ) : isProductRoot || isStage ? (
                            <div className="flex items-center gap-2">
                                <span className="text-slate-400 text-sm font-light">0.000 kg CO₂e</span>
                                {!isProductRoot && <AlertCircle className="w-3 h-3 text-amber-500" title="Waiting for component data" />}
                            </div>
                        ) : (
                            <Badge variant="outline" className="text-xs bg-slate-50/50 text-slate-400 font-light border-slate-200/60">Pending</Badge>
                        )}
                    </TableCell>
                    <TableCell className="text-right">
                        {!isProductRoot && !isStage && (
                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-[#86b027] hover:bg-white/40 rounded-lg" onClick={() => {
                                    setReviewData({ id: node.id, status: node.verification_status || 'Unverified', notes: node.review_notes || '' });
                                    setReviewDialogOpen(true);
                                }} title="Verify / Flag Data">
                                    <ShieldAlert className="w-3 h-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-600 hover:bg-white/40 rounded-lg" onClick={() => {
                                    setRequestTarget(node);
                                    setRequestDataOpen(true);
                                }} title="Request Info from Supplier">
                                    <MailQuestion className="w-3 h-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-600 hover:bg-white/40 rounded-lg" onClick={() => handleManualEdit(node)} title="Edit Details">
                                    <Edit2 className="w-3 h-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-600 hover:bg-white/40 rounded-lg" onClick={() => { setNewItem({...newItem, parent_component_id: node.id}); setIsAddOpen(true); }} title="Add Sub-component">
                                    <Plus className="w-3 h-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-500 hover:bg-white/40 rounded-lg" onClick={() => deleteMutation.mutate(node.id)}>
                                    <Trash2 className="w-3 h-3" />
                                </Button>
                            </div>
                        )}
                        {isProductRoot && (
                            <Button size="sm" onClick={() => { setNewItem({...newItem, parent_component_id: null}); setIsAddOpen(true); }} className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-7 rounded-lg shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all font-light">
                                <Plus className="w-3 h-3 mr-1" /> Add Process
                            </Button>
                        )}
                        {isStage && (
                            <Button size="sm" variant="ghost" onClick={() => { 
                                const stageComponent = components.find(c => c.lifecycle_stage === node.lifecycle_stage);
                                setNewItem({...newItem, parent_component_id: stageComponent?.id || null, lifecycle_stage: node.lifecycle_stage}); 
                                setIsAddOpen(true); 
                            }} className="text-xs h-7 text-[#86b027] hover:bg-[#86b027]/10 font-light">
                                <Plus className="w-3 h-3 mr-1" /> Add to Stage
                            </Button>
                        )}
                    </TableCell>
                </TableRow>
                {isExpanded && node.children && node.children.map(child => renderRow(child, level + 1))}
            </React.Fragment>
        );
    };

    // Calculate missing factors count
    const missingFactors = components.filter(c => !c.emission_factor).length;
    const totalImpact = components.reduce((sum, c) => sum + (c.co2e_kg || 0), 0);

    return (
        <div className="space-y-6">
            {/* Status Banner */}
            {missingFactors > 0 && (
                <div className="relative bg-gradient-to-br from-amber-100/40 via-amber-50/20 to-white/30 backdrop-blur-3xl rounded-2xl border border-amber-200/40 shadow-[0_8px_32px_rgba(0,0,0,0.08)] overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent pointer-events-none"></div>
                    <div className="relative p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-100/50 backdrop-blur-sm rounded-lg border border-amber-200/30">
                                    <AlertCircle className="w-5 h-5 text-amber-600" />
                                </div>
                                <div>
                                    <h4 className="font-light text-slate-900">Action Required: Assign Emission Factors</h4>
                                    <p className="text-sm text-slate-600 font-light">
                                        {missingFactors} component{missingFactors !== 1 ? 's' : ''} need{missingFactors === 1 ? 's' : ''} emission factors to calculate impacts
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-extralight text-slate-900">{components.length - missingFactors}/{components.length}</div>
                                <div className="text-xs text-slate-500 font-light">Complete</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden p-6">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-transparent to-transparent pointer-events-none"></div>
                <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white/40 backdrop-blur-xl border border-white/60 flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                        <Network className="w-6 h-6 text-slate-900" />
                    </div>
                    <div>
                        <h3 className="text-xl font-extralight tracking-tight text-slate-900">Bill of Materials</h3>
                        <div className="flex items-center gap-4 mt-1">
                            <p className="text-xs text-slate-500 font-light">{components.length} components</p>
                            <div className="flex items-center gap-2">
                                <div className="w-32 h-1.5 bg-slate-200/60 rounded-full overflow-hidden backdrop-blur-sm">
                                    <div className="h-full bg-[#86b027] transition-all" style={{ width: `${dataCompleteness}%` }} />
                                </div>
                                <span className="text-xs font-light text-slate-600">{dataCompleteness.toFixed(0)}%</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button size="sm" variant="ghost" className="rounded-xl hover:bg-white/20 backdrop-blur-sm text-slate-600 font-light" onClick={() => setIsDocScannerOpen(true)}>
                        <Sparkles className="w-4 h-4 mr-1" /> Scan Document
                    </Button>
                    <Button size="sm" variant="ghost" onClick={expandAll} className="rounded-xl hover:bg-white/20 backdrop-blur-sm text-slate-600 font-light">
                        <Expand className="w-3 h-3 mr-1" /> Expand
                    </Button>
                    <Button size="sm" variant="ghost" onClick={collapseAll} className="rounded-xl hover:bg-white/20 backdrop-blur-sm text-slate-600 font-light">
                        <Minimize className="w-3 h-3 mr-1" /> Collapse
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => aiCompletenessMutation.mutate()} disabled={isCompletenessCheck} className="rounded-xl hover:bg-white/20 backdrop-blur-sm text-slate-600 font-light">
                        {isCompletenessCheck ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <BrainCircuit className="w-4 h-4 mr-1" />}
                        AI Check
                    </Button>
                </div>
                </div>
            </div>

            {/* BOM Table */}
            <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-transparent to-transparent pointer-events-none"></div>
                <div className="relative">
                <Table>
                    <TableHeader className="bg-white/30 backdrop-blur-md border-b border-white/30">
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="w-[35%] text-slate-600 font-light">
                                <div className="flex items-center gap-2">
                                    Component
                                    <span className="text-[10px] text-slate-400 font-light">({components.length})</span>
                                </div>
                            </TableHead>
                            <TableHead className="w-[15%] text-slate-600 font-light">Quantity</TableHead>
                            <TableHead className="w-[20%] text-slate-600 font-light">
                                <div className="flex items-center gap-2">
                                    Emission Factor
                                    {missingFactors > 0 && (
                                        <Badge variant="outline" className="bg-amber-50/80 text-amber-600 border-amber-200/60 text-[9px] font-light">
                                            {missingFactors} missing
                                        </Badge>
                                    )}
                                </div>
                            </TableHead>
                            <TableHead className="w-[15%] text-slate-600 font-light">
                                <div className="flex flex-col">
                                    <span>Impact</span>
                                    {totalImpact > 0 && (
                                        <span className="text-[10px] text-[#86b027] font-semibold">Σ {totalImpact.toFixed(3)} kg CO₂e</span>
                                    )}
                                </div>
                            </TableHead>
                            <TableHead className="w-[15%] text-right text-slate-600 font-light">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {treeData.map(node => renderRow(node))}
                    </TableBody>
                </Table>
                </div>
            </div>

            {/* AI Suggestions from Completeness Check */}
            {aiCompletenessMutation.data && aiCompletenessMutation.data.length > 0 && (
                <div className="relative bg-gradient-to-br from-[#86b027]/10 via-[#86b027]/5 to-white/30 backdrop-blur-3xl rounded-2xl border border-[#86b027]/30 shadow-[0_8px_32px_rgba(134,176,39,0.12)] overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#86b027]/5 via-transparent to-transparent pointer-events-none"></div>
                    <div className="relative p-4">
                        <h4 className="text-sm font-light text-slate-900 mb-3 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-[#86b027]" /> AI Suggestions
                        </h4>
                        <div className="space-y-2">
                            {aiCompletenessMutation.data.map((sugg, idx) => (
                                <div key={idx} className="flex items-start gap-3 bg-white/40 backdrop-blur-sm p-3 rounded-lg border border-white/60">
                                    <Badge variant="outline" className="text-[10px] shrink-0 font-light border-slate-200/60 bg-white/40">{sugg.type}</Badge>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-light text-sm text-slate-900">{sugg.name}</p>
                                        <p className="text-xs text-slate-600 font-light mt-0.5">{sugg.reason}</p>
                                    </div>
                                    <Button size="sm" variant="ghost" className="h-7 text-xs text-[#86b027] hover:bg-[#86b027]/10 shrink-0 font-light" onClick={() => {
                                        setNewItem({ ...newItem, name: sugg.name, node_type: sugg.type === 'Material' ? 'Component' : sugg.type });
                                        setIsAddOpen(true);
                                    }}>Add</Button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* AI Tools Section */}
            <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-transparent to-transparent pointer-events-none"></div>
                <div className="relative">
                    <div className="p-5 border-b border-white/30 bg-white/20 backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/40 backdrop-blur-xl border border-white/60 flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                                <Sparkles className="w-5 h-5 text-[#86b027]" />
                            </div>
                            <div>
                                <h4 className="text-base font-extralight tracking-tight text-slate-900">AI Assistant</h4>
                                <p className="text-xs text-slate-500 font-light">Automated suggestions and quality validation</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-5 space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <AIComponentSuggester 
                                productId={productId}
                                productName={product?.name}
                                productCategory={product?.category}
                                existingComponents={components}
                                onApplyComponent={() => queryClient.invalidateQueries({ queryKey: ['product-components'] })}
                            />
                            
                            <AIDataQualityValidator 
                                components={components}
                                productId={productId}
                                onUpdateComponent={(id, updates) => updateMutation.mutate({ id, updates })}
                            />
                        </div>

                        {dataCompleteness < 70 && (
                            <PredictiveLCAEstimator 
                                productId={productId}
                                product={product}
                                components={components}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Add Item Modal */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="bg-gradient-to-br from-white/80 via-white/60 to-white/40 backdrop-blur-3xl border border-white/50 shadow-[0_16px_48px_rgba(0,0,0,0.16)]">
                    <DialogHeader>
                        <DialogTitle>Add {newItem.parent_component_id ? 'Sub-item' : 'Root Item'}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label>Type</Label>
                            <Select value={newItem.node_type} onValueChange={(v) => {
                                let stage = "Raw Material Acquisition";
                                if (v === "Process") stage = "Production";
                                if (v === "Transport") stage = "Distribution";
                                if (v === "Energy") stage = "Production";
                                setNewItem({...newItem, node_type: v, lifecycle_stage: stage});
                            }}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Component">Material / Component</SelectItem>
                                    <SelectItem value="Process">Manufacturing Process</SelectItem>
                                    <SelectItem value="Transport">Transport Leg</SelectItem>
                                    <SelectItem value="Energy">Energy Consumption</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Name</Label>
                                <div className="flex gap-2">
                                    <Input 
                                        placeholder={newItem.node_type === 'Process' ? 'e.g. Injection Molding' : 'e.g. Steel Rod'} 
                                        value={newItem.name} 
                                        onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                                    />
                                    <Button 
                                        variant="outline" 
                                        size="icon" 
                                        onClick={() => aiSuggestMutation.mutate()} 
                                        disabled={!newItem.name || isAIProcessing}
                                        className="shrink-0 text-[#86b027] border-[#86b027]/30 hover:bg-[#86b027]/10 rounded-xl"
                                        title="Auto-fill details with AI"
                                    >
                                        {isAIProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                    </Button>
                                </div>
                            </div>
                             <div className="space-y-2">
                                <Label>Geographic Origin</Label>
                                <div className="relative">
                                    <Input 
                                        value={newItem.geographic_origin} 
                                        onChange={(e) => setNewItem({...newItem, geographic_origin: e.target.value})}
                                        placeholder="e.g. CN, DE, Global"
                                        list="geo-suggestions"
                                    />
                                    <datalist id="geo-suggestions">
                                        <option value="Global" />
                                        <option value="CN" />
                                        <option value="DE" />
                                        <option value="US" />
                                        <option value="EU" />
                                        <option value="IN" />
                                    </datalist>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Quantity</Label>
                                <Input 
                                    type="number" 
                                    value={newItem.quantity} 
                                    onChange={(e) => setNewItem({...newItem, quantity: Number(e.target.value)})}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Unit</Label>
                                <Select value={newItem.unit} onValueChange={(v) => setNewItem({...newItem, unit: v})}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="kg">Kilogram (kg)</SelectItem>
                                        <SelectItem value="ton">Tonne</SelectItem>
                                        <SelectItem value="liter">Liter</SelectItem>
                                        <SelectItem value="m2">Square Meter (m²)</SelectItem>
                                        <SelectItem value="m3">Cubic Meter (m³)</SelectItem>
                                        <SelectItem value="kWh">kWh</SelectItem>
                                        <SelectItem value="MWh">MWh</SelectItem>
                                        <SelectItem value="tkm">Tonne-kilometer (tkm)</SelectItem>
                                        <SelectItem value="piece">Piece</SelectItem>
                                        <SelectItem value="meter">Meter</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Emission Factor</Label>
                                <div className="flex gap-1">
                                    <Input 
                                        type="number" 
                                        placeholder="0.00"
                                        value={newItem.emission_factor || ''} 
                                        onChange={(e) => setNewItem({...newItem, emission_factor: parseFloat(e.target.value)})}
                                    />
                                    <Button variant="outline" size="icon" className="shrink-0" onClick={() => { setEditingComponent(null); setIsDatasetOpen(true); }} title="Search Database">
                                        <Search className="w-4 h-4 text-slate-500" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Lifecycle Stage (ISO 14067)</Label>
                            <Select value={newItem.lifecycle_stage} onValueChange={(v) => setNewItem({...newItem, lifecycle_stage: v})}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Raw Material Acquisition">Raw Material Acquisition</SelectItem>
                                    <SelectItem value="Production">Production</SelectItem>
                                    <SelectItem value="Distribution">Distribution</SelectItem>
                                    <SelectItem value="Usage">Usage</SelectItem>
                                    <SelectItem value="End-of-Life">End-of-Life</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsAddOpen(false)} className="rounded-xl border-white/50 backdrop-blur-sm hover:bg-white/10">Cancel</Button>
                        <Button onClick={() => createMutation.mutate(newItem)} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.12)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.16)] hover:-translate-y-0.5 transition-all">
                            Add to Tree
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dataset Selector Modal */}
            <Dialog open={isDatasetOpen} onOpenChange={setIsDatasetOpen}>
                <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-y-auto bg-gradient-to-br from-white/80 via-white/60 to-white/40 backdrop-blur-3xl border border-white/50 shadow-[0_16px_48px_rgba(0,0,0,0.16)]">
                    <DialogHeader>
                        <DialogTitle>Assign Dataset</DialogTitle>
                    </DialogHeader>
                    <DatasetSelector 
                        searchTerm={editingComponent?.name || ''} 
                        onSelect={handleDatasetSelected}
                    />
                </DialogContent>
            </Dialog>

            {/* Review / Flag Modal */}
            <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
                <DialogContent className="bg-gradient-to-br from-white/80 via-white/60 to-white/40 backdrop-blur-3xl border border-white/50 shadow-[0_16px_48px_rgba(0,0,0,0.16)]">
                    <DialogHeader>
                        <DialogTitle>Verify or Flag Data</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Validation Status</Label>
                            <Select value={reviewData.status} onValueChange={(v) => setReviewData({...reviewData, status: v})}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Unverified">Unverified</SelectItem>
                                    <SelectItem value="Pending Review">Pending Review</SelectItem>
                                    <SelectItem value="Verified">Verified</SelectItem>
                                    <SelectItem value="Flagged">Flagged for Issue</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Review Notes</Label>
                            <Input 
                                placeholder="Add notes about data quality or issues..." 
                                value={reviewData.notes} 
                                onChange={(e) => setReviewData({...reviewData, notes: e.target.value})}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setReviewDialogOpen(false)} className="rounded-xl border-white/50 backdrop-blur-sm hover:bg-white/10">Cancel</Button>
                        <Button onClick={() => {
                            updateMutation.mutate({
                                id: reviewData.id,
                                updates: {
                                    verification_status: reviewData.status,
                                    review_notes: reviewData.notes
                                }
                            });
                            setReviewDialogOpen(false);
                        }} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.12)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.16)] hover:-translate-y-0.5 transition-all">
                            Save Status
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Data Request Modal */}
            <Dialog open={requestDataOpen} onOpenChange={setRequestDataOpen}>
                <DialogContent className="bg-gradient-to-br from-white/80 via-white/60 to-white/40 backdrop-blur-3xl border border-white/50 shadow-[0_16px_48px_rgba(0,0,0,0.16)]">
                    <DialogHeader>
                        <DialogTitle>Request Information</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="bg-slate-50 p-3 rounded border text-sm">
                            <span className="font-bold">Component:</span> {requestTarget?.name}
                            {!requestTarget?.supplier_id && (
                                <p className="text-red-500 mt-1 text-xs">Warning: No supplier assigned to this component. Please assign a supplier in Edit details first.</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>Message to Supplier</Label>
                            <Textarea 
                                placeholder="Please provide primary data for this component..." 
                                value={requestNote} 
                                onChange={(e) => setRequestNote(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRequestDataOpen(false)} className="rounded-xl border-white/50 backdrop-blur-sm hover:bg-white/10">Cancel</Button>
                        <Button 
                            onClick={() => createDataRequestMutation.mutate()} 
                            disabled={!requestTarget?.supplier_id}
                            className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.12)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.16)] hover:-translate-y-0.5 transition-all"
                        >
                            Send Request
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Document Scanner Modal */}
            <BOMDocumentScanner 
                productId={productId}
                isOpen={isDocScannerOpen}
                onClose={() => setIsDocScannerOpen(false)}
                onComponentsExtracted={() => queryClient.invalidateQueries(['product-components', productId])}
            />

            {/* Manual Edit Modal */}
            <Dialog open={isManualEditOpen} onOpenChange={setIsManualEditOpen}>
                <DialogContent className="bg-gradient-to-br from-white/80 via-white/60 to-white/40 backdrop-blur-3xl border border-white/50 shadow-[0_16px_48px_rgba(0,0,0,0.16)]">
                    <DialogHeader>
                        <DialogTitle>Edit Component Details</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Name</Label>
                                <Input value={manualEditData.name} onChange={(e) => setManualEditData({...manualEditData, name: e.target.value})} />
                            </div>
                             <div className="space-y-2">
                                <Label>Geographic Origin</Label>
                                <Input value={manualEditData.geographic_origin} onChange={(e) => setManualEditData({...manualEditData, geographic_origin: e.target.value})} placeholder="e.g. CN, DE" list="geo-suggestions" />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Quantity</Label>
                                <Input 
                                    type="number" 
                                    step="0.001"
                                    value={manualEditData.quantity} 
                                    onChange={(e) => {
                                        const newQty = parseFloat(e.target.value);
                                        const newCo2e = newQty * (manualEditData.emission_factor || 0);
                                        setManualEditData({...manualEditData, quantity: newQty, co2e_kg: newCo2e});
                                    }} 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Emission Factor (kgCO₂e/unit)</Label>
                                <div className="flex gap-1">
                                    <Input 
                                        type="number" 
                                        step="0.0001"
                                        value={manualEditData.emission_factor || ''} 
                                        onChange={(e) => {
                                            const newEF = parseFloat(e.target.value);
                                            const newCo2e = (manualEditData.quantity || 0) * newEF;
                                            setManualEditData({...manualEditData, emission_factor: newEF, co2e_kg: newCo2e});
                                        }} 
                                    />
                                    <Button variant="outline" size="icon" className="shrink-0" onClick={() => { setEditingComponent(manualEditData); setIsDatasetOpen(true); }} title="Search Database">
                                        <Search className="w-4 h-4 text-slate-500" />
                                    </Button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Total Impact (kgCO₂e)</Label>
                                <Input 
                                    type="number" 
                                    step="0.0001"
                                    value={(manualEditData.quantity || 0) * (manualEditData.emission_factor || 0)} 
                                    readOnly
                                    disabled
                                    className="font-bold text-[#86b027] bg-slate-50"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="flex justify-between">
                                    Data Quality 
                                    <span className={`font-bold ${(manualEditData.data_quality_rating || 2) >= 4 ? 'text-emerald-600' : (manualEditData.data_quality_rating || 2) >= 3 ? 'text-yellow-600' : 'text-orange-600'}`}>
                                        {manualEditData.data_quality_rating || 2}/5
                                    </span>
                                </Label>
                                <div className="flex items-center gap-1 h-10">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button 
                                            key={star}
                                            type="button"
                                            onClick={() => setManualEditData({...manualEditData, data_quality_rating: star})}
                                            className={`w-8 h-8 rounded flex items-center justify-center transition-all ${(manualEditData.data_quality_rating || 2) >= star ? 'bg-amber-100 text-amber-500 ring-1 ring-amber-300' : 'bg-slate-100 text-slate-300'}`}
                                        >
                                            ★
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[10px] text-slate-500 mt-1">
                                    5=Primary data • 4=Verified secondary • 3=Secondary • 2=Default • 1=Estimate
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label>Allocation Method</Label>
                                <Select value={manualEditData.allocation_method} onValueChange={(v) => setManualEditData({...manualEditData, allocation_method: v})}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="None">None (100%)</SelectItem>
                                        <SelectItem value="Physical">Physical</SelectItem>
                                        <SelectItem value="Economic">Economic</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Lifecycle Stage</Label>
                            <Select value={manualEditData.lifecycle_stage} onValueChange={(v) => setManualEditData({...manualEditData, lifecycle_stage: v})}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Raw Material Acquisition">Raw Material Acquisition</SelectItem>
                                    <SelectItem value="Production">Production</SelectItem>
                                    <SelectItem value="Distribution">Distribution</SelectItem>
                                    <SelectItem value="Usage">Usage</SelectItem>
                                    <SelectItem value="End-of-Life">End-of-Life</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="relative bg-gradient-to-br from-[#86b027]/10 via-[#86b027]/5 to-white/30 backdrop-blur-sm p-4 rounded-xl border border-[#86b027]/30">
                            <div className="absolute inset-0 bg-gradient-to-br from-[#86b027]/5 via-transparent to-transparent pointer-events-none"></div>
                            <div className="relative">
                                <Label className="text-[10px] text-slate-600 font-light uppercase tracking-widest">Auto-Calculated Impact</Label>
                                <div className="font-extralight text-3xl text-slate-900 mt-1">
                                    {((manualEditData.quantity || 0) * (manualEditData.emission_factor || 0)).toFixed(4)} <span className="text-sm text-slate-500 font-light">kg CO₂e</span>
                                </div>
                                <p className="text-xs text-slate-500 font-light mt-1">
                                    {manualEditData.quantity} × {manualEditData.emission_factor || 0} kgCO₂e/unit
                                </p>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsManualEditOpen(false)} className="rounded-xl border-white/50 backdrop-blur-sm hover:bg-white/10">Cancel</Button>
                        <Button onClick={saveManualEdit} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.12)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.16)] hover:-translate-y-0.5 transition-all">
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}