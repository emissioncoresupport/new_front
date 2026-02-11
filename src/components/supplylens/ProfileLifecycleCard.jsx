import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/dialog';
import { CheckCircle2, Clock, Lock, AlertTriangle, ArrowRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';

/**
 * PROFILE LIFECYCLE CARD
 * 
 * Shows profile status (DRAFT | ACTIVE | EXPIRED)
 * Allows transition DRAFT → ACTIVE (irreversible)
 * Blocks ingestion if not ACTIVE
 */

export default function ProfileLifecycleCard({ profile, onUpdate }) {
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState(null);

  const handleActivate = async () => {
    setActivating(true);
    setError(null);
    try {
      const response = await base44.functions.invoke('activateIngestionProfile', {
        profile_id: profile.profile_id,
        command_id: `ACTIVATE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      });

      if (response.data.success) {
        onUpdate({ ...profile, status: 'ACTIVE', activated_at: response.data.activated_at });
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setActivating(false);
    }
  };

  const statusConfig = {
    DRAFT: {
      badge: 'bg-yellow-100 text-yellow-800',
      icon: Clock,
      label: 'Draft',
      description: 'Profile not yet active. Configure and activate to begin ingestion.',
      action: 'activate'
    },
    ACTIVE: {
      badge: 'bg-green-100 text-green-800',
      icon: CheckCircle2,
      label: 'Active',
      description: 'Profile is active and immutable. Ingestion enabled under fixed constraints.',
      action: null
    },
    EXPIRED: {
      badge: 'bg-slate-100 text-slate-800',
      icon: Lock,
      label: 'Expired',
      description: 'Profile has expired. No ingestion allowed.',
      action: null
    }
  };

  const config = statusConfig[profile.status];
  const StatusIcon = config.icon;

  return (
    <Card className="border-2 border-slate-200 p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-slate-50">
            <StatusIcon className="w-5 h-5 text-slate-700" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Ingestion Profile Status</p>
            <Badge className={`${config.badge} text-xs mt-1`}>{config.label}</Badge>
          </div>
        </div>

        {profile.status === 'ACTIVE' && (
          <div className="flex items-center gap-1 text-xs text-slate-600">
            <Lock className="w-4 h-4" />
            <span>Immutable</span>
          </div>
        )}
      </div>

      <p className="text-sm text-slate-700 mb-4">{config.description}</p>

      {/* Profile Details */}
      <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
        <div className="p-3 rounded-lg bg-slate-50">
          <p className="text-slate-600 uppercase tracking-wide mb-1">Entity Type</p>
          <p className="text-slate-900 font-semibold">{profile.entity_type}</p>
        </div>
        <div className="p-3 rounded-lg bg-slate-50">
          <p className="text-slate-600 uppercase tracking-wide mb-1">Data Domain</p>
          <p className="text-slate-900 font-semibold">{profile.data_domain}</p>
        </div>
        <div className="p-3 rounded-lg bg-slate-50">
          <p className="text-slate-600 uppercase tracking-wide mb-1">Ingestion Path</p>
          <p className="text-slate-900 font-semibold">{profile.ingestion_path}</p>
        </div>
        <div className="p-3 rounded-lg bg-slate-50">
          <p className="text-slate-600 uppercase tracking-wide mb-1">Authority</p>
          <p className={`font-semibold ${profile.authority_type === 'Declarative' ? 'text-yellow-700' : profile.authority_type === 'Supporting' ? 'text-green-700' : 'text-orange-700'}`}>
            {profile.authority_type}
          </p>
        </div>
      </div>

      {/* Timestamps */}
      <div className="text-xs text-slate-600 space-y-1 mb-4 pb-4 border-t border-slate-200 pt-4">
        <div>Created: {new Date(profile.created_at).toLocaleString()}</div>
        {profile.activated_at && (
          <div>Activated: {new Date(profile.activated_at).toLocaleString()}</div>
        )}
      </div>

      {/* Action */}
      {config.action === 'activate' && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button className="w-full bg-slate-900 hover:bg-slate-800">
              <ArrowRight className="w-4 h-4 mr-2" />
              Activate Profile
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Activate Ingestion Profile?</AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <div>
                  <p className="font-semibold text-slate-900 mb-2">⚠️ This action is irreversible:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
                    <li>Profile will become ACTIVE</li>
                    <li>All configuration will be locked (immutable)</li>
                    <li>Ingestion will be enabled under fixed constraints</li>
                    <li>Only status can change (to EXPIRED)</li>
                  </ul>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-3">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleActivate}
                disabled={activating}
                className="bg-slate-900 hover:bg-slate-800"
              >
                {activating ? 'Activating...' : 'Activate & Lock'}
              </AlertDialogAction>
            </div>
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-xs text-red-800">{error}</p>
              </div>
            )}
          </AlertDialogContent>
        </AlertDialog>
      )}

      {config.action === null && (
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
          <p className="text-xs text-slate-600">
            {profile.status === 'ACTIVE' ? (
              <>✓ Ready for ingestion. Profile is locked and immutable.</>
            ) : (
              <>✗ Ingestion disabled. Profile has expired.</>
            )}
          </p>
        </div>
      )}
    </Card>
  );
}