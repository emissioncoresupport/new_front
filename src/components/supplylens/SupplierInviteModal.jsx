import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import { Mail, Copy, CheckCircle2, Loader2 } from 'lucide-react';

export default function SupplierInviteModal({ isOpen, onClose }) {
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [inviteLink, setInviteLink] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  const handleSendInvite = async () => {
    setSending(true);
    setError(null);

    try {
      const res = await base44.functions.invoke('createSupplierInvite', {
        supplier_email: email,
        tenant_id: 'default'
      });

      if (res.data.success) {
        setInviteLink(res.data.invite_link);
        setStep('link');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setStep('email');
    setEmail('');
    setInviteLink(null);
    setCopied(false);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md bg-white/95 backdrop-blur-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-light">Invite Supplier</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {step === 'email' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <Card className="border border-slate-200/50 bg-slate-50/50 p-4">
                <label className="text-xs font-medium text-slate-700 uppercase tracking-widest">Supplier Email</label>
                <Input
                  type="email"
                  placeholder="supplier@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2"
                />
              </Card>

              {error && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <Button onClick={handleClose} variant="outline" className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleSendInvite}
                  disabled={!email || sending}
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-lg"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mail className="w-4 h-4 mr-2" />}
                  Send Invite
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'link' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <p className="text-sm text-slate-900">Invite sent to {email}</p>
              </div>

              <Card className="border border-slate-200/50 bg-white p-4 space-y-2">
                <label className="text-xs font-medium text-slate-700 uppercase tracking-widest">Share Link</label>
                <div className="bg-slate-50 border border-slate-200 rounded p-3 flex items-center justify-between gap-2">
                  <code className="text-xs text-slate-700 font-mono truncate">{inviteLink}</code>
                  <Button
                    onClick={handleCopy}
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-slate-600 hover:bg-slate-100"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
                {copied && <p className="text-xs text-emerald-600 text-center">✓ Copied</p>}
              </Card>

              <p className="text-xs text-slate-600 text-center">Share this link with the supplier or send it manually in email.</p>

              <Button
                onClick={handleClose}
                className="w-full bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-lg"
              >
                Done
              </Button>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}