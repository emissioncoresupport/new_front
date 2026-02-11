import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, CheckCircle2 } from 'lucide-react';

const INTENTS = [
  { value: 'REGULATORY_COMPLIANCE', label: 'Regulatory Compliance' },
  { value: 'SUPPLIER_ONBOARDING', label: 'Supplier Onboarding' },
  { value: 'DATA_QUALITY_IMPROVEMENT', label: 'Data Quality Improvement' },
  { value: 'AUDIT_PREPARATION', label: 'Audit Preparation' },
  { value: 'ROUTINE_UPDATE', label: 'Routine Update' },
  { value: 'INCIDENT_INVESTIGATION', label: 'Incident Investigation' },
  { value: 'CORRECTION_SUPERSEDING', label: 'Correction/Superseding' },
  { value: 'HISTORICAL_BACKFILL', label: 'Historical Backfill' }
];

export default function Contract1IntentStep({ declaration, setDeclaration }) {
  const selectedIntent = INTENTS.find(i => i.value === declaration.declared_intent);

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-slate-900 mb-2 block">
          Why are you ingesting this evidence? *
        </label>
        <Select
          value={declaration.declared_intent}
          onValueChange={(value) => setDeclaration({ ...declaration, declared_intent: value })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select intent..." />
          </SelectTrigger>
          <SelectContent>
            {INTENTS.map((intent) => (
              <SelectItem key={intent.value} value={intent.value}>
                {intent.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {declaration.declared_intent && (
        <div>
          <label className="text-sm font-medium text-slate-900 mb-2 block">
            Explain in detail (max 280 characters)
          </label>
          <Textarea
            value={declaration.intent_details || ''}
            onChange={(e) => setDeclaration({ ...declaration, intent_details: e.target.value })}
            placeholder="Describe why this evidence is being ingested and what decision it supports..."
            className="h-24 text-sm"
            maxLength={280}
          />
          <p className="text-xs text-slate-500 mt-1">
            {declaration.intent_details?.length || 0} / 280 characters
          </p>
        </div>
      )}

      {/* Summary */}
      {declaration.declared_intent && (
        <Card className="bg-slate-50/50 border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-900">Intent Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-slate-900">{selectedIntent?.label}</p>
                {declaration.intent_details && (
                  <p className="text-slate-600 mt-1">{declaration.intent_details}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}