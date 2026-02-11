import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";
import { Coins, Recycle, BarChart3, Euro, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

/**
 * PPWR Deposit Return System (DRS) Module
 * Article 44 - Mandatory DRS for plastic bottles and metal beverage containers
 * Member States must achieve 90% collection rate by 2029
 */

export default function PPWRDepositReturnSystem() {
  const queryClient = useQueryClient();

  const { data: packaging = [] } = useQuery({
    queryKey: ['ppwr-packaging'],
    queryFn: () => base44.entities.PPWRPackaging.list()
  });

  // DRS eligibility criteria per Article 44
  const isDRSEligible = (pkg) => {
    const eligibleMaterials = ['Plastic', 'Metal'];
    const eligibleFormats = ['Sales'];
    const beverageTypes = ['beverage', 'drink', 'bottle', 'can'];
    
    return (
      eligibleMaterials.includes(pkg.material_category) &&
      eligibleFormats.includes(pkg.packaging_format) &&
      beverageTypes.some(type => pkg.packaging_name?.toLowerCase().includes(type))
    );
  };

  const drsPackaging = packaging.filter(isDRSEligible);
  const drsRegistered = drsPackaging.filter(p => p.drs_eligible && p.drs_deposit_amount);

  const stats = {
    drsEligible: drsPackaging.length,
    registered: drsRegistered.length,
    pending: drsPackaging.length - drsRegistered.length,
    avgDeposit: drsRegistered.length > 0
      ? (drsRegistered.reduce((sum, p) => sum + (p.drs_deposit_amount || 0), 0) / drsRegistered.length).toFixed(2)
      : 0,
    collectionRate: 78 // Mock - would be calculated from actual returns
  };

  const configureDRSMutation = useMutation({
    mutationFn: async ({ packagingId, depositAmount }) => {
      await base44.entities.PPWRPackaging.update(packagingId, {
        drs_eligible: true,
        drs_deposit_amount: parseFloat(depositAmount)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ppwr-packaging'] });
      toast.success('DRS configured successfully');
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-[#02a1e8]/20 bg-gradient-to-br from-[#02a1e8]/5 to-white">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#02a1e8]/10">
              <Coins className="w-6 h-6 text-[#02a1e8]" />
            </div>
            <div>
              <CardTitle className="text-xl text-slate-900">Deposit Return System (DRS)</CardTitle>
              <p className="text-sm text-slate-600 mt-1">
                Article 44 - Mandatory for plastic bottles & metal beverage containers | Target: 90% collection by 2029
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase font-bold">DRS Eligible</p>
                <h3 className="text-3xl font-bold text-slate-900">{stats.drsEligible}</h3>
              </div>
              <Recycle className="w-10 h-10 text-slate-300" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#02a1e8]/20 bg-[#02a1e8]/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#02a1e8] uppercase font-bold">Registered</p>
                <h3 className="text-3xl font-bold text-[#02a1e8]">{stats.registered}</h3>
              </div>
              <Coins className="w-10 h-10 text-[#02a1e8]/30" />
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
              <BarChart3 className="w-10 h-10 text-amber-300" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#86b027]/20 bg-[#86b027]/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#86b027] uppercase font-bold">Avg Deposit</p>
                <h3 className="text-2xl font-bold text-[#86b027]">€{stats.avgDeposit}</h3>
              </div>
              <Euro className="w-10 h-10 text-[#86b027]/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-700 uppercase font-bold">Collection Rate</p>
                <h3 className="text-3xl font-bold text-emerald-600">{stats.collectionRate}%</h3>
                <p className="text-xs text-emerald-600 mt-1">Target: 90%</p>
              </div>
              <TrendingUp className="w-10 h-10 text-emerald-300" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Regulatory Info */}
      <Alert className="border-blue-200 bg-blue-50">
        <Recycle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-sm text-slate-700">
          <strong>Article 44 DRS Requirements:</strong> All single-use plastic beverage bottles up to 3L and metal beverage containers
          must be covered by DRS. Member States must achieve 90% separate collection rate by 2029. Typical deposits: €0.15-0.25.
          Reverse vending machines or manual return points required.
        </AlertDescription>
      </Alert>

      {/* DRS Packaging List */}
      <Card>
        <CardHeader>
          <CardTitle>DRS-Eligible Packaging</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {drsPackaging.map((pkg) => (
              <div
                key={pkg.id}
                className="flex items-center justify-between p-4 border border-slate-200 rounded-lg"
              >
                <div>
                  <p className="font-semibold text-slate-900">{pkg.packaging_name}</p>
                  <p className="text-sm text-slate-600">
                    {pkg.material_category} • {pkg.packaging_format}
                  </p>
                </div>

                {pkg.drs_deposit_amount ? (
                  <div className="flex items-center gap-2">
                    <Badge className="bg-[#02a1e8] text-white">
                      €{pkg.drs_deposit_amount} deposit
                    </Badge>
                    <Badge className="bg-emerald-500 text-white">Registered</Badge>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.05"
                      placeholder="0.15"
                      className="w-24"
                      id={`deposit-${pkg.id}`}
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        const input = document.getElementById(`deposit-${pkg.id}`);
                        configureDRSMutation.mutate({
                          packagingId: pkg.id,
                          depositAmount: input.value
                        });
                      }}
                      className="bg-[#02a1e8] hover:bg-[#0189c9]"
                    >
                      Set Deposit
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}