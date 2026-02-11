import React from 'react';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function NotFoundCard({ recordId, recordType = 'Record', onBack }) {
  return (
    <Card className="border-2 border-red-200 bg-red-50">
      <CardContent className="p-8">
        <div className="flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-900 mb-2">{recordType} Not Found</h3>
            <p className="text-sm text-red-700 mb-4">
              {recordId ? `ID: ${recordId}` : 'The record you are looking for does not exist in the system.'}
            </p>
            <p className="text-xs text-red-600 mb-6">
              This could mean the record has been deleted, the ID is incorrect, or it hasn't been created yet.
            </p>
            {onBack && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onBack}
                className="gap-2 border-red-300 text-red-700 hover:bg-red-100"
              >
                <ArrowLeft className="w-4 h-4" />
                Go Back
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}