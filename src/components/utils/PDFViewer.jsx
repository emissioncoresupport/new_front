import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Download, Maximize2, RotateCw, X } from "lucide-react";

export default function PDFViewer({ fileUrl, fileName, onClose }) {
  const [zoom, setZoom] = useState(100);

  if (!fileUrl) return null;

  // Use Google Docs Viewer for reliable PDF rendering without auto-download
  const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 bg-white/90 backdrop-blur-sm border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoom(Math.max(50, zoom - 10))}
            className="h-8 w-8 p-0"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-xs font-medium text-slate-700 min-w-[50px] text-center">{zoom}%</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoom(Math.min(150, zoom + 10))}
            className="h-8 w-8 p-0"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(fileUrl, '_blank')}
            className="text-xs"
          >
            <Maximize2 className="w-3 h-3 mr-1" />
            Open Full
          </Button>
          <a
            href={fileUrl}
            download={fileName}
            className="inline-flex items-center justify-center h-8 px-3 text-xs font-medium rounded-md border border-slate-200 bg-white hover:bg-slate-50"
          >
            <Download className="w-3 h-3 mr-1" />
            Download
          </a>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* PDF Display */}
      <div className="flex-1 bg-slate-100 overflow-auto">
        <div 
          className="h-full w-full"
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
        >
          <iframe
            src={viewerUrl}
            className="w-full h-full border-0"
            title={fileName || 'Document Preview'}
            style={{ minHeight: '100vh' }}
          />
        </div>
      </div>
    </div>
  );
}