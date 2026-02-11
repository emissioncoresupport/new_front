import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Shield, CheckCircle2, AlertTriangle, FileCheck, Download } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function ISO14083CompliancePanel({ shipmentId }) {
  const queryClient = useQueryClient();

  const validateMutation = useMutation({
    mutationFn: async () => {
      const { data } = await base44.functions.invoke('iso14083Validator', {
        shipment_id: shipmentId
      });
      return data;
    },
    onSuccess: (data) => {
      if (data.validation.compliant) {
        toast.success('ISO 14083:2023 Compliant', {
          description: `Score: ${data.validation.score}/100`
        });
      } else {
        toast.error('Compliance Issues Found', {
          description: `${data.validation.errors.length} errors detected`
        });
      }
    }
  });

  return (
    <Card className="border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="w-5 h-5 text-blue-600" />
          ISO 14083:2023 Compliance Check
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={() => validateMutation.mutate()}
          disabled={validateMutation.isPending}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          <FileCheck className="w-4 h-4 mr-2" />
          {validateMutation.isPending ? 'Validating...' : 'Run Compliance Check'}
        </Button>

        {validateMutation.data && (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span className="font-bold">Compliance Score</span>
              <Badge className={
                validateMutation.data.validation.score >= 85 ? 'bg-emerald-500' :
                validateMutation.data.validation.score >= 70 ? 'bg-amber-500' : 'bg-rose-500'
              }>
                {validateMutation.data.validation.score}/100
              </Badge>
            </div>

            <Progress value={validateMutation.data.validation.score} />

            {validateMutation.data.validation.errors.length > 0 && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                <div className="font-bold text-rose-900 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Errors ({validateMutation.data.validation.errors.length})
                </div>
                <ul className="text-sm text-rose-800 space-y-1">
                  {validateMutation.data.validation.errors.map((err, idx) => (
                    <li key={idx}>• {err}</li>
                  ))}
                </ul>
              </div>
            )}

            {validateMutation.data.validation.warnings.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="font-bold text-amber-900 mb-2">Warnings</div>
                <ul className="text-sm text-amber-800 space-y-1">
                  {validateMutation.data.validation.warnings.map((warn, idx) => (
                    <li key={idx}>• {warn}</li>
                  ))}
                </ul>
              </div>
            )}

            {validateMutation.data.certification_ready && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="font-bold text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Certification Ready
                </div>
                <div className="text-sm text-emerald-800 mt-1">
                  This shipment meets ISO 14083:2023 requirements and can be submitted for third-party verification.
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}