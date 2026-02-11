import { base44 } from "@/api/base44Client";

/**
 * Workflow Engine - Executes workflows based on triggers
 */

export async function triggerWorkflow(triggerModule, triggerEvent, triggerEntity, triggerData) {
  try {
    // Find matching workflows
    const workflows = await base44.entities.WorkflowAutomation.list();
    const matchingWorkflows = workflows.filter(w => 
      w.status === 'active' &&
      w.trigger_module === triggerModule &&
      w.trigger_event === triggerEvent &&
      (w.trigger_entity === triggerEntity || !w.trigger_entity)
    );

    if (matchingWorkflows.length === 0) return;

    // Execute each matching workflow
    for (const workflow of matchingWorkflows) {
      await executeWorkflow(workflow, triggerData);
    }
  } catch (error) {
    console.error('Workflow trigger error:', error);
  }
}

async function executeWorkflow(workflow, triggerData) {
  const startTime = Date.now();
  
  // Create execution record
  const execution = await base44.entities.WorkflowExecution.create({
    workflow_id: workflow.id,
    workflow_name: workflow.name,
    trigger_data: triggerData,
    status: 'running'
  });

  try {
    let result = {};
    let aiAnalysis = null;
    const actionsPerformed = [];

    // AI-enhanced workflows
    if (workflow.ai_enabled && workflow.ai_prompt) {
      const aiResponse = await base44.integrations.Core.InvokeLLM({
        prompt: `${workflow.ai_prompt}\n\nTrigger Data: ${JSON.stringify(triggerData)}\n\nDetermine the best action to take.`,
        response_json_schema: {
          type: "object",
          properties: {
            should_execute: { type: "boolean" },
            analysis: { type: "string" },
            recommended_action: { type: "string" }
          }
        }
      });

      aiAnalysis = aiResponse.analysis;
      
      if (!aiResponse.should_execute) {
        await base44.entities.WorkflowExecution.update(execution.id, {
          status: 'completed',
          ai_analysis: aiAnalysis,
          result: { skipped: true, reason: 'AI determined action not needed' },
          execution_time_ms: Date.now() - startTime
        });
        return;
      }
    }

    // Execute action based on type
    switch (workflow.action_type) {
      case 'calculate_emissions':
        result = await executeEmissionsCalculation(workflow, triggerData);
        actionsPerformed.push('Calculated emissions');
        break;
      
      case 'flag_gap':
        result = await executeFlagGap(workflow, triggerData);
        actionsPerformed.push('Flagged data gap');
        break;
      
      case 'send_alert':
        result = await executeSendAlert(workflow, triggerData);
        actionsPerformed.push('Sent alert');
        break;
      
      case 'create_task':
        result = await executeCreateTask(workflow, triggerData);
        actionsPerformed.push('Created task');
        break;
      
      case 'run_ai_analysis':
        result = await executeAIAnalysis(workflow, triggerData);
        actionsPerformed.push('Ran AI analysis');
        break;
      
      default:
        result = { message: 'Action type not implemented' };
    }

    // Update execution record
    await base44.entities.WorkflowExecution.update(execution.id, {
      status: 'completed',
      result,
      ai_analysis: aiAnalysis,
      actions_performed: actionsPerformed,
      execution_time_ms: Date.now() - startTime
    });

    // Update workflow statistics
    await base44.entities.WorkflowAutomation.update(workflow.id, {
      execution_count: (workflow.execution_count || 0) + 1,
      last_execution: new Date().toISOString()
    });

  } catch (error) {
    await base44.entities.WorkflowExecution.update(execution.id, {
      status: 'failed',
      error_message: error.message,
      execution_time_ms: Date.now() - startTime
    });
  }
}

async function executeEmissionsCalculation(workflow, triggerData) {
  // Placeholder for logistics emissions calculation
  return { 
    calculated: true, 
    emissions_kg: 0, 
    message: 'Emissions calculation triggered' 
  };
}

async function executeFlagGap(workflow, triggerData) {
  // Create a data gap notification
  await base44.entities.Notification.create({
    type: 'warning',
    title: 'Data Gap Detected',
    message: `Workflow "${workflow.name}" detected a potential gap in ${workflow.action_module}`,
    data: triggerData
  });
  return { gap_flagged: true };
}

async function executeSendAlert(workflow, triggerData) {
  // Send email alert
  const user = await base44.auth.me();
  await base44.integrations.Core.SendEmail({
    to: user.email,
    subject: `Workflow Alert: ${workflow.name}`,
    body: `The workflow "${workflow.name}" was triggered.\n\nDetails: ${JSON.stringify(triggerData, null, 2)}`
  });
  return { alert_sent: true };
}

async function executeCreateTask(workflow, triggerData) {
  // Create CSRD task as example
  await base44.entities.CSRDTask.create({
    title: `Task from workflow: ${workflow.name}`,
    description: `Automatically created by workflow automation`,
    assigned_to: (await base44.auth.me()).email,
    priority: workflow.priority,
    status: 'pending',
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });
  return { task_created: true };
}

async function executeAIAnalysis(workflow, triggerData) {
  const analysis = await base44.integrations.Core.InvokeLLM({
    prompt: `Analyze this data and provide insights:\n${JSON.stringify(triggerData, null, 2)}`,
    response_json_schema: {
      type: "object",
      properties: {
        insights: { type: "array", items: { type: "string" } },
        recommendations: { type: "array", items: { type: "string" } }
      }
    }
  });
  return analysis;
}

export default { triggerWorkflow };