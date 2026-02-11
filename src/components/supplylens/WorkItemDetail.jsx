import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from './contract2MockData';

export default function WorkItemDetail({ item }) {
  if (!item) return null;

  return (
    <div className="space-y-4">
      {/* Required Action Display */}
      {item.requiredAction && (
        <Card className="bg-white/60 backdrop-blur-sm border border-slate-200/60">
          <CardContent className="p-4">
            <p className="text-xs text-slate-600 font-medium mb-2">Required Action</p>
            <p className="text-sm text-slate-900">{item.requiredAction.description}</p>
            
            {/* Type-specific rendering */}
            {item.requiredAction.type === 'REVIEW' && item.requiredAction.fields && (
              <div className="mt-3">
                <p className="text-xs text-slate-600 mb-1">Fields to review:</p>
                <div className="flex flex-wrap gap-1">
                  {item.requiredAction.fields.map((field, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">{field}</Badge>
                  ))}
                </div>
              </div>
            )}
            
            {item.requiredAction.type === 'EXTRACTION' && (
              <div className="mt-3">
                <Badge className={
                  item.requiredAction.extraction_status === 'COMPLETED' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-blue-100 text-blue-800'
                }>
                  {item.requiredAction.extraction_status || 'PENDING'}
                </Badge>
              </div>
            )}
            
            {item.requiredAction.type === 'MAPPING' && item.requiredAction.suggested_mappings && (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-slate-600 mb-1">Suggested mappings:</p>
                {item.requiredAction.suggested_mappings.map((mapping, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-200 rounded p-2">
                    <p className="text-xs font-mono">{mapping.source} → {mapping.target}</p>
                    <p className="text-xs text-slate-600 mt-1">Confidence: {(mapping.confidence * 100).toFixed(0)}%</p>
                  </div>
                ))}
              </div>
            )}
            
            {item.requiredAction.type === 'CONFLICT' && item.requiredAction.conflict_details && (
              <div className="mt-3 space-y-2">
                <div className="bg-amber-50 border border-amber-200 rounded p-2">
                  <p className="text-xs text-amber-900 font-medium">Conflict Field: {item.requiredAction.conflict_details.field}</p>
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-slate-700">Source A ({item.requiredAction.conflict_details.source_a}): <span className="font-mono">{item.requiredAction.conflict_details.value_a}</span></p>
                    <p className="text-xs text-slate-700">Source B ({item.requiredAction.conflict_details.source_b}): <span className="font-mono">{item.requiredAction.conflict_details.value_b || 'null'}</span></p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Audit Trail */}
      {item.auditTrail && item.auditTrail.length > 0 && (
        <Card className="bg-white/60 backdrop-blur-sm border border-slate-200/60">
          <CardContent className="p-4">
            <p className="text-xs text-slate-600 font-medium mb-3">Audit Trail</p>
            <div className="space-y-2">
              {item.auditTrail.map((event, idx) => (
                <div key={idx} className="text-xs border-l-2 border-slate-300 pl-3 py-1">
                  <p className="text-slate-900 font-medium">{event.action}</p>
                  <p className="text-slate-600">{formatDate(event.timestamp)}</p>
                  <p className="text-slate-500">By: {event.user}</p>
                  {event.decision && <p className="text-slate-700 mt-1">{event.decision}</p>}
                  {event.note && <p className="text-slate-700 mt-1">{event.note}</p>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}