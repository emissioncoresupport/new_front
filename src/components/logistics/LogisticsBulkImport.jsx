import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, FileText, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function LogisticsBulkImport({ open, onOpenChange }) {
    const [file, setFile] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const queryClient = useQueryClient();

    const handleFileChange = (e) => {
        if (e.target.files[0]) setFile(e.target.files[0]);
    };

    const importMutation = useMutation({
        mutationFn: async () => {
            setIsProcessing(true);

            try {
                // Upload file
                const { file_url } = await base44.integrations.Core.UploadFile({ file });

                // Extract data
                const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
                    file_url,
                    json_schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                shipment_id: { type: "string" },
                                shipment_date: { type: "string" },
                                shipper_name: { type: "string" },
                                consignee_name: { type: "string" },
                                origin_code: { type: "string" },
                                destination_code: { type: "string" },
                                weight_kg: { type: "number" },
                                distance_km: { type: "number" },
                                transport_mode: { type: "string" },
                                tracking_number: { type: "string" }
                            },
                            required: ["shipment_id", "origin_code", "destination_code", "weight_kg", "distance_km", "transport_mode"]
                        }
                    }
                });

                if (extractResult.status !== 'success' || !extractResult.output) {
                    throw new Error(extractResult.details || "Failed to parse file");
                }

                const records = Array.isArray(extractResult.output) ? extractResult.output : [extractResult.output];
                let successCount = 0;

                const emissionFactors = {
                    'Air': 500,
                    'Road': 62,
                    'Sea': 16,
                    'Rail': 22
                };

                for (const record of records) {
                    const factor = emissionFactors[record.transport_mode] || 62;
                    const total_co2e_kg = (record.distance_km * record.weight_kg * factor) / 1000000;

                    await base44.entities.LogisticsShipment.create({
                        shipment_id: record.shipment_id,
                        shipment_date: record.shipment_date || new Date().toISOString().split('T')[0],
                        shipper_name: record.shipper_name || null,
                        consignee_name: record.consignee_name || null,
                        origin_code: record.origin_code,
                        destination_code: record.destination_code,
                        total_weight_kg: record.weight_kg,
                        total_distance_km: record.distance_km,
                        total_co2e_kg,
                        co2e_intensity: factor,
                        main_transport_mode: record.transport_mode,
                        tracking_number: record.tracking_number || null,
                        status: 'Calculated',
                        source: 'Bulk'
                    });
                    successCount++;
                }

                setIsProcessing(false);
                return { count: successCount };
            } catch (error) {
                setIsProcessing(false);
                throw error;
            }
        },
        onSuccess: (data) => {
            toast.success(`Successfully imported ${data.count} shipment records.`);
            queryClient.invalidateQueries();
            onOpenChange(false);
            setFile(null);
        }
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Bulk Shipment Import</DialogTitle>
                    <DialogDescription>
                        Upload a CSV or Excel file containing shipment data. 
                        System will automatically calculate emissions using GLEC framework.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="p-8 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50 text-center hover:bg-slate-100 transition-colors relative">
                        <input 
                            type="file" 
                            className="absolute inset-0 opacity-0 cursor-pointer" 
                            onChange={handleFileChange}
                            accept=".csv,.xlsx,.xls"
                        />
                        {file ? (
                            <div className="flex flex-col items-center">
                                <FileText className="w-10 h-10 text-indigo-600 mb-2" />
                                <p className="font-medium text-slate-900">{file.name}</p>
                                <p className="text-xs text-slate-500">{(file.size/1024).toFixed(1)} KB</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center">
                                <Upload className="w-10 h-10 text-slate-300 mb-2" />
                                <p className="font-medium text-slate-700">Drag & Drop or Click to Upload</p>
                                <p className="text-xs text-slate-400 mt-1">Supports CSV, Excel (Max 10MB)</p>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between items-center text-xs text-slate-500">
                        <span>Required columns: ShipmentID, Date, Origin, Dest, Weight, Mode</span>
                        <Button variant="link" className="p-0 h-auto text-indigo-600">Download Template</Button>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button 
                            onClick={() => importMutation.mutate()} 
                            disabled={!file || isProcessing}
                            className="bg-[#86b027] hover:bg-[#769c22] text-white"
                        >
                            {isProcessing ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Processing GLEC Engine...</> : "Import & Calculate"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}