import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Search, Pencil, Trash2, Upload, Sparkles, FileCheck } from "lucide-react";
import PPWRPackagingModal from './PPWRPackagingModal';
import PPWRBulkImporter from './PPWRBulkImporter';
import PPWRAIRecommendationPanel from './PPWRAIRecommendationPanel';
import PPWRVerificationDocuments from './PPWRVerificationDocuments';
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function PPWRPackagingRegistry() {
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [selectedForAI, setSelectedForAI] = useState(null);
  const [showVerificationDocs, setShowVerificationDocs] = useState(false);
  const [selectedForDocs, setSelectedForDocs] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const [editPackaging, setEditPackaging] = useState(null);
  const queryClient = useQueryClient();

  const { data: packaging = [] } = useQuery({
    queryKey: ['ppwr-packaging'],
    queryFn: () => base44.entities.PPWRPackaging.list('-created_date')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PPWRPackaging.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ppwr-packaging'] });
      toast.success('Packaging deleted');
    }
  });

  const filtered = packaging.filter(p => 
    p.packaging_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-6">
          <div className="flex justify-between items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search packaging by name, material, or supplier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-11"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowImporter(true)} variant="outline" className="border-slate-300 hover:bg-slate-50 h-11">
                <Upload className="w-4 h-4 mr-2" />
                Bulk Import
              </Button>
              <Button onClick={() => { setEditPackaging(null); setShowModal(true); }} className="bg-[#86b027] hover:bg-[#769c22] text-white shadow-md h-11">
                <Plus className="w-4 h-4 mr-2" />
                Add Packaging
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(pkg => (
          <Card key={pkg.id} className="border-slate-200 hover:shadow-lg transition-all hover:border-[#86b027]/30">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1">
                  <CardTitle className="text-base font-semibold text-slate-900 leading-tight">
                    {pkg.packaging_name}
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-1">{pkg.material_category}</p>
                </div>
                <Badge className={
                  pkg.compliance_status === 'Compliant' ? 'bg-emerald-500 hover:bg-emerald-600' :
                  pkg.compliance_status === 'Critical' ? 'bg-rose-500 hover:bg-rose-600' : 
                  'bg-amber-500 hover:bg-amber-600'
                }>
                  {pkg.compliance_status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                <span className="text-xs text-slate-600">Weight</span>
                <span className="text-sm font-semibold text-slate-900">{pkg.total_weight_kg} kg</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-emerald-50 rounded-lg">
                <span className="text-xs text-emerald-700">Recycled Content</span>
                <span className="text-sm font-bold text-emerald-700">{pkg.recycled_content_percentage}%</span>
              </div>
              {pkg.recycled_content_target && (
                <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                  <span className="text-xs text-blue-700">Target</span>
                  <span className="text-sm font-semibold text-blue-700">{pkg.recycled_content_target}%</span>
                </div>
              )}
              <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors" 
                  onClick={() => { 
                    setSelectedForDocs(pkg); 
                    setShowVerificationDocs(true); 
                  }}
                  title="View verification documents and audit trail"
                >
                  <FileCheck className="w-3 h-3" />
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1 hover:bg-purple-600 hover:text-white hover:border-purple-600 transition-colors" 
                  onClick={() => { 
                    setSelectedForAI(pkg); 
                    setShowAIPanel(true); 
                  }}
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  AI
                </Button>
                <Button size="sm" variant="outline" className="flex-1 hover:bg-[#86b027] hover:text-white hover:border-[#86b027] transition-colors" onClick={() => { setEditPackaging(pkg); setShowModal(true); }}>
                  <Pencil className="w-3 h-3 mr-1" />
                  Edit
                </Button>
                <Button size="sm" variant="outline" className="text-rose-600 hover:bg-rose-50 hover:border-rose-300" onClick={() => deleteMutation.mutate(pkg.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <PPWRPackagingModal open={showModal} onOpenChange={setShowModal} packaging={editPackaging} />
      <PPWRBulkImporter open={showImporter} onOpenChange={setShowImporter} />
      
      {/* AI Recommendations Modal */}
      <Dialog open={showAIPanel} onOpenChange={setShowAIPanel}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              AI Optimization: {selectedForAI?.packaging_name}
            </DialogTitle>
          </DialogHeader>
          {selectedForAI && <PPWRAIRecommendationPanel packaging={selectedForAI} />}
        </DialogContent>
      </Dialog>

      {/* Verification Documents Modal */}
      <Dialog open={showVerificationDocs} onOpenChange={setShowVerificationDocs}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-[#86b027]" />
              Audit & Verification: {selectedForDocs?.packaging_name}
            </DialogTitle>
          </DialogHeader>
          {selectedForDocs && <PPWRVerificationDocuments packagingId={selectedForDocs.id} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}