import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
    MapPin, 
    Users, 
    FileText, 
    Truck, 
    CheckCircle2, 
    AlertTriangle, 
    ChevronRight, 
    Search, 
    Leaf, 
    Factory, 
    Ship, 
    ShieldCheck,
    FileCode,
    Download
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// Stage Component
const TraceabilityStage = ({ title, icon: Icon, status, onClick, isActive, date, subLabel }) => (
    <div 
        className={`relative flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer min-w-[160px] ${
            isActive 
                ? 'border-indigo-500 bg-indigo-50 shadow-md scale-105' 
                : 'border-slate-100 bg-white hover:border-indigo-200 hover:bg-slate-50'
        }`}
        onClick={onClick}
    >
        <div className={`p-3 rounded-full ${isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
            <Icon className="w-6 h-6" />
        </div>
        <div className="text-center">
            <p className={`text-sm font-bold ${isActive ? 'text-indigo-900' : 'text-slate-700'}`}>{title}</p>
            {subLabel && <p className="text-[10px] text-slate-500 mt-1">{subLabel}</p>}
        </div>
        {status && (
            <Badge variant="outline" className={`text-[10px] px-2 py-0.5 h-5 ${
                status === 'Verified' || status === 'Submitted' || status === 'Compliant' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                status === 'High Risk' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                'bg-slate-100 text-slate-600'
            }`}>
                {status}
            </Badge>
        )}
        {date && <span className="text-[10px] text-slate-400">{new Date(date).toLocaleDateString()}</span>}
        
        {/* Connector Line */}
        <div className="absolute top-1/2 -right-[26px] w-6 h-0.5 bg-slate-200 hidden last:hidden sm:block z-0" />
    </div>
);

// Detail View Component
const StageDetail = ({ stage, data }) => {
    if (!stage) return <div className="h-full flex items-center justify-center text-slate-400 text-sm">Select a stage to view details</div>;

    return (
        <div className="h-full animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        {stage.icon && <stage.icon className="w-5 h-5 text-indigo-600" />}
                        {stage.title}
                    </h3>
                    <p className="text-sm text-slate-500">{stage.description}</p>
                </div>
                {stage.status && (
                    <Badge className={stage.status === 'High Risk' ? 'bg-rose-500' : 'bg-emerald-600'}>
                        {stage.status}
                    </Badge>
                )}
            </div>

            <ScrollArea className="h-[calc(100%-80px)] pr-4">
                <div className="space-y-6">
                    {/* Attributes Section */}
                    {stage.attributes && (
                        <div className="grid grid-cols-2 gap-4">
                            {Object.entries(stage.attributes).map(([key, value]) => (
                                <div key={key} className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <span className="text-xs text-slate-500 uppercase tracking-wider block mb-1">{key}</span>
                                    <span className="text-sm font-medium text-slate-900 truncate block" title={value}>{value}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Documents Section */}
                    {stage.documents && stage.documents.length > 0 && (
                        <div>
                            <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                <FileText className="w-4 h-4" /> Associated Documents
                            </h4>
                            <div className="space-y-2">
                                {stage.documents.map((doc, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:shadow-sm transition-shadow">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-indigo-50 p-2 rounded text-indigo-600">
                                                <FileCode className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-slate-800">{doc.name}</p>
                                                <p className="text-xs text-slate-500">{doc.type || 'PDF'} • {doc.date}</p>
                                            </div>
                                        </div>
                                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                            <Download className="w-4 h-4 text-slate-400" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Map/Visual Section */}
                    {stage.hasMap && (
                        <div>
                            <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                <MapPin className="w-4 h-4" /> Geolocation Data
                            </h4>
                            <div className="bg-slate-100 rounded-lg h-40 flex items-center justify-center border border-slate-200 relative overflow-hidden group cursor-pointer">
                                <div className="absolute inset-0 bg-[url('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/4/5/5')] bg-cover opacity-80 transition-opacity group-hover:opacity-100"></div>
                                <div className="relative z-10 bg-white/90 px-4 py-2 rounded-full shadow-sm font-medium text-xs flex items-center gap-2">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                    {stage.attributes?.['Plots Count'] || '12'} Plots Verified
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
};

export default function TransactionTraceabilityFlow({ ddsRecord }) {
    const [selectedStage, setSelectedStage] = useState(null);

    // Fetch related data
    const { data: supplier } = useQuery({
        queryKey: ['supplier', ddsRecord?.supplier_submission_id],
        queryFn: async () => {
            if (!ddsRecord?.supplier_submission_id) return null;
            // Try to find supplier or submission
            // Assuming supplier_submission_id is Supplier ID for this demo context
            return base44.entities.Supplier.list().then(list => list.find(s => s.id === ddsRecord.supplier_submission_id));
        },
        enabled: !!ddsRecord?.supplier_submission_id
    });

    const { data: sites } = useQuery({
        queryKey: ['sites', ddsRecord?.supplier_submission_id],
        queryFn: () => base44.entities.SupplierSite.list().then(list => list.filter(s => s.supplier_id === ddsRecord?.supplier_submission_id)),
        enabled: !!ddsRecord?.supplier_submission_id
    });

    if (!ddsRecord) return null;

    // Construct Stages Data
    const stages = [
        {
            id: 'origin',
            title: 'Origin & Harvest',
            subLabel: supplier?.country || 'Unknown',
            icon: Leaf,
            status: 'Compliant',
            date: '2024-12-10',
            description: 'Land use verification and harvest data collection from source plots.',
            hasMap: true,
            attributes: {
                'Country': supplier?.country,
                'Region': supplier?.city,
                'Plots Count': '15', // Mock derived from polygon count
                'Deforestation Risk': 'Low (0%)',
                'Harvest Date': '2024-12-10'
            },
            documents: [
                { name: 'GeoJSON_Polygons.json', type: 'GeoJSON', date: '2024-12-12' },
                { name: 'Land_Tenure_Right.pdf', type: 'PDF', date: '2024-01-15' }
            ]
        },
        {
            id: 'processing',
            title: 'Processing',
            subLabel: supplier?.legal_name || 'Supplier',
            icon: Factory,
            status: supplier?.risk_level === 'high' ? 'High Risk' : 'Verified',
            date: '2024-12-15',
            description: 'Processing at supplier facility and aggregation.',
            attributes: {
                'Facility Name': sites?.[0]?.site_name || 'Primary Mill',
                'Process Type': 'Milling & Sorting',
                'Batch ID': `BATCH-${ddsRecord.id.split('-')[3] || '001'}`,
                'Chain of Custody': 'Segregated'
            },
            documents: [
                { name: 'Production_Log.csv', type: 'CSV', date: '2024-12-15' },
                { name: 'Quality_Cert.pdf', type: 'PDF', date: '2024-12-15' }
            ]
        },
        {
            id: 'transport',
            title: 'Transport',
            subLabel: 'In Transit',
            icon: Ship,
            status: 'In Progress',
            date: '2024-12-20',
            description: 'Logistics and shipment to EU border.',
            attributes: {
                'Carrier': 'Maersk Line',
                'Vessel': 'Mermaid Spirit',
                'Bill of Lading': 'BOL-8829192',
                'Port of Loading': 'Jakarta, ID',
                'Port of Entry': 'Rotterdam, NL'
            },
            documents: [
                { name: 'Bill_of_Lading.pdf', type: 'PDF', date: '2024-12-20' },
                { name: 'Packing_List.pdf', type: 'PDF', date: '2024-12-20' }
            ]
        },
        {
            id: 'compliance',
            title: 'EUDR Compliance',
            subLabel: ddsRecord.dds_reference,
            icon: ShieldCheck,
            status: ddsRecord.status,
            date: ddsRecord.submission_date,
            description: 'Due Diligence Statement submission and TRACES NT validation.',
            attributes: {
                'DDS Reference': ddsRecord.dds_reference,
                'Risk Decision': ddsRecord.risk_decision,
                'Submission Date': new Date(ddsRecord.submission_date).toLocaleString(),
                'Digital Seal': ddsRecord.digital_seal?.substring(0, 15) + '...',
                'TRACES Status': 'Accepted'
            },
            documents: [
                { name: 'DDS_Submission_Receipt.pdf', type: 'PDF', date: ddsRecord.submission_date },
                { name: 'Risk_Assessment_Report.pdf', type: 'PDF', date: ddsRecord.submission_date }
            ]
        }
    ];

    // Set initial selection
    if (!selectedStage && stages.length > 0) {
        // Don't set state during render, handle via effect or just render default
    }

    return (
        <div className="flex flex-col h-full">
            {/* Visual Flow */}
            <div className="mb-6 overflow-x-auto pb-4">
                <div className="flex items-center min-w-max px-2 gap-4">
                    {stages.map((stage, idx) => (
                        <React.Fragment key={stage.id}>
                            <TraceabilityStage 
                                {...stage} 
                                isActive={selectedStage?.id === stage.id}
                                onClick={() => setSelectedStage(stage)}
                            />
                            {/* Render connector here if not last element, already handled in component css mostly but flexible */}
                            {idx < stages.length - 1 && (
                                <ChevronRight className="w-5 h-5 text-slate-300 hidden sm:block shrink-0" />
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            <Separator className="mb-6" />

            {/* Detailed View */}
            <div className="flex-1 bg-white rounded-xl border border-slate-200 p-6 shadow-sm min-h-[300px]">
                <StageDetail 
                    stage={selectedStage || stages[3]} // Default to Compliance (last) or selected
                    data={ddsRecord}
                />
            </div>
        </div>
    );
}