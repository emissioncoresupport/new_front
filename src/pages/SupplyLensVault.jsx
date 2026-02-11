import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

export default function SupplyLensVaultPage() {
  const { data: evidence = [] } = useQuery({
    queryKey: ['evidence'],
    queryFn: () => base44.entities.Evidence.list('-uploaded_at', 1000),
    initialData: []
  });

  const stateColors = {
    'RAW': 'bg-yellow-100 text-yellow-800',
    'CLASSIFIED': 'bg-blue-100 text-blue-800',
    'STRUCTURED': 'bg-green-100 text-green-800',
    'REJECTED': 'bg-red-100 text-red-800'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-light tracking-widest text-slate-900 uppercase">Evidence Vault</h1>
          <p className="text-xs text-slate-500 mt-2 tracking-widest uppercase">Read-only audit trail</p>
        </motion.div>

        {evidence.length === 0 ? (
          <Card className="border border-slate-200 p-8 text-center">
            <p className="text-slate-600">No evidence uploaded yet.</p>
          </Card>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="space-y-3"
          >
            {evidence.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="border border-slate-200 p-4 space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{item.original_filename}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(item.uploaded_at).toLocaleDateString()} {new Date(item.uploaded_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <Badge className={stateColors[item.state]}>{item.state}</Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Entity Type</p>
                      <p className="text-xs font-medium text-slate-900">{item.declared_entity_type || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Evidence Type</p>
                      <p className="text-xs font-medium text-slate-900">{item.declared_evidence_type || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Size</p>
                      <p className="text-xs font-medium text-slate-900">
                        {(item.file_size_bytes / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Hash</p>
                      <p className="text-xs font-mono text-slate-900 truncate">
                        {item.file_hash_sha256.slice(0, 16)}...
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}