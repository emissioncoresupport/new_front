import React, { useState } from "react";
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, FileText, Download, Trash2, Plane, Ship, Truck, Train, Package, ExternalLink, Clock, Calculator } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import ShipmentCalculationDetail from './ShipmentCalculationDetail';

export default function ShipmentList() {
    const [selectedShipmentId, setSelectedShipmentId] = useState(null);
    const { data: shipments = [] } = useQuery({
        queryKey: ['logistics-shipments'],
        queryFn: () => base44.entities.LogisticsShipment.list()
    });

    const getTrackingStatusColor = (status) => {
        switch(status) {
            case 'Delivered': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'In Transit': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'Out for Delivery': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'Delayed': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'Cancelled': return 'bg-rose-100 text-rose-700 border-rose-200';
            default: return 'bg-slate-100 text-slate-600 border-slate-200';
        }
    };

    const getModeIcon = (mode) => {
        switch(mode) {
            case 'Air': return <Plane className="w-4 h-4" />;
            case 'Sea': return <Ship className="w-4 h-4" />;
            case 'Road': return <Truck className="w-4 h-4" />;
            case 'Rail': return <Train className="w-4 h-4" />;
            default: return <Truck className="w-4 h-4" />;
        }
    };

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <div className="flex-1 max-w-md relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input placeholder="Search shipments ID, shipper..." className="pl-9 bg-slate-50" />
                </div>
                <div className="flex gap-2">
                    <Badge variant="secondary" className="cursor-pointer hover:bg-slate-200">All: {shipments.length}</Badge>
                    <Badge variant="outline" className="cursor-pointer hover:bg-slate-100">Air: {shipments.filter(s => s.main_transport_mode === 'Air').length}</Badge>
                    <Badge variant="outline" className="cursor-pointer hover:bg-slate-100">Sea: {shipments.filter(s => s.main_transport_mode === 'Sea').length}</Badge>
                    <Badge variant="outline" className="cursor-pointer hover:bg-slate-100">Road: {shipments.filter(s => s.main_transport_mode === 'Road').length}</Badge>
                </div>
            </div>

            {/* List */}
            <div className="space-y-3">
                {shipments.map((shipment) => (
                    <div key={shipment.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start gap-4 flex-1">
                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                {getModeIcon(shipment.main_transport_mode)}
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800">{shipment.shipment_id}</h4>
                                <p className="text-xs text-slate-500">{shipment.shipper_name || 'Manual Entry'}</p>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <Badge variant="outline" className="text-[10px] h-5 bg-slate-50 text-slate-600 border-slate-200">
                                        {shipment.main_transport_mode}
                                    </Badge>
                                    <span className="text-xs text-slate-400">
                                        {new Date(shipment.shipment_date).toLocaleDateString()}
                                    </span>
                                    {shipment.tracking_status && (
                                        <Badge variant="outline" className={`text-[10px] h-5 ${getTrackingStatusColor(shipment.tracking_status)}`}>
                                            <Package className="w-3 h-3 mr-1" />
                                            {shipment.tracking_status}
                                        </Badge>
                                    )}
                                </div>
                                {shipment.tracking_number && (
                                    <div className="flex items-center gap-1 mt-1">
                                        <span className="text-xs text-slate-400">Tracking:</span>
                                        <code className="text-xs bg-slate-100 px-1 rounded">{shipment.tracking_number}</code>
                                        {shipment.tracking_url && (
                                            <a href={shipment.tracking_url} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-600">
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col md:items-end md:text-right flex-1 border-l md:border-l-0 pl-4 md:pl-0 border-slate-100">
                            <div className="text-lg font-bold text-slate-800">{(shipment.total_co2e_kg || 0).toFixed(2)} kg CO₂e</div>
                            <div className="text-xs text-slate-500">
                                {shipment.total_weight_kg || 0} kg • {shipment.total_distance_km || 0} km
                            </div>
                        </div>

                        <div className="flex flex-col md:items-end md:text-right flex-1">
                             <div className="text-sm font-medium text-slate-700">
                                 {/* Mock Route Display */}
                                 {shipment.origin_code || 'Origin'} → {shipment.destination_code || 'Destination'}
                             </div>
                             <div className="text-xs text-slate-400">
                                 Consignee: {shipment.consignee_name || 'N/A'}
                             </div>
                        </div>

                        <div className="flex items-center gap-2 md:ml-4">
                             <Button 
                                 size="icon" 
                                 variant="outline" 
                                 className="h-8 w-8 text-slate-500 hover:text-[#86b027] hover:border-[#86b027]"
                                 onClick={() => setSelectedShipmentId(shipment.id)}
                             >
                                 <Calculator className="w-4 h-4" />
                             </Button>
                             <Button size="icon" variant="outline" className="h-8 w-8 text-slate-500 hover:text-indigo-600">
                                 <Download className="w-4 h-4" />
                             </Button>
                             <Button size="icon" variant="outline" className="h-8 w-8 text-slate-500 hover:text-rose-600">
                                 <Trash2 className="w-4 h-4" />
                             </Button>
                        </div>
                    </div>
                ))}
                
                <ShipmentCalculationDetail 
                    shipmentId={selectedShipmentId} 
                    open={!!selectedShipmentId} 
                    onOpenChange={(open) => !open && setSelectedShipmentId(null)} 
                />
                
                {shipments.length === 0 && (
                    <div className="text-center py-12 bg-white rounded-lg border border-dashed border-slate-200">
                        <Truck className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-slate-900">No shipments recorded</h3>
                        <p className="text-slate-500 max-w-sm mx-auto mt-1">
                            Start by creating a new shipment or uploading a bulk file to track your logistics emissions.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}