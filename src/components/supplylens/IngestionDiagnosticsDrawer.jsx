import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Copy, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function IngestionDiagnosticsDrawer({ 
  draftId, 
  declaration, 
  draftSnapshot,
  lastCorrelationId,
  visible = false
}) {
  const [open, setOpen] = useState(false);

  if (!visible) return null;
  
  // Extract file metadata from draftSnapshot
  const fileMetadata = draftSnapshot?.attachments?.[0] || null;

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const serverStatus = {
    draft_verified: !!draftSnapshot?.draft?.draft_id,
    files_attached_count: draftSnapshot?.attachments?.length || 0,
    can_seal: draftSnapshot?.can_seal || false
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="text-xs text-slate-500 hover:text-slate-700 underline decoration-dotted">
          Diagnostics (Internal)
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[500px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-sm text-slate-900">Diagnostics (Internal)</SheetTitle>
          <p className="text-xs text-slate-500">Read-only state inspection for debugging (dev/admin only)</p>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Draft ID */}
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-600">Draft ID</p>
                {draftId && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(draftId, 'Draft ID')}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                )}
              </div>
              <code className="text-xs text-slate-900 break-all font-mono">
                {draftId || <span className="text-red-600">null (no draft created)</span>}
              </code>
            </CardContent>
          </Card>

          {/* Declared Scope */}
          <Card>
            <CardContent className="p-3">
              <p className="text-xs font-semibold text-slate-600 mb-1">Declared Scope</p>
              <code className="text-xs text-blue-700 font-mono">
                {declaration?.declared_scope || 'N/A'}
              </code>
            </CardContent>
          </Card>

          {/* Scope Target ID */}
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-600">Scope Target ID</p>
                {declaration?.scope_target_id && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(declaration.scope_target_id, 'Scope Target ID')}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                )}
              </div>
              <code className="text-xs text-purple-700 break-all font-mono">
                {declaration?.scope_target_id || 'null'}
              </code>
              {declaration?.scope_target_name && (
                <p className="text-xs text-slate-500 mt-1">
                  Name: {declaration.scope_target_name}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Correlation ID */}
          {lastCorrelationId && (
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-600">Last Correlation ID</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(lastCorrelationId, 'Correlation ID')}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
                <code className="text-xs text-green-700 break-all font-mono">
                  {lastCorrelationId}
                </code>
              </CardContent>
            </Card>
          )}

          {/* Server Mode */}
          <Card>
            <CardContent className="p-3">
              <p className="text-xs font-semibold text-slate-600 mb-1">Server Mode</p>
              <code className="text-xs text-indigo-700 font-mono">
                {draftSnapshot ? 'REAL' : 'SIMULATION'}
              </code>
            </CardContent>
          </Card>

          {/* Server Status */}
          <Card className="bg-slate-50 border-slate-300">
            <CardContent className="p-3">
              <p className="text-xs font-semibold text-slate-700 mb-2">Server Status</p>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  {serverStatus.draft_verified ? (
                    <CheckCircle2 className="w-3 h-3 text-green-600" />
                  ) : (
                    <AlertCircle className="w-3 h-3 text-red-600" />
                  )}
                  <span className="text-slate-700">
                    Draft verified: <strong>{serverStatus.draft_verified ? 'YES' : 'NO'}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-700">
                    Files attached: <strong>{serverStatus.files_attached_count}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {serverStatus.can_seal ? (
                    <CheckCircle2 className="w-3 h-3 text-green-600" />
                  ) : (
                    <AlertCircle className="w-3 h-3 text-amber-600" />
                  )}
                  <span className="text-slate-700">
                    Ready to seal: <strong>{serverStatus.can_seal ? 'YES' : 'NO'}</strong>
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* File Metadata */}
          {fileMetadata && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-3">
                <p className="text-xs font-semibold text-green-900 mb-2">File Metadata</p>
                <div className="space-y-1 text-xs">
                  {fileMetadata.filename && (
                    <p className="text-green-800">
                      <strong>Filename:</strong> {fileMetadata.filename}
                    </p>
                  )}
                  {fileMetadata.size_bytes && (
                    <p className="text-green-800">
                      <strong>Size:</strong> {(fileMetadata.size_bytes / 1024).toFixed(2)} KB
                    </p>
                  )}
                  {fileMetadata.attachment_id && (
                    <div>
                      <div className="flex items-center justify-between">
                        <p className="text-green-800 font-semibold">File ID:</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(fileMetadata.attachment_id, 'File ID')}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                      <code className="text-xs text-green-900 break-all font-mono">
                        {fileMetadata.attachment_id}
                      </code>
                    </div>
                  )}
                  {fileMetadata.sha256 && (
                    <div>
                      <div className="flex items-center justify-between">
                        <p className="text-green-800 font-semibold">SHA-256:</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(fileMetadata.sha256, 'SHA-256')}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                      <code className="text-xs text-green-900 break-all font-mono">
                        {fileMetadata.sha256}
                      </code>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Attached Files (from server) */}
          {draftSnapshot?.attachments && draftSnapshot.attachments.length > 0 && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-3">
                <p className="text-xs font-semibold text-blue-900 mb-2">
                  Server-Verified Files ({draftSnapshot.attachments.length})
                </p>
                <div className="space-y-2">
                  {draftSnapshot.attachments.map((att, idx) => (
                    <div key={idx} className="p-2 bg-white rounded border border-blue-200">
                      <p className="text-xs font-mono text-slate-900">{att.filename}</p>
                      <p className="text-xs text-slate-600">
                        {(att.size_bytes / 1024).toFixed(2)} KB • {att.content_type}
                      </p>
                      {att.sha256 && (
                        <div className="mt-1">
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-blue-800 font-semibold">SHA-256:</p>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyToClipboard(att.sha256, 'SHA-256')}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                          <code className="text-xs text-blue-900 break-all font-mono">
                            {att.sha256}
                          </code>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}