import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, Shield, ArrowRight, XCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

/**
 * PHASE X - SUPPLY INTELLIGENCE (ENTITY-CENTRIC)
 * 
 * Replaces evidence-centric metrics with entity-centric operational view.
 * 
 * FOCUS:
 * - Blocked entities
 * - Provisional entities
 * - Required actions
 * 
 * REMOVED:
 * - Total Evidence counters
 * - RAW/STRUCTURED metrics
 * - Ingestion path analytics
 */

export default function SupplyIntelligenceDashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error('Auth error:', error);
      }
    };
    fetchUser();
  }, []);

  // Blocked entities (suppliers with blocking issues)
  const { data: blockedSuppliers = [] } = useQuery({
    queryKey: ['blocked-suppliers', user?.email],
    queryFn: async () => {
      if (!user) return [];
      // Example: suppliers with validation_status="rejected" or critical gaps
      const suppliers = await base44.entities.Supplier.filter({
        company_id: user.email,
        validation_status: 'rejected'
      });
      return suppliers;
    },
    enabled: !!user
  });

  // Provisional entities (suppliers in provisional state)
  const { data: provisionalSuppliers = [] } = useQuery({
    queryKey: ['provisional-suppliers', user?.email],
    queryFn: async () => {
      if (!user) return [];
      // Example: suppliers with status="pending_review" or onboarding incomplete
      const suppliers = await base44.entities.Supplier.filter({
        company_id: user.email,
        status: 'pending_review'
      });
      return suppliers;
    },
    enabled: !!user
  });

  // Required actions (unclassified evidence, incomplete contexts)
  const { data: unclassifiedEvidence = [] } = useQuery({
    queryKey: ['unclassified-evidence', user?.email],
    queryFn: async () => {
      if (!user) return [];
      const evidence = await base44.entities.Evidence.filter({
        tenant_id: user.email,
        state: 'RAW'
      });
      return evidence.slice(0, 10); // Limit to 10 for display
    },
    enabled: !!user
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {/* Blocked Entities */}
        <Card className="border border-red-500 bg-red-50/50 p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="w-5 h-5 text-red-700" />
                <p className="text-xs uppercase tracking-wider text-red-900 font-light">Blocked</p>
              </div>
              <p className="text-4xl font-light text-red-900">{blockedSuppliers.length}</p>
              <p className="text-xs text-red-700 mt-1">Entities cannot be used</p>
            </div>
          </div>
          {blockedSuppliers.length > 0 && (
            <Button variant="outline" className="w-full mt-4 border-red-700 text-red-900 hover:bg-red-100 text-xs">
              Review Blocked →
            </Button>
          )}
        </Card>

        {/* Provisional Entities */}
        <Card className="border border-yellow-500 bg-yellow-50/50 p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-yellow-700" />
                <p className="text-xs uppercase tracking-wider text-yellow-900 font-light">Provisional</p>
              </div>
              <p className="text-4xl font-light text-yellow-900">{provisionalSuppliers.length}</p>
              <p className="text-xs text-yellow-700 mt-1">Pending validation</p>
            </div>
          </div>
          {provisionalSuppliers.length > 0 && (
            <Button variant="outline" className="w-full mt-4 border-yellow-700 text-yellow-900 hover:bg-yellow-100 text-xs">
              Review Provisional →
            </Button>
          )}
        </Card>

        {/* Required Actions */}
        <Card className="border border-blue-500 bg-blue-50/50 p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-blue-700" />
                <p className="text-xs uppercase tracking-wider text-blue-900 font-light">Action Required</p>
              </div>
              <p className="text-4xl font-light text-blue-900">{unclassifiedEvidence.length}</p>
              <p className="text-xs text-blue-700 mt-1">Evidence needs classification</p>
            </div>
          </div>
          {unclassifiedEvidence.length > 0 && (
            <Button variant="outline" className="w-full mt-4 border-blue-700 text-blue-900 hover:bg-blue-100 text-xs">
              Classify Evidence →
            </Button>
          )}
        </Card>
      </div>

      {/* Required Actions List */}
      {unclassifiedEvidence.length > 0 && (
        <Card className="border border-slate-300 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-light uppercase tracking-wider text-slate-900">Required Actions</h3>
            <Badge className="bg-blue-600 text-white">{unclassifiedEvidence.length} pending</Badge>
          </div>
          <div className="space-y-2">
            {unclassifiedEvidence.slice(0, 5).map(evidence => (
              <div key={evidence.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-blue-400 transition-colors">
                <div>
                  <p className="text-sm text-slate-900 font-medium">
                    {evidence.original_filename || evidence.evidence_id}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    State: {evidence.state} • Uploaded: {new Date(evidence.uploaded_at).toLocaleDateString()}
                  </p>
                </div>
                <Button variant="ghost" className="text-blue-600 hover:text-blue-700 text-xs">
                  Classify →
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Enterprise Compliance Notice */}
      <Card className="border border-slate-300 bg-slate-50 p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-slate-700 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-slate-900 uppercase tracking-wide">Enterprise-Grade Supply Intelligence</p>
            <p className="text-xs text-slate-600 mt-1">
              Entity-first workflow • All ingestion attaches to entity contexts • Evidence immutability enforced • Audit trail logged
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}