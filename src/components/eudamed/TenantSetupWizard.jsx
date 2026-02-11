import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Building2, Users, CheckCircle2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import EUDAMEDTenantService from './services/EUDAMEDTenantService';
import CountrySelector from './CountrySelector';
import VATNumberInput from './VATNumberInput';
import EORINumberInput from './EORINumberInput';

export default function TenantSetupWizard({ onComplete }) {
  const [step, setStep] = useState(1);
  const [tenantType, setTenantType] = useState('manufacturer');
  const [operatorData, setOperatorData] = useState({
    operator_type: 'manufacturer',
    legal_name: '',
    trade_name: '',
    country: '',
    vat_number: '',
    eori_number: '',
    address: '',
    city: '',
    postal_code: '',
    primary_contact_name: '',
    primary_contact_email: '',
    primary_contact_phone: '',
    website: ''
  });

  const queryClient = useQueryClient();

  const initializeMutation = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      const tenantId = user.tenant_id || 'default';

      if (tenantType === 'manufacturer' || tenantType === 'importer') {
        // Create primary operator
        const operator = await base44.entities.EconomicOperator.create({
          tenant_id: tenantId,
          is_primary: true,
          ...operatorData,
          status: 'draft'
        });
        return { operator, mode: 'direct' };
      } else {
        // Auth rep/consultant - no operator yet
        return { operator: null, mode: 'multi_client' };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries(['economic-operators']);
      toast.success('EUDAMED setup complete');
      if (onComplete) onComplete(result);
    },
    onError: (error) => {
      toast.error(`Setup failed: ${error.message}`);
    }
  });

  return (
    <div className="max-w-3xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {step === 1 && <Users className="w-5 h-5 text-[#02a1e8]" />}
            {step === 2 && <Building2 className="w-5 h-5 text-[#86b027]" />}
            {step === 3 && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
            EUDAMED Setup - Step {step}/3
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-bold text-lg">What is your role?</h3>
              <div className="grid grid-cols-2 gap-4">
                <Card 
                  className={`cursor-pointer border-2 transition-all ${tenantType === 'manufacturer' ? 'border-[#86b027] bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}
                  onClick={() => setTenantType('manufacturer')}
                >
                  <CardContent className="p-6 text-center">
                    <Building2 className="w-12 h-12 mx-auto mb-3 text-[#86b027]" />
                    <h4 className="font-bold mb-2">Manufacturer</h4>
                    <p className="text-xs text-slate-600">We manufacture medical devices</p>
                  </CardContent>
                </Card>

                <Card 
                  className={`cursor-pointer border-2 transition-all ${tenantType === 'importer' ? 'border-[#86b027] bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}
                  onClick={() => setTenantType('importer')}
                >
                  <CardContent className="p-6 text-center">
                    <Building2 className="w-12 h-12 mx-auto mb-3 text-[#02a1e8]" />
                    <h4 className="font-bold mb-2">Importer</h4>
                    <p className="text-xs text-slate-600">We import devices into the EU</p>
                  </CardContent>
                </Card>

                <Card 
                  className={`cursor-pointer border-2 transition-all ${tenantType === 'authorized_rep' ? 'border-[#86b027] bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}
                  onClick={() => setTenantType('authorized_rep')}
                >
                  <CardContent className="p-6 text-center">
                    <Users className="w-12 h-12 mx-auto mb-3 text-purple-600" />
                    <h4 className="font-bold mb-2">Authorized Rep</h4>
                    <p className="text-xs text-slate-600">We represent manufacturers</p>
                  </CardContent>
                </Card>

                <Card 
                  className={`cursor-pointer border-2 transition-all ${tenantType === 'consultant' ? 'border-[#86b027] bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}
                  onClick={() => setTenantType('consultant')}
                >
                  <CardContent className="p-6 text-center">
                    <Users className="w-12 h-12 mx-auto mb-3 text-amber-600" />
                    <h4 className="font-bold mb-2">Consultant</h4>
                    <p className="text-xs text-slate-600">We manage compliance for clients</p>
                  </CardContent>
                </Card>
              </div>

              <Button onClick={() => setStep(2)} className="w-full bg-[#86b027]">
                Next <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-bold text-lg">
                {tenantType === 'manufacturer' || tenantType === 'importer' 
                  ? 'Your Company Information' 
                  : 'Your Agency Information'}
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Operator Type</Label>
                  <Select 
                    value={operatorData.operator_type}
                    onValueChange={(value) => setOperatorData({...operatorData, operator_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manufacturer">Manufacturer</SelectItem>
                      <SelectItem value="authorized_rep">Authorized Representative</SelectItem>
                      <SelectItem value="importer">Importer</SelectItem>
                      <SelectItem value="distributor">Distributor</SelectItem>
                      <SelectItem value="system_pack_producer">System/Pack Producer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2">
                  <Label>Legal Name *</Label>
                  <Input 
                    value={operatorData.legal_name}
                    onChange={(e) => setOperatorData({...operatorData, legal_name: e.target.value})}
                    placeholder="ABC Medical Devices Ltd"
                  />
                </div>

                <div className="col-span-2">
                  <Label>Trade Name</Label>
                  <Input 
                    value={operatorData.trade_name}
                    onChange={(e) => setOperatorData({...operatorData, trade_name: e.target.value})}
                    placeholder="ABC Medical"
                  />
                </div>

                <div>
                  <Label>Country *</Label>
                  <CountrySelector 
                    value={operatorData.country}
                    onChange={(value) => setOperatorData({...operatorData, country: value})}
                  />
                </div>

                <div>
                  <Label>VAT Number</Label>
                  <VATNumberInput
                    value={operatorData.vat_number}
                    onChange={(value) => setOperatorData({...operatorData, vat_number: value})}
                    country={operatorData.country}
                  />
                </div>

                <div className="col-span-2">
                  <Label>EORI Number</Label>
                  <EORINumberInput
                    value={operatorData.eori_number}
                    onChange={(value) => setOperatorData({...operatorData, eori_number: value})}
                    country={operatorData.country}
                  />
                </div>

                <div className="col-span-2">
                  <Label>Address</Label>
                  <Input 
                    value={operatorData.address}
                    onChange={(e) => setOperatorData({...operatorData, address: e.target.value})}
                  />
                </div>

                <div>
                  <Label>City</Label>
                  <Input 
                    value={operatorData.city}
                    onChange={(e) => setOperatorData({...operatorData, city: e.target.value})}
                  />
                </div>

                <div>
                  <Label>Postal Code</Label>
                  <Input 
                    value={operatorData.postal_code}
                    onChange={(e) => setOperatorData({...operatorData, postal_code: e.target.value})}
                  />
                </div>

                <div className="col-span-2">
                  <Label>Contact Email *</Label>
                  <Input 
                    type="email"
                    value={operatorData.primary_contact_email}
                    onChange={(e) => setOperatorData({...operatorData, primary_contact_email: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                <Button 
                  onClick={() => setStep(3)} 
                  className="flex-1 bg-[#86b027]"
                  disabled={!operatorData.legal_name || !operatorData.country}
                >
                  Next <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 text-center">
              <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
              <h3 className="font-bold text-xl">Ready to Start!</h3>
              <p className="text-slate-600">
                {tenantType === 'manufacturer' || tenantType === 'importer'
                  ? 'Your economic operator profile will be created. You can then map your products and prepare for EUDAMED submission.'
                  : 'Your consultant/auth rep account will be created. You can add client operators and manage their EUDAMED compliance.'}
              </p>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                <Button 
                  onClick={() => initializeMutation.mutate()}
                  disabled={initializeMutation.isPending}
                  className="flex-1 bg-[#86b027]"
                >
                  {initializeMutation.isPending ? 'Creating...' : 'Complete Setup'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}