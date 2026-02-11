import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { 
  Package, Leaf, Factory, Shield, MapPin, Recycle, 
  Download, Share2, QrCode, ChevronRight, AlertCircle 
} from "lucide-react";
import WastePartnerLocator from './WastePartnerLocator';

export default function PublicDPPDisplay({ dpp }) {
  const [activeTab, setActiveTab] = useState('overview');

  const { data: wastePartners = [] } = useQuery({
    queryKey: ['waste-partners'],
    queryFn: () => base44.entities.WasteManagementPartner.list()
  });

  const handleShare = () => {
    const url = `${window.location.origin}/public-dpp?id=${dpp.dpp_id}`;
    if (navigator.share) {
      navigator.share({ title: `DPP - ${dpp.general_info?.product_name}`, url });
    } else {
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  const handleDownload = () => {
    const dataStr = JSON.stringify(dpp, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DPP-${dpp.dpp_id}.json`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Product Header */}
      <Card className="border-2 shadow-xl">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 space-y-4">
              <div>
                <Badge className="bg-emerald-500 mb-3">Published DPP</Badge>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
                  {dpp.general_info?.product_name || 'Product Name'}
                </h1>
                <p className="text-slate-600">{dpp.general_info?.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">SKU:</span>
                  <p className="font-medium">{dpp.general_info?.sku || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-slate-500">Manufacturer:</span>
                  <p className="font-medium">{dpp.general_info?.manufacturer || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-slate-500">Category:</span>
                  <p className="font-medium">{dpp.general_info?.category || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-slate-500">DPP Version:</span>
                  <p className="font-medium">{dpp.version || '1.0'}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button onClick={handleShare} variant="outline" size="sm">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
                <Button onClick={handleDownload} variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>

            {dpp.qr_code_url && (
              <div className="flex items-center justify-center">
                <div className="p-4 bg-white rounded-lg border-2 border-slate-200">
                  <img src={dpp.qr_code_url} alt="QR Code" className="w-32 h-32" />
                  <p className="text-xs text-center text-slate-500 mt-2">Scan to view</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Leaf className="w-8 h-8 mx-auto mb-2 text-emerald-600" />
            <p className="text-2xl font-bold text-slate-900">
              {dpp.sustainability_info?.carbon_footprint_kg || 0}
            </p>
            <p className="text-xs text-slate-600">kg CO2e</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Recycle className="w-8 h-8 mx-auto mb-2 text-blue-600" />
            <p className="text-2xl font-bold text-slate-900">
              {dpp.circularity_metrics?.recyclability_score || 0}/10
            </p>
            <p className="text-xs text-slate-600">Recyclability</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Package className="w-8 h-8 mx-auto mb-2 text-purple-600" />
            <p className="text-2xl font-bold text-slate-900">
              {dpp.circularity_metrics?.recycled_content_percentage || 0}%
            </p>
            <p className="text-xs text-slate-600">Recycled Content</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Shield className="w-8 h-8 mx-auto mb-2 text-rose-600" />
            <p className="text-2xl font-bold text-slate-900">
              {dpp.compliance_declarations?.length || 0}
            </p>
            <p className="text-xs text-slate-600">Certifications</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Information Tabs */}
      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <CardHeader className="border-b">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="materials">Materials</TabsTrigger>
              <TabsTrigger value="sustainability">Sustainability</TabsTrigger>
              <TabsTrigger value="compliance">Compliance</TabsTrigger>
              <TabsTrigger value="eol">End-of-Life</TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent className="p-6">
            <TabsContent value="overview">
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-lg mb-3">Product Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <span className="text-slate-500 block mb-1">Manufacturing Country</span>
                      <p className="font-medium">{dpp.supply_chain_info?.manufacturing_country || 'N/A'}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <span className="text-slate-500 block mb-1">Expected Lifetime</span>
                      <p className="font-medium">{dpp.circularity_metrics?.expected_lifetime_years || 'N/A'} years</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <span className="text-slate-500 block mb-1">Repairability Index</span>
                      <p className="font-medium">{dpp.circularity_metrics?.repairability_index || 0}/10</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <span className="text-slate-500 block mb-1">Last Updated</span>
                      <p className="font-medium">{new Date(dpp.last_updated).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="materials">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Material Composition</h3>
                {dpp.material_composition?.map((mat, idx) => (
                  <div key={idx} className="p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-slate-900">{mat.material}</h4>
                        {mat.sustainability_notes && (
                          <p className="text-sm text-slate-600 mt-1">{mat.sustainability_notes}</p>
                        )}
                      </div>
                      <span className="text-lg font-bold text-emerald-600">{mat.percentage}%</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {mat.recyclable && (
                        <Badge className="bg-emerald-100 text-emerald-700 border-0">♻️ Recyclable</Badge>
                      )}
                      {mat.hazardous && (
                        <Badge className="bg-rose-100 text-rose-700 border-0">⚠️ Hazardous</Badge>
                      )}
                      {mat.recycling_code && (
                        <Badge variant="outline">{mat.recycling_code}</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="sustainability">
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-lg mb-4">Environmental Impact</h3>
                  <div className="grid gap-4">
                    <div className="p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg border border-emerald-200">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm text-slate-600 mb-1">Carbon Footprint</p>
                          <p className="text-2xl font-bold text-emerald-700">
                            {dpp.sustainability_info?.carbon_footprint_kg || 0} kg CO2e
                          </p>
                        </div>
                        <Leaf className="w-12 h-12 text-emerald-600 opacity-20" />
                      </div>
                    </div>
                    {dpp.sustainability_info?.water_usage_liters > 0 && (
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-slate-600 mb-1">Water Usage</p>
                        <p className="text-xl font-bold text-blue-700">
                          {dpp.sustainability_info.water_usage_liters} liters
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {dpp.sustainability_info?.pcf_breakdown && (
                  <div>
                    <h4 className="font-medium mb-3">Lifecycle Stage Breakdown</h4>
                    <div className="space-y-2 text-sm">
                      {Object.entries(dpp.sustainability_info.pcf_breakdown).map(([stage, value]) => (
                        <div key={stage} className="flex justify-between p-2 bg-slate-50 rounded">
                          <span className="capitalize">{stage.replace('_', ' ')}</span>
                          <span className="font-medium">{value} kg CO2e</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="compliance">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Compliance & Certifications</h3>
                {dpp.compliance_declarations?.length > 0 ? (
                  dpp.compliance_declarations.map((dec, idx) => (
                    <div key={idx} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-slate-900">{dec.regulation}</h4>
                        <Badge className={
                          dec.status === 'Compliant' ? 'bg-emerald-500' :
                          dec.status === 'Requires Testing' ? 'bg-amber-500' : 'bg-slate-500'
                        }>{dec.status}</Badge>
                      </div>
                      <p className="text-sm text-slate-600">{dec.description}</p>
                      {dec.certificate_url && (
                        <a href={dec.certificate_url} target="_blank" rel="noopener noreferrer" 
                           className="text-sm text-blue-600 hover:underline mt-2 inline-block">
                          View Certificate →
                        </a>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 text-center py-8">No compliance declarations available</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="eol">
              <div className="space-y-6">
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-6 h-6 text-blue-600 shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold text-lg text-blue-900 mb-2">End-of-Life Instructions</h3>
                      <div className="text-sm text-blue-800 whitespace-pre-line">
                        {dpp.eol_instructions || 'No end-of-life instructions provided.'}
                      </div>
                    </div>
                  </div>
                </div>

                <WastePartnerLocator 
                  wastePartners={wastePartners}
                  productMaterials={dpp.material_composition}
                />
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}