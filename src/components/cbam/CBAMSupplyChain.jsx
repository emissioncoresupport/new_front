import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Network, Zap, AlertTriangle, Factory, MapPin, 
  Ship, ArrowRight, MoreHorizontal, Search, Brain
} from "lucide-react";
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { isEUCountry } from './constants';

const FlowNode = ({ type, title, subtitle, status, onClick, isSelected }) => {
  const colors = {
    supplier: "border-blue-200 bg-blue-50 text-blue-700",
    installation: "border-emerald-200 bg-emerald-50 text-emerald-700",
    import: "border-purple-200 bg-purple-50 text-purple-700",
    risk: "border-amber-200 bg-amber-50 text-amber-700"
  };

  const icons = {
    supplier: <Network className="w-4 h-4" />,
    installation: <Factory className="w-4 h-4" />,
    import: <Ship className="w-4 h-4" />,
    risk: <AlertTriangle className="w-4 h-4" />
  };

  return (
    <motion.div 
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className={`
        relative p-4 rounded-xl border-2 cursor-pointer transition-all
        ${isSelected ? 'ring-2 ring-offset-2 ring-slate-400 shadow-md' : ''}
        ${colors[type] || "border-slate-200 bg-white"}
      `}
    >
      <div className="flex items-start justify-between mb-2">
        <div className={`p-2 rounded-full bg-white/50`}>
          {icons[type]}
        </div>
        {status && (
          <Badge variant="secondary" className="text-[10px] bg-white/50">
            {status}
          </Badge>
        )}
      </div>
      <h4 className="font-bold text-sm truncate">{title}</h4>
      <p className="text-xs opacity-80 truncate">{subtitle}</p>
      
      {/* Connection Point Right */}
      <div className="absolute top-1/2 -right-1.5 w-3 h-3 bg-slate-300 rounded-full border-2 border-white" />
      {/* Connection Point Left */}
      <div className="absolute top-1/2 -left-1.5 w-3 h-3 bg-slate-300 rounded-full border-2 border-white" />
    </motion.div>
  );
};

export default function CBAMSupplyChain() {
  const [selectedNode, setSelectedNode] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Fetch Data - Only non-EU suppliers for CBAM compliance
  const { data: allSuppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list()
  });
  
  const suppliers = allSuppliers.filter(s => !isEUCountry(s.country));

  const { data: installations = [] } = useQuery({
    queryKey: ['cbam-installations'],
    queryFn: () => base44.entities.CBAMInstallation.list()
  });

  const { data: entries = [] } = useQuery({
    queryKey: ['cbam-emission-entries'],
    queryFn: () => base44.entities.CBAMEmissionEntry.list()
  });

  // AI Analysis Mutation
  const analyzeChainMutation = useMutation({
    mutationFn: async () => {
      setIsAnalyzing(true);
      
      // Construct Graph Data for LLM
      const graphData = {
        suppliers: suppliers.map(s => ({ id: s.id, name: s.legal_name, country: s.country, risk: s.risk_level })),
        installations: installations.map(i => ({ id: i.id, supplier_id: i.supplier_id, name: i.name, tech: i.production_technology, emissions: i.emission_factors })),
        flows: entries.slice(0, 20).map(e => ({ 
          id: e.id, 
          supplier_id: e.supplier_id, 
          installation_id: e.installation_id,
          origin: e.country_of_origin, 
          volume: e.quantity || e.net_mass_tonnes || 0,
          emissions: e.total_embedded_emissions || 0 
        }))
      };

      const prompt = `
        Analyze this CBAM supply chain graph for risks and bottlenecks.
        
        Data: ${JSON.stringify(graphData)}
        
        Identify:
        1. Critical Nodes (suppliers/installations with high volume or emissions).
        2. Data Gaps (missing links between imports and installations).
        3. Risk Hotspots (high risk countries or high emission factors).
        
        Return a JSON object with:
        - summary: string
        - critical_nodes: array of strings (names)
        - risks: array of { severity: "low"|"medium"|"high", message: string }
        - optimization_suggestion: string
      `;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            critical_nodes: { type: "array", items: { type: "string" } },
            risks: { 
              type: "array", 
              items: { 
                type: "object", 
                properties: {
                  severity: { type: "string" },
                  message: { type: "string" }
                } 
              } 
            },
            optimization_suggestion: { type: "string" }
          }
        }
      });

      return response;
    },
    onSuccess: (data) => {
      setAiAnalysis(data);
      setIsAnalyzing(false);
      toast.success("Supply chain analysis complete");
    },
    onError: () => {
      setIsAnalyzing(false);
      toast.error("Analysis failed");
    }
  });

  // Construct Simple Visualization Data
  // We will group by Supplier -> Installation -> Entries
  const chainData = useMemo(() => {
    return suppliers.map(supplier => {
        const supplierInsts = installations.filter(i => i.supplier_id === supplier.id);
        const supplierEntries = entries.filter(e => e.supplier_id === supplier.id);
        
        // If no installations, still show supplier with direct entries
        const nodes = [];
        
        // Installation Nodes
        const instNodes = supplierInsts.map(inst => ({
            type: 'installation',
            data: inst,
            entries: entries.filter(e => e.installation_id === inst.id)
        }));

        // Orphan entries (linked to supplier but no installation specified)
        const orphanEntries = supplierEntries.filter(e => !e.installation_id);

        return {
            supplier,
            installations: instNodes,
            orphanEntries
        };
    }).filter(group => group.installations.length > 0 || group.orphanEntries.length > 0); // Only show active chains
  }, [suppliers, installations, entries]);

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center flex-shrink-0">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Network className="w-5 h-5 text-[#02a1e8]" />
            Supply Chain Map
          </h2>
          <p className="text-sm text-slate-500">
            End-to-end visibility of material flow and emission sources.
          </p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" onClick={() => setSelectedNode(null)}>
             <Search className="w-4 h-4 mr-2" /> Reset View
           </Button>
           <Button 
             onClick={() => analyzeChainMutation.mutate()} 
             disabled={isAnalyzing}
             className="bg-purple-600 hover:bg-purple-700 text-white"
           >
             {isAnalyzing ? <Brain className="w-4 h-4 mr-2 animate-pulse" /> : <Brain className="w-4 h-4 mr-2" />}
             {isAnalyzing ? 'Analyzing...' : 'AI Risk Analysis'}
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Visual Map Area */}
        <Card className="lg:col-span-2 border-slate-200 bg-slate-50/50 overflow-hidden flex flex-col">
          <CardContent className="p-6 flex-1 overflow-y-auto">
            <div className="space-y-12">
              {chainData.length === 0 && (
                <div className="text-center py-20 text-slate-400">
                   <Network className="w-16 h-16 mx-auto mb-4 opacity-20" />
                   <p>No supply chain links found.</p>
                   <p className="text-sm">Link imports to suppliers to see the flow.</p>
                </div>
              )}

              {chainData.map((chain, idx) => (
                <div key={chain.supplier.id} className="relative">
                  {/* Connection Line Background */}
                  <div className="absolute left-[140px] top-8 bottom-8 w-0.5 bg-slate-200 -z-10" />

                  <div className="flex items-start gap-12">
                    {/* Column 1: Supplier */}
                    <div className="w-[280px] flex-shrink-0">
                      <FlowNode 
                        type="supplier"
                        title={chain.supplier.legal_name}
                        subtitle={chain.supplier.country}
                        status={`${chain.supplier.risk_level} Risk`}
                        isSelected={selectedNode?.id === chain.supplier.id}
                        onClick={() => setSelectedNode({ type: 'supplier', data: chain.supplier })}
                      />
                    </div>

                    {/* Column 2 & 3: Installations & Imports */}
                    <div className="flex-1 space-y-6">
                      {/* Installations */}
                      {chain.installations.map(inst => (
                        <div key={inst.data.id} className="flex items-start gap-12 relative">
                            {/* H-Line from Supplier to Inst */}
                            <div className="absolute -left-12 top-8 w-12 h-0.5 bg-slate-200" />
                            
                            <div className="w-[250px] flex-shrink-0">
                                <FlowNode 
                                    type="installation"
                                    title={inst.data.name}
                                    subtitle={inst.data.production_technology}
                                    status={inst.data.verification_status}
                                    isSelected={selectedNode?.id === inst.data.id}
                                    onClick={() => setSelectedNode({ type: 'installation', data: inst.data })}
                                />
                            </div>

                            {/* Imports linked to this Installation */}
                            <div className="flex-1 space-y-3">
                                {inst.entries.length > 0 ? (
                                    inst.entries.map(entry => (
                                        <div key={entry.id} className="relative">
                                             <div className="absolute -left-12 top-8 w-12 h-0.5 bg-slate-200" />
                                             <FlowNode 
                                                type="import"
                                                title={`IMP: ${entry.cn_code || entry.hs_code || 'N/A'}`}
                                                subtitle={`${entry.quantity || entry.net_mass_tonnes || 0}t • ${entry.import_date || 'N/A'}`}
                                                status={`${(entry.total_embedded_emissions || 0).toFixed(1)} tCO2e`}
                                                isSelected={selectedNode?.id === entry.id}
                                                onClick={() => setSelectedNode({ type: 'import', data: entry })}
                                            />
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl text-xs text-slate-400 flex items-center justify-center h-[90px]">
                                        No active imports
                                    </div>
                                )}
                            </div>
                        </div>
                      ))}

                      {/* Orphan Entries (Direct from Supplier) */}
                      {chain.orphanEntries.length > 0 && (
                          <div className="flex items-start gap-12 relative">
                             <div className="absolute -left-12 top-8 w-12 h-0.5 bg-slate-200 border-t-2 border-dashed" />
                             <div className="w-[250px] flex-shrink-0 p-4 border-2 border-dashed border-amber-200 bg-amber-50/50 rounded-xl text-amber-700 text-sm flex items-center justify-center">
                                <span className="text-center">
                                    <AlertTriangle className="w-4 h-4 mx-auto mb-1" />
                                    Unknown Installation
                                </span>
                             </div>
                             <div className="flex-1 space-y-3">
                                {chain.orphanEntries.map(entry => (
                                    <div key={entry.id} className="relative">
                                        <div className="absolute -left-12 top-8 w-12 h-0.5 bg-slate-200 border-t-2 border-dashed" />
                                        <FlowNode 
                                            type="import"
                                            title={`IMP: ${entry.cn_code || entry.hs_code || 'N/A'}`}
                                            subtitle={`${entry.quantity || entry.net_mass_tonnes || 0}t (Unlinked)`}
                                            status="Missing Inst."
                                            isSelected={selectedNode?.id === entry.id}
                                            onClick={() => setSelectedNode({ type: 'import', data: entry })}
                                        />
                                    </div>
                                ))}
                             </div>
                          </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sidebar: Details & AI Insights */}
        <div className="space-y-6">
           {/* AI Insights Panel */}
           <AnimatePresence>
             {aiAnalysis && (
               <motion.div 
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -20 }}
               >
                 <Card className="border-purple-200 bg-purple-50 shadow-sm overflow-hidden">
                   <div className="h-1 bg-gradient-to-r from-purple-500 to-indigo-500" />
                   <CardHeader>
                     <CardTitle className="text-purple-900 flex items-center gap-2 text-base">
                       <Brain className="w-4 h-4" /> AI Risk Assessment
                     </CardTitle>
                   </CardHeader>
                   <CardContent className="space-y-4 text-sm">
                      <p className="text-purple-800 font-medium">{aiAnalysis.summary}</p>
                      
                      {aiAnalysis.risks?.length > 0 && (
                        <div className="space-y-2">
                           <h4 className="text-xs font-bold text-purple-900 uppercase opacity-70">Identified Risks</h4>
                           {aiAnalysis.risks.map((risk, i) => (
                             <div key={i} className="flex gap-2 bg-white/60 p-2 rounded border border-purple-100">
                                <AlertTriangle className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${risk.severity === 'high' ? 'text-red-500' : 'text-amber-500'}`} />
                                <span className="text-purple-900">{risk.message}</span>
                             </div>
                           ))}
                        </div>
                      )}

                      {aiAnalysis.critical_nodes?.length > 0 && (
                         <div>
                            <h4 className="text-xs font-bold text-purple-900 uppercase opacity-70 mb-1">Critical Nodes</h4>
                            <div className="flex flex-wrap gap-1">
                               {aiAnalysis.critical_nodes.map((node, i) => (
                                  <Badge key={i} variant="outline" className="bg-white border-purple-200 text-purple-700">{node}</Badge>
                               ))}
                            </div>
                         </div>
                      )}
                   </CardContent>
                 </Card>
               </motion.div>
             )}
           </AnimatePresence>

           {/* Selection Details */}
           <Card className="border-slate-200 shadow-sm h-full">
             <CardHeader>
               <CardTitle className="text-base text-slate-700">
                 {selectedNode ? 'Node Details' : 'Selection'}
               </CardTitle>
             </CardHeader>
             <CardContent>
               {selectedNode ? (
                 <div className="space-y-4 animate-in fade-in">
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                       <h3 className="font-bold text-lg text-slate-800">{selectedNode.data.legal_name || selectedNode.data.name || selectedNode.data.import_id || selectedNode.data.hs_code}</h3>
                       <p className="text-sm text-slate-500 capitalize">{selectedNode.type}</p>
                    </div>

                    {selectedNode.type === 'supplier' && (
                       <div className="space-y-2 text-sm">
                          <div className="flex justify-between"><span>Country:</span> <span className="font-medium">{selectedNode.data.country}</span></div>
                          <div className="flex justify-between"><span>Risk Level:</span> <span className="font-medium">{selectedNode.data.risk_level}</span></div>
                          <div className="flex justify-between"><span>Tier:</span> <span className="font-medium">{selectedNode.data.tier}</span></div>
                       </div>
                    )}

                    {selectedNode.type === 'installation' && (
                       <div className="space-y-2 text-sm">
                          <div className="flex justify-between"><span>Technology:</span> <span className="font-medium">{selectedNode.data.production_technology}</span></div>
                          <div className="flex justify-between"><span>Location:</span> <span className="font-medium">{selectedNode.data.city}, {selectedNode.data.country}</span></div>
                          <div className="mt-2 pt-2 border-t border-slate-100">
                             <p className="text-xs text-slate-400 mb-1">Emission Factors</p>
                             <div className="grid grid-cols-2 gap-2">
                                <div className="bg-slate-100 p-2 rounded text-center">
                                   <span className="block font-bold">{selectedNode.data.emission_factors?.direct || '-'}</span>
                                   <span className="text-[10px] text-slate-500">Direct</span>
                                </div>
                                <div className="bg-slate-100 p-2 rounded text-center">
                                   <span className="block font-bold">{selectedNode.data.emission_factors?.indirect || '-'}</span>
                                   <span className="text-[10px] text-slate-500">Indirect</span>
                                </div>
                             </div>
                          </div>
                       </div>
                    )}
                    
                    {selectedNode.type === 'import' && (
                      <div className="space-y-2 text-sm">
                         <div className="flex justify-between"><span>Mass:</span> <span className="font-medium">{selectedNode.data.quantity || selectedNode.data.net_mass_tonnes || 0} t</span></div>
                         <div className="flex justify-between"><span>Date:</span> <span className="font-medium">{selectedNode.data.import_date || 'N/A'}</span></div>
                         <div className="flex justify-between"><span>Status:</span> <Badge variant="outline">{selectedNode.data.validation_status || 'pending'}</Badge></div>
                         <div className="p-3 bg-slate-100 rounded mt-2">
                            <span className="block text-xs text-slate-500">Total Embedded Emissions</span>
                            <span className="text-xl font-bold text-slate-800">{(selectedNode.data.total_embedded_emissions || 0).toFixed(2)}</span>
                            <span className="text-xs text-slate-500 ml-1">tCO2e</span>
                         </div>
                      </div>
                    )}

                    {/* Removed - Not implemented */}
                 </div>
               ) : (
                 <div className="text-center py-12 text-slate-400">
                    <Search className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">Select any node in the map to view detailed metrics and relationships.</p>
                 </div>
               )}
             </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}