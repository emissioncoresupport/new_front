import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

export default function SupplierPortal() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [step, setStep] = useState('loading');
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    if (!token) {
      setStep('invalid');
      return;
    }

    try {
      // Token validation happens server-side during submission
      setStep('form');
    } catch (err) {
      setStep('invalid');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await base44.functions.invoke('supplierPortalSubmission', {
        invite_token: token,
        questionnaire_data: formData
      });

      if (res.data.status === 'SUCCESS') {
        setStep('success');
      } else {
        setError(res.data.error || 'Submission failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // LOADING
  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#86b027] animate-spin" />
      </div>
    );
  }

  // INVALID TOKEN
  if (step === 'invalid') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-md p-8 text-center border-2 border-red-200/50 bg-red-50/80 backdrop-blur-sm">
          <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h1 className="text-lg font-light text-slate-900">Invalid or Expired Invite</h1>
          <p className="text-sm text-slate-600 mt-2">The invite link you used is no longer valid. Contact your account manager.</p>
        </Card>
      </div>
    );
  }

  // SUCCESS
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className="max-w-md p-8 text-center border-2 border-emerald-200/50 bg-emerald-50/80 backdrop-blur-sm">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
            <h1 className="text-lg font-light text-slate-900">Profile Submitted</h1>
            <p className="text-sm text-slate-600 mt-2">Your supplier profile has been received. You'll hear from us within 2-3 business days.</p>
            <Button className="w-full mt-6 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-lg">
              Return Home
            </Button>
          </Card>
        </motion.div>
      </div>
    );
  }

  // FORM
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-8">
      <div className="max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-light text-slate-900">Supplier Profile</h1>
          <p className="text-sm text-slate-500 mt-2">Complete your information to get onboarded</p>
        </motion.div>

        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          <Card className="border border-slate-200/50 bg-white/60 backdrop-blur-sm p-6 space-y-4">
            {/* Company Info */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                placeholder="Legal company name"
                value={formData.legal_name || ''}
                onChange={(e) => setFormData({...formData, legal_name: e.target.value})}
                required
              />
              <Input
                placeholder="Trading name (optional)"
                value={formData.trade_name || ''}
                onChange={(e) => setFormData({...formData, trade_name: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                placeholder="Country (ISO code)"
                value={formData.country || ''}
                onChange={(e) => setFormData({...formData, country: e.target.value})}
                required
              />
              <Input
                placeholder="City"
                value={formData.city || ''}
                onChange={(e) => setFormData({...formData, city: e.target.value})}
              />
            </div>

            <Input
              placeholder="Address"
              value={formData.address || ''}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
            />

            {/* Contact Info */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="email"
                placeholder="Email"
                value={formData.email || ''}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
              <Input
                type="tel"
                placeholder="Phone"
                value={formData.phone || ''}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
              />
            </div>

            {/* Business Info */}
            <Input
              placeholder="Website"
              value={formData.website || ''}
              onChange={(e) => setFormData({...formData, website: e.target.value})}
            />

            <Textarea
              placeholder="Business description / capabilities"
              value={formData.capabilities || ''}
              onChange={(e) => setFormData({...formData, capabilities: e.target.value})}
              className="h-24"
            />

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </Card>

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-gradient-to-r from-[#86b027] to-[#7aa522] hover:from-[#7aa522] hover:to-[#6b9720] text-white rounded-lg font-medium"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Submit Profile
            </Button>
          </div>
        </motion.form>
      </div>
    </div>
  );
}