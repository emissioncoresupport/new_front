import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Building2,
  Factory,
  Package,
  Truck,
  ArrowRight,
  Database,
  Shield
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

/**
 * ENTITY READINESS BOARD
 * 
 * NOT EVIDENCE-CENTRIC.
 * ENTITY-CENTRIC.
 * BACKEND VERIFIED ONLY.
 */

const ENTITY_ICONS = {
  supplier: Building2,
  facility: Factory,
  product: Package,
  shipment: Truck
};

export default function EntityReadinessBoard() {
  const navigate = useNavigate();

  // STEP 3: HARD EXCLUSION — QUARANTINED ENTITIES
  const { data: allSuppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list(),
    initialData: []
  });
  
  // Exclude QUARANTINED entities from operational logic
  const suppliers = allSuppliers.filter(s => s.status !== 'QUARANTINED');

  const { data: profiles = [] } = useQuery({
    queryKey: ['ingestion_profiles'],
    queryFn: () => base44.entities.IngestionProfile.list(),
    initialData: []
  });

  // Calculate entity readiness (backend-verified only)
  const entities = suppliers.map(supplier => {
    const entityProfiles = profiles.filter(p => p.entity_id === supplier.id);
    const blockedProfile = entityProfiles.find(p => p.status === 'BLOCKED');
    const isProvisional = supplier.data_completeness < 85 || entityProfiles.length === 0;
    const isBlocked = supplier.status === 'blocked' || blockedProfile;
    
    const readiness = isBlocked ? 'BLOCKED' : isProvisional ? 'PROVISIONAL' : 'APPROVED';
    
    const blockingReasons = [];
    if (supplier.status === 'blocked') blockingReasons.push('Entity status: blocked');
    if (blockedProfile) blockingReasons.push(`Profile ${blockedProfile.profile_id} is blocked`);
    if (supplier.data_completeness < 85) blockingReasons.push(`Data completeness: ${supplier.data_completeness}%`);
    if (entityProfiles.length === 0) blockingReasons.push('No ingestion profiles attached');

    return {
      id: supplier.id,
      name: supplier.legal_name || supplier.trading_name || 'Unnamed Entity',
      type: 'supplier',
      readiness,
      blockingReasons,
      profileCount: entityProfiles.length,
      usableModules: entityProfiles.flatMap(p => p.usable_modules || []).filter((v, i, a) => a.indexOf(v) === i),
      dataCompleteness: supplier.data_completeness || 0
    };
  });

  const blockedEntities = entities.filter(e => e.readiness === 'BLOCKED');
  const provisionalEntities = entities.filter(e => e.readiness === 'PROVISIONAL');
  const approvedEntities = entities.filter(e => e.readiness === 'APPROVED');

  const renderEntity = (entity) => {
    const Icon = ENTITY_ICONS[entity.type];
    return (
      <motion.div
        key={entity.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className={`p-4 border-2 transition-all ${
          entity.readiness === 'BLOCKED' ? 'border-red-500 bg-red-50' :
          entity.readiness === 'PROVISIONAL' ? 'border-yellow-500 bg-yellow-50' :
          'border-green-500 bg-green-50'
        }`}>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${
                entity.readiness === 'BLOCKED' ? 'bg-red-100' :
                entity.readiness === 'PROVISIONAL' ? 'bg-yellow-100' :
                'bg-green-100'
              }`}>
                <Icon className={`w-5 h-5 ${
                  entity.readiness === 'BLOCKED' ? 'text-red-700' :
                  entity.readiness === 'PROVISIONAL' ? 'text-yellow-700' :
                  'text-green-700'
                }`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{entity.name}</p>
                <Badge className={`mt-1 ${
                  entity.readiness === 'BLOCKED' ? 'bg-red-600 text-white' :
                  entity.readiness === 'PROVISIONAL' ? 'bg-yellow-600 text-white' :
                  'bg-green-600 text-white'
                }`}>
                  {entity.readiness}
                </Badge>
                
                {entity.blockingReasons.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {entity.blockingReasons.map((reason, idx) => (
                      <p key={idx} className="text-xs text-slate-700">• {reason}</p>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-200">
                  <div className="flex items-center gap-1">
                    <Database className="w-3 h-3 text-slate-600" />
                    <span className="text-xs text-slate-600">{entity.profileCount} profiles</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Shield className="w-3 h-3 text-slate-600" />
                    <span className="text-xs text-slate-600">{entity.dataCompleteness}% complete</span>
                  </div>
                </div>

                {entity.usableModules.length > 0 && (
                  <div className="flex gap-1 mt-2">
                    {entity.usableModules.map(mod => (
                      <Badge key={mod} className="bg-blue-100 text-blue-800 text-xs">{mod}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <Button
              onClick={() => navigate(createPageUrl('SupplierNetwork'))}
              variant="ghost"
              size="icon"
              className="text-slate-400 hover:text-slate-700"
            >
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-2 border-red-500 bg-red-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-5 h-5 text-red-700" />
            <p className="text-xs text-red-900 font-semibold uppercase tracking-wider">Blocked</p>
          </div>
          <p className="text-3xl font-light text-red-900">{blockedEntities.length}</p>
        </Card>

        <Card className="border-2 border-yellow-500 bg-yellow-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-yellow-700" />
            <p className="text-xs text-yellow-900 font-semibold uppercase tracking-wider">Provisional</p>
          </div>
          <p className="text-3xl font-light text-yellow-900">{provisionalEntities.length}</p>
        </Card>

        <Card className="border-2 border-green-500 bg-green-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-5 h-5 text-green-700" />
            <p className="text-xs text-green-900 font-semibold uppercase tracking-wider">Approved</p>
          </div>
          <p className="text-3xl font-light text-green-900">{approvedEntities.length}</p>
        </Card>
      </div>

      {/* Blocked Entities */}
      {blockedEntities.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <XCircle className="w-4 h-4 text-red-600" />
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Blocked Entities</h3>
          </div>
          <div className="space-y-3">
            {blockedEntities.map(renderEntity)}
          </div>
        </div>
      )}

      {/* Provisional Entities */}
      {provisionalEntities.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-yellow-600" />
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Provisional Entities</h3>
          </div>
          <div className="space-y-3">
            {provisionalEntities.slice(0, 5).map(renderEntity)}
          </div>
          {provisionalEntities.length > 5 && (
            <Button variant="outline" className="w-full mt-2">
              View All {provisionalEntities.length} Provisional Entities →
            </Button>
          )}
        </div>
      )}

      {/* Approved Entities */}
      {approvedEntities.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Approved Entities</h3>
          </div>
          <div className="space-y-3">
            {approvedEntities.slice(0, 3).map(renderEntity)}
          </div>
          {approvedEntities.length > 3 && (
            <Button variant="outline" className="w-full mt-2">
              View All {approvedEntities.length} Approved Entities →
            </Button>
          )}
        </div>
      )}

      {entities.length === 0 && (
        <Card className="border-2 border-slate-200 bg-slate-50 p-8 text-center">
          <p className="text-sm text-slate-700">No entities found. Create ingestion profile to start.</p>
        </Card>
      )}
    </div>
  );
}