import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Shield, 
  FileText, 
  ArrowRight,
  Clock,
  Database
} from 'lucide-react';

/**
 * PHASE 2.0 - MAPPING GATE DASHBOARD
 * 
 * Read-only UI that displays entity readiness for downstream use.
 * 
 * PRINCIPLES:
 * - Transparent status display
 * - Explicit gap reporting
 * - No greenwashing
 * - No fake progress bars
 * - No auto-activation
 * - Backend truth only
 */

export default function MappingGateDashboard() {
  const [selectedEntityType, setSelectedEntityType] = useState('supplier');
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [frameworks, setFrameworks] = useState(['CBAM', 'EUDR', 'CSRD']);

  // Fetch entities based on type
  const { data: entities = [], isLoading: entitiesLoading } = useQuery({
    queryKey: ['entities', selectedEntityType],
    queryFn: async () => {
      if (selectedEntityType === 'supplier') {
        return await base44.entities.Supplier.list();
      } else if (selectedEntityType === 'site') {
        return await base44.entities.SupplierSite.list();
      } else if (selectedEntityType === 'sku') {
        return await base44.entities.SKU.list();
      }
      return [];
    }
  });

  // Fetch readiness status
  const { data: readiness, isLoading: readinessLoading, refetch: refetchReadiness } = useQuery({
    queryKey: ['mapping-gate-status', selectedEntity?.id, frameworks],
    queryFn: async () => {
      if (!selectedEntity) return null;
      
      const result = await base44.functions.invoke('getMappingGateStatus', {
        entity_type: selectedEntityType,
        entity_id: selectedEntity.id,
        frameworks
      });
      
      return result.data;
    },
    enabled: !!selectedEntity
  });

  // Fetch gaps
  const { data: gaps, isLoading: gapsLoading } = useQuery({
    queryKey: ['mapping-gate-gaps', selectedEntity?.id, frameworks],
    queryFn: async () => {
      if (!selectedEntity) return null;
      
      const result = await base44.functions.invoke('getMappingGateGaps', {
        entity_type: selectedEntityType,
        entity_id: selectedEntity.id,
        frameworks
      });
      
      return result.data;
    },
    enabled: !!selectedEntity
  });

  useEffect(() => {
    if (entities.length > 0 && !selectedEntity) {
      setSelectedEntity(entities[0]);
    }
  }, [entities]);

  const getStatusBadge = (status) => {
    if (status === 'APPROVED') {
      return <Badge className="bg-green-600 text-white"><CheckCircle2 className="w-3 h-3 mr-1" /> APPROVED</Badge>;
    } else if (status === 'PROVISIONAL') {
      return <Badge className="bg-yellow-600 text-white"><AlertTriangle className="w-3 h-3 mr-1" /> PROVISIONAL</Badge>;
    } else if (status === 'BLOCKED') {
      return <Badge className="bg-red-600 text-white"><XCircle className="w-3 h-3 mr-1" /> BLOCKED</Badge>;
    }
    return <Badge>UNKNOWN</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-light text-slate-900 uppercase tracking-widest">Mapping Gate</h1>
        <p className="text-xs text-slate-600 mt-1">Deterministic Readiness Evaluation (Phase 2.0)</p>
      </div>

      {/* Entity Selection */}
      <Card className="bg-white/80 backdrop-blur border-slate-200">
        <CardHeader>
          <CardTitle className="text-sm font-light uppercase tracking-wider">Entity Selection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-600 mb-2 block">Entity Type</label>
              <Select value={selectedEntityType} onValueChange={setSelectedEntityType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="supplier">Supplier</SelectItem>
                  <SelectItem value="site">Site</SelectItem>
                  <SelectItem value="sku">SKU</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-slate-600 mb-2 block">Select Entity</label>
              <Select 
                value={selectedEntity?.id} 
                onValueChange={(id) => setSelectedEntity(entities.find(e => e.id === id))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={entitiesLoading ? "Loading..." : "Select entity"} />
                </SelectTrigger>
                <SelectContent>
                  {entities.map(entity => (
                    <SelectItem key={entity.id} value={entity.id}>
                      {entity.legal_name || entity.site_name || entity.sku_code || entity.name || entity.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Readiness Status */}
      {readiness && (
        <Card className="bg-white/80 backdrop-blur border-slate-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-light uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-4 h-4 text-slate-600" />
                Readiness Status
              </CardTitle>
              {getStatusBadge(readiness.status)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Overall Metrics */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <p className="text-xs text-slate-600 uppercase">Completeness</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{readiness.completeness_score}%</p>
                </div>
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <p className="text-xs text-slate-600 uppercase">Rule Version</p>
                  <p className="text-lg font-semibold text-slate-900 mt-1">{readiness.rule_version}</p>
                </div>
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <p className="text-xs text-slate-600 uppercase">Evaluated</p>
                  <p className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(readiness.evaluated_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Framework Readiness */}
              {readiness.framework_readiness && Object.keys(readiness.framework_readiness).length > 0 && (
                <div>
                  <p className="text-xs text-slate-600 uppercase mb-2">Framework Readiness</p>
                  <div className="grid grid-cols-3 gap-3">
                    {Object.entries(readiness.framework_readiness).map(([framework, status]) => (
                      <div key={framework} className="p-3 rounded-lg border border-slate-200">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-slate-900">{framework}</p>
                          {status.ready ? 
                            <CheckCircle2 className="w-4 h-4 text-green-600" /> : 
                            <XCircle className="w-4 h-4 text-red-600" />
                          }
                        </div>
                        <p className="text-lg font-bold text-slate-700">{status.completeness}%</p>
                        {status.missing_fields.length > 0 && (
                          <p className="text-xs text-red-600 mt-1">{status.missing_fields.length} missing</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gaps & Actions */}
      {gaps && (
        <Card className="bg-white/80 backdrop-blur border-slate-200">
          <CardHeader>
            <CardTitle className="text-sm font-light uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-600" />
              Gaps & Required Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Blocking Reasons */}
              {gaps.blocking_reasons && gaps.blocking_reasons.length > 0 && (
                <div className="p-4 rounded-lg bg-red-50 border-2 border-red-500">
                  <p className="text-xs font-semibold text-red-900 uppercase mb-2">Hard Stops</p>
                  <ul className="space-y-1">
                    {gaps.blocking_reasons.map((reason, idx) => (
                      <li key={idx} className="text-xs text-red-800 flex items-start gap-2">
                        <XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Missing Fields */}
              {gaps.missing_fields && gaps.missing_fields.length > 0 && (
                <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-500">
                  <p className="text-xs font-semibold text-yellow-900 uppercase mb-2">Missing Fields ({gaps.missing_fields.length})</p>
                  <div className="grid grid-cols-3 gap-2">
                    {gaps.missing_fields.map((field, idx) => (
                      <div key={idx} className="text-xs bg-white px-2 py-1 rounded border border-yellow-300">
                        <p className="font-mono text-slate-900">{field.field}</p>
                        <p className="text-yellow-700">{field.scope}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Required Actions */}
              {gaps.required_next_actions && gaps.required_next_actions.length > 0 && (
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-500">
                  <p className="text-xs font-semibold text-blue-900 uppercase mb-2">Next Actions</p>
                  <ul className="space-y-2">
                    {gaps.required_next_actions.map((action, idx) => (
                      <li key={idx} className="text-xs text-blue-800 flex items-start gap-2">
                        <ArrowRight className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommended Evidence */}
              {gaps.recommended_evidence_uploads && gaps.recommended_evidence_uploads.length > 0 && (
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-300">
                  <p className="text-xs font-semibold text-slate-900 uppercase mb-2">Recommended Evidence Uploads</p>
                  <ul className="space-y-1">
                    {gaps.recommended_evidence_uploads.map((rec, idx) => (
                      <li key={idx} className="text-xs text-slate-700 flex items-start gap-2">
                        <Database className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Evidence Lineage */}
              {gaps.evidence_lineage && gaps.evidence_lineage.length > 0 && (
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <p className="text-xs font-semibold text-slate-900 uppercase mb-2">Evidence Lineage ({gaps.evidence_lineage.length})</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {gaps.evidence_lineage.map((ev, idx) => (
                      <div key={idx} className="text-xs bg-white p-2 rounded border border-slate-200">
                        <div className="flex items-center justify-between">
                          <p className="font-mono text-slate-600">{ev.evidence_id.substring(0, 12)}...</p>
                          <Badge className={
                            ev.state === 'STRUCTURED' ? 'bg-green-600 text-white' :
                            ev.state === 'CLASSIFIED' ? 'bg-blue-600 text-white' :
                            ev.state === 'RAW' ? 'bg-slate-600 text-white' :
                            'bg-red-600 text-white'
                          }>{ev.state}</Badge>
                        </div>
                        {ev.classification && (
                          <p className="text-slate-600 mt-1">Type: {ev.classification.evidence_type}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Footer Notice */}
      <Card className="bg-slate-900 text-white border-slate-700">
        <CardContent className="pt-6">
          <p className="text-xs">
            <span className="font-semibold">MAPPING GATE RULES:</span> Deterministic • Backend-Enforced • Read-Only • Versioned ({readiness?.rule_version || '2.0.0'})
          </p>
          <p className="text-xs text-slate-400 mt-2">
            This evaluation does NOT activate compliance modules. It only assesses readiness for downstream use.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}