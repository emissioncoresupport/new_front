import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, QrCode, Leaf, Package, Shield, MapPin, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PublicDPPDisplay from '@/components/dpp/PublicDPPDisplay';

export default function PublicDPPPage() {
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const dppIdFromUrl = urlParams.get('id');

  const [searchQuery, setSearchQuery] = useState(dppIdFromUrl || '');
  const [selectedDPP, setSelectedDPP] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  const { data: dppRecords = [] } = useQuery({
    queryKey: ['public-dpp-records'],
    queryFn: () => base44.entities.DPPRecord.list()
  });

  useEffect(() => {
    if (dppIdFromUrl) {
      handleSearch(dppIdFromUrl);
    }
  }, [dppIdFromUrl]);

  const handleSearch = async (query = searchQuery) => {
    if (!query.trim()) return;

    setIsSearching(true);
    
    // Search by DPP ID, SKU, or product name
    const found = dppRecords.find(dpp => 
      dpp.dpp_id?.toLowerCase().includes(query.toLowerCase()) ||
      dpp.general_info?.sku?.toLowerCase().includes(query.toLowerCase()) ||
      dpp.general_info?.product_name?.toLowerCase().includes(query.toLowerCase()) ||
      dpp.gtin?.toLowerCase().includes(query.toLowerCase())
    );

    if (found) {
      if (found.status === 'published' || found.is_public) {
        setSelectedDPP(found);
      } else {
        setSelectedDPP(null);
        alert('DPP not found or not published');
      }
    } else {
      setSelectedDPP(null);
      alert('DPP not found. Please check the ID and try again.');
    }

    setIsSearching(false);
  };

  const handleQRScan = () => {
    // In a real implementation, this would trigger camera access
    const simulatedScan = prompt('Scan QR Code (enter DPP ID):');
    if (simulatedScan) {
      setSearchQuery(simulatedScan);
      handleSearch(simulatedScan);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Digital Product Passport</h1>
                <p className="text-xs sm:text-sm text-slate-500">EU Sustainability & Transparency Portal</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        {!selectedDPP ? (
          <div className="space-y-8">
            {/* Hero Section */}
            <div className="text-center space-y-4">
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
                Access Product Information
              </h2>
              <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto">
                Search for any product's Digital Product Passport to view sustainability metrics, 
                material composition, and recycling instructions.
              </p>
            </div>

            {/* Search Section */}
            <Card className="max-w-2xl mx-auto shadow-xl border-2">
              <CardContent className="p-6 sm:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                      placeholder="Enter DPP ID, SKU, or Product Name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      className="pl-10 h-12 text-base"
                    />
                  </div>
                  <Button 
                    onClick={() => handleSearch()}
                    disabled={isSearching || !searchQuery.trim()}
                    className="bg-emerald-600 hover:bg-emerald-700 h-12 px-6"
                  >
                    {isSearching ? (
                      <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Searching...</>
                    ) : (
                      'Search'
                    )}
                  </Button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-slate-500">or</span>
                  </div>
                </div>

                <Button 
                  onClick={handleQRScan}
                  variant="outline"
                  className="w-full h-12 text-base"
                >
                  <QrCode className="w-5 h-5 mr-2" />
                  Scan QR Code
                </Button>
              </CardContent>
            </Card>

            {/* Features */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mt-12">
              <Card className="text-center p-6 hover:shadow-lg transition-shadow">
                <Leaf className="w-10 h-10 mx-auto mb-3 text-emerald-600" />
                <h3 className="font-semibold text-slate-900 mb-2">Sustainability</h3>
                <p className="text-sm text-slate-600">Carbon footprint & environmental impact data</p>
              </Card>
              <Card className="text-center p-6 hover:shadow-lg transition-shadow">
                <Package className="w-10 h-10 mx-auto mb-3 text-blue-600" />
                <h3 className="font-semibold text-slate-900 mb-2">Materials</h3>
                <p className="text-sm text-slate-600">Complete material composition & recyclability</p>
              </Card>
              <Card className="text-center p-6 hover:shadow-lg transition-shadow">
                <Shield className="w-10 h-10 mx-auto mb-3 text-purple-600" />
                <h3 className="font-semibold text-slate-900 mb-2">Compliance</h3>
                <p className="text-sm text-slate-600">Regulatory certifications & declarations</p>
              </Card>
              <Card className="text-center p-6 hover:shadow-lg transition-shadow">
                <MapPin className="w-10 h-10 mx-auto mb-3 text-rose-600" />
                <h3 className="font-semibold text-slate-900 mb-2">Recycling</h3>
                <p className="text-sm text-slate-600">Find nearest recycling partners & instructions</p>
              </Card>
            </div>

            {/* Footer Info */}
            <div className="text-center text-sm text-slate-500 mt-12">
              <p>This portal complies with EU ESPR (Ecodesign for Sustainable Products Regulation)</p>
              <p className="mt-1">All data verified and validated according to Cirpass standards</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Button 
              variant="outline" 
              onClick={() => {setSelectedDPP(null); setSearchQuery('');}}
              className="mb-4"
            >
              ← Back to Search
            </Button>
            <PublicDPPDisplay dpp={selectedDPP} />
          </div>
        )}
      </div>
    </div>
  );
}