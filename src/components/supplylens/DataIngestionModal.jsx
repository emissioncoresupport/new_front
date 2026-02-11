import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Upload, Users, FileUp, Database, GripHorizontal, AlertTriangle } from 'lucide-react';
import SupplierOnboardingFlow from './SupplierOnboardingFlow';
import SupplierInviteModal from './SupplierInviteModal';
import BulkImportWizard from './BulkImportWizard';
import ERPSyncWizard from './ERPSyncWizard';

const ingestionMethods = [
  {
    id: 'upload',
    name: 'Upload Documents',
    description: 'Evidence-first ingestion with AI extraction',
    icon: Upload,
    color: 'from-blue-600 to-blue-500',
    subtitle: 'Creates immutable Evidence records only',
    requires_context: true
  },
  {
    id: 'supplier_portal',
    name: 'Supplier Portal',
    description: 'Invite suppliers to self-declare and provide data',
    icon: Users,
    color: 'from-emerald-600 to-emerald-500',
    subtitle: 'Supplier-submitted Evidence only',
    requires_context: true
  },
  {
    id: 'bulk_import',
    name: 'Bulk Import',
    description: 'CSV upload with validation pipeline',
    icon: FileUp,
    color: 'from-orange-600 to-orange-500',
    subtitle: 'Evidence creation in batch',
    requires_context: true
  },
  {
    id: 'erp_sync',
    name: 'ERP Sync',
    description: 'Connect SAP, Oracle, Dynamics',
    icon: Database,
    color: 'from-slate-400 to-slate-500',
    subtitle: 'SNAPSHOT ONLY - Real-time not implemented',
    blocked: true,
    blocked_reason: 'Real-time CDC not implemented. Only snapshot imports supported. Use Bulk Import for ERP data exports.'
  }
];

export default function DataIngestionModal({ isOpen, onClose }) {
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [wizardOpen, setWizardOpen] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!isDragging) return;
    let animId;
    const handleMouseMove = (e) => {
      cancelAnimationFrame(animId);
      animId = requestAnimationFrame(() => {
        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;
        setPosition(prev => ({
          x: Math.max(-800, Math.min(800, prev.x + deltaX)),
          y: Math.max(-600, Math.min(600, prev.y + deltaY))
        }));
        setDragStart({ x: e.clientX, y: e.clientY });
      });
    };
    const handleMouseUp = () => setIsDragging(false);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      cancelAnimationFrame(animId);
    };
  }, [isDragging, dragStart]);

  const handleSelectMethod = (method) => {
    if (method.blocked) {
      alert(`⚠️ Feature Blocked\n\n${method.blocked_reason}\n\nThis limitation is logged in the Developer Console.`);
      return;
    }
    
    if (method.id === 'upload') {
      setWizardOpen('upload');
    } else if (method.id === 'supplier_portal') {
      setWizardOpen('invite');
    } else if (method.id === 'bulk_import') {
      setWizardOpen('bulk');
    } else if (method.id === 'erp_sync') {
      setWizardOpen('erp');
    }
  };

  const handleWizardClose = () => {
    setWizardOpen(null);
    setSelectedMethod(null);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent 
          className="max-w-6xl h-[80vh] bg-gradient-to-br from-white/96 via-white/92 to-slate-50/96 border border-slate-200/50 backdrop-blur-2xl overflow-hidden flex flex-col p-0 shadow-2xl"
          style={position.x !== 0 || position.y !== 0 ? { 
            transform: `translate(${position.x}px, ${position.y}px)`,
            transition: isDragging ? 'none' : 'transform 0.1s ease-out'
          } : {}}
        >
          {/* Draggable Header */}
          <motion.div 
            className="flex items-center justify-between px-7 py-4 border-b border-slate-200/40 cursor-grab active:cursor-grabbing hover:bg-white/50 transition"
            onMouseDown={(e) => {
              setIsDragging(true);
              setDragStart({ x: e.clientX, y: e.clientY });
            }}
            whileHover={{ backgroundColor: 'rgba(255,255,255,0.35)' }}
          >
            <div className="flex items-center gap-2.5">
              <motion.div animate={{ opacity: isDragging ? 1 : 0.6 }} transition={{ duration: 0.2 }}>
                <GripHorizontal className="w-4 h-4 text-slate-400" />
              </motion.div>
              <DialogTitle className="text-base font-light text-slate-900 uppercase tracking-widest">
                Evidence Ingestion Control
              </DialogTitle>
            </div>
            <span className="text-xs text-slate-400 font-light">Drag to move</span>
          </motion.div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-7 py-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              {/* Header Section */}
              <div className="space-y-2">
                <p className="text-xs text-slate-600 uppercase tracking-widest font-light">Evidence-Only Ingestion</p>
                <p className="text-sm text-slate-700 font-light">All ingestion paths create immutable Evidence records. No automatic supplier creation. Context must be declared before upload.</p>
              </div>
              
              <div className="grid grid-cols-4 gap-3 auto-rows-max">
                {ingestionMethods.map((method, idx) => {
                  const Icon = method.icon;
                  return (
                    <motion.button
                      key={method.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.08 }}
                      onClick={() => handleSelectMethod(method)}
                      className={`text-left group ${method.blocked ? 'cursor-not-allowed' : ''}`}
                      disabled={method.blocked}
                    >
                      <motion.div whileHover={method.blocked ? {} : { scale: 1.02, y: -2 }} transition={{ duration: 0.2 }}>
                        <Card className={`border ${method.blocked ? 'border-slate-300/30 bg-slate-100/40 opacity-60' : 'border-slate-200/35 bg-gradient-to-br from-white/50 to-white/30 hover:from-white/70 hover:to-white/50 hover:border-slate-300/60 hover:shadow-lg'} backdrop-blur-lg p-4 ${!method.blocked && 'cursor-pointer'} group transition-all relative`}>
                          {method.blocked && (
                            <div className="absolute top-2 right-2">
                              <span className="text-xs font-medium px-2 py-0.5 rounded bg-red-100 text-red-700 uppercase tracking-wider">
                                Blocked
                              </span>
                            </div>
                          )}
                          <div className="space-y-3">
                            <div className={`w-11 h-11 rounded-lg border ${method.blocked ? 'border-slate-300/50 bg-slate-200/50' : 'border-slate-300/50 bg-white/70 group-hover:border-slate-400/70 group-hover:bg-white/90'} backdrop-blur-md flex items-center justify-center flex-shrink-0 ${method.blocked ? 'text-slate-400' : 'text-slate-700 group-hover:text-slate-900'} transition-all`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="space-y-2">
                              <h3 className={`text-sm font-light tracking-tight ${method.blocked ? 'text-slate-400' : 'text-slate-900'}`}>{method.name}</h3>
                              <p className={`text-xs leading-snug ${method.blocked ? 'text-slate-400' : 'text-slate-600'}`}>{method.description}</p>
                              <div className="pt-1 border-t border-slate-200/40">
                                <p className={`text-xs italic font-light ${method.blocked ? 'text-slate-400' : 'text-slate-500'}`}>{method.subtitle}</p>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Info Footer */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-6 pt-5 border-t border-slate-200/40">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-blue-50/50 to-blue-100/30 backdrop-blur-sm border border-blue-200/30 rounded p-3">
                    <p className="text-xs font-light text-blue-900 uppercase tracking-wider">Immutable</p>
                    <p className="text-xs text-blue-700 mt-1">Evidence-first only</p>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-50/50 to-emerald-100/30 backdrop-blur-sm border border-emerald-200/30 rounded p-3">
                    <p className="text-xs font-light text-emerald-900 uppercase tracking-wider">Audit Trail</p>
                    <p className="text-xs text-emerald-700 mt-1">Every action logged</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50/50 to-purple-100/30 backdrop-blur-sm border border-purple-200/30 rounded p-3">
                    <p className="text-xs font-light text-purple-900 uppercase tracking-wider">Gate-Protected</p>
                    <p className="text-xs text-purple-700 mt-1">No auto-promotion</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Embedded Wizards */}
      {wizardOpen === 'upload' && (
        <SupplierOnboardingFlow isOpen={true} onClose={handleWizardClose} onSuccess={handleWizardClose} />
      )}
      {wizardOpen === 'invite' && (
        <SupplierInviteModal isOpen={true} onClose={handleWizardClose} />
      )}
      {wizardOpen === 'bulk' && (
        <BulkImportWizard isOpen={true} onClose={handleWizardClose} onSuccess={handleWizardClose} />
      )}
      {wizardOpen === 'erp' && (
        <ERPSyncWizard isOpen={true} onClose={handleWizardClose} onSuccess={handleWizardClose} />
      )}
    </>
  );
}