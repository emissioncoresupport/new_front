import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { 
    Plane, Ship, Truck, Train, Package, MapPin, Scale, 
    Leaf, TrendingUp, Download, FileText, ExternalLink,
    Calculator, Info, CheckCircle2
} from "lucide-react";

export default function ShipmentCalculationDetail({ shipmentId, open, onOpenChange }) {
    const { data: shipment, isLoading } = useQuery({
        queryKey: ['shipment-detail', shipmentId],
        queryFn: () => base44.entities.LogisticsShipment.filter({ id: shipmentId }).then(res => res[0]),
        enabled: !!shipmentId
    });

    const { data: legs = [] } = useQuery({
        queryKey: ['shipment-legs', shipmentId],
        queryFn: () => base44.entities.LogisticsLeg.filter({ shipment_id: shipmentId }),
        enabled: !!shipmentId
    });

    if (!shipment) return null;

    const getModeIcon = (mode) => {
        switch(mode) {
            case 'Air': return <Plane className="w-5 h-5" />;
            case 'Sea': return <Ship className="w-5 h-5" />;
            case 'Road': return <Truck className="w-5 h-5" />;
            case 'Rail': return <Train className="w-5 h-5" />;
            default: return <Package className="w-5 h-5" />;
        }
    };

    const handleDownloadReport = () => {
        const report = `
LOGISTICS SHIPMENT EMISSION CALCULATION REPORT
═══════════════════════════════════════════════

Shipment ID: ${shipment.shipment_id}
Date: ${new Date(shipment.shipment_date).toLocaleDateString()}
Status: ${shipment.tracking_status || 'Calculated'}

ROUTE INFORMATION
─────────────────
Origin: ${shipment.origin_code}
Destination: ${shipment.destination_code}
Transport Mode: ${shipment.main_transport_mode}
Total Distance: ${shipment.total_distance_km} km
Cargo Weight: ${shipment.total_weight_kg} kg

EMISSION CALCULATION
────────────────────
Methodology: ISO 14083 / GLEC Framework
Emission Factor: ${shipment.co2e_intensity} g CO₂e/t-km
Total CO₂e Emissions: ${shipment.total_co2e_kg} kg

${legs.length > 0 ? `
MULTI-LEG BREAKDOWN
───────────────────
${legs.map((leg, i) => `
Leg ${leg.leg_number}: ${leg.origin_location || shipment.origin_code} → ${leg.destination_location || shipment.destination_code}
  Mode: ${leg.mode}
  Distance: ${leg.distance_km} km
  CO₂e: ${leg.co2e_kg} kg
  ${leg.carrier_name ? `Carrier: ${leg.carrier_name}` : ''}
`).join('')}` : ''}

TRACKING
────────
${shipment.tracking_number ? `Tracking Number: ${shipment.tracking_number}` : 'No tracking available'}
${shipment.tracking_url ? `Tracking URL: ${shipment.tracking_url}` : ''}

PARTIES
───────
Shipper: ${shipment.shipper_name || 'N/A'}
Consignee: ${shipment.consignee_name || 'N/A'}

Generated: ${new Date().toISOString()}
Source: EmissionCORE Logistics Module
        `.trim();

        const blob = new Blob([report], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `shipment_${shipment.shipment_id}_calculation.txt`;
        a.click();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        <div className="p-2 bg-[#86b027]/10 rounded-lg">
                            {getModeIcon(shipment.main_transport_mode)}
                        </div>
                        <div>
                            <div className="text-xl">Shipment Calculation: {shipment.shipment_id}</div>
                            <div className="text-sm font-normal text-slate-500">
                                {new Date(shipment.shipment_date).toLocaleDateString()} • {shipment.source || 'Manual'}
                            </div>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* KPIs */}
                    <div className="grid grid-cols-3 gap-4">
                        <Card className="border-l-4 border-l-[#86b027]">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase font-semibold">Total Emissions</p>
                                        <h3 className="text-2xl font-bold text-[#86b027] mt-1">
                                            {(shipment.total_co2e_kg || 0).toFixed(2)} <span className="text-sm text-slate-500">kg</span>
                                        </h3>
                                    </div>
                                    <Leaf className="w-8 h-8 text-[#86b027]/20" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-slate-400">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase font-semibold">Distance</p>
                                        <h3 className="text-2xl font-bold text-slate-700 mt-1">
                                            {(shipment.total_distance_km || 0).toFixed(0)} <span className="text-sm text-slate-500">km</span>
                                        </h3>
                                    </div>
                                    <MapPin className="w-8 h-8 text-slate-300" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-slate-400">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase font-semibold">Weight</p>
                                        <h3 className="text-2xl font-bold text-slate-700 mt-1">
                                            {(shipment.total_weight_kg || 0).toFixed(0)} <span className="text-sm text-slate-500">kg</span>
                                        </h3>
                                    </div>
                                    <Scale className="w-8 h-8 text-slate-300" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Route */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                Route Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-slate-500 font-medium">Origin</p>
                                    <p className="text-lg font-bold text-slate-800">{shipment.origin_code}</p>
                                </div>
                                <div className="text-slate-300">→</div>
                                <div className="text-right">
                                    <p className="text-xs text-slate-500 font-medium">Destination</p>
                                    <p className="text-lg font-bold text-slate-800">{shipment.destination_code}</p>
                                </div>
                            </div>
                            <Separator />
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-slate-500">Transport Mode</p>
                                    <Badge variant="outline" className="mt-1">{shipment.main_transport_mode}</Badge>
                                </div>
                                <div>
                                    <p className="text-slate-500">Status</p>
                                    <Badge className="mt-1 bg-[#86b027]">{shipment.status}</Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Calculation Methodology */}
                    <Card className="bg-slate-50">
                        <CardHeader>
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Calculator className="w-4 h-4" />
                                Calculation Methodology
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center gap-2 text-xs text-slate-600">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                <span className="font-medium">ISO 14083 / GLEC Framework Compliant</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-slate-500">Emission Factor</p>
                                    <p className="font-mono font-bold text-slate-800">{shipment.co2e_intensity} g CO₂e/t-km</p>
                                </div>
                                <div>
                                    <p className="text-slate-500">Calculation</p>
                                    <p className="text-slate-700 text-xs">
                                        Distance × Weight × Factor / 1,000,000
                                    </p>
                                </div>
                            </div>
                            <div className="bg-white p-3 rounded border">
                                <p className="text-xs font-mono text-slate-600">
                                    {shipment.total_distance_km} km × {shipment.total_weight_kg} kg × {shipment.co2e_intensity} g/t-km / 1,000,000 = {shipment.total_co2e_kg} kg CO₂e
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Multi-Leg Details */}
                    {legs.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4" />
                                    Multi-Leg Breakdown ({legs.length} legs)
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {legs.map((leg) => (
                                        <div key={leg.id} className="p-3 bg-slate-50 rounded border border-slate-200">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline">Leg {leg.leg_number}</Badge>
                                                    <span className="text-sm font-medium">{leg.mode}</span>
                                                </div>
                                                <span className="text-sm font-bold text-[#86b027]">{leg.co2e_kg} kg CO₂e</span>
                                            </div>
                                            <div className="text-xs text-slate-600 space-y-1">
                                                <div>{leg.origin_location || shipment.origin_code} → {leg.destination_location || shipment.destination_code}</div>
                                                <div className="flex gap-4">
                                                    <span>Distance: {leg.distance_km} km</span>
                                                    {leg.carrier_name && <span>Carrier: {leg.carrier_name}</span>}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Tracking & Parties */}
                    <div className="grid grid-cols-2 gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Tracking</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                {shipment.tracking_number ? (
                                    <>
                                        <div>
                                            <p className="text-slate-500 text-xs">Tracking Number</p>
                                            <code className="text-sm bg-slate-100 px-2 py-1 rounded">{shipment.tracking_number}</code>
                                        </div>
                                        {shipment.tracking_url && (
                                            <a href={shipment.tracking_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-xs flex items-center gap-1">
                                                Track Shipment <ExternalLink className="w-3 h-3" />
                                            </a>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-slate-400 text-xs">No tracking information</p>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Parties</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <div>
                                    <p className="text-slate-500 text-xs">Shipper</p>
                                    <p className="font-medium">{shipment.shipper_name || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500 text-xs">Consignee</p>
                                    <p className="font-medium">{shipment.consignee_name || 'N/A'}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <Button onClick={handleDownloadReport} className="flex-1 bg-[#86b027] hover:bg-[#769c22]">
                            <Download className="w-4 h-4 mr-2" />
                            Download Report
                        </Button>
                        <Button variant="outline" className="flex-1">
                            <FileText className="w-4 h-4 mr-2" />
                            Generate Certificate
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}