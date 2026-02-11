import React from 'react';
import ERPSyncDashboard from '../components/integration/ERPSyncDashboard';

export default function ERPIntegration() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <ERPSyncDashboard />
    </div>
  );
}