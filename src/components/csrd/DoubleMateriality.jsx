import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Target, Sparkles } from "lucide-react";
import MaterialityAssessmentModal from './MaterialityAssessmentModal';
import MaterialityInteractiveDashboard from './enhanced/MaterialityInteractiveDashboard';
import { toast } from "sonner";
import ECGTComplianceValidator from '../dpp/ECGTComplianceValidator';

export default function DoubleMateriality() {
  const [showModal, setShowModal] = useState(false);
  const [editTopic, setEditTopic] = useState(null);
  const [isAutoAssessing, setIsAutoAssessing] = useState(false);
  const queryClient = useQueryClient();

  const { data: topics = [] } = useQuery({
    queryKey: ['csrd-materiality-topics'],
    queryFn: () => base44.entities.CSRDMaterialityTopic.list()
  });

  const matrixData = topics.map(t => ({
    name: t.topic_name,
    impact: t.impact_materiality_score || 0,
    financial: t.financial_materiality_score || 0,
    isMaterial: t.is_material,
    esrs: t.esrs_standard
  }));

  const handleAutoAssess = async () => {
    setIsAutoAssessing(true);
    const loadingToast = toast.loading('🤖 AI analyzing company data and assessing ALL ESRS topics...');
    
    try {
      const { autoAssessMateriality } = await import('./CSRDMaterialityService');
      const assessedTopics = await autoAssessMateriality();

      // Save or update all topics
      for (const assessment of assessedTopics) {
        const existing = topics.find(t => t.esrs_standard === assessment.esrs_standard);
        
        if (existing) {
          await base44.entities.CSRDMaterialityTopic.update(existing.id, assessment);
        } else {
          await base44.entities.CSRDMaterialityTopic.create({
            ...assessment,
            reporting_year: new Date().getFullYear()
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['csrd-materiality-topics'] });
      toast.dismiss(loadingToast);
      toast.success(`✅ ${assessedTopics.length} topics assessed! ${assessedTopics.filter(t => t.is_material).length} are material.`);
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Assessment failed: ' + error.message);
      console.error(error);
    } finally {
      setIsAutoAssessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-transparent to-transparent pointer-events-none"></div>
        <div className="relative flex justify-between items-center">
          <div>
            <h2 className="text-xl font-extralight text-slate-900 mb-1">Double Materiality Assessment</h2>
            <p className="text-sm text-slate-500 font-light">Assess impact and financial materiality per CSRD requirements</p>
          </div>
          <div className="flex gap-3">
            <button 
              type="button"
              onClick={handleAutoAssess} 
              disabled={isAutoAssessing}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-md bg-white border border-slate-300 text-slate-900 hover:bg-slate-50 transition-all duration-200 font-light text-sm tracking-wide disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 stroke-[1.5]" />
              {isAutoAssessing ? 'Assessing...' : 'AI Auto-Assess All'}
            </button>
            <button 
              type="button"
              onClick={() => { setEditTopic(null); setShowModal(true); }} 
              className="inline-flex items-center gap-2 px-5 py-2 rounded-md bg-slate-900 text-white hover:bg-slate-800 transition-all duration-200 font-light text-sm tracking-wide"
            >
              <Plus className="w-4 h-4 stroke-[1.5]" />
              Add Topic
            </button>
          </div>
        </div>
      </div>

      <MaterialityInteractiveDashboard topics={topics} />

      <MaterialityAssessmentModal open={showModal} onOpenChange={setShowModal} topic={editTopic} />
    </div>
  );
}