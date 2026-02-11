import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    MapPin, Truck, Factory, Package, AlertTriangle, CheckCircle2, 
    Leaf, Globe, ArrowRight, Info, X, Search
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Helper to calculate node positions for a tree-like layout
const calculateLayout = (nodes, edges) => {
    // Simple layered layout
    const levels = {};
    nodes.forEach(node => {
        if (!levels[node.level]) levels[node.level] = [];
        levels[node.level].push(node);
    });

    const layoutNodes = [];
    const levelKeys = Object.keys(levels).sort((a, b) => parseInt(a) - parseInt(b));
    
    // Calculate X, Y
    // Assume standard width/height
    const NODE_WIDTH = 220;
    const NODE_HEIGHT = 100;
    const X_GAP = 100;
    const Y_GAP = 40;

    const startX = 50;
    
    levelKeys.forEach((level, colIndex) => {
        const columnNodes = levels[level];
        const startY = 50; // Center vertically based on max column height? Simplified to top-align for now
        
        columnNodes.forEach((node, rowIndex) => {
            layoutNodes.push({
                ...node,
                x: startX + colIndex * (NODE_WIDTH + X_GAP),
                y: startY + rowIndex * (NODE_HEIGHT + Y_GAP),
                width: NODE_WIDTH,
                height: NODE_HEIGHT
            });
        });
    });

    return layoutNodes;
};

export default function TraceabilityGraph() {
    const [selectedDDS, setSelectedDDS] = useState('all');
    const [selectedNode, setSelectedNode] = useState(null);

    // Fetch Data
    const { data: ddsList = [] } = useQuery({
        queryKey: ['eudr-dds-trace'],
        queryFn: () => base44.entities.EUDRDDS.list()
    });

    const { data: suppliers = [] } = useQuery({
        queryKey: ['suppliers-trace'],
        queryFn: () => base44.entities.Supplier.list()
    });

    const { data: sites = [] } = useQuery({
        queryKey: ['sites-trace'],
        queryFn: () => base44.entities.SupplierSite.list()
    });

    const { data: skus = [] } = useQuery({
        queryKey: ['skus-trace'],
        queryFn: () => base44.entities.SKU.list()
    });
    
    const { data: mappings = [] } = useQuery({
        queryKey: ['mappings-trace'],
        queryFn: () => base44.entities.SupplierSKUMapping.list()
    });

    const { data: submissions = [] } = useQuery({
        queryKey: ['eudr-submissions-trace'],
        queryFn: () => base44.entities.EUDRSupplierSubmission.list()
    });

    // Construct Graph Data based on selection
    const graphData = useMemo(() => {
        const nodes = [];
        const edges = [];
        let filteredDDS = ddsList;
        
        if (selectedDDS !== 'all') {
            filteredDDS = ddsList.filter(d => d.id === selectedDDS);
        }

        // LEVEL 0: EUDR DDS (Import)
        filteredDDS.forEach(dds => {
            const ddsNodeId = `dds-${dds.id}`;
            nodes.push({
                id: ddsNodeId,
                type: 'import',
                label: dds.dds_reference,
                subLabel: dds.commodity_description,
                status: dds.status,
                risk: dds.risk_level,
                data: dds,
                level: 4 // Rightmost
            });

            // Find linked Supplier Submission or direct Supplier
            // Logic: DDS -> Supplier (via manually linked field or PO match)
            // For this mockup, we try to link via PO number or if explicit supplier link exists
            // We'll fuzzy match PO or use explicit supplier_submission_id which links to EUDRSupplierSubmission
            
            let linkedSubmission = null;
            if (dds.supplier_submission_id) {
                 // This field might be ID of Supplier OR EUDRSupplierSubmission based on schema evolution
                 // Let's try finding a submission first
                 linkedSubmission = submissions.find(s => s.id === dds.supplier_submission_id);
                 
                 // Or maybe it's a direct supplier ID?
                 if (!linkedSubmission) {
                     // Try to find supplier directly
                     const directSupplier = suppliers.find(s => s.id === dds.supplier_submission_id);
                     if (directSupplier) {
                         // Create Supplier Node
                         const suppNodeId = `supp-${directSupplier.id}`;
                         if (!nodes.find(n => n.id === suppNodeId)) {
                             nodes.push({
                                 id: suppNodeId,
                                 type: 'supplier',
                                 label: directSupplier.legal_name,
                                 subLabel: directSupplier.country,
                                 status: directSupplier.status,
                                 risk: directSupplier.risk_level,
                                 data: directSupplier,
                                 level: 3
                             });
                         }
                         edges.push({ from: suppNodeId, to: ddsNodeId });
                     }
                 }
            }
            
            if (linkedSubmission) {
                // Create Submission Node (optional, maybe merge with Supplier)
                const subNodeId = `sub-${linkedSubmission.id}`;
                // Actually better to show the Supplier of this submission
                // We assume submission has supplier_name or we find supplier by name?
                // Or if we can link to Supplier entity
                
                // Let's try to find the Supplier entity matching the submission
                const supplier = suppliers.find(s => s.legal_name === linkedSubmission.supplier_name) || { 
                    id: `temp-${linkedSubmission.id}`, 
                    legal_name: linkedSubmission.supplier_name, 
                    country: linkedSubmission.country,
                    isTemp: true
                };

                const suppNodeId = `supp-${supplier.id}`;
                if (!nodes.find(n => n.id === suppNodeId)) {
                    nodes.push({
                        id: suppNodeId,
                        type: 'supplier',
                        label: supplier.legal_name,
                        subLabel: supplier.country,
                        status: supplier.status || 'active',
                        risk: supplier.risk_level || 'unknown',
                        data: supplier,
                        level: 3
                    });
                }
                edges.push({ from: suppNodeId, to: ddsNodeId });

                // LEVEL 2: Sites & SKUs
                // Find Sites for this supplier
                const supplierSites = sites.filter(site => site.supplier_id === supplier.id);
                supplierSites.forEach(site => {
                    const siteNodeId = `site-${site.id}`;
                    if (!nodes.find(n => n.id === siteNodeId)) {
                        nodes.push({
                            id: siteNodeId,
                            type: 'site',
                            label: site.site_name,
                            subLabel: site.city,
                            status: site.status,
                            risk: site.site_risk_score > 50 ? 'high' : 'low',
                            data: site,
                            level: 2
                        });
                    }
                    edges.push({ from: siteNodeId, to: suppNodeId });

                    // LEVEL 1: Geolocation (Origin)
                    // If site has lat/lon or if submission has geojson
                    if (site.lat && site.lon) {
                         const geoNodeId = `geo-${site.id}`;
                         nodes.push({
                             id: geoNodeId,
                             type: 'origin',
                             label: `${site.country} Origin`,
                             subLabel: `${site.lat}, ${site.lon}`,
                             status: 'verified',
                             data: { lat: site.lat, lon: site.lon, ...site },
                             level: 1
                         });
                         edges.push({ from: geoNodeId, to: siteNodeId });
                    }
                });
                
                // If linked submission has explicit geolocation data (EUDR specific)
                if (linkedSubmission.geolocation_data) {
                    const geoId = `geo-sub-${linkedSubmission.id}`;
                    nodes.push({
                        id: geoId,
                        type: 'origin',
                        label: "Harvest Plot",
                        subLabel: "GeoJSON Data",
                        status: 'verified',
                        data: linkedSubmission.geolocation_data,
                        level: 1
                    });
                    edges.push({ from: geoId, to: suppNodeId });
                }

                // Find SKUs for this supplier
                const supplierSkus = mappings.filter(m => m.supplier_id === supplier.id);
                supplierSkus.forEach(mapping => {
                    const sku = skus.find(s => s.id === mapping.sku_id);
                    if (sku) {
                        const skuNodeId = `sku-${sku.id}`;
                        // Maybe put SKUs at same level as Sites? Or separate?
                        // Let's put them at Level 2 as well
                        if (!nodes.find(n => n.id === skuNodeId)) {
                             nodes.push({
                                 id: skuNodeId,
                                 type: 'sku',
                                 label: sku.sku_code,
                                 subLabel: sku.hs_code,
                                 status: 'active',
                                 data: sku,
                                 level: 2
                             });
                        }
                        edges.push({ from: skuNodeId, to: suppNodeId });
                    }
                });
            }
        });

        // Add a "EU Market" node at Level 5
        if (nodes.length > 0) {
            nodes.push({
                id: 'eu-market',
                type: 'market',
                label: 'EU Market',
                subLabel: 'Import Destination',
                status: 'cleared',
                level: 5
            });
            // Link all DDS to Market
            filteredDDS.forEach(dds => {
                edges.push({ from: `dds-${dds.id}`, to: 'eu-market' });
            });
        }

        return { nodes: calculateLayout(nodes, edges), edges };
    }, [ddsList, suppliers, sites, skus, mappings, submissions, selectedDDS]);

    const renderNodeIcon = (type) => {
        switch(type) {
            case 'origin': return <Globe className="w-4 h-4 text-emerald-600" />;
            case 'site': return <Factory className="w-4 h-4 text-blue-600" />;
            case 'sku': return <Package className="w-4 h-4 text-amber-600" />;
            case 'supplier': return <Truck className="w-4 h-4 text-indigo-600" />;
            case 'import': return <Leaf className="w-4 h-4 text-emerald-700" />;
            case 'market': return <CheckCircle2 className="w-4 h-4 text-slate-600" />;
            default: return <Info className="w-4 h-4" />;
        }
    };
    
    const getNodeColor = (node) => {
        if (node.risk === 'High' || node.risk === 'critical') return 'border-rose-400 bg-rose-50';
        if (node.type === 'origin') return 'border-emerald-200 bg-emerald-50';
        if (node.type === 'import') return 'border-emerald-300 bg-emerald-100';
        if (node.type === 'market') return 'border-slate-300 bg-slate-100';
        return 'border-slate-200 bg-white';
    };

    return (
        <div className="h-[calc(100vh-200px)] flex flex-col">
            <div className="flex justify-between items-center mb-4 px-1">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-indigo-600" />
                        Supply Chain Traceability
                    </h2>
                    <p className="text-sm text-slate-500">Visualize product journey from origin to EU market</p>
                </div>
                <div className="flex gap-2">
                    <Select value={selectedDDS} onValueChange={setSelectedDDS}>
                        <SelectTrigger className="w-[250px] bg-white">
                            <SelectValue placeholder="Filter by DDS Reference" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Active Chains</SelectItem>
                            {ddsList.map(d => (
                                <SelectItem key={d.id} value={d.id}>{d.dds_reference} ({d.hs_code})</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button variant="outline">
                        <Search className="w-4 h-4 mr-2" /> Find Risk Points
                    </Button>
                </div>
            </div>

            <div className="flex-1 relative bg-slate-50 rounded-xl border border-slate-200 overflow-hidden shadow-inner">
                {/* Interactive Canvas */}
                <div className="absolute inset-0 overflow-auto p-10">
                    <svg className="absolute inset-0 pointer-events-none w-[2000px] h-[1000px]" style={{zIndex: 0}}>
                        {graphData.edges.map((edge, idx) => {
                            const source = graphData.nodes.find(n => n.id === edge.from);
                            const target = graphData.nodes.find(n => n.id === edge.to);
                            if (!source || !target) return null;
                            
                            // Draw Bezier curve
                            const x1 = source.x + source.width;
                            const y1 = source.y + source.height / 2;
                            const x2 = target.x;
                            const y2 = target.y + target.height / 2;
                            const path = `M ${x1} ${y1} C ${x1 + 50} ${y1}, ${x2 - 50} ${y2}, ${x2} ${y2}`;
                            
                            return (
                                <motion.path 
                                    key={`${edge.from}-${edge.to}`}
                                    d={path}
                                    fill="none"
                                    stroke="#cbd5e1"
                                    strokeWidth="2"
                                    initial={{ pathLength: 0, opacity: 0 }}
                                    animate={{ pathLength: 1, opacity: 1 }}
                                    transition={{ duration: 1, delay: idx * 0.1 }}
                                />
                            );
                        })}
                    </svg>

                    <div className="relative w-[2000px] h-[1000px]" style={{zIndex: 10}}>
                         <AnimatePresence>
                            {graphData.nodes.map((node) => (
                                <motion.div
                                    key={node.id}
                                    className={`absolute rounded-lg border-l-4 p-3 shadow-sm cursor-pointer hover:shadow-md transition-all w-[220px] ${getNodeColor(node)}`}
                                    style={{ left: node.x, top: node.y, height: node.height }}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    whileHover={{ scale: 1.02 }}
                                    onClick={() => setSelectedNode(node)}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="p-1.5 rounded bg-white/50">
                                            {renderNodeIcon(node.type)}
                                        </div>
                                        {node.risk && (node.risk === 'High' || node.risk === 'critical') && (
                                            <AlertTriangle className="w-4 h-4 text-rose-500 animate-pulse" />
                                        )}
                                    </div>
                                    <h4 className="font-bold text-slate-800 text-sm truncate">{node.label}</h4>
                                    <p className="text-xs text-slate-500 truncate">{node.subLabel}</p>
                                    {node.type === 'origin' && (
                                        <Badge variant="outline" className="mt-2 bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                                            Deforestation-Free
                                        </Badge>
                                    )}
                                </motion.div>
                            ))}
                         </AnimatePresence>
                    </div>
                </div>

                {/* Detail Panel Overlay */}
                <AnimatePresence>
                    {selectedNode && (
                        <motion.div 
                            className="absolute right-0 top-0 bottom-0 w-80 bg-white border-l border-slate-200 shadow-2xl z-20 p-6 overflow-y-auto"
                            initial={{ x: 320 }}
                            animate={{ x: 0 }}
                            exit={{ x: 320 }}
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-lg">Node Details</h3>
                                <Button variant="ghost" size="icon" onClick={() => setSelectedNode(null)}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                            
                            <div className="space-y-6">
                                <div>
                                    <p className="text-xs uppercase text-slate-400 font-bold mb-1">Entity Type</p>
                                    <Badge variant="secondary">{selectedNode.type}</Badge>
                                </div>
                                <div>
                                    <p className="text-xs uppercase text-slate-400 font-bold mb-1">Name / Reference</p>
                                    <p className="text-slate-800 font-medium">{selectedNode.label}</p>
                                </div>
                                
                                {selectedNode.data && (
                                    <>
                                        {selectedNode.type === 'import' && (
                                            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                                                <p className="text-xs font-bold text-emerald-800 mb-2">EUDR Status</p>
                                                <div className="grid grid-cols-2 gap-2 text-xs">
                                                    <span className="text-slate-500">Status:</span>
                                                    <span className="font-mono">{selectedNode.data.status}</span>
                                                    <span className="text-slate-500">Seal:</span>
                                                    <span className="font-mono truncate">{selectedNode.data.digital_seal || 'Pending'}</span>
                                                </div>
                                            </div>
                                        )}
                                        
                                        {selectedNode.type === 'origin' && (
                                            <div className="space-y-2">
                                                <div className="aspect-video bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden relative">
                                                    <img 
                                                        src={`https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${selectedNode.data.lon || 0},${selectedNode.data.lat || 0},12,0/300x150?access_token=pk.mock`} 
                                                        alt="Satellite View" 
                                                        className="w-full h-full object-cover opacity-80"
                                                        onError={(e) => e.target.style.display = 'none'} 
                                                    />
                                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                        <MapPin className="w-8 h-8 text-rose-500 drop-shadow-lg" />
                                                    </div>
                                                </div>
                                                <p className="text-xs text-slate-500">
                                                    Lat: {selectedNode.data.lat}, Lon: {selectedNode.data.lon}
                                                </p>
                                            </div>
                                        )}

                                        <div>
                                            <p className="text-xs uppercase text-slate-400 font-bold mb-2">Raw Data</p>
                                            <pre className="text-[10px] bg-slate-900 text-slate-300 p-3 rounded-lg overflow-x-auto">
                                                {JSON.stringify(selectedNode.data, null, 2)}
                                            </pre>
                                        </div>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}