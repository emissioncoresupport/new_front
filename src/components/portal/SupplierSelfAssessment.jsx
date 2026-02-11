import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, AlertTriangle, FileCheck, Loader2, ClipboardList } from "lucide-react";
import { toast } from "sonner";

export default function SupplierSelfAssessment({ supplierId }) {
  const [activeAssessment, setActiveAssessment] = useState(null);
  const [responses, setResponses] = useState({});
  const [actionPlan, setActionPlan] = useState('');
  const queryClient = useQueryClient();

  const { data: assessments = [] } = useQuery({
    queryKey: ['supplier-assessments', supplierId],
    queryFn: () => base44.entities.SupplierAssessment.filter({ supplier_id: supplierId }, '-created_date')
  });

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.SupplierAssessment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-assessments'] });
      toast.success('Assessment completed successfully');
      setActiveAssessment(null);
      setResponses({});
      setActionPlan('');
    }
  });

  const assessmentTemplates = {
    cbam_readiness: {
      title: 'CBAM Readiness Assessment',
      description: 'Evaluate your readiness for Carbon Border Adjustment Mechanism compliance',
      questions: [
        { id: 'q1', text: 'Do you track Scope 1 & 2 emissions at your production facilities?', type: 'yesno' },
        { id: 'q2', text: 'Do you have verified emission data per installation?', type: 'yesno' },
        { id: 'q3', text: 'Can you provide production process details and emission factors?', type: 'yesno' },
        { id: 'q4', text: 'Do you have an accredited verifier for CBAM reporting?', type: 'yesno' },
        { id: 'q5', text: 'Are you familiar with CBAM reporting requirements?', type: 'scale' }
      ]
    },
    eudr_compliance: {
      title: 'EUDR Compliance Assessment',
      description: 'Assess compliance with EU Deforestation Regulation',
      questions: [
        { id: 'q1', text: 'Can you provide geolocation data for all sourcing locations?', type: 'yesno' },
        { id: 'q2', text: 'Do you have Due Diligence Statements (DDS) for products?', type: 'yesno' },
        { id: 'q3', text: 'Do you monitor deforestation risk in your supply chain?', type: 'yesno' },
        { id: 'q4', text: 'Are your products traceable to plot-level?', type: 'yesno' },
        { id: 'q5', text: 'Do you use satellite monitoring for deforestation detection?', type: 'yesno' }
      ]
    },
    csrd_readiness: {
      title: 'CSRD Readiness Assessment',
      description: 'Evaluate preparedness for Corporate Sustainability Reporting Directive',
      questions: [
        { id: 'q1', text: 'Do you collect ESG data across E, S, and G topics?', type: 'yesno' },
        { id: 'q2', text: 'Have you conducted a double materiality assessment?', type: 'yesno' },
        { id: 'q3', text: 'Do you have documented sustainability policies?', type: 'yesno' },
        { id: 'q4', text: 'Are your ESG metrics externally assured?', type: 'yesno' },
        { id: 'q5', text: 'How mature is your ESG reporting capability?', type: 'scale' }
      ]
    },
    general_esg: {
      title: 'General ESG Assessment',
      description: 'Comprehensive evaluation of ESG practices',
      questions: [
        { id: 'q1', text: 'Do you have a formal ESG policy?', type: 'yesno' },
        { id: 'q2', text: 'Do you measure and report GHG emissions?', type: 'yesno' },
        { id: 'q3', text: 'Do you have supplier code of conduct?', type: 'yesno' },
        { id: 'q4', text: 'Do you conduct regular ESG audits?', type: 'yesno' },
        { id: 'q5', text: 'Do you have diversity and inclusion programs?', type: 'yesno' },
        { id: 'q6', text: 'Are you ISO 14001 or ISO 45001 certified?', type: 'yesno' },
        { id: 'q7', text: 'How would you rate your overall ESG maturity?', type: 'scale' }
      ]
    }
  };

  const handleStartAssessment = (type) => {
    setActiveAssessment(type);
    setResponses({});
    setActionPlan('');
  };

  const handleSubmitAssessment = () => {
    const template = assessmentTemplates[activeAssessment];
    const totalQuestions = template.questions.length;
    const answeredQuestions = Object.keys(responses).length;

    if (answeredQuestions < totalQuestions) {
      toast.error('Please answer all questions');
      return;
    }

    // Calculate score
    let yesCount = 0;
    let scaleSum = 0;
    let scaleCount = 0;

    template.questions.forEach(q => {
      const answer = responses[q.id];
      if (q.type === 'yesno' && answer === 'yes') yesCount++;
      if (q.type === 'scale') {
        scaleSum += parseInt(answer);
        scaleCount++;
      }
    });

    const yesnoScore = (yesCount / template.questions.filter(q => q.type === 'yesno').length) * 70;
    const scaleScore = scaleCount > 0 ? (scaleSum / (scaleCount * 5)) * 30 : 0;
    const totalScore = Math.round(yesnoScore + scaleScore);

    // Determine risk level
    let riskLevel = 'low';
    if (totalScore < 40) riskLevel = 'critical';
    else if (totalScore < 60) riskLevel = 'high';
    else if (totalScore < 80) riskLevel = 'medium';

    // Identify gaps
    const gaps = template.questions
      .filter(q => q.type === 'yesno' && responses[q.id] === 'no')
      .map(q => ({
        area: q.text,
        severity: totalScore < 50 ? 'high' : 'medium',
        recommendation: `Implement processes to address: ${q.text}`
      }));

    saveMutation.mutate({
      supplier_id: supplierId,
      assessment_type: activeAssessment,
      status: 'completed',
      completion_date: new Date().toISOString(),
      score: totalScore,
      risk_level: riskLevel,
      responses,
      gaps_identified: gaps,
      action_plan: actionPlan
    });
  };

  const statusColors = {
    not_started: 'bg-slate-100 text-slate-700',
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-emerald-100 text-emerald-700',
    reviewed: 'bg-purple-100 text-purple-700'
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-[#545454]">Self-Assessment Center</h3>
        <p className="text-sm text-slate-600">Evaluate your compliance readiness and identify improvement areas</p>
      </div>

      {!activeAssessment ? (
        <>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(assessmentTemplates).map(([key, template]) => {
              const existingAssessment = assessments.find(a => a.assessment_type === key);
              
              return (
                <Card key={key} className="hover:border-[#86b027] transition-colors cursor-pointer" onClick={() => handleStartAssessment(key)}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base">{template.title}</CardTitle>
                        <p className="text-xs text-slate-600 mt-1">{template.description}</p>
                      </div>
                      {existingAssessment && (
                        <Badge className={statusColors[existingAssessment.status]}>
                          {existingAssessment.status.replace('_', ' ')}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">{template.questions.length} questions</span>
                      {existingAssessment && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs">Score:</span>
                          <Badge variant="outline" className="font-bold">
                            {existingAssessment.score}/100
                          </Badge>
                        </div>
                      )}
                    </div>
                    <Button className="w-full mt-3 bg-[#86b027]" size="sm">
                      {existingAssessment ? 'Retake Assessment' : 'Start Assessment'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Past Assessments */}
          {assessments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Assessment History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {assessments.map(assessment => (
                    <div key={assessment.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {assessment.risk_level === 'low' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                        {assessment.risk_level !== 'low' && <AlertTriangle className="w-5 h-5 text-amber-600" />}
                        <div>
                          <p className="font-medium text-sm">
                            {assessmentTemplates[assessment.assessment_type]?.title}
                          </p>
                          <p className="text-xs text-slate-600">
                            {new Date(assessment.completion_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">Score: {assessment.score}/100</Badge>
                        <Badge className={
                          assessment.risk_level === 'low' ? 'bg-emerald-100 text-emerald-700' :
                          assessment.risk_level === 'medium' ? 'bg-blue-100 text-blue-700' :
                          assessment.risk_level === 'high' ? 'bg-amber-100 text-amber-700' :
                          'bg-rose-100 text-rose-700'
                        }>
                          {assessment.risk_level} risk
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card className="border-[#86b027]">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>{assessmentTemplates[activeAssessment].title}</CardTitle>
                <p className="text-sm text-slate-600 mt-1">{assessmentTemplates[activeAssessment].description}</p>
              </div>
              <Button variant="outline" onClick={() => setActiveAssessment(null)}>
                Cancel
              </Button>
            </div>
            <Progress value={(Object.keys(responses).length / assessmentTemplates[activeAssessment].questions.length) * 100} className="mt-4" />
          </CardHeader>
          <CardContent className="space-y-6">
            {assessmentTemplates[activeAssessment].questions.map((question, idx) => (
              <div key={question.id} className="p-4 bg-slate-50 rounded-lg">
                <Label className="text-sm font-medium mb-3 block">
                  {idx + 1}. {question.text}
                </Label>
                
                {question.type === 'yesno' && (
                  <RadioGroup value={responses[question.id]} onValueChange={(val) => setResponses({...responses, [question.id]: val})}>
                    <div className="flex gap-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id={`${question.id}-yes`} />
                        <Label htmlFor={`${question.id}-yes`} className="cursor-pointer">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id={`${question.id}-no`} />
                        <Label htmlFor={`${question.id}-no`} className="cursor-pointer">No</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="partial" id={`${question.id}-partial`} />
                        <Label htmlFor={`${question.id}-partial`} className="cursor-pointer">Partially</Label>
                      </div>
                    </div>
                  </RadioGroup>
                )}

                {question.type === 'scale' && (
                  <RadioGroup value={responses[question.id]} onValueChange={(val) => setResponses({...responses, [question.id]: val})}>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map(num => (
                        <div key={num} className="flex items-center space-x-2">
                          <RadioGroupItem value={num.toString()} id={`${question.id}-${num}`} />
                          <Label htmlFor={`${question.id}-${num}`} className="cursor-pointer">{num}</Label>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">1 = Not at all, 5 = Fully implemented</p>
                  </RadioGroup>
                )}
              </div>
            ))}

            <div>
              <Label className="text-sm font-medium mb-2 block">Action Plan (Optional)</Label>
              <Textarea
                value={actionPlan}
                onChange={(e) => setActionPlan(e.target.value)}
                placeholder="Describe your plan to address identified gaps..."
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setActiveAssessment(null)}>Cancel</Button>
              <Button 
                onClick={handleSubmitAssessment} 
                disabled={saveMutation.isPending}
                className="bg-[#86b027]"
              >
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Complete Assessment
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}