import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Receipt, Download, Mail, Search, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function CustomerCarbonReceipts() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: shipments = [] } = useQuery({
    queryKey: ['logistics-shipments'],
    queryFn: () => base44.entities.LogisticsShipment.list('-shipment_date')
  });

  const filtered = shipments.filter(s => 
    s.shipment_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.consignee_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const generateReceipt = async (shipment) => {
    toast.loading("Generating carbon receipt...");
    
    const prompt = `Generate a professional carbon emissions receipt for customer.
    Shipment ID: ${shipment.shipment_id}
    Route: ${shipment.origin_code} → ${shipment.destination_code}
    Mode: ${shipment.main_transport_mode}
    Distance: ${shipment.total_distance_km} km
    Weight: ${shipment.total_weight_kg} kg
    Total CO₂e: ${shipment.total_co2e_kg} kg
    Intensity: ${shipment.co2e_intensity} g CO₂e/t-km
    
    Include: breakdown by transport mode, GLEC methodology reference, offset suggestions, 
    comparison to industry average, and environmental impact context.`;

    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            receipt_html: { type: "string" },
            offset_suggestions: { type: "string" },
            comparison_text: { type: "string" }
          }
        }
      });

      // Download as PDF (mock)
      toast.success("Receipt generated successfully");
      console.log(response);
    } catch (error) {
      toast.error("Failed to generate receipt");
    }
  };

  const emailReceipt = async (shipment) => {
    if (!shipment.consignee_name) {
      toast.error("No consignee email available");
      return;
    }

    toast.loading("Sending carbon receipt...");

    try {
      await base44.integrations.Core.SendEmail({
        to: shipment.consignee_name,
        subject: `Carbon Emissions Receipt - Shipment ${shipment.shipment_id}`,
        body: `Dear Customer,

Your shipment has been delivered. Here is your carbon emissions breakdown:

Shipment ID: ${shipment.shipment_id}
Route: ${shipment.origin_code} → ${shipment.destination_code}
Transport Mode: ${shipment.main_transport_mode}
Total CO₂e: ${shipment.total_co2e_kg} kg

This shipment's carbon intensity was ${shipment.co2e_intensity} g CO₂e/t-km, calculated using the GLEC Framework methodology.

Consider carbon offsetting to achieve carbon-neutral delivery.

Best regards,
Logistics Team`
      });

      toast.success("Receipt emailed to customer");
    } catch (error) {
      toast.error("Failed to send email");
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-[#02a1e8]/20 shadow-md">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-[#02a1e8] flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Customer Carbon Receipts
          </CardTitle>
          <p className="text-sm text-slate-500">
            Generate and send carbon emission receipts to customers for transparency
          </p>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input 
                placeholder="Search by shipment ID or customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Badge variant="secondary">
              {filtered.length} Shipments
            </Badge>
          </div>

          <div className="space-y-3">
            {filtered.slice(0, 20).map((shipment) => (
              <Card key={shipment.id} className="border-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-slate-900">{shipment.shipment_id}</h4>
                        <Badge variant="outline" className="text-xs">
                          {shipment.main_transport_mode}
                        </Badge>
                        {shipment.tracking_status === 'Delivered' && (
                          <Badge className="bg-[#86b027] text-white text-xs">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Delivered
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-slate-500">Customer</p>
                          <p className="font-medium text-slate-900">{shipment.consignee_name || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Route</p>
                          <p className="font-medium text-slate-900">
                            {shipment.origin_code} → {shipment.destination_code}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">CO₂e Emissions</p>
                          <p className="font-medium text-[#86b027]">{shipment.total_co2e_kg} kg</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Delivery Date</p>
                          <p className="font-medium text-slate-900">
                            {shipment.delivery_date ? new Date(shipment.delivery_date).toLocaleDateString() : 'In Transit'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => generateReceipt(shipment)}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        PDF
                      </Button>
                      <Button 
                        size="sm" 
                        className="bg-[#02a1e8] hover:bg-[#0290d0] text-white"
                        onClick={() => emailReceipt(shipment)}
                      >
                        <Mail className="w-4 h-4 mr-1" />
                        Email
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12">
              <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No shipments found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}