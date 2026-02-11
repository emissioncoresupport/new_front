import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, FileText, CheckCircle, Download, ZoomIn, ZoomOut, RotateCw, Maximize2, Move } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { motion, AnimatePresence } from "framer-motion";

export default function CBAMDocumentViewer({ document, open, onClose }) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  if (!document || !open) return null;

  const extractedFields = document.extracted_fields || document.extracted_data || {};
  const fieldCount = Object.keys(extractedFields).length;

  const modalContent = (
    <AnimatePresence>
      {open && (
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0}
        initial={{ opacity: 0, x: 300 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 300 }}
        className="fixed top-4 right-4 w-[600px] h-[calc(100vh-2rem)]"
        style={{ zIndex: 999999 }}
      >
        <div className="relative w-full h-full bg-white/20 backdrop-blur-3xl border border-white/30 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col">
        {/* Draggable Header */}
        <div className="px-5 pt-4 pb-3 border-b border-white/20 bg-white/10 backdrop-blur-2xl cursor-move flex items-center justify-between" onPointerDown={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#86b027]/20 to-[#86b027]/10 backdrop-blur-md border border-white/40 flex items-center justify-center shadow-sm">
              <FileText className="w-4.5 h-4.5 text-[#86b027]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">{document.file_name || document.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-[10px] border-slate-300/60 h-5 px-1.5 bg-white/40">
                  {document.file_type || 'PDF'}
                </Badge>
                <Badge className="text-[10px] bg-[#86b027] text-white border-0 h-5 px-1.5">
                  <CheckCircle className="w-2.5 h-2.5 mr-1" />
                  {fieldCount} Fields
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2 py-1 bg-white/40 rounded-lg border border-white/30">
              <Move className="w-3 h-3 text-slate-500" />
              <span className="text-[10px] text-slate-600 font-medium">Drag to move</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600 rounded-lg"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="px-5 py-2.5 border-b border-white/20 bg-white/10 backdrop-blur-xl flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-1 bg-white/50 backdrop-blur-sm rounded-lg p-1 border border-white/40">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoom(Math.max(50, zoom - 10))}
              className="h-7 w-7 p-0 hover:bg-white/60"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </Button>
            <span className="text-xs font-semibold text-slate-700 px-2.5 min-w-[50px] text-center">{zoom}%</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoom(Math.min(200, zoom + 10))}
              className="h-7 w-7 p-0 hover:bg-white/60"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </Button>
            <Separator orientation="vertical" className="h-5 mx-1 bg-slate-300/50" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoom(100)}
              className="h-7 px-2.5 text-xs hover:bg-white/60"
            >
              100%
            </Button>
            <Separator orientation="vertical" className="h-5 mx-1 bg-slate-300/50" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRotation((rotation + 90) % 360)}
              className="h-7 w-7 p-0 hover:bg-white/60"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="flex items-center gap-1.5">
            {document.file_url && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(document.file_url, '_blank')}
                  className="h-7 px-3 text-xs bg-white/60 border-white/40 hover:bg-white/80"
                >
                  <Maximize2 className="w-3 h-3 mr-1.5" />
                  Open Full
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const link = window.document.createElement('a');
                    link.href = document.file_url;
                    link.download = document.file_name || 'document';
                    link.click();
                  }}
                  className="h-7 px-3 text-xs bg-white/60 border-white/40 hover:bg-white/80"
                >
                  <Download className="w-3 h-3 mr-1.5" />
                  Download
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 overflow-hidden pointer-events-auto">
          {/* PDF Preview - Fixed to prevent auto-download */}
          <div className="flex-1 overflow-hidden bg-gradient-to-br from-slate-100/50 to-slate-50/50 backdrop-blur-sm">
            {document.file_url ? (
              <div className="h-full w-full p-4">
                <iframe
                  src={`https://docs.google.com/viewer?url=${encodeURIComponent(document.file_url)}&embedded=true`}
                  className="w-full h-full rounded-xl shadow-lg border border-white/40"
                  style={{ 
                    transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                    transformOrigin: 'top left',
                    transition: 'transform 0.2s ease'
                  }}
                  title="Document Preview"
                />
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-center text-slate-500 p-8">
                <div>
                  <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <p className="text-sm font-medium">Preview not available</p>
                  <p className="text-xs text-slate-400 mt-1">File format may not support inline preview</p>
                </div>
              </div>
            )}
          </div>

          {/* Extracted Data Sidebar */}
          <div className="w-full border-t border-white/20 bg-white/10 backdrop-blur-2xl flex flex-col pointer-events-auto max-h-[200px]">
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="text-xs font-semibold text-slate-900 mb-2.5">Extracted Data</h3>
                  <div className="space-y-2">
                    {Object.entries(extractedFields).map(([key, value]) => {
                      if (!value || value === 'N/A' || value === '') return null;
                      return (
                        <div key={key} className="bg-white/60 backdrop-blur-md rounded-lg border border-white/40 p-2.5 shadow-sm">
                          <p className="text-[10px] text-slate-600 mb-0.5 uppercase tracking-wide font-medium">
                            {key.replace(/_/g, ' ')}
                          </p>
                          <p className="text-xs font-semibold text-slate-900">
                            {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                          </p>
                        </div>
                      );
                    })}

                    {fieldCount === 0 && (
                      <div className="text-center py-12 text-slate-400">
                        <p className="text-xs">No data extracted</p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator className="bg-slate-200/60" />

                {/* Document Metadata */}
                <div>
                  <h3 className="text-xs font-semibold text-slate-900 mb-2.5">Document Info</h3>
                  <div className="space-y-2 text-xs">
                    {(document.size || document.file_size_bytes) && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">File Size</span>
                        <span className="font-medium text-slate-900">
                          {((document.size || document.file_size_bytes) / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                    )}
                    {document.created_date && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Upload Date</span>
                        <span className="font-medium text-slate-900">
                          {new Date(document.created_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {document.extraction_confidence && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Confidence</span>
                        <Badge className="bg-[#86b027] text-white border-0 text-xs h-5">
                          {document.extraction_confidence}%
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
        </div>
      </motion.div>
      )}
    </AnimatePresence>
  );

  return typeof window !== 'undefined' ? ReactDOM.createPortal(modalContent, window.document.body) : null;
}