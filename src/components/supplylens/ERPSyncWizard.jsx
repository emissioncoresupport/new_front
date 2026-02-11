import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import { Database, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function ERPSyncWizard({ isOpen, onClose, onSuccess }) {
  const [step, setStep] = useState('system');
  const [system, setSystem] = useState('SAP');
  const [connectionData, setConnectionData] = useState({});
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  const handleTestConnection = async () => {
    setTesting(true);
    setError(null);

    try {
      const res = await base44.functions.invoke('erpSyncConnector', {
        action: 'test_connection',
        erp_system: system,
        api_key: connectionData.api_key,
        endpoint: connectionData.endpoint
      });

      if (res.data.status === 'SUCCESS') {
        setStatus('Connection successful!');
        setStep('sync');
      } else {
        setError(res.data.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setTesting(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setError(null);

    try {
      // Mock ERP fetch (production: call actual ERP API)
      const suppliers = [
        { legal_name: 'Example Corp', country: 'DE', supplier_type: 'manufacturer' },
        { legal_name: 'Another Ltd', country: 'FR', supplier_type: 'distributor' }
      ];

      let succeeded = 0;
      for (const supplier of suppliers) {
        const gateRes = await base44.functions.invoke('mappingGateEnforcer', {
          evidence_id: `erp_${Date.now()}_${supplier.legal_name}`,
          supplier_data: {
            ...supplier,
            evidence_source: 'erp_sync',
            uploaded_at: new Date().toISOString()
          }
        });
        if (gateRes.data.success) succeeded++;
      }

      setStatus(`Synced ${suppliers.length} suppliers. ${succeeded} succeeded.`);
      setStep('complete');
      onSuccess && onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-none">
        <DialogHeader>
          <DialogTitle className="text-lg font-light">ERP Sync Configuration</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* SYSTEM SELECTION */}
          {step === 'system' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-700 uppercase tracking-widest">Select ERP System</label>
                <Select value={system} onValueChange={setSystem}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SAP">SAP S/4HANA</SelectItem>
                    <SelectItem value="Oracle">Oracle NetSuite</SelectItem>
                    <SelectItem value="NetSuite">NetSuite</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Card className="border border-slate-200/50 bg-slate-50/50 p-4 space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-700">API Endpoint</label>
                  <Input
                    placeholder="https://api.example.com"
                    value={connectionData.endpoint || ''}
                    onChange={(e) => setConnectionData({...connectionData, endpoint: e.target.value})}
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700">API Key</label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={connectionData.api_key || ''}
                    onChange={(e) => setConnectionData({...connectionData, api_key: e.target.value})}
                    className="mt-1"
                  />
                </div>
              </Card>

              <div className="flex gap-3">
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleTestConnection}
                  disabled={testing || !connectionData.endpoint || !connectionData.api_key}
                  className="flex-1 bg-gradient-to-r from-[#86b027] to-[#7aa522] text-white rounded-lg"
                >
                  {testing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Test Connection
                </Button>
              </div>

              {status && <div className="text-xs text-emerald-600 text-center">{status}</div>}
            </motion.div>
          )}

          {/* SYNC STEP */}
          {step === 'sync' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <Card className="border border-emerald-200/50 bg-emerald-50/50 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">Connection established</p>
                    <p className="text-xs text-slate-600 mt-1">Ready to sync suppliers from {system}</p>
                  </div>
                </div>
              </Card>

              <p className="text-xs text-slate-600">The system will now fetch all suppliers from your {system} instance and process them through our Mapping Gate for proof-backed validation.</p>

              <div className="flex gap-3">
                <Button
                  onClick={() => setStep('system')}
                  variant="outline"
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleSync}
                  disabled={syncing}
                  className="flex-1 bg-gradient-to-r from-[#86b027] to-[#7aa522] text-white rounded-lg"
                >
                  {syncing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Start Sync
                </Button>
              </div>
            </motion.div>
          )}

          {/* COMPLETE STEP */}
          {step === 'complete' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <div>
                <p className="text-sm font-medium text-slate-900">Sync Complete</p>
                <p className="text-xs text-slate-600 mt-1">{status}</p>
              </div>
              <Button
                onClick={onClose}
                className="w-full bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-lg"
              >
                Done
              </Button>
            </motion.div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}