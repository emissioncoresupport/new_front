import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
    BarChart3, TrendingUp, AlertTriangle, DollarSign, 
    Scale, ArrowRight, Save, Calculator, Leaf, Sparkles,
    Truck, Layers, RefreshCw, CheckCircle2, X, Loader2
} from "lucide-react";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line
} from "recharts";

export default function PFASScenarioBuilder() {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState("builder");
    const [inputs, setInputs] = useState({
        name: "New Substitution Scenario",
        current_material: "PTFE Coating",
        substitute_material: "",
        current_cost_per_unit: 5.50,
        substitute_cost_per_unit: 0,
        annual_volume: 10000,
        transition_cost: 15000,
        toxicity_score_current: 8,
        toxicity_score_substitute: 0,
        performance_impact: "Equivalent"
    });
    const [calculated, setCalculated] = useState(null);
    const [isAiSuggesting, setIsAiSuggesting] = useState(false);
    const [selectedScenarios, setSelectedScenarios] = useState([]);

    const { data: scenarios = [] } = useQuery({
        queryKey: ['substitution-scenarios'],
        queryFn: () => base44.entities.SubstitutionScenario.list('-created_date')
    });

    // AI Suggestion Handler
    const handleAiSuggest = async () => {
        if (!inputs.current_material) {
            toast.error("Please enter a current material first");
            return;
        }
        setIsAiSuggesting(true);
        try {
            const prompt = `
                Suggest 3 optimal PFAS-free substitute materials for: "${inputs.current_material}".
                Focus on industrial viability, cost, and toxicity reduction.
                
                Return a JSON object with a "suggestions" array. Each suggestion should have:
                - name (string)
                - cost_estimate (number, approx $ per unit assuming current is $${inputs.current_cost_per_unit})
                - toxicity_score (number, 1-10, low is better)
                - transition_cost_estimate (number, approx $)
                - supply_chain_risk (Low, Medium, High)
                - risk_reasoning (string, short explanation)
                - performance (Improved, Equivalent, Degraded)
            `;

            const response = await base44.integrations.Core.InvokeLLM({
                prompt,
                response_json_schema: {
                    type: "object",
                    properties: {
                        suggestions: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    name: { type: "string" },
                                    cost_estimate: { type: "number" },
                                    toxicity_score: { type: "number" },
                                    transition_cost_estimate: { type: "number" },
                                    supply_chain_risk: { type: "string" },
                                    risk_reasoning: { type: "string" },
                                    performance: { type: "string" }
                                }
                            }
                        }
                    }
                }
            });

            const result = typeof response === 'string' ? JSON.parse(response) : response;
            
            // Just pick the first one for auto-fill, or could show a modal. 
            // For simplicity/speed, we'll fill with the best one but notify user.
            const best = result.suggestions[0];
            if (best) {
                setInputs(prev => ({
                    ...prev,
                    substitute_material: best.name,
                    substitute_cost_per_unit: best.cost_estimate,
                    toxicity_score_substitute: best.toxicity_score,
                    transition_cost: best.transition_cost_estimate,
                    performance_impact: best.performance,
                    // Store risk data temporarily in state or inputs if we want to use it immediately
                    supply_chain_risk_level: best.supply_chain_risk,
                    supply_chain_risk_details: best.risk_reasoning
                }));
                toast.success(`AI Suggestion Applied: ${best.name}`);
            }
        } catch (e) {
            toast.error("Failed to get AI suggestions");
        } finally {
            setIsAiSuggesting(false);
        }
    };

    const calculateImpact = () => {
        const currentAnnualCost = inputs.current_cost_per_unit * inputs.annual_volume;
        const newAnnualCost = inputs.substitute_cost_per_unit * inputs.annual_volume;
        const annualOpExDiff = currentAnnualCost - newAnnualCost; // Positive means savings
        
        let paybackMonths = 0;
        let fiveYearSavings = 0;

        if (annualOpExDiff > 0) {
            paybackMonths = (inputs.transition_cost / annualOpExDiff) * 12;
            fiveYearSavings = (annualOpExDiff * 5) - inputs.transition_cost;
        } else {
            paybackMonths = -1; // Never pays back purely on material cost
            fiveYearSavings = (annualOpExDiff * 5) - inputs.transition_cost;
        }

        const toxicityReduction = ((inputs.toxicity_score_current - inputs.toxicity_score_substitute) / inputs.toxicity_score_current) * 100;

        // Mock supply chain risk if not set by AI
        const riskLevel = inputs.supply_chain_risk_level || "Medium";
        const riskDetails = inputs.supply_chain_risk_details || "Standard procurement lead times expected.";

        setCalculated({
            annualOpExDiff,
            paybackMonths,
            fiveYearSavings,
            toxicityReduction,
            riskLevel,
            riskDetails
        });
    };

    const saveMutation = useMutation({
        mutationFn: async () => {
            if (!calculated) return;
            
            const user = await base44.auth.me();
            const tenantId = user.tenant_id || 'default';
            
            const scenario = await base44.entities.SubstitutionScenario.create({
                tenant_id: tenantId,
                ...inputs,
                payback_period_months: calculated.paybackMonths,
                five_year_savings: calculated.fiveYearSavings,
                regulatory_risk_reduction: calculated.toxicityReduction,
                supply_chain_risk_level: calculated.riskLevel,
                supply_chain_risk_details: calculated.riskDetails,
                created_by: user.email
            });

            // Link back to any related assessments that triggered this scenario
            const assessments = await base44.entities.PFASComplianceAssessment.filter({
                status: 'non_compliant'
            });
            
            // Find assessments with matching substances
            const matchingAssessments = assessments.filter(a => 
                a.reasoning?.includes(inputs.current_material)
            );

            if (matchingAssessments.length > 0) {
                await base44.entities.SubstitutionScenario.update(scenario.id, {
                    assessment_link_id: matchingAssessments[0].id
                });
            }

            return scenario;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['substitution-scenarios']);
            toast.success("Scenario saved and linked to assessment");
        }
    });

    const toggleScenarioSelection = (id) => {
        if (selectedScenarios.includes(id)) {
            setSelectedScenarios(selectedScenarios.filter(s => s !== id));
        } else {
            if (selectedScenarios.length >= 3) {
                toast.warning("Max 3 scenarios for comparison");
                return;
            }
            setSelectedScenarios([...selectedScenarios, id]);
        }
    };

    // Chart Data for Builder
    const chartData = calculated ? [
        { year: 'Year 0', Current: 0, Substitute: inputs.transition_cost },
        { year: 'Year 1', Current: inputs.current_cost_per_unit * inputs.annual_volume, Substitute: inputs.transition_cost + (inputs.substitute_cost_per_unit * inputs.annual_volume) },
        { year: 'Year 2', Current: inputs.current_cost_per_unit * inputs.annual_volume * 2, Substitute: inputs.transition_cost + (inputs.substitute_cost_per_unit * inputs.annual_volume * 2) },
        { year: 'Year 3', Current: inputs.current_cost_per_unit * inputs.annual_volume * 3, Substitute: inputs.transition_cost + (inputs.substitute_cost_per_unit * inputs.annual_volume * 3) },
    ] : [];

    // Comparison Data Preparation
    const comparisonScenarios = scenarios.filter(s => selectedScenarios.includes(s.id));

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
                    <TabsList className="bg-white p-1 border border-slate-100">
                        <TabsTrigger value="builder" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700">
                            <Calculator className="w-4 h-4 mr-2" /> Builder
                        </TabsTrigger>
                        <TabsTrigger value="comparison" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700">
                            <Scale className="w-4 h-4 mr-2" /> Compare ({selectedScenarios.length})
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {activeTab === "builder" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Configuration Panel */}
                    <div className="lg:col-span-4 space-y-6">
                        <Card className="border-none shadow-lg shadow-slate-200/50">
                            <CardHeader className="bg-gradient-to-r from-slate-50 to-white rounded-t-xl border-b pb-4">
                                <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
                                    <Sparkles className="w-5 h-5 text-indigo-500" />
                                    Scenario Config
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 space-y-5">
                                <div className="space-y-2">
                                    <Label>Scenario Name</Label>
                                    <Input value={inputs.name} onChange={e => setInputs({...inputs, name: e.target.value})} />
                                </div>
                                
                                <div className="space-y-2">
                                    <Label>Current Material</Label>
                                    <Input value={inputs.current_material} onChange={e => setInputs({...inputs, current_material: e.target.value})} />
                                </div>

                                <div className="relative">
                                    <div className="space-y-2">
                                        <Label className="flex justify-between">
                                            Substitute Material
                                            <Button variant="link" className="h-auto p-0 text-xs text-indigo-600" onClick={handleAiSuggest} disabled={isAiSuggesting}>
                                                {isAiSuggesting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                                                AI Suggest
                                            </Button>
                                        </Label>
                                        <Input 
                                            value={inputs.substitute_material} 
                                            onChange={e => setInputs({...inputs, substitute_material: e.target.value})} 
                                            placeholder={isAiSuggesting ? "AI is thinking..." : "Enter substitute name"}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Current Cost ($)</Label>
                                        <Input type="number" value={inputs.current_cost_per_unit} onChange={e => setInputs({...inputs, current_cost_per_unit: parseFloat(e.target.value)})} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Substitute Cost ($)</Label>
                                        <Input type="number" value={inputs.substitute_cost_per_unit} onChange={e => setInputs({...inputs, substitute_cost_per_unit: parseFloat(e.target.value)})} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Annual Volume</Label>
                                        <Input type="number" value={inputs.annual_volume} onChange={e => setInputs({...inputs, annual_volume: parseFloat(e.target.value)})} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Transition Cost ($)</Label>
                                        <Input type="number" value={inputs.transition_cost} onChange={e => setInputs({...inputs, transition_cost: parseFloat(e.target.value)})} />
                                    </div>
                                </div>

                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <Label className="mb-3 block text-xs font-bold text-slate-500 uppercase">Toxicity Score (1-10)</Label>
                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span>Current</span>
                                                <span className="font-bold">{inputs.toxicity_score_current}</span>
                                            </div>
                                            <Slider 
                                                value={[inputs.toxicity_score_current]} 
                                                max={10} step={1} 
                                                onValueChange={v => setInputs({...inputs, toxicity_score_current: v[0]})}
                                            />
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-emerald-600">Substitute</span>
                                                <span className="font-bold text-emerald-600">{inputs.toxicity_score_substitute}</span>
                                            </div>
                                            <Slider 
                                                value={[inputs.toxicity_score_substitute]} 
                                                max={10} step={1} 
                                                onValueChange={v => setInputs({...inputs, toxicity_score_substitute: v[0]})}
                                                className="bg-emerald-100"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200" onClick={calculateImpact}>
                                    Run Analysis
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Saved Scenarios Selector */}
                        <Card className="border-none shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Saved Scenarios</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0 max-h-[300px] overflow-y-auto">
                                {scenarios.map(s => (
                                    <div key={s.id} className="flex items-start gap-3 p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                        <Checkbox 
                                            checked={selectedScenarios.includes(s.id)}
                                            onCheckedChange={() => toggleScenarioSelection(s.id)}
                                        />
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="font-medium text-sm text-slate-800">{s.name}</span>
                                                <Badge variant="outline" className={s.five_year_savings > 0 ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-rose-600 bg-rose-50 border-rose-200'}>
                                                    {s.five_year_savings > 0 ? 'Savings' : 'Cost'}
                                                </Badge>
                                            </div>
                                            <div className="flex justify-between text-xs text-slate-500">
                                                <span>{s.substitute_material}</span>
                                                <span>{s.supply_chain_risk_level} Risk</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Analysis Results */}
                    <div className="lg:col-span-8 space-y-6">
                        {calculated ? (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <Card className="bg-white border-l-4 border-l-emerald-500 shadow-md">
                                        <CardContent className="p-6">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium text-slate-500">Toxicity Reduction</span>
                                                <Leaf className="w-4 h-4 text-emerald-500" />
                                            </div>
                                            <h3 className="text-3xl font-bold text-emerald-700">{calculated.toxicityReduction.toFixed(0)}%</h3>
                                            <p className="text-xs text-slate-400 mt-1">Safer Chemical Profile</p>
                                        </CardContent>
                                    </Card>

                                    <Card className={`bg-white border-l-4 shadow-md ${calculated.annualOpExDiff >= 0 ? 'border-l-blue-500' : 'border-l-amber-500'}`}>
                                        <CardContent className="p-6">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium text-slate-500">Annual OpEx</span>
                                                <DollarSign className={`w-4 h-4 ${calculated.annualOpExDiff >= 0 ? 'text-blue-500' : 'text-amber-500'}`} />
                                            </div>
                                            <h3 className={`text-3xl font-bold ${calculated.annualOpExDiff >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>
                                                {calculated.annualOpExDiff >= 0 ? '+' : ''}{calculated.annualOpExDiff.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                                            </h3>
                                            <p className="text-xs text-slate-400 mt-1">{calculated.annualOpExDiff >= 0 ? 'Projected Savings' : 'Additional Cost'}</p>
                                        </CardContent>
                                    </Card>

                                    <Card className="bg-white border-l-4 border-l-purple-500 shadow-md">
                                        <CardContent className="p-6">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium text-slate-500">Supply Chain Risk</span>
                                                <Truck className="w-4 h-4 text-purple-500" />
                                            </div>
                                            <h3 className={`text-2xl font-bold ${
                                                calculated.riskLevel === 'High' ? 'text-rose-600' : 
                                                calculated.riskLevel === 'Medium' ? 'text-amber-600' : 'text-emerald-600'
                                            }`}>
                                                {calculated.riskLevel}
                                            </h3>
                                            <p className="text-xs text-slate-400 mt-1 line-clamp-1">{calculated.riskDetails}</p>
                                        </CardContent>
                                    </Card>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="md:col-span-2">
                                        <Card className="shadow-md border-none">
                                            <CardHeader>
                                                <CardTitle>Cumulative Financial Projection</CardTitle>
                                                <CardDescription>3-Year Total Cost of Ownership Comparison</CardDescription>
                                            </CardHeader>
                                            <CardContent className="h-[300px]">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <LineChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                        <XAxis dataKey="year" tick={{fontSize: 12}} />
                                                        <YAxis tick={{fontSize: 12}} tickFormatter={(val) => `$${val/1000}k`} />
                                                        <RechartsTooltip 
                                                            contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                                                            formatter={(value) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} 
                                                        />
                                                        <Legend />
                                                        <Line type="monotone" dataKey="Current" stroke="#94a3b8" strokeWidth={2} dot={false} />
                                                        <Line type="monotone" dataKey="Substitute" stroke="#6366f1" strokeWidth={3} activeDot={{ r: 6 }} />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </CardContent>
                                        </Card>
                                    </div>
                                    <div className="md:col-span-1 space-y-4">
                                        <Card className="bg-slate-50 border-slate-200 h-full">
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-sm font-bold text-slate-700">Risk Analysis</CardTitle>
                                            </CardHeader>
                                            <CardContent className="text-sm space-y-4">
                                                <div>
                                                    <span className="text-xs text-slate-400 uppercase font-bold">Performance</span>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Layers className="w-4 h-4 text-indigo-500" />
                                                        <span className="font-medium">{inputs.performance_impact}</span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <span className="text-xs text-slate-400 uppercase font-bold">Supply Chain Note</span>
                                                    <p className="mt-1 text-slate-600 text-xs leading-relaxed border-l-2 border-purple-300 pl-2">
                                                        {calculated.riskDetails}
                                                    </p>
                                                </div>
                                                <div className="pt-4">
                                                    <Button onClick={() => saveMutation.mutate()} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
                                                        <Save className="w-4 h-4 mr-2" /> Save Analysis
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 p-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                                <Scale className="w-16 h-16 mb-4 text-slate-200" />
                                <h3 className="text-xl font-semibold text-slate-600">Start Your Analysis</h3>
                                <p className="text-center max-w-md mt-2 text-slate-500">
                                    Configure the material scenario on the left. Use <span className="text-indigo-600 font-bold">AI Suggest</span> to discover optimal substitutes.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === "comparison" && (
                <div className="space-y-6">
                    {comparisonScenarios.length > 0 ? (
                        <div className="overflow-x-auto">
                            <div className="min-w-[800px] grid grid-cols-1 gap-6">
                                {/* Comparison Header */}
                                <div className="flex gap-4">
                                    {comparisonScenarios.map(s => (
                                        <Card key={s.id} className="flex-1 min-w-[280px] border-t-4 border-t-indigo-500">
                                            <CardHeader>
                                                <Badge variant="secondary" className="w-fit mb-2">{s.status}</Badge>
                                                <CardTitle className="text-lg">{s.name}</CardTitle>
                                                <CardDescription>{s.substitute_material}</CardDescription>
                                            </CardHeader>
                                            <CardContent className="space-y-6">
                                                <div>
                                                    <p className="text-xs text-slate-400 uppercase font-bold mb-1">5-Year Savings</p>
                                                    <p className={`text-2xl font-bold ${s.five_year_savings > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                        {s.five_year_savings.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                                                    </p>
                                                </div>
                                                
                                                <div className="space-y-3">
                                                    <div className="flex justify-between text-sm border-b border-slate-100 pb-2">
                                                        <span className="text-slate-500">Toxicity Reduction</span>
                                                        <span className="font-bold text-emerald-600">{s.regulatory_risk_reduction?.toFixed(0)}%</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm border-b border-slate-100 pb-2">
                                                        <span className="text-slate-500">Payback Period</span>
                                                        <span className="font-bold text-slate-700">{s.payback_period_months > 0 ? `${s.payback_period_months.toFixed(1)} Mo` : 'N/A'}</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm border-b border-slate-100 pb-2">
                                                        <span className="text-slate-500">Supply Chain Risk</span>
                                                        <Badge variant="outline" className={
                                                            s.supply_chain_risk_level === 'High' ? 'text-rose-600 bg-rose-50' :
                                                            s.supply_chain_risk_level === 'Medium' ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50'
                                                        }>
                                                            {s.supply_chain_risk_level}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex justify-between text-sm border-b border-slate-100 pb-2">
                                                        <span className="text-slate-500">Performance</span>
                                                        <span className="font-bold text-slate-700">{s.performance_impact}</span>
                                                    </div>
                                                </div>

                                                <div className="bg-slate-50 p-3 rounded text-xs text-slate-600 italic">
                                                    "{s.supply_chain_risk_details || 'No risk details available.'}"
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-200">
                            <Scale className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                            <h3 className="text-lg font-medium text-slate-700">No Scenarios Selected</h3>
                            <p className="text-slate-500">Go to the Builder tab and select saved scenarios to compare.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}