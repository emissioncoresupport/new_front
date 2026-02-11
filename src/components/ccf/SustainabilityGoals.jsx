import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Target, Plus, Trash2, TrendingDown, Calendar, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function SustainabilityGoals() {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const queryClient = useQueryClient();

    const [newGoal, setNewGoal] = useState({
        name: "",
        type: "Custom",
        scope: "All Scopes",
        baseline_year: new Date().getFullYear() - 1,
        target_year: 2030,
        baseline_value: "",
        reduction_target_percent: "",
        current_value: "",
        status: "On Track"
    });

    const { data: goals = [] } = useQuery({
        queryKey: ['sustainability-goals'],
        queryFn: () => base44.entities.SustainabilityGoal.list()
    });

    const createGoalMutation = useMutation({
        mutationFn: (data) => base44.entities.SustainabilityGoal.create({
            ...data,
            baseline_value: Number(data.baseline_value),
            reduction_target_percent: Number(data.reduction_target_percent),
            current_value: Number(data.current_value || data.baseline_value)
        }),
        onSuccess: () => {
            queryClient.invalidateQueries(['sustainability-goals']);
            setIsCreateOpen(false);
            toast.success("Goal created successfully");
            setNewGoal({
                name: "",
                type: "Custom",
                scope: "All Scopes",
                baseline_year: new Date().getFullYear() - 1,
                target_year: 2030,
                baseline_value: "",
                reduction_target_percent: "",
                current_value: "",
                status: "On Track"
            });
        }
    });

    const deleteGoalMutation = useMutation({
        mutationFn: (id) => base44.entities.SustainabilityGoal.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries(['sustainability-goals']);
            toast.success("Goal removed");
        }
    });

    const calculateProgress = (goal) => {
        if (!goal.baseline_value || !goal.reduction_target_percent) return 0;
        const targetValue = goal.baseline_value * (1 - goal.reduction_target_percent / 100);
        const totalReductionNeeded = goal.baseline_value - targetValue;
        const currentReduction = goal.baseline_value - goal.current_value;
        
        let progress = (currentReduction / totalReductionNeeded) * 100;
        return Math.min(Math.max(progress, 0), 100);
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Sustainability Goals</h2>
                    <p className="text-slate-500">Track progress against SBTi and custom reduction targets.</p>
                </div>
                <Button onClick={() => setIsCreateOpen(true)} className="bg-[#86b027] hover:bg-[#769c22] text-white">
                    <Plus className="w-4 h-4 mr-2" /> Add New Goal
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {goals.map(goal => {
                    const progress = calculateProgress(goal);
                    const targetValue = goal.baseline_value * (1 - goal.reduction_target_percent / 100);

                    return (
                        <Card key={goal.id} className="hover:shadow-md transition-all border-l-4 border-l-[#86b027]">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <Badge variant="outline" className="mb-2 bg-slate-50 border-slate-200 text-slate-600">
                                            {goal.type} • {goal.scope}
                                        </Badge>
                                        <CardTitle className="text-lg font-bold text-slate-800">{goal.name}</CardTitle>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500" onClick={() => deleteGoalMutation.mutate(goal.id)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <div className="text-3xl font-bold text-[#86b027]">
                                                {goal.reduction_target_percent}%
                                            </div>
                                            <div className="text-xs text-slate-500">Reduction Target</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-medium text-slate-700">
                                                Target: {targetValue.toFixed(0)} tCO₂e
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                by {goal.target_year} (Base: {goal.baseline_year})
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                            <span>Progress</span>
                                            <span className="font-bold">{progress.toFixed(1)}%</span>
                                        </div>
                                        <Progress value={progress} className="h-2" indicatorClassName="bg-[#86b027]" />
                                    </div>

                                    <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            {goal.status === 'On Track' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : 
                                             goal.status === 'At Risk' ? <AlertCircle className="w-4 h-4 text-amber-500" /> :
                                             <TrendingDown className="w-4 h-4 text-red-500" />}
                                            <span className="text-sm font-medium text-slate-700">{goal.status}</span>
                                        </div>
                                        <div className="text-xs text-slate-400">
                                            Current: {goal.current_value} tCO₂e
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
                
                {goals.length === 0 && (
                    <div className="col-span-2 py-12 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                        <Target className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-slate-600">No Goals Defined</h3>
                        <p className="text-slate-400">Set your first sustainability target to track progress.</p>
                    </div>
                )}
            </div>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Set Sustainability Goal</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label>Goal Name</Label>
                            <Input 
                                placeholder="e.g. 50% Reduction by 2030" 
                                value={newGoal.name}
                                onChange={(e) => setNewGoal({...newGoal, name: e.target.value})}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Type</Label>
                                <Select value={newGoal.type} onValueChange={(v) => setNewGoal({...newGoal, type: v})}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="SBTi">SBTi Aligned</SelectItem>
                                        <SelectItem value="Custom">Custom</SelectItem>
                                        <SelectItem value="NetZero">Net Zero</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Scope</Label>
                                <Select value={newGoal.scope} onValueChange={(v) => setNewGoal({...newGoal, scope: v})}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="All Scopes">All Scopes</SelectItem>
                                        <SelectItem value="Scope 1">Scope 1</SelectItem>
                                        <SelectItem value="Scope 2">Scope 2</SelectItem>
                                        <SelectItem value="Scope 3">Scope 3</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Baseline Year</Label>
                                <Input 
                                    type="number" 
                                    value={newGoal.baseline_year}
                                    onChange={(e) => setNewGoal({...newGoal, baseline_year: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Target Year</Label>
                                <Input 
                                    type="number" 
                                    value={newGoal.target_year}
                                    onChange={(e) => setNewGoal({...newGoal, target_year: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Baseline Emissions (tCO₂e)</Label>
                            <Input 
                                type="number" 
                                value={newGoal.baseline_value}
                                onChange={(e) => setNewGoal({...newGoal, baseline_value: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Reduction Target (%)</Label>
                            <Input 
                                type="number" 
                                value={newGoal.reduction_target_percent}
                                onChange={(e) => setNewGoal({...newGoal, reduction_target_percent: e.target.value})}
                            />
                        </div>
                         <div className="space-y-2">
                            <Label>Current Emissions (tCO₂e)</Label>
                            <Input 
                                type="number" 
                                value={newGoal.current_value}
                                onChange={(e) => setNewGoal({...newGoal, current_value: e.target.value})}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                        <Button onClick={() => createGoalMutation.mutate(newGoal)} className="bg-[#86b027] hover:bg-[#769c22] text-white">
                            Create Goal
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}