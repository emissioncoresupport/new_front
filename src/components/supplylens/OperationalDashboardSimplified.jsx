import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default function OperationalDashboard() {
  // All metrics disabled until supplier promotion logic is audited
  const metricsBlocked = true;

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const itemVariants = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } };

  return (
    <div className="space-y-6">
      {/* KPI Strip - Disabled */}
      <motion.div initial="hidden" animate="visible" variants={containerVariants} className="grid grid-cols-5 gap-4">
        {[
          { label: 'Velocity' },
          { label: 'Exceptions' },
          { label: 'Approved' },
          { label: 'Avg Time' },
          { label: 'Coverage' }
        ].map((kpi, idx) => (
          <motion.div key={idx} variants={itemVariants}>
            <Card className="border border-slate-200/30 bg-white/40 backdrop-blur-sm p-4 relative overflow-hidden">
              <p className="text-xs text-slate-400 uppercase tracking-widest font-light">{kpi.label}</p>
              <div className="text-xs text-slate-400 italic leading-tight mt-2">
                Not available yet. Supplier promotion logic under audit.
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Evidence Pipeline */}
      <motion.div initial="hidden" animate="visible" variants={containerVariants} className="grid grid-cols-3 gap-6">
        {/* Pipeline */}
        <motion.div variants={itemVariants}>
          <Card className="border border-slate-200/40 bg-white/60 backdrop-blur-sm p-6">
            <h3 className="text-sm font-light text-slate-900 uppercase tracking-widest mb-6">Evidence Pipeline</h3>
            <div className="space-y-3">
              {[
                { stage: 'Evidence Received', count: '—' },
                { stage: 'Evidence Classified', count: '—' },
                { stage: 'Evidence Structured', count: '—' },
                { stage: 'Mapping Gate Pending', count: '—' },
                { stage: 'Candidates (Blocked/Promotable)', count: '—' }
              ].map((stage, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">{stage.stage}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full w-0 bg-slate-300" />
                    </div>
                    <span className="text-xs font-light text-slate-400 w-8 text-right italic">{stage.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Risk Portfolio - Disabled */}
        <motion.div variants={itemVariants}>
          <Card className="border border-slate-200/30 bg-white/40 backdrop-blur-sm p-6">
            <h3 className="text-sm font-medium text-slate-400 mb-4 uppercase tracking-widest">Risk Portfolio</h3>
            <div className="flex items-center justify-center h-32">
              <p className="text-xs text-slate-400 italic text-center max-w-xs">
                Risk metrics not available yet. Supplier promotion logic under audit.
              </p>
            </div>
          </Card>
        </motion.div>

        {/* Deadlines - Disabled */}
        <motion.div variants={itemVariants}>
          <Card className="border border-slate-200/30 bg-white/40 backdrop-blur-sm p-6">
            <h3 className="text-sm font-medium text-slate-400 mb-4 uppercase tracking-widest">Regulatory Deadlines</h3>
            <div className="flex items-center justify-center h-32">
              <p className="text-xs text-slate-400 italic text-center max-w-xs">
                Deadline tracking not available yet. Supplier promotion logic under audit.
              </p>
            </div>
          </Card>
        </motion.div>
      </motion.div>

      {/* Exceptions & Decisions - Disabled */}
      <motion.div initial="hidden" animate="visible" variants={containerVariants} className="grid grid-cols-2 gap-6">
        <motion.div variants={itemVariants}>
          <Card className="border border-slate-200/30 bg-white/40 backdrop-blur-sm p-6">
            <h3 className="text-sm font-medium text-slate-400 mb-4 uppercase tracking-widest">Active Exceptions</h3>
            <div className="flex items-center justify-center h-32">
              <p className="text-xs text-slate-400 italic text-center max-w-xs">
                Exception tracking not available yet. Supplier promotion logic under audit.
              </p>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border border-slate-200/30 bg-white/40 backdrop-blur-sm p-6">
            <h3 className="text-sm font-medium text-slate-400 mb-4 uppercase tracking-widest">Recent Decisions</h3>
            <div className="flex items-center justify-center h-32">
              <p className="text-xs text-slate-400 italic text-center max-w-xs">
                Decision audit trail not available yet. Supplier promotion logic under audit.
              </p>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}