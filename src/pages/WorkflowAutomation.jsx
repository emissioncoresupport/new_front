import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Workflow, BarChart3, Plus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import WorkflowDashboard from '@/components/workflows/WorkflowDashboard';
import WorkflowBuilder from '@/components/workflows/WorkflowBuilder';
import WorkflowExecutionLog from '@/components/workflows/WorkflowExecutionLog';
import AIWorkflowSuggestions from '@/components/workflows/AIWorkflowSuggestions';

export default function WorkflowAutomationPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showBuilder, setShowBuilder] = useState(false);

  return (
    <div className="min-h-screen bg-transparent text-[#545454] relative overflow-x-hidden">
      {/* Modern Gradient Background */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-slate-100/50 to-[#86b027]/5" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-gradient-to-b from-slate-200/20 to-transparent blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-gradient-to-t from-[#86b027]/15 to-transparent blur-[80px]" />
      </div>

      {/* Header */}
      <div className="bg-white/95 backdrop-blur-md border-b border-slate-100 sticky top-0 z-20 shadow-sm relative">
        <div className="max-w-[1600px] mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-lg bg-[#86b027] shadow-lg shadow-[#86b027]/20">
                <Workflow className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#545454] tracking-tight">
                  Workflow Automation
                </h1>
                <p className="text-xs text-[#02a1e8] font-bold tracking-widest uppercase">
                  AI-Driven Cross-Module Intelligence
                </p>
              </div>
            </div>
            
            <Button 
              onClick={() => setShowBuilder(true)}
              className="bg-[#86b027] hover:bg-[#769c22] text-white shadow-md shadow-[#86b027]/20"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Workflow
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-8 py-8 relative z-10">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="bg-white p-1.5 rounded-full border border-slate-100 inline-flex h-auto shadow-sm">
            <TabsTrigger 
              value="dashboard"
              className="gap-2 rounded-full px-6 py-2.5 text-sm font-medium data-[state=active]:bg-[#86b027] data-[state=active]:text-white transition-all text-[#545454] hover:text-[#86b027]"
            >
              <BarChart3 className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger 
              value="workflows"
              className="gap-2 rounded-full px-6 py-2.5 text-sm font-medium data-[state=active]:bg-[#86b027] data-[state=active]:text-white transition-all text-[#545454] hover:text-[#86b027]"
            >
              <Settings className="w-4 h-4" />
              My Workflows
            </TabsTrigger>
            <TabsTrigger 
              value="executions"
              className="gap-2 rounded-full px-6 py-2.5 text-sm font-medium data-[state=active]:bg-[#86b027] data-[state=active]:text-white transition-all text-[#545454] hover:text-[#86b027]"
            >
              <BarChart3 className="w-4 h-4" />
              Execution Log
            </TabsTrigger>
            <TabsTrigger 
              value="ai-suggestions"
              className="gap-2 rounded-full px-6 py-2.5 text-sm font-medium data-[state=active]:bg-[#86b027] data-[state=active]:text-white transition-all text-[#545454] hover:text-[#86b027]"
            >
              <Workflow className="w-4 h-4" />
              AI Suggestions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <WorkflowDashboard onCreateWorkflow={() => setShowBuilder(true)} />
          </TabsContent>

          <TabsContent value="workflows">
            <WorkflowBuilder isOpen={showBuilder} onClose={() => setShowBuilder(false)} />
          </TabsContent>

          <TabsContent value="executions">
            <WorkflowExecutionLog />
          </TabsContent>

          <TabsContent value="ai-suggestions">
            <AIWorkflowSuggestions onCreateWorkflow={() => setShowBuilder(true)} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}