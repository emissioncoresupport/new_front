import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Mail, FileText, Clock, CheckCircle, AlertCircle, 
  Send, RefreshCw, Loader2, Play, Sparkles
} from "lucide-react";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { updateSupplierRiskAndGenerateAlerts } from './RiskEngine';
import { triggerVerificationWorkflow, runAutomatedVerification, requestDocuments, analyzeUploadedDocument, generateFollowUpTasks } from './VerificationEngine';

import { Search, FileCheck, ClipboardCheck, Database, FlaskConical } from "lucide-react";

const taskTypeConfig = {
  welcome_email: { icon: Mail, color: "text-blue-600", bg: "bg-blue-100", label: "Welcome Email" },
  questionnaire: { icon: FileText, color: "text-purple-600", bg: "bg-purple-100", label: "Questionnaire" },
  documentation: { icon: FileText, color: "text-amber-600", bg: "bg-amber-100", label: "Documentation" },
  verification: { icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-100", label: "Verification" },
  risk_assessment: { icon: AlertCircle, color: "text-rose-600", bg: "bg-rose-100", label: "Risk Assessment" },
  approval: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-100", label: "Approval" },
  test_report_request: { icon: FlaskConical, color: "text-cyan-600", bg: "bg-cyan-100", label: "Test Report" },
  database_check: { icon: Database, color: "text-indigo-600", bg: "bg-indigo-100", label: "Database Check" },
  audit_request: { icon: ClipboardCheck, color: "text-orange-600", bg: "bg-orange-100", label: "Audit Request" }
};

const statusConfig = {
  pending: { color: "bg-slate-100 text-slate-700", label: "Pending" },
  sent: { color: "bg-blue-100 text-blue-700", label: "Sent" },
  in_progress: { color: "bg-amber-100 text-amber-700", label: "In Progress" },
  completed: { color: "bg-emerald-100 text-emerald-700", label: "Completed" },
  overdue: { color: "bg-rose-100 text-rose-700", label: "Overdue" },
  verified: { color: "bg-green-100 text-green-700", label: "Verified" },
  failed: { color: "bg-red-100 text-red-700", label: "Needs Review" }
};

async function generateAIEmailContent(type, context) {
  const prompt = `
    Draft a professional and personalized email for a supplier.
    Type: ${type}
    Context: ${JSON.stringify(context)}
    
    Return a JSON object with:
    - subject: string (concise and clear)
    - body: string (professional tone, use \\n for newlines, include placeholders for specific details if needed but try to fill them)
    
    The email should be sent from "Supplier Management Team".
  `;
  
  return await base44.integrations.Core.InvokeLLM({ 
    prompt,
    response_json_schema: {
      type: "object",
      properties: {
        subject: { type: "string" },
        body: { type: "string" }
      },
      required: ["subject", "body"]
    }
  });
}

export async function triggerSupplierOnboarding(supplier, contacts) {
  const tasks = [];
  const today = new Date();
  
  const user = await base44.auth.me();
  
  tasks.push({
    supplier_id: supplier.id,
    task_type: 'welcome_email',
    title: 'Send Welcome Email',
    description: `Welcome ${supplier.legal_name} to the supplier portal and introduce the onboarding process.`,
    status: 'pending',
    due_date: format(today, 'yyyy-MM-dd')
  });

  tasks.push({
    supplier_id: supplier.id,
    task_type: 'questionnaire',
    title: 'General Due Diligence Questionnaire',
    description: 'Basic supplier information, certifications, and compliance declarations.',
    status: 'pending',
    due_date: format(addDays(today, 14), 'yyyy-MM-dd'),
    questionnaire_type: 'general'
  });

  if (supplier.pfas_relevant) {
    tasks.push({
      supplier_id: supplier.id,
      task_type: 'questionnaire',
      title: 'PFAS Compliance Questionnaire',
      description: 'Assessment of PFAS (per- and polyfluoroalkyl substances) usage in products and processes.',
      status: 'pending',
      due_date: format(addDays(today, 21), 'yyyy-MM-dd'),
      questionnaire_type: 'pfas'
    });
  }

  if (supplier.eudr_relevant) {
    tasks.push({
      supplier_id: supplier.id,
      task_type: 'questionnaire',
      title: 'EUDR Deforestation Due Diligence',
      description: 'EU Deforestation Regulation compliance assessment including geolocation and traceability data.',
      status: 'pending',
      due_date: format(addDays(today, 21), 'yyyy-MM-dd'),
      questionnaire_type: 'eudr'
    });
  }

  if (supplier.cbam_relevant) {
    tasks.push({
      supplier_id: supplier.id,
      task_type: 'questionnaire',
      title: 'CBAM Carbon Emissions Declaration',
      description: 'Carbon Border Adjustment Mechanism data collection for embedded emissions reporting.',
      status: 'pending',
      due_date: format(addDays(today, 21), 'yyyy-MM-dd'),
      questionnaire_type: 'cbam'
    });
  }

  if (supplier.ppwr_relevant) {
    tasks.push({
      supplier_id: supplier.id,
      task_type: 'questionnaire',
      title: 'PPWR Packaging Assessment',
      description: 'Packaging and Packaging Waste Regulation compliance questionnaire.',
      status: 'pending',
      due_date: format(addDays(today, 21), 'yyyy-MM-dd'),
      questionnaire_type: 'ppwr'
    });
  }

  if (supplier.cbam_relevant) {
    tasks.push({
      supplier_id: supplier.id,
      task_type: 'documentation',
      title: 'CBAM Installation Verification',
      description: 'Verify production facility details, emission monitoring systems, and calculation methodologies.',
      status: 'pending',
      due_date: format(addDays(today, 30), 'yyyy-MM-dd'),
      compliance_module: 'CBAM'
    });
    
    tasks.push({
      supplier_id: supplier.id,
      task_type: 'database_check',
      title: 'CBAM Registry Cross-Check',
      description: 'Verify supplier against EU CBAM installation database.',
      status: 'pending',
      due_date: format(addDays(today, 7), 'yyyy-MM-dd'),
      verification_type: 'cbam_registry',
      compliance_module: 'CBAM'
    });
  }

  if (supplier.pfas_relevant) {
    tasks.push({
      supplier_id: supplier.id,
      task_type: 'test_report_request',
      title: 'PFAS Laboratory Test Report',
      description: 'Request third-party laboratory analysis for PFAS content in materials and products.',
      status: 'pending',
      due_date: format(addDays(today, 45), 'yyyy-MM-dd'),
      compliance_module: 'PFAS'
    });
    
    tasks.push({
      supplier_id: supplier.id,
      task_type: 'documentation',
      title: 'PFAS Phase-Out Plan',
      description: 'Document timeline and strategy for eliminating PFAS from products.',
      status: 'pending',
      due_date: format(addDays(today, 30), 'yyyy-MM-dd'),
      compliance_module: 'PFAS'
    });
  }

  if (supplier.eudr_relevant) {
    tasks.push({
      supplier_id: supplier.id,
      task_type: 'documentation',
      title: 'EUDR Geolocation Data',
      description: 'Collect GPS coordinates of production plots and supply chain traceability documentation.',
      status: 'pending',
      due_date: format(addDays(today, 30), 'yyyy-MM-dd'),
      compliance_module: 'EUDR'
    });
    
    tasks.push({
      supplier_id: supplier.id,
      task_type: 'audit_request',
      title: 'EUDR Deforestation Risk Assessment',
      description: 'Third-party audit of supply chain for deforestation-free compliance.',
      status: 'pending',
      due_date: format(addDays(today, 60), 'yyyy-MM-dd'),
      compliance_module: 'EUDR'
    });
  }

  if (supplier.ppwr_relevant) {
    tasks.push({
      supplier_id: supplier.id,
      task_type: 'documentation',
      title: 'PPWR Packaging Composition',
      description: 'Detailed breakdown of packaging materials, recycled content percentages, and recyclability data.',
      status: 'pending',
      due_date: format(addDays(today, 30), 'yyyy-MM-dd'),
      compliance_module: 'PPWR'
    });
  }

  if (supplier.risk_level === 'high' || supplier.risk_level === 'critical') {
    tasks.push({
      supplier_id: supplier.id,
      task_type: 'questionnaire',
      title: 'Human Rights & Labor Due Diligence',
      description: 'Enhanced due diligence on labor practices, working conditions, and human rights compliance.',
      status: 'pending',
      due_date: format(addDays(today, 14), 'yyyy-MM-dd'),
      questionnaire_type: 'human_rights'
    });

    tasks.push({
      supplier_id: supplier.id,
      task_type: 'questionnaire',
      title: 'Environmental Impact Assessment',
      description: 'Detailed environmental practices, emissions data, and sustainability initiatives.',
      status: 'pending',
      due_date: format(addDays(today, 14), 'yyyy-MM-dd'),
      questionnaire_type: 'environmental'
    });
  }

  tasks.push({
    supplier_id: supplier.id,
    task_type: 'documentation',
    title: 'General Required Documentation',
    description: 'Collect certificates (ISO, industry-specific), business registration, insurance documents.',
    status: 'pending',
    due_date: format(addDays(today, 30), 'yyyy-MM-dd')
  });

  const createdTasks = [];
  for (const task of tasks) {
    const created = await base44.entities.OnboardingTask.create(task);
    createdTasks.push(created);
  }

  for (const task of createdTasks) {
    await base44.entities.Notification.create({
      user_email: user.email,
      type: 'task_assigned',
      title: `New Onboarding Task Assigned`,
      message: `${task.title} for ${supplier.legal_name}${task.compliance_module ? ` (${task.compliance_module})` : ''}`,
      priority: task.compliance_module ? 'high' : 'normal',
      entity_type: 'OnboardingTask',
      entity_id: task.id,
      is_read: false,
      action_url: `/SupplyLens?tab=onboarding&supplier=${supplier.id}`
    });
  }

  await base44.entities.Notification.create({
    user_email: user.email,
    type: 'supplier_onboarding_started',
    title: `Supplier Onboarding Started`,
    message: `Automated workflow initiated for ${supplier.legal_name} with ${createdTasks.length} tasks`,
    priority: 'normal',
    entity_type: 'Supplier',
    entity_id: supplier.id,
    is_read: false,
    action_url: `/SupplyLens?tab=onboarding&supplier=${supplier.id}`
  });

  return createdTasks;
}

export async function sendWelcomeEmail(supplier, contacts, task) {
  const primaryContact = contacts.find(c => c.supplier_id === supplier.id && c.is_primary) 
    || contacts.find(c => c.supplier_id === supplier.id);
  
  if (!primaryContact?.email) {
    throw new Error('No contact email found. Please add a contact person with an email address to this supplier in the Contacts tab.');
  }

  const portalUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://app.base44.com'}/supplier-portal?supplier=${supplier.id}`;
  
  const aiContent = await generateAIEmailContent('welcome_email', {
    supplier_name: supplier.legal_name,
    contact_name: primaryContact.name || 'Partner',
    portal_url: portalUrl,
    tasks: [
      task ? 'General Due Diligence' : null,
      supplier.pfas_relevant ? 'PFAS Compliance Assessment' : null,
      supplier.eudr_relevant ? 'EUDR Deforestation Declaration' : null,
      supplier.cbam_relevant ? 'CBAM Carbon Emissions Data' : null,
      supplier.ppwr_relevant ? 'PPWR Packaging Assessment' : null
    ].filter(Boolean)
  });

  await base44.integrations.Core.SendEmail({
    to: primaryContact.email,
    subject: aiContent.subject,
    body: aiContent.body
  });

  if (task) {
    await base44.entities.OnboardingTask.update(task.id, {
      status: 'completed',
      sent_date: new Date().toISOString(),
      completed_date: new Date().toISOString()
    });
  }

  return { sent: true, email: primaryContact.email };
}

export async function sendQuestionnaireEmail(supplier, contacts, task) {
  const primaryContact = contacts.find(c => c.supplier_id === supplier.id && c.is_primary) 
    || contacts.find(c => c.supplier_id === supplier.id);
  
  if (!primaryContact?.email) {
    throw new Error('No contact email found. Please add a contact person with an email address to this supplier in the Contacts tab.');
  }

  const questionnaireUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://app.base44.com'}/questionnaire?supplier=${supplier.id}&type=${task.questionnaire_type}&task=${task.id}`;
  
  const questionnaireDescriptions = {
    general: 'General Due Diligence covering company information, certifications, and basic compliance',
    pfas: 'PFAS (Per- and polyfluoroalkyl substances) usage and compliance assessment',
    eudr: 'EU Deforestation Regulation compliance including supply chain traceability',
    cbam: 'Carbon Border Adjustment Mechanism embedded emissions data collection',
    ppwr: 'Packaging and Packaging Waste Regulation compliance assessment',
    human_rights: 'Human rights and labor practices due diligence',
    environmental: 'Environmental impact and sustainability assessment'
  };

  const emailBody = `
Dear ${primaryContact.name || 'Supplier Partner'},

As part of our supplier due diligence process, we request that you complete the following questionnaire:

**${task.title}**

${questionnaireDescriptions[task.questionnaire_type] || task.description}

Please complete this questionnaire by: ${format(new Date(task.due_date), 'MMMM d, yyyy')}

Access the questionnaire here:
${questionnaireUrl}

This information is essential for maintaining our compliance with regulatory requirements and ensuring a sustainable supply chain.

If you have any questions or need assistance, please contact our compliance team.

Best regards,
Supplier Compliance Team
  `.trim();

  await base44.integrations.Core.SendEmail({
    to: primaryContact.email,
    subject: `Action Required: ${task.title} - ${supplier.legal_name}`,
    body: emailBody
  });

  await base44.entities.OnboardingTask.update(task.id, {
    status: 'sent',
    sent_date: new Date().toISOString()
  });

  return { sent: true, email: primaryContact.email };
}

export async function sendReminder(supplier, contacts, task) {
  const primaryContact = contacts.find(c => c.supplier_id === supplier.id && c.is_primary) 
    || contacts.find(c => c.supplier_id === supplier.id);
  
  if (!primaryContact?.email) {
    throw new Error('No contact email found. Please add a contact person with an email address to this supplier in the Contacts tab.');
  }

  const daysUntilDue = Math.ceil((new Date(task.due_date) - new Date()) / (1000 * 60 * 60 * 24));
  const isOverdue = daysUntilDue < 0;

  const aiContent = await generateAIEmailContent(isOverdue ? 'overdue_reminder' : 'task_reminder', {
    supplier_name: supplier.legal_name,
    contact_name: primaryContact.name,
    task_title: task.title,
    due_date: format(new Date(task.due_date), 'MMMM d, yyyy'),
    days_remaining_or_overdue: Math.abs(daysUntilDue),
    is_overdue: isOverdue
  });

  await base44.integrations.Core.SendEmail({
    to: primaryContact.email,
    subject: aiContent.subject,
    body: aiContent.body
  });

  await base44.entities.OnboardingTask.update(task.id, {
    reminder_count: (task.reminder_count || 0) + 1,
    last_reminder_date: new Date().toISOString(),
    status: isOverdue ? 'overdue' : task.status
  });

  return { sent: true, email: primaryContact.email };
}

export async function sendVerificationUpdateEmail(supplier, contacts, task) {
  const primaryContact = contacts.find(c => c.supplier_id === supplier.id && c.is_primary) 
    || contacts.find(c => c.supplier_id === supplier.id);
  
  if (!primaryContact?.email) {
    throw new Error('No contact email found.');
  }

  const aiContent = await generateAIEmailContent('verification_status_update', {
    supplier_name: supplier.legal_name,
    contact_name: primaryContact.name,
    task_title: task.title,
    status: task.status,
    verification_result: task.verification_result
  });

  await base44.integrations.Core.SendEmail({
    to: primaryContact.email,
    subject: aiContent.subject,
    body: aiContent.body
  });

  return { sent: true, email: primaryContact.email };
}

async function markTaskCompleted(task, responseData = null) {
  await base44.entities.OnboardingTask.update(task.id, {
    status: 'completed',
    completed_date: new Date().toISOString(),
    response_data: responseData
  });
}

export default function OnboardingWorkflow({ supplier, tasks, contacts, onRefresh, allSuppliers = [], sites = [], onSwitchTab }) {
  const [isProcessing, setIsProcessing] = useState({});
  const queryClient = useQueryClient();

  const supplierTasks = tasks.filter(t => t.supplier_id === supplier.id);
  const completedTasks = supplierTasks.filter(t => t.status === 'completed' || t.status === 'verified').length;
  const completionPercentage = supplierTasks.length > 0 ? Math.round((completedTasks / supplierTasks.length) * 100) : 0;

  const stages = [
    { id: 'initiation', name: 'INITIATION', types: ['welcome_email'], completed: false, current: false },
    { id: 'data_collection', name: 'DATA COLLECTION', types: ['questionnaire', 'documentation'], completed: false, current: false },
    { id: 'verification', name: 'VERIFICATION', types: ['verification', 'database_check', 'audit_request', 'test_report_request'], completed: false, current: false },
    { id: 'approval', name: 'APPROVAL', types: ['approval', 'risk_assessment'], completed: false, current: false }
  ];

  stages.forEach((stage, idx) => {
    const stageTasks = supplierTasks.filter(t => stage.types.includes(t.task_type));
    if (stageTasks.length > 0) {
      const allCompleted = stageTasks.every(t => t.status === 'completed' || t.status === 'verified');
      stage.completed = allCompleted;
      if (!allCompleted && stageTasks.some(t => t.status === 'in_progress' || t.status === 'sent')) {
        stage.current = true;
      } else if (!allCompleted && !stage.completed && !stages.slice(0, idx).some(s => !s.completed)) {
        stage.current = true;
      }
    }
  });

  const handleAction = async (action, task) => {
    const key = task?.id || action;
    setIsProcessing(prev => ({ ...prev, [key]: true }));

    try {
      if (['send_welcome', 'send_questionnaire', 'send_reminder'].includes(action)) {
        const hasEmailContact = contacts.some(c => c.supplier_id === supplier.id && c.email);
        if (!hasEmailContact) {
          toast.error("No contact email found", {
            description: "Please add a contact person with an email address.",
            action: {
              label: "Go to Contacts",
              onClick: () => onSwitchTab && onSwitchTab('contacts')
            }
          });
          return;
        }
      }
      if (action === 'start_onboarding') {
        const createdTasks = await triggerSupplierOnboarding(supplier, contacts);
        
        const welcomeTask = createdTasks.find(t => t.task_type === 'welcome_email');
        const hasEmailContact = contacts.some(c => c.supplier_id === supplier.id && c.email);
        
        if (welcomeTask && hasEmailContact) {
             try {
                 await sendWelcomeEmail(supplier, contacts, welcomeTask);
                 toast.success('Onboarding started & Welcome email sent automatically');
             } catch (emailError) {
                 console.error("Auto-email failed", emailError);
                 toast.warning('Onboarding started, but welcome email failed to send.');
             }
        } else {
             toast.success('Onboarding workflow initialized');
        }
      } else if (action === 'send_welcome') {
        await sendWelcomeEmail(supplier, contacts, task);
        toast.success('Welcome email sent');
      } else if (action === 'send_questionnaire') {
        await sendQuestionnaireEmail(supplier, contacts, task);
        toast.success('Questionnaire email sent');
      } else if (action === 'send_reminder') {
        await sendReminder(supplier, contacts, task);
        toast.success('AI-generated reminder sent');
      } else if (action === 'send_verification_update') {
        await sendVerificationUpdateEmail(supplier, contacts, task);
        toast.success('Verification status update sent');
      }
      
      queryClient.invalidateQueries({ queryKey: ['onboarding-tasks'] });
      onRefresh?.();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Action failed');
    } finally {
      setIsProcessing(prev => ({ ...prev, [key]: false }));
    }
    };

    const handleAISuggestions = async () => {
      setIsProcessing(prev => ({ ...prev, 'ai_suggest': true }));
      try {
          const prompt = `
              Analyze this supplier and suggest 1-2 new onboarding tasks based on their profile:
              Supplier: ${JSON.stringify(supplier)}
              Current Tasks: ${JSON.stringify(supplierTasks.map(t => t.task_type))}

              Return a JSON array of task objects (OnboardingTask entity structure) that are missing but recommended.
              Focus on risk-specific verifications (e.g. if high risk country -> suggest detailed audit).
          `;

          const suggestions = await base44.integrations.Core.InvokeLLM({
              prompt,
              response_json_schema: {
                  type: "object",
                  properties: {
                      tasks: {
                          type: "array",
                          items: {
                              type: "object",
                              properties: {
                                  title: { type: "string" },
                                  description: { type: "string" },
                                  task_type: { type: "string" },
                                  due_date: { type: "string" }
                              }
                          }
                      }
                  }
              }
          });

          if (suggestions.tasks && suggestions.tasks.length > 0) {
              for (const task of suggestions.tasks) {
                  await base44.entities.OnboardingTask.create({
                      ...task,
                      supplier_id: supplier.id,
                      status: 'pending',
                      due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                      source: 'ai_suggestion'
                  });
              }
              toast.success(`Added ${suggestions.tasks.length} AI-suggested tasks`);
              queryClient.invalidateQueries({ queryKey: ['onboarding-tasks'] });
              onRefresh?.();
          } else {
              toast.info("AI found no new tasks to suggest at this time.");
          }

      } catch (e) {
          console.error(e);
          toast.error("Failed to get AI suggestions");
      } finally {
          setIsProcessing(prev => ({ ...prev, 'ai_suggest': false }));
      }
    };

    if (supplierTasks.length === 0) {
    return (
      <div className="bg-white/60 backdrop-blur-3xl rounded-2xl border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-500/10 flex items-center justify-center mx-auto mb-4">
          <Play className="w-8 h-8 text-blue-600" />
        </div>
        <h3 className="text-lg font-light text-slate-900 mb-2">Start Onboarding</h3>
        <p className="text-sm text-slate-600 font-medium mb-6 max-w-md mx-auto">
          No onboarding tasks found. Start the automated workflow to send welcome emails and questionnaires.
        </p>
        <button
          type="button"
          onClick={() => handleAction('start_onboarding')}
          disabled={isProcessing['start_onboarding']}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:shadow-lg transition-all shadow-md disabled:opacity-50"
        >
          {isProcessing['start_onboarding'] ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Starting...</>
          ) : (
            <><Play className="w-5 h-5" /> Start Onboarding Workflow</>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress Hero - Tesla Style */}
      <div className="relative bg-white/60 backdrop-blur-3xl rounded-2xl border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.08)] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50/50 via-transparent to-emerald-500/5"></div>
        <div className="relative p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/80 backdrop-blur-md border border-white/40 flex items-center justify-center shadow-sm">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-xl font-light tracking-tight text-slate-900">Onboarding Progress</h3>
                <p className="text-xs text-slate-600 font-medium mt-0.5">{completedTasks} / {supplierTasks.length} tasks completed</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-extralight text-slate-900">{completionPercentage}<span className="text-xl text-slate-500">%</span></div>
              <p className="text-xs text-slate-600 font-medium uppercase tracking-wider">Complete</p>
            </div>
          </div>

          <div className="h-2 bg-slate-200/50 rounded-full overflow-hidden mb-6">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-[#86b027] rounded-full transition-all duration-700"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>

          <div className="flex items-center justify-between px-4">
            {stages.map((stage, idx) => (
              <React.Fragment key={stage.id}>
                <div className="flex flex-col items-center gap-2">
                  <div className={cn(
                    "w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm",
                    stage.completed 
                      ? "bg-gradient-to-br from-emerald-500 to-[#86b027] text-white shadow-emerald-200" 
                      : stage.current 
                        ? "bg-white/90 border-2 border-[#86b027] text-[#86b027]" 
                        : "bg-white/50 border border-slate-200 text-slate-400"
                  )}>
                    {stage.completed ? <CheckCircle className="w-5 h-5" /> : <span className="text-sm font-light">{idx + 1}</span>}
                  </div>
                  <span className={cn(
                    "text-[9px] font-medium uppercase tracking-widest max-w-[80px] text-center",
                    stage.completed ? "text-emerald-600" : stage.current ? "text-[#86b027]" : "text-slate-400"
                  )}>
                    {stage.name}
                  </span>
                </div>
                {idx < stages.length - 1 && (
                  <div className={cn(
                    "flex-1 h-0.5 mx-2 rounded-full transition-all duration-300",
                    stages[idx + 1].completed ? "bg-gradient-to-r from-emerald-500 to-[#86b027]" : "bg-slate-200"
                  )} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Tasks List - Minimal Cards */}
      <div className="bg-white/60 backdrop-blur-3xl rounded-2xl border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-medium text-slate-900 uppercase tracking-wider">Tasks</h3>
          <button
            type="button"
            onClick={handleAISuggestions}
            disabled={isProcessing['ai_suggest']}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-300/40 text-violet-700 hover:bg-violet-500/20 transition-all text-xs font-medium"
          >
            {isProcessing['ai_suggest'] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            AI Suggestions
          </button>
        </div>

        <div className="space-y-3">
          {supplierTasks.map((task) => {
            const config = taskTypeConfig[task.task_type] || { icon: AlertCircle, color: "text-slate-600", bg: "bg-slate-100", label: task.task_type };
            const status = statusConfig[task.status] || { color: "bg-slate-100 text-slate-600", label: task.status };
            const Icon = config.icon;
            const isOverdue = new Date(task.due_date) < new Date() && task.status !== 'completed';
            
            return (
              <div 
                key={task.id}
                className={cn(
                  "p-4 rounded-xl backdrop-blur-md border transition-all hover:shadow-md",
                  isOverdue ? "bg-rose-50/60 border-rose-200/60" :
                  task.status === 'completed' ? "bg-emerald-50/60 border-emerald-200/60" :
                  "bg-white/40 border-white/40 hover:border-[#86b027]/40"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", config.bg)}>
                      <Icon className={cn("w-5 h-5", config.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 mb-1">{task.title}</p>
                      {task.description && (
                        <p className="text-xs text-slate-600 font-medium mb-2">{task.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <Badge variant="secondary" className={cn("text-xs", status.color)}>
                          {status.label}
                        </Badge>
                        <span className="text-[10px] text-slate-500 font-medium">
                          Due: {format(new Date(task.due_date), 'MMM d, yyyy')}
                        </span>
                        {task.reminder_count > 0 && (
                          <span className="text-[10px] text-amber-600 font-medium">
                            ({task.reminder_count} reminder{task.reminder_count > 1 ? 's' : ''})
                          </span>
                        )}
                      </div>

                      {task.uploaded_documents && task.uploaded_documents.length > 0 && (
                        <div className="mt-3">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Uploaded Documents</p>
                          <div className="flex flex-wrap gap-2">
                            {task.uploaded_documents.map((doc, idx) => {
                              const analysis = doc.analysis;
                              const isValid = analysis?.is_valid;
                              const needsAction = analysis?.recommended_action !== 'accept';

                              return (
                                <a 
                                  key={idx} 
                                  href={doc.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className={cn(
                                    "flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border transition-all",
                                    isValid && !needsAction
                                      ? "bg-emerald-50/80 border-emerald-200/80 text-emerald-700 hover:bg-emerald-100"
                                      : needsAction
                                        ? "bg-rose-50/80 border-rose-200/80 text-rose-700 hover:bg-rose-100"
                                        : "bg-white/80 border-slate-200 text-slate-600 hover:border-blue-300"
                                  )}
                                >
                                  <FileText className="w-3 h-3" />
                                  <span className="font-medium truncate max-w-[120px]">{doc.name}</span>
                                  {isValid && !needsAction && <CheckCircle className="w-3 h-3 text-emerald-600" />}
                                  {needsAction && <AlertCircle className="w-3 h-3 text-rose-600" />}
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {task.status === 'pending' && task.task_type === 'welcome_email' && (
                      <button
                        type="button"
                        onClick={() => handleAction('send_welcome', task)}
                        disabled={isProcessing[task.id]}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-300/40 text-blue-700 hover:bg-blue-500/20 transition-all text-xs font-medium"
                      >
                        {isProcessing[task.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                        Send
                      </button>
                    )}
                    {task.status === 'pending' && task.task_type === 'questionnaire' && (
                      <button
                        type="button"
                        onClick={() => handleAction('send_questionnaire', task)}
                        disabled={isProcessing[task.id]}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-300/40 text-purple-700 hover:bg-purple-500/20 transition-all text-xs font-medium"
                      >
                        {isProcessing[task.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                        Send
                      </button>
                    )}
                    {(task.status === 'sent' || task.status === 'in_progress' || isOverdue) && task.status !== 'completed' && (
                      <button
                        type="button"
                        onClick={() => handleAction('send_reminder', task)}
                        disabled={isProcessing[task.id]}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-300/40 text-amber-700 hover:bg-amber-500/20 transition-all text-xs font-medium"
                      >
                        {isProcessing[task.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                        Remind
                      </button>
                    )}
                    {task.status === 'completed' && (
                      <CheckCircle className="w-6 h-6 text-emerald-500" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}