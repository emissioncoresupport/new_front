import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import {
  Upload,
  Users,
  Database,
  FileUp,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Copy
} from 'lucide-react';

const paths = [
  {
    id: 'buyer_upload',
    label: 'Buyer Upload',
    description: 'You upload supplier documents',
    icon: Upload,
    timeline: '2-3 days per supplier',
    best_for: 'Most comprehensive, document-backed',
    proof_type: 'Document hash + metadata',
    users: ['Compliance Officer', 'Procurement'],
    color: 'from-blue-600 to-blue-500'
  },
  {
    id: 'supplier_portal',
    label: 'Supplier Portal',
    description: 'Suppliers self-declare via invite',
    icon: Users,
    timeline: '1-2 days average',
    best_for: 'Fastest adoption, supplier-driven',
    proof_type: 'Questionnaire hash + timestamp',
    users: ['Suppliers', 'All tiers'],
    color: 'from-emerald-600 to-emerald-500'
  },
  {
    id: 'erp_sync',
    label: 'ERP Integration',
    description: 'Auto-sync from SAP/Oracle/NetSuite',
    icon: Database,
    timeline: 'Real-time',
    best_for: 'Bulk load, continuous updates',
    proof_type: 'ERP record hash + sync log',
    users: ['System', 'No manual input'],
    color: 'from-purple-600 to-purple-500'
  },
  {
    id: 'bulk_import',
    label: 'Bulk Import',
    description: 'Upload CSV/Excel supplier list',
    icon: FileUp,
    timeline: '1 day',
    best_for: 'Quick initial population',
    proof_type: 'File hash + row checksums',
    users: ['Procurement', 'IT'],
    color: 'from-orange-600 to-orange-500'
  }
];

export default function TenantSupplierSetup() {
  const [step, setStep] = useState('intro');
  const [selectedPath, setSelectedPath] = useState(null);
  const [user, setUser] = useState(null);
  const [setupDone, setSetupDone] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const handlePathSelect = async (pathId) => {
    setSelectedPath(pathId);
    
    // Initialize tenant ingestion path
    try {
      const res = await base44.functions.invoke('initializeTenantIngestion', {
        ingestion_path: pathId
      });
      
      if (res.data.success) {
        setStep('configured');
        setTimeout(() => setSetupDone(true), 2000);
      }
    } catch (err) {
      console.error('Setup failed:', err);
    }
  };

  const handleCopyInviteLink = (link) => {
    navigator.clipboard.writeText(link);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // STEP 1: Introduction
  if (step === 'intro') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-8">
        <div className="max-w-5xl mx-auto space-y-8">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-5xl font-light tracking-widest text-slate-900 uppercase">
              Welcome to SupplyLens
            </h1>
            <p className="text-sm text-slate-500 mt-3 tracking-widest uppercase">
              Proof-backed supply chain. Choose your path.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 gap-6"
          >
            {paths.map((path, idx) => {
              const Icon = path.icon;
              return (
                <motion.div
                  key={path.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + idx * 0.05 }}
                >
                  <Card
                    onClick={() => handlePathSelect(path.id)}
                    className="border border-slate-200/50 bg-white/60 backdrop-blur-sm p-6 cursor-pointer hover:border-slate-300 hover:shadow-lg transition-all group"
                  >
                    <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br ${path.color} text-white mb-4 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    <h3 className="text-sm font-medium text-slate-900">{path.label}</h3>
                    <p className="text-xs text-slate-600 mt-1">{path.description}</p>

                    <div className="mt-4 space-y-2 text-xs">
                      <div className="flex items-start gap-2">
                        <span className="text-slate-400 font-medium min-w-fit">Timeline:</span>
                        <span className="text-slate-600">{path.timeline}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-slate-400 font-medium min-w-fit">Best for:</span>
                        <span className="text-slate-600">{path.best_for}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-slate-400 font-medium min-w-fit">Proof:</span>
                        <span className="text-slate-600">{path.proof_type}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-200/50">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePathSelect(path.id);
                        }}
                        className="w-full bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white text-xs py-2 rounded-lg"
                      >
                        Choose <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-slate-50/80 border border-slate-200/50 rounded-lg p-4"
          >
            <p className="text-xs text-slate-600 leading-relaxed">
              <strong className="text-slate-900">All paths are proof-backed.</strong> Every supplier created is linked to an immutable evidence record (document hash, timestamp, source). This ensures CBAM/CSRD audit readiness from day 1.
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  // STEP 2: Configured
  if (step === 'configured') {
    const pathConfig = paths.find(p => p.id === selectedPath);
    const inviteLink = `https://supplylens.app/invite/${selectedPath.replace('_', '-')}/abc123xyz`;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-8">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6"
          >
            <CheckCircle2 className="w-16 h-16 text-emerald-600 mx-auto" />
            <div>
              <h1 className="text-3xl font-light text-slate-900">All Set</h1>
              <p className="text-sm text-slate-600 mt-2">Your ingestion path is configured</p>
            </div>

            <Card className="border-2 border-emerald-200/50 bg-emerald-50/80 backdrop-blur-sm p-6 text-left space-y-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-600 font-medium">Selected Path</p>
                <p className="text-lg font-light text-slate-900 mt-1">{pathConfig.label}</p>
                <p className="text-xs text-slate-600 mt-1">{pathConfig.description}</p>
              </div>

              {selectedPath === 'supplier_portal' && (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-widest text-slate-600 font-medium">Invite Link</p>
                  <div className="bg-white/60 border border-slate-200 rounded-lg p-3 flex items-center justify-between">
                    <code className="text-xs text-slate-700 font-mono truncate">{inviteLink}</code>
                    <Button
                      onClick={() => handleCopyInviteLink(inviteLink)}
                      variant="ghost"
                      size="sm"
                      className="text-emerald-600 hover:bg-emerald-100/50"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  {copySuccess && <p className="text-xs text-emerald-600">✓ Copied</p>}
                  <p className="text-xs text-slate-600 mt-2">Share this link with suppliers. They complete the questionnaire → you review → supplier created.</p>
                </div>
              )}

              <div>
                <p className="text-xs uppercase tracking-widest text-slate-600 font-medium">Proof Coverage</p>
                <p className="text-2xl font-light text-emerald-600 mt-1">0%</p>
                <p className="text-xs text-slate-600 mt-1">Expected. Suppliers added as they onboard.</p>
              </div>
            </Card>

            <Button
              onClick={() => setSetupDone(true)}
              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white py-2 rounded-lg font-medium"
            >
              Go to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  return null;
}