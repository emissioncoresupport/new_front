import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Info, GripVertical, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HowMethodsWorkModal({ isOpen, onClose }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragStart = useRef({ x: 0, y: 0 });

  const handleHeaderDown = (e) => {
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    
    const handleMove = (moveEvent) => {
      setPosition({
        x: moveEvent.clientX - dragStart.current.x,
        y: moveEvent.clientY - dragStart.current.y
      });
    };

    const handleUp = () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        left: '50%',
        top: '50%',
        marginLeft: '-280px',
        marginTop: '-240px'
      }}
      className="fixed z-50 w-[560px]"
    >
      <div className="bg-gradient-to-br from-white/90 to-slate-50/70 backdrop-blur-xl border-2 border-slate-900/15 shadow-2xl rounded-2xl overflow-hidden">
        <div 
          onMouseDown={handleHeaderDown}
          className="border-b border-white/20 bg-gradient-to-r from-white/50 to-transparent pb-2 px-5 pt-3 cursor-grab active:cursor-grabbing flex flex-col items-center gap-2 hover:bg-white/60 transition-colors"
        >
          <div className="w-8 h-1 rounded-full bg-slate-400/40"></div>
          <div className="flex items-center justify-between w-full pb-1">
            <div className="flex items-center gap-2.5 text-slate-900 font-light text-base tracking-tight">
              <Info className="w-4 h-4 text-slate-700" />
              Binding Modes
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-5 w-5 hover:bg-white/40">
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
        <div className="space-y-2.5 mt-4 px-5 pb-5">
          <div className="group p-4 bg-white rounded-lg border border-slate-200/50 hover:border-slate-300 transition-all duration-200 hover:shadow-lg">
            <h4 className="font-medium text-slate-900 mb-1.5 flex items-center gap-2 text-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-700"></div>
              Bind Existing
            </h4>
            <p className="text-slate-700 font-normal leading-relaxed text-xs">
              Link evidence to an existing entity (Supplier, Product/SKU, Product Family, or Legal Entity). Most common for established operations.
            </p>
          </div>

          <div className="group p-4 bg-white rounded-lg border border-slate-200/50 hover:border-slate-300 transition-all duration-200 hover:shadow-lg">
            <h4 className="font-medium text-slate-900 mb-1.5 flex items-center gap-2 text-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-700"></div>
              Create New
            </h4>
            <p className="text-slate-700 font-normal leading-relaxed text-xs">
              Create a new entity inline during ingestion. Wizard prompts for required fields, then automatically binds evidence.
            </p>
          </div>

          <div className="group p-4 bg-amber-50 rounded-lg border border-amber-200/60 hover:border-amber-300 transition-all duration-200 hover:shadow-lg">
            <h4 className="font-medium text-amber-900 mb-1.5 flex items-center gap-2 text-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-700"></div>
              Defer Binding
            </h4>
            <p className="text-amber-800 font-normal leading-relaxed text-xs">
              Ingest without immediate binding. Provide reference (SKU, supplier name) for later reconciliation.
            </p>
            <p className="mt-1.5 text-amber-900 font-medium text-xs">
              ⚠ Must be bound and approved before compliance use.
            </p>
          </div>

          <div className="group p-4 bg-white rounded-lg border border-slate-200/50 hover:border-slate-300 transition-all duration-200 hover:shadow-lg">
            <h4 className="font-medium text-slate-900 mb-1.5 flex items-center gap-2 text-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-700"></div>
              No Target Required
            </h4>
            <p className="text-slate-700 font-normal leading-relaxed text-xs">
              Some evidence (e.g., company-wide certifications) proceed without entity binding. Direct submission without scope selection.
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}