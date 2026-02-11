import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  CheckCircle2, Clock, AlertCircle, Building2, TrendingUp, 
  FileText, Link2, X 
} from "lucide-react";

export default function CBAMIntegrationStatus({ onClose }) {
  const [position, setPosition] = useState({ x: window.innerWidth / 2 - 300, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  // Check ERP connections
  const { data: erpConnections = [] } = useQuery({
    queryKey: ['erp-connections'],
    queryFn: () => base44.entities.ERPConnection.filter({ status: 'active' })
  });

  // Check CBAM Clients (for registry connections)
  const { data: cbamClients = [] } = useQuery({
    queryKey: ['cbam-clients'],
    queryFn: () => base44.entities.CBAMClient.filter({ sync_enabled: true })
  });



  // Check suppliers (SupplyLens)
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers-count'],
    queryFn: async () => {
      const all = await base44.entities.Supplier.list('-updated_date', 10);
      return all;
    }
  });

  // Check if price history exists (ETS Market Data)
  const { data: priceHistory = [] } = useQuery({
    queryKey: ['cbam-price-history'],
    queryFn: () => base44.entities.CBAMPriceHistory.list('-date', 5)
  });

  const handleMouseDown = (e) => {
    if (e.target.closest('.no-drag')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  const integrations = [
    {
      id: 'cbam-registry',
      name: 'National CBAM Registry',
      description: 'Connect to your national registry',
      icon: Building2,
      status: cbamClients.length > 0 ? 'connected' : 'disconnected'
    },
    {
      id: 'ets-market',
      name: 'ETS Market Data',
      description: 'Real-time EU ETS pricing',
      icon: TrendingUp,
      status: priceHistory.length > 0 ? 'connected' : 'ready'
    },
    {
      id: 'customs-hub',
      name: 'EU Customs Hub',
      description: 'Import declarations',
      icon: FileText,
      status: erpConnections.length > 0 ? 'connected' : 'ready'
    },
    {
      id: 'supplylens',
      name: 'SupplyLens',
      description: 'Supplier emissions data',
      icon: Link2,
      status: suppliers.length > 0 ? 'connected' : 'disconnected'
    }
  ];

  const connectedCount = integrations.filter(i => i.status === 'connected').length;
  const totalCount = integrations.length;

  const getDetails = (integration) => {
    switch (integration.id) {
      case 'cbam-registry':
        return cbamClients.length > 0 
          ? `${cbamClients.length} account${cbamClients.length !== 1 ? 's' : ''} linked`
          : 'No registry configured';
      case 'ets-market':
        return priceHistory.length > 0 
          ? `Last update: ${new Date(priceHistory[0]?.date || Date.now()).toLocaleDateString()}`
          : 'Market data available';
      case 'customs-hub':
        return erpConnections.length > 0 
          ? `${erpConnections.length} ERP system${erpConnections.length !== 1 ? 's' : ''}`
          : 'Ready for configuration';
      case 'supplylens':
        return suppliers.length > 0 
          ? `${suppliers.length} supplier${suppliers.length !== 1 ? 's' : ''} tracked`
          : 'No suppliers configured';
      default:
        return '';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Draggable Modal */}
      <div
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
        onMouseDown={handleMouseDown}
        className="relative bg-white/70 backdrop-blur-3xl rounded-3xl border border-white/50 shadow-[0_32px_64px_rgba(0,0,0,0.12)] w-[580px] select-none"
      >
        {/* Drag Handle */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1 bg-slate-300/50 rounded-full" />

        {/* Header */}
        <div className="flex items-center justify-between px-7 pt-7 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-900/5 backdrop-blur-sm flex items-center justify-center">
              <Link2 className="w-5 h-5 text-slate-700" />
            </div>
            <div>
              <h2 className="text-xl font-light text-slate-900">Integration Status</h2>
              <p className="text-xs text-slate-500 font-light">External data connections</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="no-drag w-8 h-8 rounded-full hover:bg-slate-900/5 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="px-7 pb-6 space-y-2.5 max-h-[520px] overflow-y-auto">
          {integrations.map((integration) => {
            const IntegrationIcon = integration.icon;
            const isConnected = integration.status === 'connected';
            const isReady = integration.status === 'ready';
            const details = getDetails(integration);
            
            return (
              <div
                key={integration.id}
                className="bg-white/50 backdrop-blur-xl rounded-2xl border border-white/60 p-4 hover:bg-white/70 hover:shadow-[0_4px_24px_rgba(0,0,0,0.08)] transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-900/5 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                    <IntegrationIcon className="w-5 h-5 text-slate-700" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h3 className="font-medium text-slate-900 text-sm">{integration.name}</h3>
                      {isConnected ? (
                        <Badge className="bg-emerald-50/80 text-emerald-700 border border-emerald-200/50 text-[11px] font-light px-2 py-0.5">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Connected
                        </Badge>
                      ) : isReady ? (
                        <Badge className="bg-blue-50/80 text-blue-700 border border-blue-200/50 text-[11px] font-light px-2 py-0.5">
                          <Clock className="w-3 h-3 mr-1" />
                          Ready
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-xs text-slate-500 font-light mb-0.5">{integration.description}</p>
                    <p className="text-[11px] text-slate-400 font-light">{details}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-7 py-5 border-t border-slate-200/30">
          <p className="text-xs text-slate-500 font-light">
            <span className="font-medium text-slate-900">{connectedCount}/{totalCount}</span> integrations active
          </p>
          <Button 
            onClick={onClose}
            className="no-drag bg-slate-900 hover:bg-slate-800 text-white h-9 px-7 rounded-xl text-sm font-light shadow-sm"
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}