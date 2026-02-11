import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, Trash2, Copy, Download, Terminal } from 'lucide-react';
import { ctaAuditService } from './services/ctaAuditService';
import { toast } from 'sonner';

export default function QAConsole({ isAdmin = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState([]);
  const [expandedLogId, setExpandedLogId] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setLogs(ctaAuditService.getLogs());
    }, 500);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isAdmin) return null;

  if (!isOpen) {
    return null;
  }

  const handleClearLogs = () => {
    ctaAuditService.clearLogs();
    setLogs([]);
    toast.success('Logs cleared');
  };

  const handleExportLogs = () => {
    const data = ctaAuditService.exportLogs();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cta-audit-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Logs exported');
  };

  const handleCopyLog = (log) => {
    navigator.clipboard.writeText(JSON.stringify(log, null, 2));
    toast.success('Log copied');
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 w-96 max-h-[600px] bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 rounded-lg border border-slate-700/50 shadow-2xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="sticky top-0 px-4 py-3 border-b border-slate-700/50 flex items-center justify-between bg-slate-900/95 backdrop-blur">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#86b027]" />
          CTA Audit Console
          <Badge variant="outline" className="text-[10px] bg-slate-800 border-slate-600">
            {logs.length}/50
          </Badge>
        </h2>
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            onClick={handleExportLogs}
            title="Export logs"
          >
            <Download className="w-3 h-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            onClick={handleClearLogs}
            title="Clear logs"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            onClick={() => setIsOpen(false)}
            title="Close"
          >
            ✕
          </Button>
        </div>
      </div>

      {/* Log List */}
      <div className="overflow-y-auto custom-scrollbar flex-1 divide-y divide-slate-700/30">
        {logs.length === 0 ? (
          <div className="p-4 text-center text-slate-500 text-xs">
            No CTA logs yet. Click buttons to capture events.
          </div>
        ) : (
          logs.map((log, idx) => (
            <div key={idx} className="p-3 hover:bg-slate-800/50 transition-colors text-[11px]">
              {/* Summary Row */}
              <div
                className="flex items-center gap-2 cursor-pointer group"
                onClick={() => setExpandedLogId(expandedLogId === idx ? null : idx)}
              >
                <ChevronRight
                  className={`w-3 h-3 text-slate-500 group-hover:text-slate-400 transition-transform ${
                    expandedLogId === idx ? 'rotate-90' : ''
                  }`}
                />
                <Badge className={log.success ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}>
                  {log.success ? '✓' : '✗'}
                </Badge>
                <span className="text-slate-300 font-mono flex-1 truncate">{log.action_name}</span>
                <span className="text-slate-500 text-[10px]">{log.duration_ms}ms</span>
              </div>

              {/* Expanded Details */}
              {expandedLogId === idx && (
                <div className="mt-2 ml-6 space-y-1 pt-2 border-t border-slate-700/30 text-[10px] text-slate-400 font-mono">
                  <div className="flex justify-between">
                    <span>Time:</span>
                    <span className="text-slate-300">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Page:</span>
                    <span className="text-slate-300">{log.page}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>User:</span>
                    <span className="text-slate-300 truncate">{log.user}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Expected:</span>
                    <span className="text-slate-300 truncate">{log.expected_outcome}</span>
                  </div>
                  {log.returned_ids.length > 0 && (
                    <div className="flex justify-between">
                      <span>IDs:</span>
                      <span className="text-[#86b027] font-semibold">{log.returned_ids.join(', ')}</span>
                    </div>
                  )}
                  {log.navigation_target && (
                    <div className="flex justify-between">
                      <span>Nav:</span>
                      <span className="text-[#86b027] truncate">{log.navigation_target}</span>
                    </div>
                  )}
                  {log.error_message && (
                    <div className="flex justify-between text-red-400">
                      <span>Error:</span>
                      <span className="truncate">{log.error_message}</span>
                    </div>
                  )}
                  {Object.keys(log.params).length > 0 && (
                    <div className="mt-1 p-1 bg-slate-800/50 rounded text-slate-300">
                      Params: {JSON.stringify(log.params)}
                    </div>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5 text-slate-500 hover:text-slate-300 mt-1"
                    onClick={() => handleCopyLog(log)}
                    title="Copy log"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-700/50 px-4 py-2 bg-slate-900/95 text-[10px] text-slate-500">
        Success: {logs.filter(l => l.success).length} | Failed: {logs.filter(l => !l.success).length}
      </div>
    </div>
  );
}