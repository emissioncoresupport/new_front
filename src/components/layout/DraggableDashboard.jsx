import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactDOM from 'react-dom';
import { Button } from "@/components/ui/button";
import { X, Move } from "lucide-react";
import { cn } from "@/lib/utils";

// Global z-index management for multiple modals
const modalZIndexes = new Map();
let highestZIndex = 999999;

export default function DraggableDashboard({ 
  children, 
  open, 
  onClose, 
  title,
  icon: Icon,
  width = '600px',
  height = 'calc(100vh - 2rem)',
  defaultPosition = 'right',
  className = ''
}) {

  const modalId = React.useRef(`modal-${Date.now()}-${Math.random()}`).current;
  const [zIndex, setZIndex] = React.useState(highestZIndex);

  React.useEffect(() => {
    if (open) {
      highestZIndex++;
      modalZIndexes.set(modalId, highestZIndex);
      setZIndex(highestZIndex);
    }
    return () => {
      if (!open) {
        modalZIndexes.delete(modalId);
      }
    };
  }, [open, modalId]);

  const bringToFront = () => {
    highestZIndex++;
    modalZIndexes.set(modalId, highestZIndex);
    setZIndex(highestZIndex);
  };

  if (!open) return null;

  const positions = {
    right: { top: 4, right: 4, left: 'auto' },
    left: { top: 4, left: 4, right: 'auto' },
    center: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
  };

  const modalContent = (
    <AnimatePresence>
      {open && (
        <motion.div
                drag
                dragMomentum={false}
                dragElastic={0}
                onMouseDown={bringToFront}
                onTouchStart={bringToFront}
                initial={{ opacity: 0, scale: 0.95, ...(typeof defaultPosition === 'string' && defaultPosition === 'center' ? { x: '-50%', y: '-50%' } : {}) }}
                animate={{ opacity: 1, scale: 1, ...(typeof defaultPosition === 'string' && defaultPosition === 'center' ? { x: '-50%', y: '-50%' } : {}) }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  "fixed",
                  className
                )}
                style={{ 
                  zIndex: zIndex,
                  width,
                  height,
                  ...(typeof defaultPosition === 'string' ? positions[defaultPosition] : defaultPosition)
                }}
              >
            <div className="relative w-full h-full bg-white/40 backdrop-blur-3xl border border-white/30 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col">
            {/* Draggable Header */}
            <div className="px-4 py-3 border-b border-white/20 bg-white/10 backdrop-blur-xl cursor-move flex items-center justify-between">
              <div className="flex items-center gap-3">
                {Icon && (
                  <div className="w-8 h-8 rounded-lg bg-white/60 backdrop-blur-md border border-white/40 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-[#86b027]" />
                  </div>
                )}
                {title && (
                  <h3 className="text-base font-semibold text-slate-900">{title}</h3>
                )}
              </div>
              
              <div className="flex items-center gap-2 pointer-events-auto">
                <div className="flex items-center gap-1 px-2 text-slate-400">
                  <Move className="w-3 h-3" />
                  <Move className="w-3 h-3 -ml-2" />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onClose();
                  }}
                  className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600 rounded"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto pointer-events-auto">
              {children}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return typeof window !== 'undefined' ? ReactDOM.createPortal(modalContent, window.document.body) : null;
}