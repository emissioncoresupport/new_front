import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, X, FileCheck, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from "sonner";

export default function DocumentUploader({ task, supplier }) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const queryClient = useQueryClient();
  const fileInputRef = React.useRef(null);

  const updateTaskMutation = useMutation({
    mutationFn: (data) => base44.entities.OnboardingTask.update(task.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-tasks'] });
      toast.success("Document uploaded successfully");
    }
  });

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setProgress(10);

    try {
      // Simulate progress
      const timer = setInterval(() => {
        setProgress(p => Math.min(p + 10, 80));
      }, 200);

      // 1. Upload file
      const result = await base44.integrations.Core.UploadFile({ file });
      
      // 2. Analyze Document and Verify with AI
      setProgress(85);
      let extractedData = null;
      
      try {
        // Extract key info and verify against supplier/task requirements
        const aiResult = await base44.integrations.Core.InvokeLLM({
          prompt: `
            Analyze this uploaded document (URL: ${result.file_url}).
            
            1. Extract key information: Document Type, Expiration Date, Issuing Authority, Certificate Number, Supplier/Company Name, Test Results/Outcome (if applicable).
            
            2. VERIFY the document against these criteria:
               - Document Type should match one of: ${JSON.stringify(task.required_documents || [])}.
               - Expiration Date must be in the future (Today is ${new Date().toISOString().split('T')[0]}).
               - Supplier Name on document should roughly match: "${supplier?.legal_name || ''}" or "${supplier?.trade_name || ''}".
               - For test reports: Outcome should be positive/pass.
            
            Return a JSON object with:
            - extracted_info: { document_type, expiration_date, issuing_authority, certificate_number, company_name, test_outcome }
            - verification: { 
                is_valid: boolean, 
                issues: string[] (list of discrepancies found, e.g. "Expired on ...", "Name mismatch...", "Wrong document type") 
              }
          `,
          file_urls: [result.file_url],
          response_json_schema: {
            type: "object",
            properties: {
              extracted_info: {
                type: "object",
                properties: {
                  document_type: { type: "string" },
                  expiration_date: { type: "string" },
                  issuing_authority: { type: "string" },
                  certificate_number: { type: "string" },
                  company_name: { type: "string" },
                  test_outcome: { type: "string" }
                }
              },
              verification: {
                type: "object",
                properties: {
                  is_valid: { type: "boolean" },
                  issues: { type: "array", items: { type: "string" } }
                },
                required: ["is_valid", "issues"]
              }
            }
          }
        });
        extractedData = aiResult;
      } catch (aiError) {
        console.warn("AI analysis failed", aiError);
      }

      clearInterval(timer);
      setProgress(100);

      // Update task with document info
      const currentDocs = task.uploaded_documents || [];
      const newDoc = {
        name: file.name,
        url: result.file_url,
        uploaded_at: new Date().toISOString(),
        size: file.size,
        type: file.type,
        analysis: extractedData // Store the AI analysis
      };

      // If all required documents are present (simplified check), mark as completed
      const isComplete = !task.required_documents || task.required_documents.length <= currentDocs.length + 1;

      await updateTaskMutation.mutateAsync({
        uploaded_documents: [...currentDocs, newDoc],
        status: isComplete ? 'completed' : 'in_progress',
        completed_date: isComplete ? new Date().toISOString() : null,
        // Store extracted data in response_data if useful
        response_data: {
          ...task.response_data,
          latest_doc_analysis: extractedData
        }
      });
      
      if (extractedData) {
        if (extractedData.verification?.is_valid) {
          toast.success("Document verified successfully!");
        } else if (extractedData.verification?.issues?.length > 0) {
          toast.warning(`Document issues found: ${extractedData.verification.issues.join(", ")}`);
        } else {
          toast.success("Document analyzed.");
        }
      }

    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Failed to upload document");
    } finally {
      setIsUploading(false);
      setProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="w-full">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
        accept=".pdf,.doc,.docx,.jpg,.png,.xls,.xlsx"
      />
      
      {isUploading ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span className="flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" /> Uploading...
            </span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {task.required_documents && task.required_documents.length > 0 && (
            <div className="mb-2">
              <p className="text-xs font-medium text-slate-500 mb-1">Required:</p>
              <ul className="list-disc list-inside text-xs text-slate-600">
                {task.required_documents.map((doc, i) => (
                  <li key={i}>{doc}</li>
                ))}
              </ul>
            </div>
          )}
          
          <Button 
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            className="w-full sm:w-auto border-dashed border-2 border-slate-300 hover:border-sky-500 hover:bg-sky-50 text-slate-600 hover:text-sky-700 transition-all"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Document
          </Button>
          <p className="text-xs text-slate-400 mt-1">
            Supported formats: PDF, JPG, PNG, Office docs (Max 10MB)
          </p>
        </div>
      )}
      
      {/* Show uploaded docs with verification status */}
      {task.uploaded_documents && task.uploaded_documents.length > 0 && (
        <div className="mt-3 space-y-2">
          {task.uploaded_documents.map((doc, idx) => (
            <div key={idx} className="bg-slate-50 p-2 rounded border border-slate-200 text-xs">
              <div className="flex justify-between items-start">
                <div className="font-medium truncate max-w-[200px]">{doc.name}</div>
                {doc.analysis?.verification ? (
                  <div className={`flex items-center gap-1 ${doc.analysis.verification.is_valid ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {doc.analysis.verification.is_valid ? (
                      <><FileCheck className="w-3 h-3" /> Verified</>
                    ) : (
                      <><X className="w-3 h-3" /> Issues Found</>
                    )}
                  </div>
                ) : (
                  <span className="text-slate-400">Uploaded</span>
                )}
              </div>
              
              {doc.analysis?.verification?.issues?.length > 0 && (
                <ul className="mt-1 space-y-1 list-disc list-inside text-rose-600">
                  {doc.analysis.verification.issues.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              )}
              
              {doc.analysis?.extracted_info?.expiration_date && (
                 <div className="mt-1 text-slate-500">
                   Expires: {doc.analysis.extracted_info.expiration_date}
                 </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}