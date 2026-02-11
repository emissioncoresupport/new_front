import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, AlertCircle, Clock, GripVertical, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

export default function IntegrationHealthModal({ open, onClose }) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const modalRef = React.useRef(null);

  const { data: connectors = [] } = useQuery({
    queryKey: ['integration-connectors'],
    queryFn: async () => {
      const { demoStore } = await import('@/components/supplylens/DemoDataStore');
      return demoStore.getIntegrationConnectors();
    }
  });

  const handleMouseDown = (e) => {
    if (e.target.closest('button, a, input')) return;
    setIsDragging(true);
    const modal = modalRef.current;
    const rect = modal.getBoundingClientRect();
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  React.useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging && modalRef.current) {
        setPosition({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
      }
    };

    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const healthyCount = connectors.filter(c => c.status === 'OK').length;
  const degradedCount = connectors.filter(c => c.status === 'DEGRADED').length;
  const overallHealth = connectors.length > 0 ? Math.round((healthyCount / connectors.length) * 100) : 100;

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
      <div 
        ref={modalRef}
        onMouseDown={handleMouseDown}
        className="fixed w-[640px] bg-black/60 backdrop-blur-2xl border border-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.4)] overflow-hidden rounded-2xl pointer-events-auto flex flex-col"
        style={{
          top: position.y ? `${position.y}px` : '50%',
          left: position.x ? `${position.x}px` : '50%',
          transform: !position.x && !position.y ? 'translate(-50%, -50%)' : 'none',
          cursor: isDragging ? 'grabbing' : 'grab',
          maxHeight: '80vh',
        }}
      >
        <div className="sticky top-0 bg-black/50 backdrop-blur-xl border-b border-white/5 z-10">
          <div className="flex justify-center py-2 cursor-grab active:cursor-grabbing">
            <GripVertical className="w-5 h-5 text-white/20" />
          </div>
          <div className="px-6 py-3 flex items-center justify-between">
            <h2 className="text-lg font-light text-white">Integration Health Status</h2>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all">
              <X className="w-5 h-5 text-white/60" />
            </button>
          </div>
        </div>
        
        <div className="space-y-4 p-6 overflow-y-auto" style={{scrollbarColor: 'rgba(255, 255, 255, 0.1) transparent'}}>
          {/* Overall Health */}
          <Card className="bg-white/5 border border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/60 uppercase tracking-wider mb-1">Overall Health</p>
                  <p className="text-3xl font-light text-white">{overallHealth}%</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-white/70">{healthyCount} Healthy</p>
                  <p className="text-xs text-white/50">{degradedCount} Degraded</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Connector List */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-white/90 mb-3">Data Source Connectors</p>
            {connectors.map((connector) => (
              <Card key={connector.id} className={`border ${connector.status === 'OK' ? 'border-white/20 bg-white/5' : 'border-white/15 bg-white/3'}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {connector.status === 'OK' ? (
                        <CheckCircle2 className="w-5 h-5 text-white/70" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-white/50" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-white/90">{connector.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="w-3 h-3 text-white/40" />
                          <p className="text-xs text-white/60">
                            Last sync: {new Date(connector.last_sync).toLocaleString('en-GB', { 
                              timeZone: 'Europe/Amsterdam', 
                              month: 'short', 
                              day: 'numeric', 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                    <Badge className={connector.status === 'OK' ? 'bg-white/20 text-white/90 border border-white/30' : 'bg-white/10 text-white/70 border border-white/20'}>
                      {connector.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}