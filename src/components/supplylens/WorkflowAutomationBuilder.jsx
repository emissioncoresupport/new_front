/**
 * Workflow Automation Builder
 * No-code workflow builder integrated into onboarding and compliance workflows
 * Replaces manual task creation with smart, rule-based automation
 */

import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, Plus, Trash2, ArrowRight } from "lucide-react";
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";

export default function WorkflowAutomationBuilder({ supplierId, onSave }) {
    const [workflow, setWorkflow] = useState({
        name: '',
        trigger: 'supplier_created',
        conditions: [],
        actions: []
    });

    const addCondition = () => {
        setWorkflow(prev => ({
            ...prev,
            conditions: [...prev.conditions, { field: 'risk_level', operator: 'equals', value: 'high' }]
        }));
    };

    const addAction = () => {
        setWorkflow(prev => ({
            ...prev,
            actions: [...prev.actions, { type: 'send_questionnaire', config: {} }]
        }));
    };

    const saveWorkflow = async () => {
        try {
            await base44.entities.WorkflowAutomation.create({
                ...workflow,
                supplier_id: supplierId,
                status: 'active'
            });
            toast.success('Workflow automation created');
            if (onSave) onSave();
        } catch (error) {
            toast.error('Failed to save workflow');
        }
    };

    return (
        <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-transparent to-transparent pointer-events-none"></div>
            <div className="relative p-6 space-y-6">
                <div className="flex items-center gap-3">
                    <Zap className="w-6 h-6 text-[#86b027]" />
                    <h3 className="text-lg font-light text-slate-900">Workflow Automation</h3>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-light text-slate-700">Workflow Name</label>
                        <Input 
                            placeholder="e.g. High-Risk Supplier Follow-Up"
                            value={workflow.name}
                            onChange={(e) => setWorkflow({...workflow, name: e.target.value})}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-light text-slate-700">Trigger</label>
                        <Select value={workflow.trigger} onValueChange={(v) => setWorkflow({...workflow, trigger: v})}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="supplier_created">Supplier Created</SelectItem>
                                <SelectItem value="risk_level_changed">Risk Level Changed</SelectItem>
                                <SelectItem value="questionnaire_completed">Questionnaire Completed</SelectItem>
                                <SelectItem value="adverse_impact_identified">Adverse Impact Identified</SelectItem>
                                <SelectItem value="sanctions_hit">Sanctions Match</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-light text-slate-700">Conditions</label>
                            <Button size="sm" variant="ghost" onClick={addCondition} className="h-7 text-xs">
                                <Plus className="w-3 h-3 mr-1" /> Add
                            </Button>
                        </div>
                        {workflow.conditions.map((cond, idx) => (
                            <div key={idx} className="flex items-center gap-2 p-3 bg-white/40 rounded-lg border border-white/60">
                                <Select value={cond.field} onValueChange={(v) => {
                                    const newConds = [...workflow.conditions];
                                    newConds[idx].field = v;
                                    setWorkflow({...workflow, conditions: newConds});
                                }}>
                                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="risk_level">Risk Level</SelectItem>
                                        <SelectItem value="country">Country</SelectItem>
                                        <SelectItem value="tier">Tier</SelectItem>
                                        <SelectItem value="cbam_relevant">CBAM Relevant</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select value={cond.operator} onValueChange={(v) => {
                                    const newConds = [...workflow.conditions];
                                    newConds[idx].operator = v;
                                    setWorkflow({...workflow, conditions: newConds});
                                }}>
                                    <SelectTrigger className="h-8 text-xs w-24"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="equals">Equals</SelectItem>
                                        <SelectItem value="not_equals">Not Equals</SelectItem>
                                        <SelectItem value="contains">Contains</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Input 
                                    className="h-8 text-xs"
                                    value={cond.value}
                                    onChange={(e) => {
                                        const newConds = [...workflow.conditions];
                                        newConds[idx].value = e.target.value;
                                        setWorkflow({...workflow, conditions: newConds});
                                    }}
                                />
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                                    setWorkflow({...workflow, conditions: workflow.conditions.filter((_, i) => i !== idx)});
                                }}>
                                    <Trash2 className="w-3 h-3" />
                                </Button>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-light text-slate-700">Actions</label>
                            <Button size="sm" variant="ghost" onClick={addAction} className="h-7 text-xs">
                                <Plus className="w-3 h-3 mr-1" /> Add
                            </Button>
                        </div>
                        {workflow.actions.map((action, idx) => (
                            <div key={idx} className="flex items-center gap-2 p-3 bg-[#86b027]/10 rounded-lg border border-[#86b027]/30">
                                <Select value={action.type} onValueChange={(v) => {
                                    const newActions = [...workflow.actions];
                                    newActions[idx].type = v;
                                    setWorkflow({...workflow, actions: newActions});
                                }}>
                                    <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="send_questionnaire">Send Questionnaire</SelectItem>
                                        <SelectItem value="send_email">Send Email</SelectItem>
                                        <SelectItem value="create_task">Create Task</SelectItem>
                                        <SelectItem value="trigger_audit">Trigger Audit</SelectItem>
                                        <SelectItem value="escalate_risk">Escalate Risk</SelectItem>
                                        <SelectItem value="run_sanctions_check">Run Sanctions Check</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                                    setWorkflow({...workflow, actions: workflow.actions.filter((_, i) => i !== idx)});
                                }}>
                                    <Trash2 className="w-3 h-3" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-white/40">
                    <Button variant="outline" onClick={() => setWorkflow({ name: '', trigger: 'supplier_created', conditions: [], actions: [] })}>
                        Clear
                    </Button>
                    <Button onClick={saveWorkflow} className="bg-slate-900 hover:bg-slate-800 text-white">
                        Save Workflow
                    </Button>
                </div>
            </div>
        </div>
    );
}