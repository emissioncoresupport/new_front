import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { ArrowRight, Sparkles, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const WORKFLOW_TEMPLATES = [
  {
    name: "PCF → Logistics Auto-Calculate",
    description: "When a product with components is created in PCF, automatically calculate logistics emissions",
    trigger_module: "PCF",
    trigger_event: "create",
    trigger_entity: "Product",
    action_module: "Logistics",
    action_type: "calculate_emissions",
    ai_enabled: true
  },
  {
    name: "SupplyLens → CSRD Gap Detector",
    description: "When supplier data is updated, flag potential CSRD reporting gaps",
    trigger_module: "SupplyLens",
    trigger_event: "update",
    trigger_entity: "Supplier",
    action_module: "CSRD",
    action_type: "flag_gap",
    ai_enabled: true
  },
  {
    name: "CCF → CSRD Alert",
    description: "When emissions exceed threshold, create CSRD compliance task",
    trigger_module: "CCF",
    trigger_event: "threshold_met",
    trigger_entity: "CCFEntry",
    action_module: "CSRD",
    action_type: "create_task",
    ai_enabled: false
  }
];

export default function WorkflowBuilder({ isOpen, onClose }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    trigger_module: "",
    trigger_event: "",
    trigger_entity: "",
    trigger_conditions: {},
    action_module: "",
    action_type: "",
    action_config: {},
    ai_enabled: false,
    ai_prompt: "",
    priority: "medium",
    status: "active"
  });

  const queryClient = useQueryClient();

  const { data: workflows = [] } = useQuery({
    queryKey: ['workflows'],
    queryFn: () => base44.entities.WorkflowAutomation.list(),
    enabled: isOpen
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.WorkflowAutomation.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['workflows']);
      toast.success("Workflow created successfully");
      onClose();
      resetForm();
    }
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      trigger_module: "",
      trigger_event: "",
      trigger_entity: "",
      trigger_conditions: {},
      action_module: "",
      action_type: "",
      action_config: {},
      ai_enabled: false,
      ai_prompt: "",
      priority: "medium",
      status: "active"
    });
  };

  const applyTemplate = (template) => {
    setFormData({
      ...formData,
      ...template,
      ai_prompt: template.ai_enabled ? `Analyze the ${template.trigger_entity} data and determine the best action for ${template.action_module} module.` : ""
    });
    toast.success("Template applied");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Workflow Automation</DialogTitle>
          <DialogDescription>
            Build AI-driven workflows that connect your sustainability modules
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Templates */}
          {workflows.length === 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Quick Start Templates</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {WORKFLOW_TEMPLATES.map((template, idx) => (
                  <Card key={idx} className="cursor-pointer hover:border-[#86b027] transition-colors" onClick={() => applyTemplate(template)}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-sm text-slate-700">{template.name}</h4>
                        {template.ai_enabled && <Sparkles className="w-4 h-4 text-[#86b027]" />}
                      </div>
                      <p className="text-xs text-slate-500">{template.description}</p>
                      <div className="flex items-center gap-2 mt-3 text-xs">
                        <Badge variant="outline" className="text-[10px]">{template.trigger_module}</Badge>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <Badge variant="outline" className="text-[10px]">{template.action_module}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Workflow Name *</Label>
              <Input 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., PCF to Logistics Auto-Calc"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea 
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="What does this workflow do?"
                className="h-20"
              />
            </div>
          </div>

          {/* Trigger Configuration */}
          <Card className="border-[#86b027]/20 bg-[#86b027]/5">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <span className="bg-[#86b027] text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">1</span>
                Trigger (When)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Trigger Module *</Label>
                  <Select value={formData.trigger_module} onValueChange={(v) => setFormData({...formData, trigger_module: v})}>
                    <SelectTrigger><SelectValue placeholder="Select module" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PCF">PCF (Product Carbon)</SelectItem>
                      <SelectItem value="CCF">CCF (Corporate Carbon)</SelectItem>
                      <SelectItem value="SupplyLens">SupplyLens</SelectItem>
                      <SelectItem value="Logistics">Logistics Emissions</SelectItem>
                      <SelectItem value="CBAM">CBAM</SelectItem>
                      <SelectItem value="EUDR">EUDR</SelectItem>
                      <SelectItem value="CSRD">CSRD</SelectItem>
                      <SelectItem value="VSME">VSME</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Trigger Event *</Label>
                  <Select value={formData.trigger_event} onValueChange={(v) => setFormData({...formData, trigger_event: v})}>
                    <SelectTrigger><SelectValue placeholder="Select event" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="create">Create</SelectItem>
                      <SelectItem value="update">Update</SelectItem>
                      <SelectItem value="delete">Delete</SelectItem>
                      <SelectItem value="threshold_met">Threshold Met</SelectItem>
                      <SelectItem value="data_gap_detected">Data Gap Detected</SelectItem>
                      <SelectItem value="compliance_deadline">Compliance Deadline</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Trigger Entity</Label>
                <Input 
                  value={formData.trigger_entity}
                  onChange={(e) => setFormData({...formData, trigger_entity: e.target.value})}
                  placeholder="e.g., Product, Supplier, CCFEntry"
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Configuration */}
          <Card className="border-[#02a1e8]/20 bg-[#02a1e8]/5">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <span className="bg-[#02a1e8] text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">2</span>
                Action (Then)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Action Module *</Label>
                  <Select value={formData.action_module} onValueChange={(v) => setFormData({...formData, action_module: v})}>
                    <SelectTrigger><SelectValue placeholder="Select module" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Logistics">Logistics Emissions</SelectItem>
                      <SelectItem value="CSRD">CSRD Reporting</SelectItem>
                      <SelectItem value="CCF">CCF</SelectItem>
                      <SelectItem value="SupplyLens">SupplyLens</SelectItem>
                      <SelectItem value="Email">Email Notification</SelectItem>
                      <SelectItem value="AI_Analysis">AI Analysis</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Action Type *</Label>
                  <Select value={formData.action_type} onValueChange={(v) => setFormData({...formData, action_type: v})}>
                    <SelectTrigger><SelectValue placeholder="Select action" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="calculate_emissions">Calculate Emissions</SelectItem>
                      <SelectItem value="flag_gap">Flag Data Gap</SelectItem>
                      <SelectItem value="send_alert">Send Alert</SelectItem>
                      <SelectItem value="create_task">Create Task</SelectItem>
                      <SelectItem value="run_ai_analysis">Run AI Analysis</SelectItem>
                      <SelectItem value="create_record">Create Record</SelectItem>
                      <SelectItem value="update_record">Update Record</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Enhancement */}
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-600" />
                  <Label className="text-sm font-medium">AI-Enhanced Workflow</Label>
                </div>
                <Switch 
                  checked={formData.ai_enabled}
                  onCheckedChange={(checked) => setFormData({...formData, ai_enabled: checked})}
                />
              </div>
              {formData.ai_enabled && (
                <div className="space-y-2">
                  <Label className="text-xs">AI Analysis Prompt</Label>
                  <Textarea 
                    value={formData.ai_prompt}
                    onChange={(e) => setFormData({...formData, ai_prompt: e.target.value})}
                    placeholder="Describe what AI should analyze and decide..."
                    className="h-24 text-xs bg-white"
                  />
                  <p className="text-[10px] text-slate-600">AI will analyze trigger data and intelligently execute actions based on context.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Priority */}
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={formData.priority} onValueChange={(v) => setFormData({...formData, priority: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={() => createMutation.mutate(formData)}
            disabled={!formData.name || !formData.trigger_module || !formData.action_module}
            className="bg-[#86b027] hover:bg-[#769c22]"
          >
            Create Workflow
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}