import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Shield } from 'lucide-react';
import { toast } from 'sonner';

export default function GrantedDatasetsPanel({ supplierOrgId, buyerOrgId }) {
  const [grantedDatasets, setGrantedDatasets] = useState([]);
  const currentTenant = buyerOrgId || 'BuyerOrgA';

  useEffect(() => {
    const grants = JSON.parse(localStorage.getItem('supplier_grants') || '[]');
    const filtered = grants.filter(g =>
      g.supplier_org_id === supplierOrgId &&
      g.buyer_org_id === currentTenant &&
      g.status === 'ACTIVE'
    );
    setGrantedDatasets(filtered);
  }, [supplierOrgId, buyerOrgId]);

  const handleExportMetadata = (grant) => {
    // Log access
    const accessLog = {
      log_id: `LOG-${Date.now()}`,
      grant_id: grant.grant_id,
      evidence_id: grant.evidence_id,
      tenant: currentTenant,
      actor: 'buyer_user@example.com',
      action: 'GRANTED_DATASET_EXPORT',
      allowed: true,
      timestamp: new Date().toISOString()
    };
    const logs = JSON.parse(localStorage.getItem('buyer_access_logs') || '[]');
    logs.push(accessLog);
    localStorage.setItem('buyer_access_logs', JSON.stringify(logs));

    toast.success('Exported metadata', {
      description: `Evidence ${grant.evidence_id} metadata exported`
    });
  };

  if (grantedDatasets.length === 0) {
    return (
      <Card className="border border-slate-200/60 bg-white/70 backdrop-blur-xl">
        <CardContent className="p-6 text-center">
          <Shield className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          <p className="text-sm text-slate-500 font-light">No granted datasets from this supplier</p>
          <p className="text-xs text-slate-400 font-light mt-1">
            Supplier must create a grant to share datasets
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-[#86b027]/30 bg-gradient-to-r from-[#86b027]/5 to-white/70 backdrop-blur-xl">
      <CardHeader className="border-b border-slate-200/50">
        <CardTitle className="text-base font-light flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#86b027]" />
          Granted Datasets ({grantedDatasets.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-2">
        {grantedDatasets.map((grant) => (
          <div key={grant.grant_id} className="bg-slate-50/50 border border-slate-200 rounded-lg p-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-xs font-mono font-semibold text-slate-900">{grant.grant_id}</p>
                  <Badge className="bg-green-100 text-green-800 text-xs">ACTIVE</Badge>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  <Badge variant="outline" className="text-xs">{grant.dataset_type}</Badge>
                  {grant.period && <Badge variant="outline" className="text-xs">{grant.period}</Badge>}
                </div>
                <p className="text-xs text-slate-600">
                  Evidence: <span className="font-mono">{grant.evidence_id}</span> • Granted: {new Date(grant.granted_at).toLocaleDateString()}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-[#86b027] text-[#86b027] hover:bg-[#86b027]/5"
                onClick={() => handleExportMetadata(grant)}
              >
                <Download className="w-3 h-3 mr-1" />
                Export Metadata
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}