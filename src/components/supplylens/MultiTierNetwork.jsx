import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Network, ChevronRight, Building2, Package, AlertTriangle, 
  Search, Filter, Share2, Download, Zap, Eye, TrendingUp, Activity,
  MapPin, ArrowRight, Layers, Sparkles, Bell, CheckCircle2, XCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function MultiTierNetwork({ suppliers }) {
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [selectedTier, setSelectedTier] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNode, setSelectedNode] = useState(null);
  const [showFlowView, setShowFlowView] = useState(false);
  const [isAnalyzingRisks, setIsAnalyzingRisks] = useState(false);
  const [networkAlerts, setNetworkAlerts] = useState([]);
  
  const queryClient = useQueryClient();

  const { data: mappings = [] } = useQuery({
    queryKey: ['supplier-sku-mappings'],
    queryFn: () => base44.entities.SupplierSKUMapping.list()
  });

  const { data: boms = [] } = useQuery({
    queryKey: ['boms'],
    queryFn: () => base44.entities.BillOfMaterials.list()
  });

  const { data: skus = [] } = useQuery({
    queryKey: ['skus'],
    queryFn: () => base44.entities.SKU.list()
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['risk-alerts'],
    queryFn: () => base44.entities.RiskAlert.list()
  });

  // Build multi-tier network structure
  const networkTree = useMemo(() => {
    const tree = [];

    // Get Tier 1 suppliers (direct suppliers)
    const tier1Suppliers = suppliers.filter(s => s.tier === 'tier_1');

    tier1Suppliers.forEach(supplier => {
      // Get SKUs supplied by this Tier 1
      const supplierSKUs = mappings
        .filter(m => m.supplier_id === supplier.id)
        .map(m => skus.find(s => s.id === m.sku_id))
        .filter(Boolean);

      const node = {
        id: supplier.id,
        type: 'supplier',
        tier: 1,
        name: supplier.legal_name,
        country: supplier.country,
        risk_level: supplier.risk_level,
        skus: supplierSKUs,
        children: []
      };

      // For each SKU, trace down the BOM to find Tier 2 components
      supplierSKUs.forEach(sku => {
        const components = boms.filter(b => b.parent_sku_id === sku.id);
        
        components.forEach(comp => {
          const childSKU = skus.find(s => s.id === comp.child_sku_id);
          if (!childSKU) return;

          // Find Tier 2 supplier for this component
          const tier2Mapping = mappings.find(m => m.sku_id === childSKU.id);
          if (tier2Mapping) {
            const tier2Supplier = suppliers.find(s => s.id === tier2Mapping.supplier_id);
            if (tier2Supplier) {
              // Check if this Tier 2 supplier already exists in children
              let tier2Node = node.children.find(c => c.id === tier2Supplier.id);
              if (!tier2Node) {
                tier2Node = {
                  id: tier2Supplier.id,
                  type: 'supplier',
                  tier: 2,
                  name: tier2Supplier.legal_name,
                  country: tier2Supplier.country,
                  risk_level: tier2Supplier.risk_level,
                  skus: [],
                  children: []
                };
                node.children.push(tier2Node);
              }
              tier2Node.skus.push(childSKU);

              // Trace to Tier 3
              const tier2Components = boms.filter(b => b.parent_sku_id === childSKU.id);
              tier2Components.forEach(t2comp => {
                const tier3SKU = skus.find(s => s.id === t2comp.child_sku_id);
                if (!tier3SKU) return;

                const tier3Mapping = mappings.find(m => m.sku_id === tier3SKU.id);
                if (tier3Mapping) {
                  const tier3Supplier = suppliers.find(s => s.id === tier3Mapping.supplier_id);
                  if (tier3Supplier) {
                    let tier3Node = tier2Node.children.find(c => c.id === tier3Supplier.id);
                    if (!tier3Node) {
                      tier3Node = {
                        id: tier3Supplier.id,
                        type: 'supplier',
                        tier: 3,
                        name: tier3Supplier.legal_name,
                        country: tier3Supplier.country,
                        risk_level: tier3Supplier.risk_level,
                        skus: [],
                        children: []
                      };
                      tier2Node.children.push(tier3Node);
                    }
                    tier3Node.skus.push(tier3SKU);
                  }
                }
              });
            }
          }
        });
      });

      tree.push(node);
    });

    return tree;
  }, [suppliers, mappings, boms, skus]);

  // AI Risk Analysis for entire network
  const analyzeNetworkRisks = async () => {
    setIsAnalyzingRisks(true);
    try {
      const networkData = networkTree.map(tier1 => ({
        supplier: tier1.name,
        country: tier1.country,
        risk_level: tier1.risk_level,
        tier2_count: tier1.children.length,
        tier3_count: tier1.children.reduce((sum, t2) => sum + t2.children.length, 0),
        skus: tier1.skus.map(s => s.sku_code)
      }));

      const prompt = `
        Analyze this multi-tier supply chain network for potential risks and vulnerabilities.
        
        Network Data:
        ${JSON.stringify(networkData, null, 2)}
        
        Identify:
        1. Single points of failure (critical suppliers with no alternatives)
        2. Geographic concentration risks (too many suppliers in same region)
        3. High-risk cascading dependencies (high-risk Tier 1 with many Tier 2/3)
        4. Compliance vulnerabilities across tiers
        5. Material bottlenecks or constraints
        
        Return actionable alerts with severity, affected entities, and recommendations.
      `;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            alerts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
                  risk_type: { type: "string" },
                  affected_suppliers: { type: "array", items: { type: "string" } },
                  description: { type: "string" },
                  recommendation: { type: "string" },
                  impact_assessment: { type: "string" }
                }
              }
            },
            network_health_score: { type: "number" },
            critical_issues_count: { type: "number" }
          }
        }
      });

      setNetworkAlerts(result.alerts || []);
      
      // Create database alerts for critical issues
      const criticalAlerts = result.alerts.filter(a => a.severity === 'critical' || a.severity === 'high');
      for (const alert of criticalAlerts) {
        for (const supplierName of alert.affected_suppliers) {
          const supplier = suppliers.find(s => s.legal_name === supplierName);
          if (supplier) {
            await base44.entities.RiskAlert.create({
              supplier_id: supplier.id,
              alert_type: 'supply_chain',
              severity: alert.severity === 'critical' ? 'critical' : 'high',
              title: alert.title,
              description: `${alert.description}\n\nRecommendation: ${alert.recommendation}`,
              source: 'Network AI Analysis',
              status: 'open'
            });
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ['risk-alerts'] });
      toast.success(`Network analysis complete: ${result.critical_issues_count} critical issues identified`);
    } catch (error) {
      console.error('Network analysis failed:', error);
      toast.error('Failed to analyze network risks');
    } finally {
      setIsAnalyzingRisks(false);
    }
  };

  const toggleNode = (nodeId) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'critical': return 'text-rose-700 bg-rose-100 border-rose-200';
      case 'high': return 'text-amber-700 bg-amber-100 border-amber-200';
      case 'medium': return 'text-blue-700 bg-blue-100 border-blue-200';
      default: return 'text-emerald-700 bg-emerald-100 border-emerald-200';
    }
  };

  const filteredTree = networkTree.filter(node => {
    if (searchTerm && !node.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (selectedTier !== 'all' && node.tier !== parseInt(selectedTier)) {
      return false;
    }
    return true;
  });

  const renderNode = (node, depth = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children.length > 0;
    const nodeAlerts = alerts.filter(a => a.supplier_id === node.id && a.status === 'open');
    const hasAlerts = nodeAlerts.length > 0;

    return (
      <div key={node.id} style={{ marginLeft: `${depth * 32}px` }}>
        <div className={cn(
          "flex items-center gap-3 p-3 rounded-lg border mb-2 hover:shadow-md transition-all cursor-pointer relative",
          getRiskColor(node.risk_level)
        )}
        onClick={() => setSelectedNode(node)}
        >
          {hasAlerts && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center">
              <Bell className="w-3 h-3 text-white" />
            </div>
          )}
          
          {hasChildren && (
            <button 
              onClick={(e) => { e.stopPropagation(); toggleNode(node.id); }} 
              className="flex-shrink-0"
            >
              <ChevronRight className={cn(
                "w-4 h-4 transition-transform",
                isExpanded && "transform rotate-90"
              )} />
            </button>
          )}
          {!hasChildren && <div className="w-4" />}
          
          <Building2 className="w-5 h-5" />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-bold text-sm truncate">{node.name}</p>
              <Badge variant="outline" className="text-[10px]">Tier {node.tier}</Badge>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <MapPin className="w-3 h-3" />
              <span className="text-xs">{node.country}</span>
              {node.skus.length > 0 && (
                <>
                  <span className="text-xs text-slate-400">•</span>
                  <Package className="w-3 h-3" />
                  <span className="text-xs">{node.skus.length} SKUs</span>
                </>
              )}
              {hasChildren && (
                <>
                  <span className="text-xs text-slate-400">•</span>
                  <Layers className="w-3 h-3" />
                  <span className="text-xs">{node.children.length} downstream</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {node.risk_level && (
              <Badge className={cn(
                "capitalize text-xs",
                node.risk_level === 'critical' ? 'bg-rose-600' :
                node.risk_level === 'high' ? 'bg-amber-600' :
                node.risk_level === 'medium' ? 'bg-blue-600' :
                'bg-emerald-600'
              )}>
                {node.risk_level}
              </Badge>
            )}
            <Eye className="w-4 h-4 text-slate-400" />
          </div>
        </div>

        {isExpanded && node.children.map(child => renderNode(child, depth + 1))}
      </div>
    );
  };

  const tierStats = {
    tier1: networkTree.length,
    tier2: networkTree.reduce((sum, n) => sum + n.children.length, 0),
    tier3: networkTree.reduce((sum, n) => 
      sum + n.children.reduce((s2, c) => s2 + c.children.length, 0), 0
    )
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-[#545454] flex items-center gap-2">
            <Network className="w-5 h-5 text-[#86b027]" />
            Multi-Tier Supply Network
          </h3>
          <p className="text-sm text-slate-500">Interactive risk visualization and material flow analysis</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowFlowView(!showFlowView)}
          >
            <Activity className="w-4 h-4 mr-2" />
            {showFlowView ? 'Tree View' : 'Flow View'}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={analyzeNetworkRisks}
            disabled={isAnalyzingRisks}
          >
            {isAnalyzingRisks ? (
              <>
                <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                AI Risk Analysis
              </>
            )}
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Network AI Alerts */}
      {networkAlerts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-amber-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Network Risk Alerts ({networkAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {networkAlerts.slice(0, 3).map((alert, idx) => (
              <div key={idx} className="p-3 bg-white rounded-lg border border-amber-200">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={cn(
                        "text-xs",
                        alert.severity === 'critical' ? 'bg-rose-600' :
                        alert.severity === 'high' ? 'bg-amber-600' :
                        alert.severity === 'medium' ? 'bg-blue-600' :
                        'bg-slate-600'
                      )}>
                        {alert.severity}
                      </Badge>
                      <span className="text-xs text-slate-500 uppercase font-bold">{alert.risk_type}</span>
                    </div>
                    <p className="font-medium text-slate-900 text-sm">{alert.title}</p>
                    <p className="text-xs text-slate-600 mt-1">{alert.description}</p>
                    <p className="text-xs text-emerald-700 mt-2">💡 {alert.recommendation}</p>
                  </div>
                </div>
              </div>
            ))}
            {networkAlerts.length > 3 && (
              <p className="text-xs text-center text-amber-600 pt-2">
                +{networkAlerts.length - 3} more alerts
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-slate-100">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-[#86b027]/10">
                <Building2 className="w-5 h-5 text-[#86b027]" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">Tier 1</p>
                <p className="text-2xl font-bold text-[#545454]">{tierStats.tier1}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-[#02a1e8]/10">
                <Building2 className="w-5 h-5 text-[#02a1e8]" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">Tier 2</p>
                <p className="text-2xl font-bold text-[#545454]">{tierStats.tier2}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-indigo-100">
                <Building2 className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">Tier 3</p>
                <p className="text-2xl font-bold text-[#545454]">{tierStats.tier3}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-purple-100">
                <Package className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">Total SKUs</p>
                <p className="text-2xl font-bold text-[#545454]">{skus.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex gap-3">
        <Input 
          placeholder="Search suppliers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xs"
          icon={<Search className="w-4 h-4" />}
        />
        <Button 
          variant={selectedTier === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedTier('all')}
        >
          All Tiers
        </Button>
        <Button 
          variant={selectedTier === '1' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedTier('1')}
        >
          Tier 1
        </Button>
        <Button 
          variant={selectedTier === '2' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedTier('2')}
        >
          Tier 2
        </Button>
        <Button 
          variant={selectedTier === '3' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedTier('3')}
        >
          Tier 3
        </Button>
      </div>

      {/* Network Tree */}
      <Card className="border-slate-100 shadow-sm">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-lg font-bold text-[#545454]">
            Supply Chain Hierarchy
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="max-h-[600px] overflow-y-auto space-y-2">
            {filteredTree.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Network className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No network data available</p>
                <p className="text-xs mt-1">Add Tier 1 suppliers and mappings to build your network</p>
              </div>
            ) : (
              filteredTree.map(node => renderNode(node))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Node Drill-Down Modal */}
      <Dialog open={!!selectedNode} onOpenChange={() => setSelectedNode(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#86b027]" />
              {selectedNode?.name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedNode && (
            <ScrollArea className="max-h-[600px] pr-4">
              <div className="space-y-6 py-4">
                {/* Overview */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs font-bold text-slate-500 uppercase">Location</p>
                    <p className="font-semibold text-[#545454] flex items-center gap-1 mt-1">
                      <MapPin className="w-4 h-4" />
                      {selectedNode.country}
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs font-bold text-slate-500 uppercase">Tier Level</p>
                    <p className="font-semibold text-[#545454] mt-1">Tier {selectedNode.tier}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs font-bold text-slate-500 uppercase">Risk Level</p>
                    <Badge className={cn(
                      "mt-1 capitalize",
                      selectedNode.risk_level === 'critical' ? 'bg-rose-600' :
                      selectedNode.risk_level === 'high' ? 'bg-amber-600' :
                      selectedNode.risk_level === 'medium' ? 'bg-blue-600' :
                      'bg-emerald-600'
                    )}>
                      {selectedNode.risk_level}
                    </Badge>
                  </div>
                </div>

                {/* SKUs Supplied */}
                <div>
                  <h4 className="font-bold text-[#545454] mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4 text-[#86b027]" />
                    SKUs Supplied ({selectedNode.skus.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedNode.skus.map(sku => (
                      <div key={sku.id} className="p-3 border border-slate-200 rounded-lg hover:border-[#86b027] transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-slate-900">{sku.sku_code}</p>
                            <p className="text-xs text-slate-500">{sku.description}</p>
                          </div>
                          <Badge variant="outline">{sku.category || 'General'}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Downstream Dependencies */}
                {selectedNode.children.length > 0 && (
                  <div>
                    <h4 className="font-bold text-[#545454] mb-3 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#02a1e8]" />
                      Downstream Suppliers ({selectedNode.children.length})
                    </h4>
                    <div className="space-y-2">
                      {selectedNode.children.map(child => (
                        <div key={child.id} className="p-3 border border-slate-200 rounded-lg bg-slate-50">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-slate-900">{child.name}</p>
                              <p className="text-xs text-slate-500">{child.country} • {child.skus.length} SKUs</p>
                            </div>
                            <Badge className="capitalize text-xs">
                              Tier {child.tier}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Active Alerts */}
                {alerts.filter(a => a.supplier_id === selectedNode.id && a.status === 'open').length > 0 && (
                  <div>
                    <h4 className="font-bold text-[#545454] mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      Active Alerts
                    </h4>
                    <div className="space-y-2">
                      {alerts.filter(a => a.supplier_id === selectedNode.id && a.status === 'open').map(alert => (
                        <div key={alert.id} className="p-3 border-l-4 border-l-amber-500 bg-amber-50 rounded-lg">
                          <p className="font-medium text-amber-900 text-sm">{alert.title}</p>
                          <p className="text-xs text-amber-700 mt-1">{alert.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}