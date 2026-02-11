import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";
import { Tag, QrCode, CheckCircle2, AlertTriangle, Download } from "lucide-react";

/**
 * PPWR Labeling & Marking Module
 * Article 11 - Mandatory labeling requirements for all packaging
 * Article 10 - Digital Product Passport integration
 */

export default function PPWRLabelingModule() {
  const queryClient = useQueryClient();

  const { data: packaging = [] } = useQuery({
    queryKey: ['ppwr-packaging'],
    queryFn: () => base44.entities.PPWRPackaging.list()
  });

  const stats = {
    total: packaging.length,
    labeled: packaging.filter(p => p.labeling_compliant).length,
    withPassport: packaging.filter(p => p.digital_passport_id).length,
    pending: packaging.filter(p => !p.labeling_compliant).length
  };

  const generateLabelMutation = useMutation({
    mutationFn: async (packagingId) => {
      const pkg = packaging.find(p => p.id === packagingId);

      // Generate label content per Article 11
      const labelContent = {
        material_composition: pkg.material_category,
        recyclability: pkg.recyclability_score >= 80 ? 'Widely Recyclable' : 
                      pkg.recyclability_score >= 50 ? 'Check Local Guidelines' : 'Not Recyclable',
        recycled_content: `${pkg.recycled_content_percentage}% PCR`,
        disposal_instructions: pkg.is_reusable ? 'Return for reuse' : 'Recycle in designated bin',
        drs_info: pkg.drs_eligible ? `€${pkg.drs_deposit_amount} deposit` : null
      };

      // Generate Digital Product Passport
      const passportId = `PPWR-${pkg.id}-${Date.now()}`;
      const qrUrl = `https://packaging-passport.eu/${passportId}`;

      await base44.entities.PPWRPackaging.update(packagingId, {
        labeling_compliant: true,
        label_material_composition: labelContent.material_composition,
        label_recyclability_info: labelContent.recyclability,
        digital_passport_id: passportId,
        passport_qr_url: qrUrl
      });

      return { labelContent, qrUrl };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ppwr-packaging'] });
      toast.success('Label and passport generated');
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-[#86b027]/20 bg-gradient-to-br from-[#86b027]/5 to-white">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#86b027]/10">
              <Tag className="w-6 h-6 text-[#86b027]" />
            </div>
            <div>
              <CardTitle className="text-xl text-slate-900">Labeling & Digital Passports</CardTitle>
              <p className="text-sm text-slate-600 mt-1">
                Article 11 labeling requirements | Article 10 Digital Product Passport with QR code
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase font-bold">Total Items</p>
                <h3 className="text-3xl font-bold text-slate-900">{stats.total}</h3>
              </div>
              <Tag className="w-10 h-10 text-slate-300" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#86b027]/20 bg-[#86b027]/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#86b027] uppercase font-bold">Labeled</p>
                <h3 className="text-3xl font-bold text-[#86b027]">{stats.labeled}</h3>
              </div>
              <CheckCircle2 className="w-10 h-10 text-[#86b027]/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#02a1e8]/20 bg-[#02a1e8]/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#02a1e8] uppercase font-bold">With Passport</p>
                <h3 className="text-3xl font-bold text-[#02a1e8]">{stats.withPassport}</h3>
              </div>
              <QrCode className="w-10 h-10 text-[#02a1e8]/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-700 uppercase font-bold">Pending</p>
                <h3 className="text-3xl font-bold text-amber-600">{stats.pending}</h3>
              </div>
              <AlertTriangle className="w-10 h-10 text-amber-300" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Regulatory Requirements */}
      <Alert className="border-blue-200 bg-blue-50">
        <Tag className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-sm text-slate-700">
          <strong>Article 11 Mandatory Labeling:</strong> All packaging must display material composition, recyclability information,
          and disposal instructions. Labels must be legible, visible, and in official language(s) of Member State.
          Digital Product Passport (Article 10) required via QR code linking to sustainability data.
        </AlertDescription>
      </Alert>

      {/* Packaging List */}
      <Card>
        <CardHeader>
          <CardTitle>Packaging Items - Labeling Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {packaging.map((pkg) => (
              <div
                key={pkg.id}
                className="flex items-center justify-between p-4 border border-slate-200 rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">{pkg.packaging_name}</p>
                  <div className="mt-2 space-y-1 text-xs text-slate-600">
                    {pkg.label_material_composition && (
                      <p>📦 {pkg.label_material_composition}</p>
                    )}
                    {pkg.label_recyclability_info && (
                      <p>♻️ {pkg.label_recyclability_info}</p>
                    )}
                    {pkg.digital_passport_id && (
                      <p className="text-[#02a1e8] font-mono">🔗 {pkg.digital_passport_id}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {pkg.labeling_compliant ? (
                    <>
                      <Badge className="bg-[#86b027] text-white">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Compliant
                      </Badge>
                      {pkg.passport_qr_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(pkg.passport_qr_url, '_blank')}
                        >
                          <QrCode className="w-4 h-4 mr-1" />
                          View QR
                        </Button>
                      )}
                    </>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => generateLabelMutation.mutate(pkg.id)}
                      disabled={generateLabelMutation.isPending}
                      className="bg-[#86b027] hover:bg-[#769c22]"
                    >
                      Generate Label & Passport
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Label Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Label Information Requirements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-900">Mandatory Elements:</h4>
              <ul className="space-y-2 text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#86b027] mt-0.5" />
                  <span>Material composition (primary material)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#86b027] mt-0.5" />
                  <span>Recyclability classification</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#86b027] mt-0.5" />
                  <span>Disposal instructions</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#86b027] mt-0.5" />
                  <span>Recycled content percentage (if applicable)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#86b027] mt-0.5" />
                  <span>DRS deposit information (if applicable)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#86b027] mt-0.5" />
                  <span>QR code to Digital Product Passport</span>
                </li>
              </ul>
            </div>

            <div className="bg-slate-50 rounded-lg p-6 border-2 border-dashed border-slate-300">
              <div className="text-center space-y-4">
                <QrCode className="w-32 h-32 mx-auto text-slate-400" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-600">SCAN FOR DETAILS</p>
                  <p className="text-xs text-slate-500">Digital Product Passport</p>
                  <p className="text-xs text-slate-500">Material: Plastic (PET)</p>
                  <p className="text-xs text-slate-500">30% Recycled Content</p>
                  <p className="text-xs text-emerald-600 font-semibold">♻️ Widely Recyclable</p>
                  <p className="text-xs text-blue-600">🔄 €0.15 Deposit</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}