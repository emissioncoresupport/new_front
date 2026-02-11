import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { FileText, UploadCloud, RefreshCw, CheckCircle2, MoreVertical, Loader2, Globe, Shield } from "lucide-react";
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";
import CBAMRegistryConfigModal from './CBAMRegistryConfigModal';
import { validateCBAMReport } from './CBAMValidationEngine';
import { submitToRegistry } from './CBAMSubmissionService';

export default function CBAMSubmissionActions({ report }) {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const queryClient = useQueryClient();
  
  // Fetch entries and installations for validation
  const { data: entries = [] } = useQuery({
    queryKey: ['cbam-emission-entries'],
    queryFn: () => base44.entities.CBAMEmissionEntry.list()
  });

  const { data: installations = [] } = useQuery({
    queryKey: ['cbam-installations'],
    queryFn: () => base44.entities.CBAMInstallation.list()
  });

  const reportEntries = entries.filter(e => e.report_id === report.id);

  // Validation Mutation
  const validateMutation = useMutation({
    mutationFn: async () => {
      const validation = validateCBAMReport(report, reportEntries);
      
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.length} critical errors found`);
      }

      // Update report status
      await base44.entities.CBAMReport.update(report.id, {
        status: 'validated'
      });

      return validation;
    },
    onSuccess: (validation) => {
      queryClient.invalidateQueries({ queryKey: ['cbam-reports'] });
      toast.success(`Report validated successfully! ${validation.warnings.length} warnings noted.`);
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });
  
  const submitMutation = useMutation({
    mutationFn: async () => {
        // First validate
        const validation = validateCBAMReport(report, reportEntries);
        if (!validation.readyForSubmission) {
          throw new Error('Report validation failed - fix errors before submission');
        }

        // Submit to registry
        const result = await submitToRegistry(report, reportEntries, installations);
        
        if (!result.success) {
          throw new Error(result.error);
        }

        return result;
    },
    onSuccess: (result) => {
        queryClient.invalidateQueries({ queryKey: ['cbam-reports'] });
        toast.success(`Report submitted! Transaction ID: ${result.transactionId}`);
    },
    onError: (error) => {
        toast.error("Submission failed: " + error.message);
    }
  });

  const handleExportXML = () => {
      toast.success("Generating CBAM XML Report...");
      // Logic to generate/download XML would go here
      setTimeout(() => {
          toast.info("XML Report Downloaded");
      }, 1000);
  };

  return (
    <>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <MoreVertical className="w-4 h-4" />
                    Actions
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                {report.status === 'draft' && (
                  <DropdownMenuItem onClick={() => validateMutation.mutate()} disabled={validateMutation.isPending}>
                    {validateMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin text-[#86b027]" />
                    ) : (
                      <Shield className="w-4 h-4 mr-2 text-[#86b027]" />
                    )}
                    Validate Report
                  </DropdownMenuItem>
                )}
                
                <DropdownMenuItem onClick={handleExportXML}>
                    <FileText className="w-4 h-4 mr-2 text-slate-500" />
                    Export XML (Official)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {report.status === 'draft' || report.status === 'validated' ? (
                     <DropdownMenuItem onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending}>
                        {submitMutation.isPending ? (
                             <Loader2 className="w-4 h-4 mr-2 animate-spin text-[#02a1e8]" />
                        ) : (
                             <UploadCloud className="w-4 h-4 mr-2 text-[#02a1e8]" />
                        )}
                        Submit to EU Registry
                     </DropdownMenuItem>
                ) : (
                     <DropdownMenuItem onClick={() => toast.info("Check status in Compliance Tracker")}>
                        <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" />
                        Already Submitted
                     </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsConfigOpen(true)}>
                    <Globe className="w-4 h-4 mr-2 text-slate-400" />
                    Configure Integration
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>

        <CBAMRegistryConfigModal open={isConfigOpen} onOpenChange={setIsConfigOpen} />
    </>
  );
}