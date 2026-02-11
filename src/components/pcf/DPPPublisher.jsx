import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Copy, Download, History, Globe, Lock, Loader2, RefreshCw, Share2, FileJson } from "lucide-react";
import { toast } from "sonner";

export default function DPPPublisher({ product, components, isOpen, onClose }) {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState("publish");
    const [isPublishing, setIsPublishing] = useState(false);

    // Fetch History
    const { data: history = [] } = useQuery({
        queryKey: ['dpp-history', product?.id],
        queryFn: async () => {
            if (!product?.id) return [];
            const all = await base44.entities.DPPPublication.list('-published_at');
            return all.filter(d => d.product_id === product.id);
        },
        enabled: !!product?.id && isOpen
    });

    // Generate JSON-LD Data
    const generateDPPData = () => {
        return {
            "@context": "https://w3id.org/dpp/v1",
            "@type": "DigitalProductPassport",
            "product": {
                "name": product.name,
                "sku": product.sku,
                "description": product.description,
                "category": product.category,
                "identifiers": {
                    "gtin": product.sku, // Mock GTIN
                    "internal_id": product.id
                }
            },
            "sustainability": {
                "carbon_footprint": {
                    "total_co2e": product.total_co2e_kg,
                    "unit": "kgCO2e",
                    "per_unit": product.unit,
                    "system_boundary": product.system_boundary,
                    "standard": "ISO 14067"
                },
                "material_circularity": {
                    "recycled_content": "15%", // Mock
                    "recyclability": "98%" // Mock
                }
            },
            "components": components.map(c => ({
                "name": c.name,
                "quantity": c.quantity,
                "origin": c.geographic_origin,
                "carbon_impact": c.co2e_kg
            })),
            "verification": {
                "status": product.status,
                "verifier": "Internal Audit",
                "date": new Date().toISOString()
            }
        };
    };

    const currentData = product ? generateDPPData() : {};

    const publishMutation = useMutation({
        mutationFn: async () => {
            setIsPublishing(true);
            // Simulate blockchain hashing delay
            await new Promise(r => setTimeout(r, 2000));
            
            const version = history.length > 0 ? (parseFloat(history[0].version) + 0.1).toFixed(1) : "1.0";
            const hash = "0x" + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
            
            const user = await base44.auth.me();
            
            await base44.entities.DPPPublication.create({
                product_id: product.id,
                version: version,
                status: "Published",
                dpp_data: currentData,
                blockchain_hash: hash,
                published_by: user?.email || "system",
                published_at: new Date().toISOString()
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['dpp-history']);
            toast.success("Product Passport Published Successfully");
            setActiveTab("history");
            setIsPublishing(false);
        },
        onError: () => {
            toast.error("Failed to publish DPP");
            setIsPublishing(false);
        }
    });

    const copyToClipboard = () => {
        navigator.clipboard.writeText(JSON.stringify(currentData, null, 2));
        toast.success("JSON-LD copied to clipboard");
    };

    const downloadJSON = () => {
        const blob = new Blob([JSON.stringify(currentData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `DPP-${product.sku}-v${history.length + 1}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    if (!product) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[800px] h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Globe className="w-5 h-5 text-indigo-600" />
                        Digital Product Passport (DPP) Publisher
                    </DialogTitle>
                    <DialogDescription>
                        Generate, sign, and publish standardized product data for circular economy compliance.
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="publish">Generate & Publish</TabsTrigger>
                        <TabsTrigger value="history">Publication History</TabsTrigger>
                    </TabsList>

                    <TabsContent value="publish" className="flex-1 flex flex-col min-h-0 mt-4 space-y-4">
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-700">Readiness Check</p>
                                <div className="flex items-center gap-2 mt-1">
                                    {product.status === 'Completed' ? (
                                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Ready to Publish</Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-amber-600 border-amber-200">Draft State</Badge>
                                    )}
                                    <span className="text-xs text-slate-400">|</span>
                                    <span className="text-xs text-slate-500">{components.length} Components</span>
                                </div>
                            </div>
                            <Button variant="outline" size="sm" onClick={generateDPPData}>
                                <RefreshCw className="w-3 h-3 mr-2" /> Refresh Data
                            </Button>
                        </div>

                        <div className="flex-1 relative rounded-md border bg-slate-900 text-slate-50 font-mono text-xs overflow-hidden">
                            <div className="absolute top-2 right-2 flex gap-2">
                                <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-400 hover:text-white" onClick={copyToClipboard}>
                                    <Copy className="w-3 h-3" />
                                </Button>
                            </div>
                            <ScrollArea className="h-full p-4">
                                <pre>{JSON.stringify(currentData, null, 2)}</pre>
                            </ScrollArea>
                        </div>
                    </TabsContent>

                    <TabsContent value="history" className="flex-1 min-h-0 mt-4">
                        <ScrollArea className="h-full pr-4">
                            <div className="space-y-4">
                                {history.length === 0 ? (
                                    <div className="text-center py-10 text-slate-400">
                                        <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p>No publication history found.</p>
                                    </div>
                                ) : (
                                    history.map((pub) => (
                                        <Card key={pub.id}>
                                            <CardContent className="p-4 flex items-center justify-between">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline" className="font-mono">v{pub.version}</Badge>
                                                        <span className="text-sm font-medium text-slate-800">Published on {new Date(pub.published_at).toLocaleDateString()}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                                        <Lock className="w-3 h-3" />
                                                        <span className="font-mono truncate max-w-[200px]" title={pub.blockchain_hash}>Hash: {pub.blockchain_hash}</span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button variant="ghost" size="sm" onClick={() => {
                                                        const blob = new Blob([JSON.stringify(pub.dpp_data, null, 2)], { type: 'application/json' });
                                                        const url = URL.createObjectURL(blob);
                                                        const a = document.createElement('a');
                                                        a.href = url;
                                                        a.download = `DPP-${product.sku}-v${pub.version}.json`;
                                                        a.click();
                                                    }}>
                                                        <Download className="w-4 h-4 text-slate-500" />
                                                    </Button>
                                                    <Button variant="ghost" size="sm">
                                                        <Share2 className="w-4 h-4 text-slate-500" />
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </TabsContent>
                </Tabs>

                <DialogFooter className="mt-4">
                    {activeTab === "publish" && (
                        <>
                            <Button variant="outline" onClick={downloadJSON}>
                                <Download className="w-4 h-4 mr-2" /> Download JSON-LD
                            </Button>
                            <Button 
                                onClick={() => publishMutation.mutate()} 
                                disabled={isPublishing}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                                {isPublishing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Globe className="w-4 h-4 mr-2" />}
                                {isPublishing ? "Publishing..." : "Publish to Network"}
                            </Button>
                        </>
                    )}
                    {activeTab === "history" && (
                        <Button variant="outline" onClick={onClose}>Close</Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}