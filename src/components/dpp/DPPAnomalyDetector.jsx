import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Sparkles, Loader2 } from "lucide-react";
import { detectAnomalies } from './DPPValidationService';
import { toast } from "sonner";

export default function DPPAnomalyDetector({ dppData, productCategory }) {
  const [anomalies, setAnomalies] = useState(null);
  const [isScanning, setIsScanning] = useState(false);

  const handleScan = async () => {
    setIsScanning(true);
    toast.loading('AI scanning for anomalies...');
    
    try {
      const detected = await detectAnomalies(dppData, productCategory);
      setAnomalies(detected);
      
      if (detected.length === 0) {
        toast.success('No anomalies detected!');
      } else {
        toast.warning(`${detected.length} anomalies detected`);
      }
    } catch (error) {
      toast.error('Anomaly detection failed');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>AI Anomaly Detection</CardTitle>
          <Button onClick={handleScan} disabled={isScanning} variant="outline" size="sm">
            {isScanning ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Scanning...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" /> Scan for Anomalies</>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {anomalies === null ? (
          <div className="text-center py-8 text-slate-400">
            <p className="text-sm">Click "Scan for Anomalies" to detect data inconsistencies</p>
          </div>
        ) : anomalies.length === 0 ? (
          <div className="text-center py-8 text-emerald-600">
            <p className="text-sm font-medium">✓ No anomalies detected</p>
          </div>
        ) : (
          <div className="space-y-3">
            {anomalies.map((anomaly, idx) => (
              <div key={idx} className="flex gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm capitalize">{anomaly.type.replace('_', ' ')}</span>
                    <Badge variant="outline" className={
                      anomaly.severity === 'high' ? 'border-rose-500 text-rose-700' :
                      anomaly.severity === 'medium' ? 'border-amber-500 text-amber-700' :
                      'border-blue-500 text-blue-700'
                    }>{anomaly.severity}</Badge>
                  </div>
                  <p className="text-sm text-slate-700">{anomaly.explanation}</p>
                  <div className="mt-2 text-xs text-slate-600 space-y-1">
                    <p>Field: <span className="font-mono">{anomaly.field}</span></p>
                    <p>Detected: <strong>{anomaly.detected_value}</strong></p>
                    <p>Expected: {anomaly.expected_range}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}