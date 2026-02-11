import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Settings, CheckCircle2, AlertCircle, Link as LinkIcon, Loader2 } from "lucide-react";
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function CBAMIntegrationWizard({ onClose }) {
  const [position, setPosition] = useState({ x: window.innerWidth / 2 - 300, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const { data: registries = [] } = useQuery({
    queryKey: ['cbam-clients'],
    queryFn: () => base44.entities.CBAMClient.list()
  });

  const handleMouseDown = (e) => {
    if (e.target.closest('.wizard-content')) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y
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
  }, [isDragging, dragOffset]);

  const integrations = [
    {
      name: 'National CBAM Registry',
      status: registries.length > 0 ? 'connected' : 'not_connected',
      description: 'Connect to your national registry',
      icon: '🏛️'
    },
    {
      name: 'ETS Market Data',
      status: 'connected',
      description: 'Real-time EU ETS pricing',
      icon: '💹'
    },
    {
      name: 'EU Customs Hub',
      status: 'ready',
      description: 'Import declarations',
      icon: '🚢'
    },
    {
      name: 'SupplyLens',
      status: 'connected',
      description: 'Supplier emissions data',
      icon: '🔗'
    }
  ];

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100]"
        onClick={onClose}
      />

      {/* Draggable Wizard */}
      <div
        className="fixed z-[101] select-none"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: '600px'
        }}
        onMouseDown={handleMouseDown}
      >
        <div className="relative bg-gradient-to-br from-white/90 via-white/80 to-white/70 backdrop-blur-3xl rounded-2xl border border-white/60 shadow-[0_20px_60px_rgba(0,0,0,0.3)] overflow-hidden cursor-move">
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-transparent to-transparent pointer-events-none" />
          
          {/* Header */}
          <div className="relative border-b border-white/40 px-6 py-4 bg-gradient-to-r from-slate-50/50 to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-900/10 to-slate-900/5 backdrop-blur-md flex items-center justify-center">
                  <LinkIcon className="w-5 h-5 text-slate-700" />
                </div>
                <div>
                  <h3 className="text-base font-medium text-slate-900">Integration Status</h3>
                  <p className="text-xs text-slate-500 mt-0.5">External data connections</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg hover:bg-slate-100/50 transition-colors flex items-center justify-center"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="relative wizard-content p-6 space-y-3 max-h-[500px] overflow-y-auto">
            {integrations.map((integration, idx) => (
              <div
                key={idx}
                className="group relative bg-white/60 backdrop-blur-md hover:bg-white/80 rounded-xl border border-white/60 p-4 transition-all hover:shadow-lg cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-2xl">{integration.icon}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-900">{integration.name}</p>
                        {integration.status === 'connected' && (
                          <Badge className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Connected
                          </Badge>
                        )}
                        {integration.status === 'ready' && (
                          <Badge className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5">
                            Ready
                          </Badge>
                        )}
                        {integration.status === 'not_connected' && (
                          <Badge className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Setup Required
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{integration.description}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="relative border-t border-white/40 px-6 py-4 bg-gradient-to-r from-slate-50/50 to-transparent">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">
                {integrations.filter(i => i.status === 'connected').length}/{integrations.length} integrations active
              </p>
              <Button
                size="sm"
                onClick={onClose}
                className="bg-slate-900 hover:bg-slate-800 text-white h-8 px-4 text-xs"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}