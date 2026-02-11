import React from 'react';
import EvidenceVaultCompliance from '../components/supplylens/EvidenceVaultCompliance';
import { parseEvidenceVaultParams } from '../components/supplylens/deepLinkingUtils';
import { EvidenceService } from '../components/supplylens/contract2/services';
import { ACTIVE_TENANT_ID } from '../components/supplylens/contract2/data';
import { Badge } from '@/components/ui/badge';
import { Shield } from 'lucide-react';
import NotFoundCard from '../components/supplylens/NotFoundCard';

export default function EvidenceVault() {
  const urlParams = new URLSearchParams(window.location.search);
  const focusParam = urlParams.get('focus') || '';
  const initialTab = urlParams.get('tab') || 'records';
  
  const [focusDisplayId, setFocusDisplayId] = React.useState(focusParam);
  const [resolvedEvidence, setResolvedEvidence] = React.useState(null);
  const [notFoundId, setNotFoundId] = React.useState(null);
  
  // Update focus when URL changes
  React.useEffect(() => {
    const currentFocus = new URLSearchParams(window.location.search).get('focus');
    if (currentFocus !== focusDisplayId) {
      setFocusDisplayId(currentFocus || '');
      setNotFoundId(null); // Clear not-found state on URL change
    }
  }, [window.location.search]);
  
  // Safe evidence lookup
  const handleLookupEvidence = React.useCallback(async (focusId) => {
    if (!focusId) {
      setNotFoundId(null);
      return;
    }
    try {
      const { demoStore } = await import('@/components/supplylens/DemoDataStore');
      const evidence = demoStore.getEvidenceByDisplayId(focusId) || demoStore.getEvidenceByRecordId(focusId);
      if (evidence) {
        setResolvedEvidence(evidence);
        setNotFoundId(null);
      } else {
        setResolvedEvidence(null);
        setNotFoundId(focusId);
      }
    } catch (error) {
      console.error('[EvidenceVault] Lookup error:', error);
      setNotFoundId(focusId);
    }
  }, []);
  
  React.useEffect(() => {
    if (focusDisplayId) {
      handleLookupEvidence(focusDisplayId);
    }
  }, [focusDisplayId, handleLookupEvidence]);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="border-b border-slate-200 bg-white/60 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-[1920px] mx-auto px-8 py-6">
          <h1 className="text-3xl font-light text-slate-900 tracking-tight">Evidence Vault</h1>
          <p className="text-slate-600 font-light mt-1">
            Immutable system of record for sealed and ingested evidence
            {resolvedEvidence && (
              <Badge className="ml-3 bg-amber-100 text-amber-800 border border-amber-200">
                Viewing: {resolvedEvidence.display_id}
              </Badge>
            )}
            {notFoundId && (
              <Badge className="ml-3 bg-red-100 text-red-800 border border-red-200">
                Not found: {notFoundId}
              </Badge>
            )}
          </p>
        </div>
      </div>
      <div className="max-w-[1920px] mx-auto px-8 py-8">
        {notFoundId && (
          <NotFoundCard 
            recordId={notFoundId} 
            recordType="Evidence Record"
            onBack={() => {
              setNotFoundId(null);
              setFocusDisplayId('');
              window.history.back();
            }}
          />
        )}
        {!notFoundId && (
          <EvidenceVaultCompliance 
            focusDisplayId={focusDisplayId}
            onFocusResolved={setResolvedEvidence}
            initialTab={initialTab}
          />
        )}
      </div>
    </div>
  );
}