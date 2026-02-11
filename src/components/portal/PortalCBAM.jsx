import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import CBAMInstallations from '../cbam/CBAMInstallations';
import { AlertCircle, Info, Upload, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";

export default function PortalCBAM({ supplier, scopes }) {
  const [isUploading, setIsUploading] = useState(false);

  const handleEvidenceUpload = async (e) => {
    const file = e.target.files[0];
    if(!file) return;
    setIsUploading(true);
    try {
        const res = await base44.integrations.Core.UploadFile({ file });
        await base44.entities.DataRequest.create({
            title: `Evidence Upload: ${file.name}`,
            supplier_id: supplier.id,
            status: 'submitted',
            evidence_file_url: res.file_url,
            request_type: 'certificate',
            description: 'Unsolicited evidence upload from portal',
            due_date: new Date().toISOString().split('T')[0]
        });
        toast.success("Evidence uploaded and stored successfully");
    } catch(err) {
        console.error(err);
        toast.error("Failed to upload evidence");
    } finally {
        setIsUploading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
             <Info className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-blue-900">CBAM Compliance Required</h3>
            <p className="text-blue-700 mt-1">
              As a supplier of goods covered by the EU Carbon Border Adjustment Mechanism, you are required to report embedded emissions data.
              Please register your production sites (installations) below and keep emission factors up to date.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-bold text-slate-800">Your Production Installations</h3>
        <CBAMInstallations supplierId={supplier.id} scopes={scopes} />
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-bold text-slate-800">Data Submission Guidelines</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <Card className="border-slate-200 shadow-sm">
             <CardContent className="p-6">
               <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2">
                 <AlertCircle className="w-4 h-4 text-amber-500" />
                 Emission Factors
               </h4>
               <p className="text-sm text-slate-500">
                 Ensure you provide <strong>specific embedded emissions</strong> (Direct & Indirect) calculated according to EU methodology. Default values may be used temporarily but will face penalties.
               </p>
             </CardContent>
           </Card>
           <Card className="border-slate-200 shadow-sm bg-slate-50">
             <CardContent className="p-6 flex flex-col h-full justify-between">
               <div>
                   <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2">
                     <Upload className="w-4 h-4 text-[#02a1e8]" />
                     Upload Evidence
                   </h4>
                   <p className="text-sm text-slate-500 mb-4">
                     Upload ISO 14064 verification reports or other third-party accredited verification documents.
                   </p>
               </div>
               <div className="relative">
                   <input 
                     type="file" 
                     className="absolute inset-0 opacity-0 cursor-pointer z-10"
                     onChange={handleEvidenceUpload}
                     disabled={isUploading}
                   />
                   <Button variant="outline" className="w-full bg-white" disabled={isUploading}>
                     {isUploading ? "Uploading..." : "Select File"}
                   </Button>
               </div>
             </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}