import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, Leaf } from "lucide-react";
import CreateLCAStudyModal from './CreateLCAStudyModal';

export default function LCAStudyList({ onStudyClick }) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: studies = [] } = useQuery({
    queryKey: ['lca-studies'],
    queryFn: () => base44.entities.LCAStudy.list('-created_date')
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list()
  });

  const filteredStudies = studies.filter(s => 
    s.study_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    products.find(p => p.id === s.product_id)?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#545454]">LCA Studies</h2>
          <p className="text-slate-500 text-sm">Manage your life cycle assessment projects</p>
        </div>
        <Button 
          onClick={() => setShowCreateModal(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Study
        </Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Search studies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid gap-4">
        {filteredStudies.length === 0 ? (
          <Card className="border-slate-200">
            <CardContent className="py-12 text-center">
              <Leaf className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-500 mb-2">No studies found</p>
              <p className="text-xs text-slate-400">Create a new LCA study to get started</p>
            </CardContent>
          </Card>
        ) : (
          filteredStudies.map(study => {
            const product = products.find(p => p.id === study.product_id);
            return (
              <Card key={study.id} className="border-slate-200 hover:border-emerald-300 hover:shadow-lg transition-all cursor-pointer group" onClick={() => onStudyClick(study.id)}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">{study.study_name}</h3>
                        <Badge className={
                          study.status === 'Completed' ? 'bg-emerald-100 text-emerald-700 border-0' :
                          study.status === 'In Progress' ? 'bg-amber-100 text-amber-700 border-0' :
                          study.status === 'Under Review' ? 'bg-blue-100 text-blue-700 border-0' :
                          'bg-slate-100 text-slate-700 border-0'
                        }>
                          {study.status}
                        </Badge>
                        {study.iso_compliant && (
                          <Badge variant="outline" className="border-blue-200 text-blue-700 text-xs">
                            ISO 14040/14044
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 mb-3">
                        {product?.name || 'Unknown Product'} • {study.functional_unit}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="text-xs">{study.study_type}</Badge>
                        <Badge variant="outline" className="text-xs">{study.system_boundary}</Badge>
                        <Badge variant="outline" className="text-xs">{study.impact_assessment_method}</Badge>
                        {study.geographical_scope && (
                          <Badge variant="outline" className="text-xs">{study.geographical_scope}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-emerald-600">{study.completion_percentage || 0}%</p>
                      <p className="text-xs text-slate-500">Complete</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <CreateLCAStudyModal 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={(id) => {
          setShowCreateModal(false);
          onStudyClick(id);
        }}
      />
    </div>
  );
}