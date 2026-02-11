import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default function PersonalDataWarning({ isChecked }) {
  if (!isChecked) return null;

  return (
    <Card className="border-amber-300 bg-amber-50/80 backdrop-blur-sm">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-700 mt-0.5 flex-shrink-0" />
          <div className="space-y-2 text-xs text-amber-800">
            <p className="font-semibold">GDPR Data Minimization</p>
            <ul className="list-disc list-inside space-y-1 font-light">
              <li>Do not upload invoices, names, or emails unless absolutely required</li>
              <li>Redact personal information (phone, SSN, passport) before upload</li>
              <li>Personal data flag stored with evidence; retention period strictly enforced</li>
              <li>Explicit GDPR legal basis required; improper processing logged</li>
            </ul>
            <p className="mt-2 font-light italic">
              Supplier controls grants and can request deletion at any time via GDPR Deletion Request.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}