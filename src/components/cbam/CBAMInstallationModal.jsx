import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";
import { Loader2, Sparkles, Upload, FileText } from "lucide-react";

export default function CBAMInstallationModal({ open, onOpenChange, supplierId, installation }) {
  const queryClient = useQueryClient();
  const [isVerifying, setIsVerifying] = useState(false);
  
  const [formData, setFormData] = useState(installation || {
    name: '',
    country: '',
    city: '',
    address: '',
    production_technology: 'Electric Arc Furnace',
    hs_code: '',
    direct_emissions: 0,
    indirect_emissions: 0,
    unlocode: ''
  });

  const isEdit = !!installation;

  const mutation = useMutation({
    mutationFn: (data) => isEdit 
      ? base44.entities.CBAMInstallation.update(installation.id, data)
      : base44.entities.CBAMInstallation.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cbam-installations'] });
      toast.success(`Installation ${isEdit ? 'updated' : 'registered'} successfully`);
      onOpenChange(false);
    },
    onError: () => toast.error("Operation failed")
  });

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      // Simulated AI Benchmark Check
      // In a real scenario, this would call base44.integrations.Core.InvokeLLM
      const prompt = `
        Verify the following CBAM installation data against industry benchmarks for ${formData.country}:
        Technology: ${formData.production_technology}
        Direct Emissions: ${formData.direct_emissions} tCO2e/t
        Indirect Emissions: ${formData.indirect_emissions} tCO2e/t
        
        Benchmarks (Simulated):
        EAF (Global Avg): ~0.6 - 1.2 tCO2e/t
        Blast Furnace: ~2.0 - 2.5 tCO2e/t
        
        Is this within reasonable range? Return a short JSON: { "status": "verified" | "flagged", "reason": "string" }
      `;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
           type: "object",
           properties: {
             status: { type: "string", enum: ["verified", "flagged"] },
             reason: { type: "string" }
           }
        }
      });

      if (response.status === 'flagged') {
        toast.warning("AI Flagged Discrepancy: " + response.reason);
      } else {
        toast.success("AI Verification Passed: Data aligns with regional benchmarks.");
      }

      return response;
    } catch (error) {
      console.error("Verification failed", error);
      toast.error("Verification service unavailable");
      return { status: 'pending', reason: 'Service error' };
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Auto-verify on submit if new
    let verification = { status: 'pending', reason: 'Manual review pending' };
    if (!isEdit) {
       verification = await handleVerify();
    }

    mutation.mutate({
      supplier_id: supplierId,
      name: formData.name,
      country: formData.country,
      city: formData.city,
      address: formData.address,
      production_technology: formData.production_technology,
      goods_produced: [{ hs_code: formData.hs_code, name: 'Primary Product' }],
      emission_factors: {
        direct: parseFloat(formData.direct_emissions),
        indirect: parseFloat(formData.indirect_emissions)
      },
      verification_status: verification.status,
      verification_notes: verification.reason
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Installation' : 'Register Production Site'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Installation Name</Label>
              <Input 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})} 
                required 
                placeholder="e.g. Shanghai Plant #1"
              />
            </div>
            <div className="space-y-2">
              <Label>Production Technology</Label>
              <Select 
                value={formData.production_technology} 
                onValueChange={(v) => setFormData({...formData, production_technology: v})}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Electric Arc Furnace">Electric Arc Furnace (EAF)</SelectItem>
                  <SelectItem value="Blast Furnace">Blast Furnace (BF-BOF)</SelectItem>
                  <SelectItem value="Sintering">Sintering</SelectItem>
                  <SelectItem value="Electrolysis">Electrolysis (Aluminium)</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Country</Label>
              <Input 
                value={formData.country} 
                onChange={(e) => setFormData({...formData, country: e.target.value})} 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input 
                value={formData.city} 
                onChange={(e) => setFormData({...formData, city: e.target.value})} 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label>UN/LOCODE (Optional)</Label>
              <Input 
                value={formData.unlocode} 
                onChange={(e) => setFormData({...formData, unlocode: e.target.value})} 
                placeholder="CN SHA"
              />
            </div>
          </div>

          <div className="space-y-2">
             <Label>Full Address</Label>
             <Input 
               value={formData.address} 
               onChange={(e) => setFormData({...formData, address: e.target.value})} 
               placeholder="Street address, ZIP code"
             />
          </div>

          <div className="p-4 bg-slate-50/50 rounded-lg border border-slate-200/60 space-y-4">
             <div className="flex items-center justify-between">
                <h4 className="font-medium text-xs text-slate-700">Emission Factors & Product</h4>
                <Badge variant="outline" className="bg-white text-xs">
                  <Sparkles className="w-3 h-3 mr-1 text-slate-700" />
                  AI Verification Enabled
                </Badge>
             </div>
             
             <div className="space-y-2">
               <Label>Main Product HS Code</Label>
               <Input 
                 value={formData.hs_code} 
                 onChange={(e) => setFormData({...formData, hs_code: e.target.value})} 
                 placeholder="e.g. 7208 10 00"
                 required
               />
             </div>

             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label>Direct Emissions (tCO2e/t)</Label>
                 <Input 
                   type="number" 
                   step="0.001" 
                   value={formData.direct_emissions} 
                   onChange={(e) => setFormData({...formData, direct_emissions: e.target.value})} 
                   required
                 />
               </div>
               <div className="space-y-2">
                 <Label>Indirect Emissions (tCO2e/t)</Label>
                 <Input 
                   type="number" 
                   step="0.001" 
                   value={formData.indirect_emissions} 
                   onChange={(e) => setFormData({...formData, indirect_emissions: e.target.value})} 
                   required
                 />
               </div>
             </div>
          </div>
          
          <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center hover:bg-slate-50 transition-colors cursor-pointer">
             <Upload className="w-6 h-6 mx-auto text-slate-400 mb-2" />
             <p className="text-sm text-slate-600">Upload Verification Evidence (ISO 14064 Report)</p>
             <p className="text-xs text-slate-400">PDF, Excel supported</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-slate-200/80 text-slate-700 hover:bg-slate-50 h-9 px-4 text-sm shadow-none">Cancel</Button>
            <Button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white h-9 px-4 text-sm shadow-sm" disabled={mutation.isPending || isVerifying}>
              {(mutation.isPending || isVerifying) && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
              {isEdit ? 'Update Installation' : 'Register & Verify'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Badge({ children, className, variant }) {
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${className}`}>{children}</span>;
}