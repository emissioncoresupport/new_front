import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { 
  XCircle, 
  AlertTriangle, 
  ArrowRight, 
  Clock, 
  Shield,
  FileText,
  CheckCircle2,
  Plus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import ProfileFirstIngestionModal from './ProfileFirstIngestionModal';
import QuarantineExecutionPanel from './QuarantineExecutionPanel';

export default function SupplyLensOverview() {
  const [ingestionModalOpen, setIngestionModalOpen] = useState(false);
  const navigate = useNavigate();

  // STEP 3: HARD EXCLUSION — QUARANTINED ENTITIES
  const { data: allSuppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list(),
    initialData: []
  });
  
  // Exclude QUARANTINED entities from operational logic
  const suppliers = allSuppliers.filter(s => s.status !== 'QUARANTINED');

  const { data: evidence = [] } = useQuery({
    queryKey: ['evidence'],
    queryFn: () => base44.entities.Evidence.list(),
    initialData: []
  });

  // Calculate blocking metrics
  const blockedSuppliers = suppliers.filter(s => s.status === 'blocked' || s.validation_status === 'rejected');
  const provisionalSuppliers = suppliers.filter(s => s.validation_status === 'pending' && s.data_completeness < 85);
  const rawEvidence = evidence.filter(e => e.state === 'RAW');
  const classifiedEvidence = evidence.filter(e => e.state === 'CLASSIFIED');
  const missingStructuredEvidence = suppliers.filter(s => {
    const supplierEvidence = evidence.filter(e => e.tenant_id === s.company_id && e.state === 'STRUCTURED');
    return supplierEvidence.length === 0;
  });

  // Generate required actions
  const requiredActions = [];
  
  if (rawEvidence.length > 0) {
    requiredActions.push({
      id: 'classify-evidence',
      title: `Classify ${rawEvidence.length} RAW evidence${rawEvidence.length > 1 ? 's' : ''}`,
      severity: 'HIGH',
      target: 'SupplyLensClassify',
      icon: FileText
    });
  }
  
  if (classifiedEvidence.length > 0) {
    requiredActions.push({
      id: 'approve-structuring',
      title: `Approve ${classifiedEvidence.length} classified evidence${classifiedEvidence.length > 1 ? 's' : ''}`,
      severity: 'MEDIUM',
      target: 'SupplyLensStructure',
      icon: CheckCircle2
    });
  }
  
  if (blockedSuppliers.length > 0) {
    requiredActions.push({
      id: 'resolve-blocked',
      title: `Resolve ${blockedSuppliers.length} blocked supplier${blockedSuppliers.length > 1 ? 's' : ''}`,
      severity: 'CRITICAL',
      target: 'SupplierNetwork',
      icon: XCircle
    });
  }

  if (provisionalSuppliers.length > 0 && provisionalSuppliers.length <= 5) {
    requiredActions.push({
      id: 'complete-data',
      title: `Complete data for ${provisionalSuppliers.length} provisional supplier${provisionalSuppliers.length > 1 ? 's' : ''}`,
      severity: 'MEDIUM',
      target: 'SupplierNetwork',
      icon: AlertTriangle
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-end justify-between border-b border-slate-200/60 pb-6">
          <div>
            <h1 className="text-4xl font-light tracking-widest text-slate-900 uppercase">Control Plane</h1>
            <p className="text-xs text-slate-500 mt-2 tracking-widest uppercase">Operator Mission Control</p>
          </div>
        </motion.div>

        {/* PRIORITY 1: BLOCKERS */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-2 border-red-500/20 bg-white/80 backdrop-blur-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <XCircle className="w-5 h-5 text-red-600" />
              <h2 className="text-sm font-medium text-slate-900 uppercase tracking-widest">Blocking Issues</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {blockedSuppliers.length > 0 && (
                <button
                  onClick={() => navigate(createPageUrl('SupplierNetwork'))}
                  className="p-4 rounded-lg bg-red-50 border border-red-200 hover:border-red-400 transition-all text-left group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-light text-red-900">{blockedSuppliers.length}</p>
                      <p className="text-xs text-red-700 mt-1 uppercase tracking-wide">Suppliers Blocked</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-red-600 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              )}

              {provisionalSuppliers.length > 0 && (
                <button
                  onClick={() => navigate(createPageUrl('SupplierNetwork'))}
                  className="p-4 rounded-lg bg-yellow-50 border border-yellow-200 hover:border-yellow-400 transition-all text-left group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-light text-yellow-900">{provisionalSuppliers.length}</p>
                      <p className="text-xs text-yellow-700 mt-1 uppercase tracking-wide">Suppliers Provisional</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-yellow-600 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              )}

              {missingStructuredEvidence.length > 0 && (
                <button
                  onClick={() => navigate(createPageUrl('SupplyLens'))}
                  className="p-4 rounded-lg bg-orange-50 border border-orange-200 hover:border-orange-400 transition-all text-left group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-light text-orange-900">{missingStructuredEvidence.length}</p>
                      <p className="text-xs text-orange-700 mt-1 uppercase tracking-wide">Missing Structured Evidence</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-orange-600 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              )}

              {blockedSuppliers.length === 0 && provisionalSuppliers.length === 0 && missingStructuredEvidence.length === 0 && (
                <div className="col-span-2 p-8 rounded-lg bg-green-50 border border-green-200 text-center">
                  <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-sm text-green-900 font-medium">No blocking issues</p>
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* PRIORITY 2: REQUIRED ACTIONS */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-2 border-blue-500/20 bg-white/80 backdrop-blur-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <ArrowRight className="w-5 h-5 text-blue-600" />
              <h2 className="text-sm font-medium text-slate-900 uppercase tracking-widest">Next Required Actions</h2>
            </div>
            
            <div className="space-y-3">
              {requiredActions.length > 0 ? requiredActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    onClick={() => navigate(createPageUrl(action.target))}
                    className="w-full p-4 rounded-lg bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all text-left group flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5 text-slate-600" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{action.title}</p>
                        <Badge className={
                          action.severity === 'CRITICAL' ? 'bg-red-600 text-white mt-1' :
                          action.severity === 'HIGH' ? 'bg-orange-600 text-white mt-1' :
                          'bg-blue-600 text-white mt-1'
                        }>{action.severity}</Badge>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </button>
                );
              }) : (
                <div className="p-8 rounded-lg bg-green-50 border border-green-200 text-center">
                  <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-sm text-green-900 font-medium">All actions completed</p>
                  <p className="text-xs text-green-700 mt-1">System ready for downstream use</p>
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* PRIORITY 3: REGULATORY RISK */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border border-slate-200/40 bg-white/60 backdrop-blur-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-slate-600" />
              <h2 className="text-sm font-medium text-slate-900 uppercase tracking-widest">Regulatory Risk Exposure</h2>
            </div>
            
            <div className="grid grid-cols-4 gap-3">
              {['CBAM', 'EUDR', 'CSRD', 'EUDAMED'].map(framework => {
                const frameworkSuppliers = suppliers.filter(s => s[`${framework.toLowerCase()}_relevant`]);
                const frameworkBlocked = frameworkSuppliers.filter(s => s.status === 'blocked');
                const frameworkProvisional = frameworkSuppliers.filter(s => s.data_completeness < 85);
                
                const status = frameworkBlocked.length > 0 ? 'BLOCKED' :
                              frameworkProvisional.length > 0 ? 'PROVISIONAL' : 'READY';
                
                return (
                  <div key={framework} className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                    <p className="text-xs font-semibold text-slate-900 mb-2">{framework}</p>
                    <Badge className={
                      status === 'BLOCKED' ? 'bg-red-600 text-white' :
                      status === 'PROVISIONAL' ? 'bg-yellow-600 text-white' :
                      'bg-green-600 text-white'
                    }>{status}</Badge>
                    <p className="text-xs text-slate-600 mt-2">{frameworkSuppliers.length} suppliers</p>
                  </div>
                );
              })}
            </div>
          </Card>
        </motion.div>

        {/* QUARANTINE EXECUTION (ADMIN ONLY) */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <QuarantineExecutionPanel />
        </motion.div>

        {/* PRIORITY 4: ADD NEW EVIDENCE (SECONDARY) */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="border border-slate-200/40 bg-white/40 backdrop-blur-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-medium text-slate-900 uppercase tracking-widest">Add New Evidence</h2>
                <p className="text-xs text-slate-600 mt-1">Upload documents, import suppliers, or connect ERP</p>
              </div>
              <Button
                onClick={() => setIngestionModalOpen(true)}
                className="bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Supply Entity
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* System Status Footer */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-4 border-t border-slate-200/40">
            <p>Backend Truth • Deterministic Rules • Zero Inference</p>
            <p className="flex items-center gap-2">
              <Clock className="w-3 h-3" />
              Updated {new Date().toLocaleTimeString()}
            </p>
          </div>
        </motion.div>
      </div>

      <ProfileFirstIngestionModal isOpen={ingestionModalOpen} onClose={() => setIngestionModalOpen(false)} />
    </div>
  );
}