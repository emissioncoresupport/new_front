import React, { useState, useEffect } from 'react';
import { X, Calendar, Database, Settings, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AdvancedEvidenceFilters({ filters, onFilterChange, onClose }) {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleDragStart = (e) => {
    if (e.target.closest('button, input, select, textarea, [role="combobox"]')) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
      <div 
        className="bg-white/90 backdrop-blur-xl w-full max-w-md h-auto max-h-[90vh] shadow-2xl border-2 border-slate-900/15 rounded-2xl p-6 overflow-y-auto pointer-events-auto"
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`
        }}
      >
        {/* Header - Draggable */}
        <div 
          className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200/50 cursor-move"
          onMouseDown={handleDragStart}
        >
          <div className="flex items-center gap-2">
            <GripVertical className="w-4 h-4 text-slate-400" />
            <Settings className="w-5 h-5 text-slate-900" />
            <h3 className="text-lg font-light text-slate-900 tracking-tight">Advanced Filters</h3>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            className="rounded-full hover:bg-slate-200/50 text-slate-500 hover:text-slate-700"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Filters */}
        <div className="space-y-6">
          {/* Ingestion Method */}
          <div className="space-y-2">
            <Label className="text-xs text-slate-600 uppercase tracking-wide font-medium flex items-center gap-2">
              <Database className="w-3.5 h-3.5" />
              Ingestion Method
            </Label>
            <Select
              value={filters.ingestionMethod || 'all'}
              onValueChange={(value) => onFilterChange({ ...filters, ingestionMethod: value === 'all' ? '' : value })}
            >
              <SelectTrigger className="h-10 bg-white border-slate-200">
                <SelectValue placeholder="All Methods" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="FILE_UPLOAD">File Upload</SelectItem>
                <SelectItem value="API_PUSH">API Push</SelectItem>
                <SelectItem value="ERP_SYNC">ERP Sync</SelectItem>
                <SelectItem value="SUPPLIER_PORTAL">Supplier Portal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Source System */}
          <div className="space-y-2">
            <Label className="text-xs text-slate-600 uppercase tracking-wide font-medium">
              Source System
            </Label>
            <Input
              type="text"
              placeholder="e.g., SAP S/4HANA, Manual Upload"
              value={filters.sourceSystem || ''}
              onChange={(e) => onFilterChange({ ...filters, sourceSystem: e.target.value })}
              className="h-10 bg-white border-slate-200"
            />
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <Label className="text-xs text-slate-600 uppercase tracking-wide font-medium flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />
              Date Range
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-500 mb-1">From</Label>
                <Input
                  type="date"
                  value={filters.dateFrom || ''}
                  onChange={(e) => onFilterChange({ ...filters, dateFrom: e.target.value })}
                  className="h-10 bg-white border-slate-200"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-500 mb-1">To</Label>
                <Input
                  type="date"
                  value={filters.dateTo || ''}
                  onChange={(e) => onFilterChange({ ...filters, dateTo: e.target.value })}
                  className="h-10 bg-white border-slate-200"
                />
              </div>
            </div>
          </div>

          {/* Ingested By */}
          <div className="space-y-2">
            <Label className="text-xs text-slate-600 uppercase tracking-wide font-medium">
              Ingested By (Email)
            </Label>
            <Input
              type="email"
              placeholder="e.g., info@emissioncore.io"
              value={filters.ingestedBy || ''}
              onChange={(e) => onFilterChange({ ...filters, ingestedBy: e.target.value })}
              className="h-10 bg-white border-slate-200"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 pt-6 border-t border-slate-200 flex gap-3">
          <Button
            onClick={() => {
              onFilterChange({
                status: filters.status,
                datasetType: filters.datasetType
              });
            }}
            variant="outline"
            className="flex-1 border-2 border-slate-200 hover:bg-slate-50"
          >
            Clear Advanced
          </Button>
          <Button
            onClick={onClose}
            className="flex-1 bg-slate-900 hover:bg-slate-800 text-white"
          >
            Apply Filters
          </Button>
        </div>
      </div>
    </div>
  );
}