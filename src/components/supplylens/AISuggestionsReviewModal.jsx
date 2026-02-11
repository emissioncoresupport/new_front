import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Sparkles, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function AISuggestionsReviewModal({ 
  open, 
  onClose, 
  suggestions = [], 
  onApprove, 
  onReject,
  entityType 
}) {
  const [activeDecision, setActiveDecision] = useState(null);
  const [reasonCode, setReasonCode] = useState('');
  const [comment, setComment] = useState('');

  const handleApprove = async (suggestion) => {
    setActiveDecision({ suggestion, action: 'APPROVE' });
  };

  const handleReject = async (suggestion) => {
    setActiveDecision({ suggestion, action: 'REJECT' });
  };

  const submitDecision = async () => {
    if (!reasonCode) {
      toast.error('Reason code is required');
      return;
    }

    if (activeDecision.action === 'REJECT' && !comment) {
      toast.error('Comment is required for rejection');
      return;
    }

    if (activeDecision.action === 'APPROVE') {
      await onApprove(activeDecision.suggestion, reasonCode, comment);
    } else {
      await onReject(activeDecision.suggestion, reasonCode, comment);
    }

    setActiveDecision(null);
    setReasonCode('');
    setComment('');
  };

  const pendingSuggestions = suggestions.filter(s => s.status === 'PENDING');

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col bg-white/80 backdrop-blur-xl border-2 border-slate-200/60">
        <DialogHeader className="border-b border-slate-200/60 pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#86b027]" />
            <DialogTitle className="text-lg font-light">AI Mapping Suggestions</DialogTitle>
            <Badge variant="outline" className="ml-auto">{pendingSuggestions.length} pending</Badge>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 p-6">
          {pendingSuggestions.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Sparkles className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p className="text-sm">No pending AI suggestions</p>
              <p className="text-xs text-slate-400 mt-2">All suggestions have been reviewed</p>
            </div>
          ) : (
            pendingSuggestions.map((suggestion) => (
              <Card key={suggestion.suggestion_id} className="border-2 border-slate-200 bg-white/90 backdrop-blur-sm hover:shadow-lg transition-all">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">{suggestion.mapping_type}</Badge>
                        <Badge className={
                          suggestion.confidence_score >= 90 ? 'bg-green-100 text-green-800' :
                          suggestion.confidence_score >= 70 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }>
                          {suggestion.confidence_score}% confidence
                        </Badge>
                      </div>
                      <p className="text-sm font-semibold text-slate-900 mb-1">
                        {suggestion.source_entity_name || 'Unknown'} → {suggestion.target_entity_name}
                      </p>
                      <p className="text-xs text-slate-600 mb-2">
                        Target ID: <span className="font-mono">{suggestion.target_entity_id}</span>
                      </p>
                      <div className="bg-slate-50 rounded p-2 mb-2">
                        <p className="text-xs text-slate-700">{suggestion.reasoning}</p>
                      </div>
                      {suggestion.matched_attributes?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {suggestion.matched_attributes.map((attr, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {attr}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 pt-3 border-t border-slate-200">
                    <Button 
                      size="sm" 
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-2"
                      onClick={() => handleApprove(suggestion)}
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="flex-1 border-red-300 text-red-700 hover:bg-red-50 gap-2"
                      onClick={() => handleReject(suggestion)}
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Decision Confirmation Dialog */}
        <Dialog open={!!activeDecision} onOpenChange={() => setActiveDecision(null)}>
          <DialogContent className="max-w-md bg-white">
            <DialogHeader>
              <DialogTitle>
                {activeDecision?.action === 'APPROVE' ? 'Approve Mapping' : 'Reject Mapping'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 p-4">
              <div>
                <Label>Reason Code *</Label>
                <Input
                  value={reasonCode}
                  onChange={(e) => setReasonCode(e.target.value)}
                  placeholder={activeDecision?.action === 'APPROVE' ? 'e.g., EXACT_MATCH, FUZZY_MATCH' : 'e.g., INCORRECT_MATCH, DATA_QUALITY'}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Comment {activeDecision?.action === 'REJECT' && '*'}</Label>
                <Input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Additional context (required for rejection)"
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setActiveDecision(null)}>
                  Cancel
                </Button>
                <Button 
                  className={`flex-1 ${activeDecision?.action === 'APPROVE' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} text-white`}
                  onClick={submitDecision}
                >
                  Confirm {activeDecision?.action === 'APPROVE' ? 'Approval' : 'Rejection'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}