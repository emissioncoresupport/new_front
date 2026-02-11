import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";
import { Loader2, Save, Upload, FileText, Sparkles, Package } from "lucide-react";
import UsageMeteringService from '@/components/billing/UsageMeteringService';

export default function NewShipmentModal({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('manual');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);
  const [legs, setLegs] = useState([]);
  const [showLegs, setShowLegs] = useState(false);
  const [formData, setFormData] = useState({
    shipment_id: '',
    origin_code: '',
    destination_code: '',
    main_transport_mode: 'Road',
    distance_km: '',
    cargo_weight_kg: '',
    tracking_status: 'Pending',
    source: 'Manual',
    shipper_name: '',
    consignee_name: '',
    tracking_number: '',
    internal_ref: '',
    supplier_id: '',
    sku_id: ''
  });

  // Fetch suppliers for linking
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list()
  });

  // Fetch SKUs for linking
  const { data: skus = [] } = useQuery({
    queryKey: ['skus'],
    queryFn: () => base44.entities.SKU.list()
  });

  const calculateDistance = async (origin, destination) => {
    if (!origin || !destination) return null;
    
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Calculate the great circle distance in kilometers between ${origin} and ${destination}. 
        These are IATA airport codes or location codes.
        Return only a JSON with the distance.`,
        response_json_schema: {
          type: "object",
          properties: {
            distance_km: { type: "number" },
            origin_city: { type: "string" },
            destination_city: { type: "string" }
          }
        }
      });
      
      return result.distance_km;
    } catch (error) {
      console.error('Distance calculation failed:', error);
      return null;
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadedFile(file);
    setIsExtracting(true);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            shipment_id: { type: "string" },
            awb_number: { type: "string" },
            tracking_number: { type: "string" },
            shipper_name: { type: "string" },
            consignee_name: { type: "string" },
            origin_code: { type: "string" },
            destination_code: { type: "string" },
            origin_airport: { type: "string" },
            destination_airport: { type: "string" },
            weight_kg: { type: "number" },
            pieces: { type: "number" },
            transport_mode: { type: "string" },
            flight_number: { type: "string" },
            shipment_date: { type: "string" }
          }
        }
      });

      if (extractResult.status === 'success' && extractResult.output) {
        const extracted = extractResult.output;
        const origin = extracted.origin_code || extracted.origin_airport || '';
        const destination = extracted.destination_code || extracted.destination_airport || '';
        
        // Auto-calculate distance
        let distance = '';
        if (origin && destination) {
          toast.info('Calculating distance...');
          const calculatedDistance = await calculateDistance(origin, destination);
          if (calculatedDistance) {
            distance = calculatedDistance.toString();
            toast.success(`Distance auto-calculated: ${calculatedDistance} km`);
          }
        }
        
        setFormData({
          ...formData,
          shipment_id: extracted.awb_number || extracted.shipment_id || formData.shipment_id,
          tracking_number: extracted.tracking_number || extracted.awb_number || '',
          shipper_name: extracted.shipper_name || '',
          consignee_name: extracted.consignee_name || '',
          origin_code: origin,
          destination_code: destination,
          cargo_weight_kg: extracted.weight_kg || '',
          distance_km: distance,
          main_transport_mode: extracted.transport_mode || 'Air',
          source: 'Document'
        });
        toast.success('Document data extracted successfully');
      } else {
        toast.error('Failed to extract data from document');
      }
    } catch (error) {
      console.error(error);
      toast.error('Document processing failed');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleAutoCalculateDistance = async () => {
    if (!formData.origin_code || !formData.destination_code) {
      toast.error('Enter origin and destination codes first');
      return;
    }
    
    setIsCalculatingDistance(true);
    const distance = await calculateDistance(formData.origin_code, formData.destination_code);
    setIsCalculatingDistance(false);
    
    if (distance) {
      setFormData({...formData, distance_km: distance.toString()});
      toast.success(`Distance calculated: ${distance} km`);
    } else {
      toast.error('Could not calculate distance automatically');
    }
  };

  const addLeg = () => {
    const newLeg = {
      id: Date.now(),
      leg_number: legs.length + 1,
      origin: '',
      destination: '',
      mode: 'Road',
      distance_km: '',
      carrier_name: ''
    };
    setLegs([...legs, newLeg]);
  };

  const removeLeg = (legId) => {
    setLegs(legs.filter(l => l.id !== legId));
  };

  const updateLeg = (legId, field, value) => {
    setLegs(legs.map(l => l.id === legId ? {...l, [field]: value} : l));
  };

  const createShipmentMutation = useMutation({
    mutationFn: async (data) => {
      const distance = parseFloat(data.distance_km) || 0;
      const weight = parseFloat(data.cargo_weight_kg) || 0;
      
      const emissionFactors = {
        'Air': 500,
        'Road': 62,
        'Sea': 16,
        'Rail': 22,
        'Multimodal': 0
      };
      
      let total_co2e_kg = 0;
      let total_distance = distance;
      
      // Calculate for multi-leg if legs exist
      if (legs.length > 0) {
        total_distance = 0;
        for (const leg of legs) {
          const legDistance = parseFloat(leg.distance_km) || 0;
          const legFactor = emissionFactors[leg.mode] || 62;
          const legCO2e = (legDistance * weight * legFactor) / 1000000;
          total_co2e_kg += legCO2e;
          total_distance += legDistance;
        }
      } else {
        const factor = emissionFactors[data.main_transport_mode] || 50;
        total_co2e_kg = (distance * weight * factor) / 1000000;
      }
      
      const shipment = await base44.entities.LogisticsShipment.create({
        shipment_id: data.shipment_id,
        shipment_date: new Date().toISOString().split('T')[0],
        shipper_name: data.shipper_name || null,
        consignee_name: data.consignee_name || null,
        origin_code: data.origin_code,
        destination_code: data.destination_code,
        main_transport_mode: legs.length > 0 ? 'Multimodal' : data.main_transport_mode,
        total_distance_km: total_distance,
        total_weight_kg: weight,
        total_co2e_kg,
        co2e_intensity: total_distance > 0 ? (total_co2e_kg * 1000000) / (total_distance * weight) : 0,
        tracking_status: data.tracking_status,
        tracking_number: data.tracking_number || null,
        internal_ref: data.internal_ref || null,
        status: 'Calculated',
        source: data.source
      });

      // Create legs
      if (legs.length > 0) {
        for (const leg of legs) {
          const legDistance = parseFloat(leg.distance_km) || 0;
          const legFactor = emissionFactors[leg.mode] || 62;
          const legCO2e = (legDistance * weight * legFactor) / 1000000;
          
          await base44.entities.LogisticsLeg.create({
            shipment_id: shipment.id,
            leg_number: leg.leg_number,
            origin_location: leg.origin,
            destination_location: leg.destination,
            mode: leg.mode,
            distance_km: legDistance,
            co2e_kg: legCO2e,
            carrier_name: leg.carrier_name || null,
            supplier_id: data.supplier_id || null,
            sku_id: data.sku_id || null
          });
        }
      } else if (data.supplier_id || data.sku_id) {
        await base44.entities.LogisticsLeg.create({
          shipment_id: shipment.id,
          supplier_id: data.supplier_id || null,
          sku_id: data.sku_id || null,
          leg_number: 1,
          mode: data.main_transport_mode,
          distance_km: distance,
          co2e_kg: total_co2e_kg
        });
      }

      await UsageMeteringService.trackShipmentCalculation({
        shipmentId: shipment.id
      });

      return shipment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logistics-shipments'] });
      toast.success('Shipment created and emissions calculated');
      onOpenChange(false);
      setFormData({
        shipment_id: '',
        origin_code: '',
        destination_code: '',
        main_transport_mode: 'Road',
        distance_km: '',
        cargo_weight_kg: '',
        tracking_status: 'Pending',
        source: 'Manual'
      });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Register New Shipment</DialogTitle>
          <DialogDescription>
            Create shipment manually, upload AWB/CMR/BOL documents, or import from SupplyLens
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            <TabsTrigger value="document">Upload Document</TabsTrigger>
            <TabsTrigger value="supplylens">From SupplyLens</TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Shipment ID</Label>
              <Input
                value={formData.shipment_id}
                onChange={(e) => setFormData({...formData, shipment_id: e.target.value})}
                placeholder="e.g., SHP-2026-001"
              />
            </div>

            <div className="space-y-2">
              <Label>Transport Mode</Label>
              <Select value={formData.main_transport_mode} onValueChange={(v) => setFormData({...formData, main_transport_mode: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Air">Air</SelectItem>
                  <SelectItem value="Road">Road</SelectItem>
                  <SelectItem value="Sea">Sea</SelectItem>
                  <SelectItem value="Rail">Rail</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Origin</Label>
              <Input
                value={formData.origin_code}
                onChange={(e) => setFormData({...formData, origin_code: e.target.value})}
                placeholder="e.g., SHA (Shanghai)"
              />
            </div>

            <div className="space-y-2">
              <Label>Destination</Label>
              <Input
                value={formData.destination_code}
                onChange={(e) => setFormData({...formData, destination_code: e.target.value})}
                placeholder="e.g., RTM (Rotterdam)"
              />
            </div>

            <div className="space-y-2">
              <Label>Distance (km)</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={formData.distance_km}
                  onChange={(e) => setFormData({...formData, distance_km: e.target.value})}
                  placeholder="Auto-calculated or enter manually"
                />
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={handleAutoCalculateDistance}
                  disabled={isCalculatingDistance || !formData.origin_code || !formData.destination_code}
                  className="shrink-0"
                >
                  {isCalculatingDistance ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-slate-500">Auto-calculates from origin/destination codes</p>
            </div>

            <div className="space-y-2">
              <Label>Cargo Weight (kg)</Label>
              <Input
                type="number"
                value={formData.cargo_weight_kg}
                onChange={(e) => setFormData({...formData, cargo_weight_kg: e.target.value})}
                placeholder="e.g., 15000"
              />
            </div>

            <div className="space-y-2">
              <Label>Shipper Name (Optional)</Label>
              <Input
                value={formData.shipper_name}
                onChange={(e) => setFormData({...formData, shipper_name: e.target.value})}
                placeholder="e.g., ABC Logistics"
              />
            </div>

            <div className="space-y-2">
              <Label>Consignee Name (Optional)</Label>
              <Input
                value={formData.consignee_name}
                onChange={(e) => setFormData({...formData, consignee_name: e.target.value})}
                placeholder="e.g., Customer Inc"
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-sm">Multi-Leg Shipment (Optional)</h4>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowLegs(!showLegs)}>
                {showLegs ? 'Hide' : 'Add'} Legs
              </Button>
            </div>
            
            {showLegs && (
              <div className="space-y-3 mb-4 p-3 bg-slate-50 rounded-lg">
                {legs.map((leg, idx) => (
                  <div key={leg.id} className="p-3 bg-white rounded border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-600">Leg {leg.leg_number}</span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeLeg(leg.id)}>
                        <Loader2 className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <Input 
                        placeholder="Origin"
                        value={leg.origin}
                        onChange={(e) => updateLeg(leg.id, 'origin', e.target.value)}
                      />
                      <Input 
                        placeholder="Destination"
                        value={leg.destination}
                        onChange={(e) => updateLeg(leg.id, 'destination', e.target.value)}
                      />
                      <Select value={leg.mode} onValueChange={(v) => updateLeg(leg.id, 'mode', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Air">Air</SelectItem>
                          <SelectItem value="Road">Road</SelectItem>
                          <SelectItem value="Sea">Sea</SelectItem>
                          <SelectItem value="Rail">Rail</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input 
                        type="number"
                        placeholder="Distance (km)"
                        value={leg.distance_km}
                        onChange={(e) => updateLeg(leg.id, 'distance_km', e.target.value)}
                      />
                      <Input 
                        placeholder="Carrier (optional)"
                        value={leg.carrier_name}
                        onChange={(e) => updateLeg(leg.id, 'carrier_name', e.target.value)}
                      />
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addLeg} className="w-full">
                  + Add Leg
                </Button>
              </div>
            )}
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium text-sm mb-3">SupplyLens Integration (Optional)</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Link to Supplier</Label>
                <Select value={formData.supplier_id} onValueChange={(v) => setFormData({...formData, supplier_id: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>None</SelectItem>
                    {suppliers.slice(0, 50).map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.legal_name || s.trade_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Link to SKU</Label>
                <Select value={formData.sku_id} onValueChange={(v) => setFormData({...formData, sku_id: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select SKU" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>None</SelectItem>
                    {skus.slice(0, 50).map(sku => (
                      <SelectItem key={sku.id} value={sku.id}>{sku.sku_code} - {sku.description}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          </TabsContent>

          <TabsContent value="document" className="space-y-4 mt-4">
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors relative">
              <input 
                type="file" 
                accept=".pdf,.jpg,.jpeg,.png"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handleFileUpload}
                disabled={isExtracting}
              />
              {uploadedFile ? (
                <div className="flex flex-col items-center gap-2">
                  <FileText className="w-12 h-12 text-emerald-600" />
                  <p className="font-medium text-slate-900">{uploadedFile.name}</p>
                  <p className="text-xs text-slate-500">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
                  {isExtracting && (
                    <div className="flex items-center gap-2 text-[#86b027] mt-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Extracting data with AI...</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <Upload className="w-12 h-12 text-slate-300" />
                  <div>
                    <p className="font-medium text-slate-700">Upload AWB, CMR, BOL, or Invoice</p>
                    <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG supported • AI-powered extraction</p>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <div className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">Air Waybill</div>
                    <div className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded">CMR</div>
                    <div className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded">Bill of Lading</div>
                  </div>
                </div>
              )}
            </div>

            {uploadedFile && !isExtracting && (
              <div className="space-y-4">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-800 text-sm">
                    <Sparkles className="w-4 h-4" />
                    <span>AI extracted the data below. Review and adjust if needed.</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Shipment/AWB Number</Label>
                    <Input
                      value={formData.shipment_id}
                      onChange={(e) => setFormData({...formData, shipment_id: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tracking Number</Label>
                    <Input
                      value={formData.tracking_number}
                      onChange={(e) => setFormData({...formData, tracking_number: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Origin</Label>
                    <Input
                      value={formData.origin_code}
                      onChange={(e) => setFormData({...formData, origin_code: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Destination</Label>
                    <Input
                      value={formData.destination_code}
                      onChange={(e) => setFormData({...formData, destination_code: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Weight (kg)</Label>
                    <Input
                      type="number"
                      value={formData.cargo_weight_kg}
                      onChange={(e) => setFormData({...formData, cargo_weight_kg: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Distance (km)</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        value={formData.distance_km}
                        onChange={(e) => setFormData({...formData, distance_km: e.target.value})}
                        placeholder="Auto-filled or manual"
                      />
                      <Button 
                        type="button"
                        variant="outline" 
                        size="icon"
                        onClick={handleAutoCalculateDistance}
                        disabled={isCalculatingDistance}
                      >
                        {isCalculatingDistance ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="supplylens" className="space-y-4 mt-4">
            <div className="text-center py-8">
              <Package className="w-16 h-16 text-slate-200 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900">Import from Purchase Orders</h3>
              <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
                Select active POs from SupplyLens to automatically create shipment records with supplier and SKU links
              </p>
              <Button variant="outline" className="mt-4">
                Browse Purchase Orders
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => createShipmentMutation.mutate(formData)}
            disabled={createShipmentMutation.isPending || !formData.shipment_id || !formData.distance_km || !formData.cargo_weight_kg}
            className="bg-[#86b027] hover:bg-[#769c22]"
          >
            {createShipmentMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
            ) : (
              <><Save className="w-4 h-4 mr-2" /> Register & Calculate</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}