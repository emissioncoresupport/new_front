import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, RefreshCw, CheckCircle2, AlertTriangle, Database, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from 'react-markdown';

export default function CSRDNarrativeAssistant({ esrsStandard, disclosureRequirement, existingContent, onContentUpdate }) {
  const [content, setContent] = useState(existingContent || '');
  const [aiDraft, setAiDraft] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [complianceScore, setComplianceScore] = useState(null);
  const [dataGaps, setDataGaps] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Fetch company-specific data points for this ESRS standard
  const { data: dataPoints = [] } = useQuery({
    queryKey: ['csrd-data-points', esrsStandard],
    queryFn: () => base44.entities.CSRDDataPoint.filter({ esrs_standard: esrsStandard })
  });

  // Fetch existing narratives for reference
  const { data: narratives = [] } = useQuery({
    queryKey: ['csrd-narratives', esrsStandard],
    queryFn: () => base44.entities.CSRDNarrative.filter({ esrs_standard: esrsStandard })
  });

  // Fetch materiality topics for context
  const { data: materialityTopics = [] } = useQuery({
    queryKey: ['csrd-materiality-topics', esrsStandard],
    queryFn: () => base44.entities.CSRDMaterialityTopic.filter({ esrs_standard: esrsStandard })
  });

  // Fetch supplier data for value chain context
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers-csrd'],
    queryFn: () => base44.entities.Supplier.list('-created_date', 10)
  });

  const handleGenerateDraft = async () => {
    setIsGenerating(true);
    toast.loading('AI is analyzing your data and generating EFRAG-compliant narrative...');

    try {
      // Build company-specific data context
      const materialityContext = materialityTopics.length > 0 
        ? `Materiality Assessment Results:
${materialityTopics.map(t => `- ${t.topic_name}: Impact Score ${t.impact_materiality_score}/10, Financial Score ${t.financial_materiality_score}/10 (${t.is_material ? 'MATERIAL' : 'Not Material'})`).join('\n')}`
        : 'No materiality assessment data available yet.';

      const dataPointsContext = dataPoints.length > 0
        ? `Available Data Points for ${esrsStandard}:
${dataPoints.map(dp => `- ${dp.metric_name} (${dp.esrs_code}): ${dp.value} ${dp.unit} (Year: ${dp.reporting_year}, Quality: ${dp.verification_status})`).join('\n')}`
        : `No data points collected yet for ${esrsStandard}.`;

      const supplierContext = suppliers.length > 0
        ? `Value Chain Context: ${suppliers.length} suppliers tracked, including ${suppliers.slice(0, 3).map(s => `${s.legal_name} (${s.country})`).join(', ')}`
        : 'No supplier data available.';

      const prompt = `You are a CSRD sustainability reporting expert following EFRAG IG 1 (Materiality Assessment) and EFRAG IG 3 (Implementation Guidance).

TASK: Generate a comprehensive, data-driven narrative for ${esrsStandard} - ${disclosureRequirement}

COMPANY-SPECIFIC DATA AVAILABLE:
${materialityContext}

${dataPointsContext}

${supplierContext}

EFRAG IG 1 REQUIREMENTS (Double Materiality per Step 3):
- Impact Materiality: Assess Severity × Likelihood of impact on people/environment
- Financial Materiality: Assess Magnitude × Probability of financial effect on company
- Justify materiality determination with evidence
- Include stakeholder engagement results

NARRATIVE REQUIREMENTS (EFRAG December 2024):
1. Double materiality perspective (impact + financial materiality)
2. Time horizons (short <3y, medium 3-10y, long >10y)
3. Policies, governance, and due diligence processes
4. Actions taken and planned with timelines
5. Measurable targets and KPIs (reference actual data points above)
6. Risks and opportunities assessment
7. Stakeholder engagement approach and outcomes

${content ? `CURRENT DRAFT TO IMPROVE:\n${content}\n\n` : ''}

Generate a professional, data-driven narrative (400-600 words) that:
- Uses the ACTUAL data points provided above with specific numbers and metrics
- References company-specific context (suppliers, materiality scores)
- Follows EFRAG IG 1 methodology
- Addresses any missing data by noting where additional information is needed
- Uses professional sustainability reporting language`;

      const response = await base44.integrations.Core.InvokeLLM({ prompt });
      
      setAiDraft(response);
      toast.dismiss();
      toast.success('Data-driven draft generated!');
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to generate draft');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnalyzeCompliance = async () => {
    if (!content) {
      toast.error('No content to analyze');
      return;
    }

    setIsAnalyzing(true);
    toast.loading('Performing deep EFRAG compliance analysis with data gap detection...');

    try {
      // Build data availability summary
      const dataPointsContext = dataPoints.length > 0
        ? `Available Data Points:\n${dataPoints.map(dp => `- ${dp.metric_name} (${dp.esrs_code}): ${dp.value} ${dp.unit}`).join('\n')}`
        : 'No quantitative data points available.';

      const materialityContext = materialityTopics.length > 0
        ? `Materiality Scores: Impact ${materialityTopics[0]?.impact_materiality_score || 'N/A'}/10, Financial ${materialityTopics[0]?.financial_materiality_score || 'N/A'}/10`
        : 'No materiality assessment completed.';

      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an EFRAG compliance auditor. Analyze this CSRD narrative against EFRAG IG 1 (Materiality Assessment) and EFRAG IG 3 (Implementation Guidance) standards.

ESRS STANDARD: ${esrsStandard}
DISCLOSURE REQUIREMENT: ${disclosureRequirement}

COMPANY DATA AVAILABLE:
${dataPointsContext}

${materialityContext}

NARRATIVE TO ANALYZE:
${content}

EFRAG IG 1 COMPLIANCE CHECKLIST:
☐ Double Materiality Assessment (Severity × Likelihood for Impact; Magnitude × Probability for Financial)
☐ Stakeholder engagement documented
☐ Justification for materiality determination
☐ Time horizons specified (short/medium/long-term)
☐ Policies and governance structures described
☐ Actions taken and planned with timelines
☐ Measurable targets and KPIs referenced
☐ Risks and opportunities identified
☐ Value chain considerations (upstream/downstream)
☐ Quantitative data points integrated

Provide detailed analysis:
1. EFRAG Compliance Score (0-100) based on checklist above
2. Specific improvement suggestions (reference EFRAG IG sections)
3. Strengths of current narrative
4. DATA GAPS: List specific missing data points or metrics that should be collected to improve disclosure quality
5. Cross-reference actual data availability vs narrative claims`,
        response_json_schema: {
          type: 'object',
          properties: {
            compliance_score: { type: 'number', description: 'Score 0-100' },
            suggestions: { type: 'array', items: { type: 'string' } },
            strengths: { type: 'array', items: { type: 'string' } },
            data_gaps: { 
              type: 'array', 
              items: { 
                type: 'object',
                properties: {
                  gap_description: { type: 'string' },
                  required_data_point: { type: 'string' },
                  esrs_code: { type: 'string' },
                  priority: { type: 'string', enum: ['high', 'medium', 'low'] }
                }
              }
            },
            efrag_section_references: { type: 'array', items: { type: 'string' } }
          }
        }
      });

      setComplianceScore(analysis.compliance_score);
      setSuggestions(analysis.suggestions || []);
      setDataGaps(analysis.data_gaps || []);
      
      toast.dismiss();
      toast.success(`Analysis complete! Compliance: ${analysis.compliance_score}/100`);
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to analyze content');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAcceptAIDraft = () => {
    setContent(aiDraft);
    onContentUpdate?.(aiDraft);
    setAiDraft('');
    toast.success('AI draft accepted');
  };

  return (
    <div className="space-y-4">
      {/* Data Availability Summary */}
      <div className="relative bg-gradient-to-br from-blue-50/60 via-blue-50/40 to-blue-50/30 backdrop-blur-xl rounded-2xl border border-blue-300/40 shadow-[0_4px_16px_rgba(59,130,246,0.12)] overflow-hidden">
        <div className="relative p-4">
          <div className="flex items-start gap-3">
            <Database className="w-5 h-5 text-[#02a1e8] shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-light text-slate-900 mb-2">Company Data Available for {esrsStandard}</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-slate-500 font-light">Data Points</p>
                  <p className="font-light text-2xl text-[#02a1e8]">{dataPoints.length}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-light">Materiality Assessed</p>
                  <p className="font-light text-2xl text-[#86b027]">{materialityTopics.length > 0 ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-light">Suppliers Tracked</p>
                  <p className="font-light text-2xl text-slate-700">{suppliers.length}</p>
                </div>
              </div>
              {dataPoints.length === 0 && (
                <p className="text-xs text-amber-700 mt-2 font-light">⚠️ Limited data available. AI will flag missing data points in analysis.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-transparent to-transparent pointer-events-none"></div>
        <div className="relative">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#86b027]" />
              <h3 className="text-xl font-extralight text-slate-900">AI Narrative Assistant (EFRAG IG 1 & IG 3)</h3>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleGenerateDraft}
                disabled={isGenerating}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-white/60 backdrop-blur-md border border-white/60 text-slate-700 hover:bg-white transition-all duration-200 font-light text-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 stroke-[1.5] ${isGenerating ? 'animate-spin' : ''}`} />
                Generate Draft
              </button>
              <button
                type="button"
                onClick={handleAnalyzeCompliance}
                disabled={!content || isAnalyzing}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-white/60 backdrop-blur-md border border-white/60 text-slate-700 hover:bg-white transition-all duration-200 font-light text-sm disabled:opacity-50"
              >
                <CheckCircle2 className={`w-4 h-4 stroke-[1.5] ${isAnalyzing ? 'animate-spin' : ''}`} />
                Analyze & Find Gaps
              </button>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Narrative Content</label>
              {complianceScore !== null && (
                <Badge className={complianceScore >= 80 ? 'bg-emerald-500' : complianceScore >= 60 ? 'bg-amber-500' : 'bg-rose-500'}>
                  EFRAG Score: {complianceScore}/100
                </Badge>
              )}
            </div>
            <Textarea
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                onContentUpdate?.(e.target.value);
              }}
              placeholder="Write your narrative here, or click 'Generate Draft' for AI assistance..."
              className="h-64 font-mono text-sm"
            />
            <p className="text-xs text-slate-500">{content.length} characters / {content.split(/\s+/).filter(Boolean).length} words</p>
          </div>

          {suggestions.length > 0 && (
            <div className="p-4 bg-amber-50/60 backdrop-blur-md border border-amber-300/40 rounded-xl">
              <h4 className="font-light text-amber-900 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                EFRAG Compliance Improvements
              </h4>
              <ul className="text-sm text-amber-800 space-y-1">
                {suggestions.map((sug, idx) => (
                  <li key={idx}>• {sug}</li>
                ))}
              </ul>
            </div>
          )}

          {dataGaps.length > 0 && (
            <div className="p-4 bg-rose-50/60 backdrop-blur-md border border-rose-300/40 rounded-xl">
              <h4 className="font-light text-rose-900 mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Data Gap Analysis - Required Data Points
              </h4>
              <div className="space-y-3">
                {dataGaps.map((gap, idx) => (
                  <div key={idx} className="p-3 bg-white rounded border-l-4 border-rose-400">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-sm text-rose-900">{gap.required_data_point}</p>
                      <Badge className={
                        gap.priority === 'high' ? 'bg-rose-600' : 
                        gap.priority === 'medium' ? 'bg-amber-500' : 'bg-slate-500'
                      }>
                        {gap.priority} priority
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-700 mb-1">{gap.gap_description}</p>
                    {gap.esrs_code && (
                      <p className="text-xs text-slate-500">ESRS Code: {gap.esrs_code}</p>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-rose-700 mt-3 font-medium">
                💡 Collect these data points to improve EFRAG compliance and disclosure quality
              </p>
            </div>
          )}

          {aiDraft && (
            <div className="p-4 bg-[#86b027]/10 backdrop-blur-md border border-[#86b027]/30 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-light text-slate-900">AI-Generated Draft</h4>
                <button
                  type="button"
                  onClick={handleAcceptAIDraft}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-slate-900 text-white hover:bg-slate-800 transition-all duration-200 font-light text-sm"
                >
                  Use This Draft
                </button>
              </div>
              <div className="prose prose-sm max-w-none text-slate-700">
                <ReactMarkdown>{aiDraft}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}