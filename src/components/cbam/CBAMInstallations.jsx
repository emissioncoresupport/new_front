import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Factory, Plus, MapPin, CheckCircle, AlertTriangle, MoreVertical, Globe, Euro } from "lucide-react";
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import CBAMInstallationModal from './CBAMInstallationModal';
import InstallationCBAMCostPanel from './InstallationCBAMCostPanel';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function CBAMInstallations({ supplierId, scopes }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInstallation, setSelectedInstallation] = useState(null);
  const [showCostPanel, setShowCostPanel] = useState(false);
  const [costPanelInstallation, setCostPanelInstallation] = useState(null);

  const { data: installations = [], isLoading } = useQuery({
    queryKey: ['cbam-installations', supplierId, scopes],
    queryFn: async () => {
      // If supplierId is provided, filter by it. Otherwise, fetch all (admin view)
      const all = await base44.entities.CBAMInstallation.list();
      let filtered = supplierId ? all.filter(i => i.supplier_id === supplierId) : all;
      
      // Scope Filtering logic can be added here if installations need to be restricted per import
      
      return filtered;
    }
  });

  const handleEdit = (inst) => {
    setSelectedInstallation(inst);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Installations Registry</h2>
          <p className="text-sm text-slate-500">Manage production sites and emission factors</p>
        </div>
        <Button className="bg-[#86b027] hover:bg-[#769c22] text-white shadow-sm" onClick={() => { setSelectedInstallation(null); setIsModalOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Register Installation
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading installations...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {installations.map(inst => (
            <Card key={inst.id} className="border-slate-200 shadow-sm hover:border-blue-300 transition-all group">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-slate-100 rounded-lg group-hover:bg-[#86b027]/10 group-hover:text-[#86b027] transition-colors">
                    <Factory className="w-6 h-6" />
                  </div>
                  <div className="flex gap-2">
                     {inst.verification_status === 'verified' ? (
                      <div className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-medium flex items-center">
                        <CheckCircle className="w-3 h-3 mr-1" /> Verified
                      </div>
                     ) : inst.verification_status === 'flagged' ? (
                      <div className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs font-medium flex items-center">
                        <AlertTriangle className="w-3 h-3 mr-1" /> Review
                      </div>
                     ) : (
                      <div className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-medium">
                        Pending
                      </div>
                     )}
                     
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <MoreVertical className="h-4 w-4 text-slate-400" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(inst)}>Edit Details</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setCostPanelInstallation(inst); setShowCostPanel(true); }}>
                            <Euro className="w-4 h-4 mr-2" />
                            View CBAM Costs
                          </DropdownMenuItem>
                          {/* Removed - Not implemented */}
                        </DropdownMenuContent>
                      </DropdownMenu>
                  </div>
                </div>
                <h3 className="font-bold text-slate-900 mb-1 truncate">{inst.name}</h3>
                <div className="flex items-center text-sm text-slate-500 mb-4">
                  <MapPin className="w-3.5 h-3.5 mr-1" /> {inst.city}, {inst.country}
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Technology</span>
                    <span className="font-medium truncate max-w-[120px]">{inst.production_technology}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Direct EF</span>
                    <span className="font-medium">{inst.emission_factors?.direct || '-'} <span className="text-xs text-slate-400">tCO2e/t</span></span>
                  </div>
                   <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Indirect EF</span>
                    <span className="font-medium">{inst.emission_factors?.indirect || '-'} <span className="text-xs text-slate-400">tCO2e/t</span></span>
                  </div>
                </div>
                
                {inst.verification_notes && (
                  <div className="mt-4 p-2 bg-slate-50 rounded text-xs text-slate-600 italic border border-slate-100">
                    "{inst.verification_notes}"
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          <Card 
            className="border-dashed border-2 border-slate-200 shadow-sm hover:border-[#86b027] hover:bg-[#86b027]/5 transition-all cursor-pointer flex items-center justify-center min-h-[250px]"
            onClick={() => { setSelectedInstallation(null); setIsModalOpen(true); }}
          >
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                <Plus className="w-6 h-6 text-slate-400" />
              </div>
              <p className="font-medium text-slate-600">Register New Installation</p>
            </div>
          </Card>
        </div>
      )}
      
      <CBAMInstallationModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen} 
        supplierId={supplierId} 
        installation={selectedInstallation}
      />

      <Dialog open={showCostPanel} onOpenChange={setShowCostPanel}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>CBAM Cost Analysis - {costPanelInstallation?.name}</DialogTitle>
          </DialogHeader>
          {costPanelInstallation && (
            <InstallationCBAMCostPanel installation={costPanelInstallation} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}