import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Target, AlertCircle, CheckCircle2, Clock, AlertTriangle, ExternalLink, FileText, Users, Package } from 'lucide-react';
import RecordContextHeader from '@/components/supplylens/RecordContextHeader';

// Deterministic status computation
const computeReadinessStatus = (module) => {
  const { coverage, pending_matches, blocked_work_items, conflicts } = module;
  
  // NOT_READY: blocked work items, conflicts, or low coverage
  if (blocked_work_items > 0 || conflicts > 0 || coverage < 70) {
    return 'NOT_READY';
  }
  
  // PENDING_MATCH: pending matches exist
  if (pending_matches > 0) {
    return 'PENDING_MATCH';
  }
  
  // READY: high coverage, no issues
  if (coverage >= 95 && pending_matches === 0 && blocked_work_items === 0 && conflicts === 0) {
    return 'READY';
  }
  
  // READY_WITH_GAPS: moderate coverage, no blockers
  if (coverage >= 70 && coverage < 95 && blocked_work_items === 0 && conflicts === 0) {
    return 'READY_WITH_GAPS';
  }
  
  return 'NOT_READY';
};

const StatusBadge = ({ status }) => {
  const config = {
    NOT_READY: { color: 'bg-slate-900 text-white border-slate-900', icon: AlertCircle },
    READY_WITH_GAPS: { color: 'bg-slate-600 text-white border-slate-600', icon: Clock },
    READY: { color: 'bg-slate-800 text-white border-slate-800', icon: CheckCircle2 },
    PENDING_MATCH: { color: 'bg-slate-700 text-white border-slate-700', icon: Clock }
  };
  
  const { color, icon: Icon } = config[status] || config.NOT_READY;
  
  return (
    <Badge className={`${color} border flex items-center gap-1 text-sm px-3 py-1`}>
      <Icon className="w-4 h-4" />
      {status.replace(/_/g, ' ')}
    </Badge>
  );
};

const mockModules = [
  {
    module_name: 'Supplier Master',
    module_tag: 'SUPPLIER_MASTER',
    coverage: 97,
    gaps: 0,
    pending_matches: 0,
    blocked_work_items: 0,
    conflicts: 0,
    blockers: []
  },
  {
    module_name: 'Product Master',
    module_tag: 'PRODUCT_MASTER',
    coverage: 78,
    gaps: 3,
    pending_matches: 0,
    blocked_work_items: 0,
    conflicts: 0,
    blockers: [
      { type: 'DATA_GAP', entity_type: 'SKU', entity_id: 'SKU-101', entity_name: 'Widget-X', evidence_id: null, description: 'Missing mandatory field: category', work_item_id: null },
      { type: 'DATA_GAP', entity_type: 'SKU', entity_id: 'SKU-102', entity_name: 'Widget-Y', evidence_id: null, description: 'Missing mandatory field: description', work_item_id: null },
      { type: 'DATA_GAP', entity_type: 'SKU', entity_id: 'SKU-103', entity_name: 'Widget-Z', evidence_id: 'EV-045', description: 'Evidence sealed but entity incomplete', work_item_id: 'WI-015' }
    ]
  },
  {
    module_name: 'BOM',
    module_tag: 'BOM',
    coverage: 85,
    gaps: 0,
    pending_matches: 5,
    blocked_work_items: 0,
    conflicts: 0,
    blockers: [
      { type: 'PENDING_MATCH', entity_type: 'BOM', entity_id: 'BOM-201', entity_name: 'Assembly-A', evidence_id: 'EV-051', description: 'AI suggested mapping awaiting approval', work_item_id: 'WI-020' },
      { type: 'PENDING_MATCH', entity_type: 'BOM', entity_id: 'BOM-202', entity_name: 'Assembly-B', evidence_id: 'EV-052', description: 'AI suggested mapping awaiting approval', work_item_id: 'WI-021' },
      { type: 'PENDING_MATCH', entity_type: 'BOM', entity_id: 'BOM-203', entity_name: 'Assembly-C', evidence_id: 'EV-053', description: 'Fuzzy match confidence: 78%', work_item_id: 'WI-022' },
      { type: 'PENDING_MATCH', entity_type: 'BOM', entity_id: 'BOM-204', entity_name: 'Assembly-D', evidence_id: 'EV-054', description: 'Fuzzy match confidence: 82%', work_item_id: 'WI-023' },
      { type: 'PENDING_MATCH', entity_type: 'BOM', entity_id: 'BOM-205', entity_name: 'Assembly-E', evidence_id: 'EV-055', description: 'Exact match pending human review', work_item_id: 'WI-024' }
    ]
  },
  {
    module_name: 'CBAM',
    module_tag: 'CBAM',
    coverage: 65,
    gaps: 8,
    pending_matches: 2,
    blocked_work_items: 3,
    conflicts: 1,
    blockers: [
      { type: 'BLOCKED_WORK_ITEM', entity_type: 'Supplier', entity_id: 'SUP-301', entity_name: 'SteelCo GmbH', evidence_id: 'EV-071', description: 'Extraction job failed: missing CN code', work_item_id: 'WI-030' },
      { type: 'BLOCKED_WORK_ITEM', entity_type: 'Supplier', entity_id: 'SUP-302', entity_name: 'AluminiumCorp', evidence_id: 'EV-072', description: 'Mapping session stalled: duplicate detected', work_item_id: 'WI-031' },
      { type: 'BLOCKED_WORK_ITEM', entity_type: 'Supplier', entity_id: 'SUP-303', entity_name: 'CementWorks Ltd', evidence_id: 'EV-073', description: 'Review rejected: data quality issues', work_item_id: 'WI-032' },
      { type: 'CONFLICT', entity_type: 'Supplier', entity_id: 'SUP-304', entity_name: 'FertilizerCo', evidence_id: 'EV-074', description: 'Conflicting emissions data from two evidence records', work_item_id: 'WI-033' },
      { type: 'PENDING_MATCH', entity_type: 'Supplier', entity_id: 'SUP-305', entity_name: 'HydrogenPlus', evidence_id: 'EV-075', description: 'AI suggested mapping awaiting approval', work_item_id: 'WI-034' },
      { type: 'PENDING_MATCH', entity_type: 'Supplier', entity_id: 'SUP-306', entity_name: 'ElectroCorp', evidence_id: 'EV-076', description: 'Fuzzy match confidence: 85%', work_item_id: 'WI-035' },
      { type: 'DATA_GAP', entity_type: 'Supplier', entity_id: 'SUP-307', entity_name: 'IronWorks SA', evidence_id: null, description: 'Missing mandatory field: installation_id', work_item_id: null },
      { type: 'DATA_GAP', entity_type: 'Supplier', entity_id: 'SUP-308', entity_name: 'SteelProd Inc', evidence_id: null, description: 'Missing mandatory field: production_route', work_item_id: null }
    ]
  }
];

export default function Contract2Readiness() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const filterRecordId = searchParams.get('record_id');
  const [selectedModule, setSelectedModule] = useState(null);
  const [showBlockersDrawer, setShowBlockersDrawer] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white">
      <div className="border-b border-slate-200/50 bg-white/95 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-[1920px] mx-auto px-8 py-6">
          <h1 className="text-3xl font-light text-slate-900 tracking-tight">Readiness</h1>
          <p className="text-slate-500 font-light mt-1">Module-level data coverage and reconciliation status</p>
        </div>
      </div>
      <div className="max-w-[1920px] mx-auto px-8 py-8 space-y-6">
        {filterRecordId && (
          <RecordContextHeader
            recordId={filterRecordId}
            evidenceType="SUPPLIER_MASTER"
            ingestionMethod="FILE_UPLOAD"
            binding={{ target_id: 'SUP-001' }}
            sealedAt={new Date().toISOString()}
            reconciliationStatus="READY_WITH_GAPS"
          />
        )}

        {/* Contract 7: Dataset Registry */}
        <Card className="border border-slate-200 bg-white/95 backdrop-blur-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardHeader className="border-b border-slate-200/50">
            <CardTitle className="text-base font-light text-slate-900">Dataset Registry</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Dataset Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Schema Version</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Last Updated</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Compatibility Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-900">SUPPLIER_MASTER_V1</td>
                    <td className="px-4 py-3 text-slate-600">v1.2.0</td>
                    <td className="px-4 py-3 text-slate-500">2026-01-15</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">Backward compatible with v1.1.x</td>
                  </tr>
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-900">EMISSIONS_DECLARATION_V1</td>
                    <td className="px-4 py-3 text-slate-600">v1.0.3</td>
                    <td className="px-4 py-3 text-slate-500">2026-02-01</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">Stable, CBAM-aligned</td>
                  </tr>
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-900">BOM_V2</td>
                    <td className="px-4 py-3 text-slate-600">v2.1.0</td>
                    <td className="px-4 py-3 text-slate-500">2026-01-28</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">Breaking change from v1.x</td>
                  </tr>
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-900">CERTIFICATION_V1</td>
                    <td className="px-4 py-3 text-slate-600">v1.0.1</td>
                    <td className="px-4 py-3 text-slate-500">2025-12-10</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">ISO 13485, ISO 9001 supported</td>
                  </tr>
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-900">INVOICE_V1</td>
                    <td className="px-4 py-3 text-slate-600">v1.3.2</td>
                    <td className="px-4 py-3 text-slate-500">2026-02-05</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">Multi-currency support added</td>
                  </tr>
                </tbody>
              </table>
            </div>
        </Card>

        {/* Module Readiness Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {mockModules.map((module) => {
            const computedStatus = computeReadinessStatus(module);
            const hasBlockers = module.blocked_work_items > 0 || module.conflicts > 0;
            
            return (
              <Card key={module.module_name} className="bg-white/95 border border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] backdrop-blur-sm">
                <CardHeader className="border-b border-slate-200/50">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-light text-slate-900">{module.module_name}</CardTitle>
                    <StatusBadge status={computedStatus} />
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {/* Coverage Bar */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-600">Data Coverage</span>
                      <span className="font-semibold text-slate-900">{module.coverage}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-slate-900 rounded-full transition-all duration-500"
                        style={{ width: `${module.coverage}%` }}
                      />
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50/50 rounded-lg border border-slate-200/50">
                      <div className="text-2xl font-light text-slate-900">{module.gaps}</div>
                      <div className="text-xs text-slate-500 uppercase tracking-wider">Data Gaps</div>
                    </div>
                    <div className="p-3 bg-slate-50/50 rounded-lg border border-slate-200/50">
                      <div className="text-2xl font-light text-slate-900">{module.pending_matches}</div>
                      <div className="text-xs text-slate-500 uppercase tracking-wider">Pending Matches</div>
                    </div>
                  </div>

                  {/* Blockers Warning (if any) */}
                  {hasBlockers && (
                    <div className="p-3 bg-slate-50 border border-slate-300 rounded-lg flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-slate-900" />
                      <div className="text-xs">
                        <span className="text-slate-900 font-medium">
                          {module.blocked_work_items} blocked work items, {module.conflicts} conflicts
                        </span>
                      </div>
                    </div>
                  )}

                  {/* View Blockers Button */}
                  <Button 
                    variant="outline" 
                    className="w-full gap-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white transition-colors"
                    onClick={() => {
                      setSelectedModule(module);
                      setShowBlockersDrawer(true);
                    }}
                    disabled={module.blockers.length === 0}
                  >
                    <AlertCircle className="w-4 h-4" />
                    View Blockers {module.blockers.length > 0 && `(${module.blockers.length})`}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Blockers Drawer */}
        <Dialog open={showBlockersDrawer} onOpenChange={setShowBlockersDrawer}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                {selectedModule?.module_name} - Blockers Breakdown
              </DialogTitle>
            </DialogHeader>
            
            {selectedModule && (
              <div className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Coverage</div>
                    <div className="text-2xl font-light text-slate-900">{selectedModule.coverage}%</div>
                  </div>
                  <div className="bg-slate-100 border border-slate-200 rounded-lg p-3">
                    <div className="text-xs text-slate-600 uppercase tracking-wider mb-1">Pending Matches</div>
                    <div className="text-2xl font-light text-slate-900">{selectedModule.pending_matches}</div>
                  </div>
                  <div className="bg-slate-100 border border-slate-300 rounded-lg p-3">
                    <div className="text-xs text-slate-600 uppercase tracking-wider mb-1">Blocked Items</div>
                    <div className="text-2xl font-light text-slate-900">{selectedModule.blocked_work_items}</div>
                  </div>
                  <div className="bg-slate-900 border border-slate-900 rounded-lg p-3">
                    <div className="text-xs text-slate-300 uppercase tracking-wider mb-1">Conflicts</div>
                    <div className="text-2xl font-light text-white">{selectedModule.conflicts}</div>
                  </div>
                </div>

                {/* Blockers List */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Blockers ({selectedModule.blockers.length})
                  </h3>
                  
                  {selectedModule.blockers.length === 0 ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-8 text-center">
                      <CheckCircle2 className="w-8 h-8 text-slate-900 mx-auto mb-2" />
                      <p className="text-sm text-slate-900 font-medium">No blockers - module is ready!</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedModule.blockers.map((blocker, idx) => (
                        <div 
                          key={idx} 
                          className="bg-white/95 border border-slate-200 rounded-lg p-4 hover:border-slate-900 transition-colors backdrop-blur-sm"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge className={
                                blocker.type === 'DATA_GAP' ? 'bg-slate-100 text-slate-900 text-xs border border-slate-300' :
                                blocker.type === 'PENDING_MATCH' ? 'bg-slate-200 text-slate-900 text-xs border border-slate-300' :
                                blocker.type === 'BLOCKED_WORK_ITEM' ? 'bg-slate-300 text-slate-900 text-xs border border-slate-400' :
                                'bg-slate-900 text-white text-xs border border-slate-900'
                              }>
                                {blocker.type.replace(/_/g, ' ')}
                              </Badge>
                              <span className="text-xs text-slate-500">
                                {blocker.entity_type}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              {blocker.entity_type === 'Supplier' && <Users className="w-4 h-4 text-slate-900" />}
                              {blocker.entity_type === 'SKU' && <Package className="w-4 h-4 text-slate-900" />}
                              {blocker.entity_type === 'BOM' && <FileText className="w-4 h-4 text-slate-900" />}
                              <Link 
                                to={createPageUrl('SupplyLensNetwork')} 
                                className="text-sm font-medium text-slate-900 hover:text-slate-600 transition-colors"
                              >
                                {blocker.entity_name}
                              </Link>
                              <span className="text-xs text-slate-500 font-mono">{blocker.entity_id}</span>
                            </div>

                            <p className="text-sm text-slate-600">{blocker.description}</p>

                            <div className="flex gap-2 pt-2">
                              {blocker.evidence_id && (
                                <Link to={createPageUrl(`EvidenceRecordDetail?record_id=${blocker.evidence_id}`)}>
                                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white">
                                    <FileText className="w-3 h-3" />
                                    View Evidence
                                  </Button>
                                </Link>
                              )}
                              {blocker.work_item_id && (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="h-7 text-xs gap-1 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white"
                                  onClick={() => {
                                    window.location.href = `${createPageUrl('SupplyLens')}?work_item=${blocker.work_item_id}`;
                                  }}
                                >
                                  <Clock className="w-3 h-3" />
                                  Open Task
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="border-t border-slate-200 pt-4 flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1 gap-2 rounded-lg border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white"
                    onClick={() => {
                      window.location.href = `${createPageUrl('SupplyLens')}?module=${selectedModule.module_tag}`;
                    }}
                  >
                    <Clock className="w-4 h-4" />
                    Open Work Queue
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1 gap-2 rounded-lg border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white"
                    onClick={() => {
                      window.location.href = createPageUrl('SupplyLensNetwork');
                    }}
                  >
                    <Users className="w-4 h-4" />
                    View Entities
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}