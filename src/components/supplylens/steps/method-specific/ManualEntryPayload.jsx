import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AlertCircle, User, Shield } from 'lucide-react';

export default function ManualEntryPayload({ payload, setPayload, declaration, setDeclaration, onNext, onBack }) {
  const canProceed = declaration.entry_notes && declaration.entry_notes.trim().length >= 20 && payload.trim().length > 0;

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-slate-900">2. Manual Data Entry</h3>

      <Card className="bg-amber-50/50 border-amber-300/60">
        <CardContent className="p-4 text-sm text-amber-900 space-y-2">
          <div className="flex items-start gap-2">
            <User className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Manual Entry Mode</p>
              <p className="text-xs text-amber-800 mt-1">No file uploads allowed. No raw JSON paste. Structured data entry only.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-blue-50/50 border-blue-300/60">
        <CardContent className="p-4 text-xs text-blue-900 space-y-2">
          <div className="flex items-start gap-2">
            <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Attestation Rules</p>
              <ul className="list-disc list-inside mt-1 space-y-1 text-blue-800">
                <li>source_system automatically set to <code className="bg-blue-100 px-1 rounded">INTERNAL_MANUAL</code></li>
                <li>attestor_user_id automatically set to your user ID server-side</li>
                <li>attested_by_email automatically set to your email</li>
                <li>Entry notes serve as your attestation and cannot be empty placeholders</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Entry Notes (already in Step 1, shown here for context) */}
      <div className="bg-slate-50/50 border border-slate-200 rounded p-3">
        <p className="text-xs text-slate-600 mb-2">
          <strong>Entry Notes Declared in Step 1:</strong>
        </p>
        <div className="bg-white border border-slate-300 rounded p-2 text-xs text-slate-700 max-h-24 overflow-y-auto">
          {declaration.entry_notes || <span className="text-slate-400 italic">Not set</span>}
        </div>
        <p className="text-xs text-slate-500 mt-1">{(declaration.entry_notes || '').length} / 20 chars minimum</p>
      </div>

      {/* Structured Data Entry */}
      <div className="space-y-2">
        <Label>Data Values (Structured Input)</Label>
        <Textarea
          value={payload}
          onChange={(e) => setPayload(e.target.value)}
          placeholder='{"supplier_name": "ACME Corp", "address": "123 Main St", ...}'
          className="font-mono text-xs min-h-24"
        />
        <p className="text-xs text-slate-500">Enter data as JSON key-value pairs (will be validated)</p>
      </div>

      {/* Validation Error */}
      {!canProceed && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-3 text-sm text-red-900 flex gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Cannot proceed:</p>
              <ul className="list-disc list-inside mt-1 text-xs">
                {(!declaration.entry_notes || declaration.entry_notes.trim().length < 20) && (
                  <li>Entry notes must be at least 20 characters (attestation required)</li>
                )}
                {!payload.trim() && <li>Data values cannot be empty</li>}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex gap-3 justify-end pt-4 border-t">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button onClick={onNext} disabled={!canProceed} className="bg-[#86b027] hover:bg-[#86b027]/90">
          Review & Seal
        </Button>
      </div>
    </div>
  );
}