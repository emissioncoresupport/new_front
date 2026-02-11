import { base44 } from "@/api/base44Client";

/**
 * CSRD Automation Engine
 * Orchestrates intelligent workflows and data collection
 */

export async function runFullAutomation() {
  const results = {
    materiality_assessed: false,
    data_collected: 0,
    tasks_generated: 0,
    notifications_sent: 0,
    errors: []
  };

  try {
    // Step 1: Auto-assess materiality if not done
    const { autoAssessMateriality, generateTasksFromMateriality } = await import('./CSRDMaterialityService');
    
    const existingTopics = await base44.entities.CSRDMaterialityTopic.list();
    if (existingTopics.length === 0) {
      const topics = await autoAssessMateriality();
      for (const topic of topics) {
        await base44.entities.CSRDMaterialityTopic.create({
          ...topic,
          reporting_year: new Date().getFullYear()
        });
      }
      results.materiality_assessed = true;
    }

    // Step 2: Get material topics
    const materialTopics = await base44.entities.CSRDMaterialityTopic.filter({ is_material: true });

    // Step 3: Auto-collect data from other modules
    const { autoCollectDataFromModules } = await import('./CSRDMaterialityService');
    
    for (const topic of materialTopics) {
      const autoData = await autoCollectDataFromModules(topic.esrs_standard);
      
      for (const dp of autoData) {
        // Check if already exists
        const existing = await base44.entities.CSRDDataPoint.filter({
          esrs_code: dp.esrs_code,
          reporting_year: new Date().getFullYear()
        });

        if (existing.length === 0) {
          await base44.entities.CSRDDataPoint.create({
            ...dp,
            esrs_standard: topic.esrs_standard,
            reporting_year: new Date().getFullYear(),
            data_source: 'Auto-collected from modules',
            verification_status: 'Internally Verified'
          });
          results.data_collected++;
        }
      }
    }

    // Step 4: Generate tasks for material topics
    const existingTasks = await base44.entities.CSRDTask.list();
    const tasksByESRS = new Set(existingTasks.map(t => t.esrs_standard));

    const user = await base44.auth.me();
    
    for (const topic of materialTopics) {
      if (!tasksByESRS.has(topic.esrs_standard)) {
        // Create data collection task
        await base44.entities.CSRDTask.create({
          title: `Collect ${topic.esrs_standard} Data: ${topic.topic_name}`,
          description: `Review and validate auto-collected data. Add missing metrics per ESRS disclosure requirements.`,
          task_type: 'data_collection',
          esrs_standard: topic.esrs_standard,
          assigned_to: user.email,
          assignee_type: 'internal',
          priority: 'high',
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'pending'
        });

        // Create narrative task
        await base44.entities.CSRDTask.create({
          title: `Draft ${topic.esrs_standard} Narrative: ${topic.topic_name}`,
          description: `Use AI Narrative Assistant to draft EFRAG-compliant narrative using collected data.`,
          task_type: 'narrative_preparation',
          esrs_standard: topic.esrs_standard,
          assigned_to: user.email,
          assignee_type: 'internal',
          priority: 'medium',
          due_date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'pending'
        });

        results.tasks_generated += 2;
      }
    }

    // Step 5: Send summary notification
    try {
      await base44.integrations.Core.SendEmail({
        to: user.email,
        subject: 'CSRD Automation Complete - Action Required',
        body: `CSRD Automation Summary:

✅ Materiality Assessment: ${results.materiality_assessed ? 'Completed' : 'Already done'}
✅ Material Topics Identified: ${materialTopics.length}
✅ Data Points Auto-Collected: ${results.data_collected}
✅ Tasks Generated: ${results.tasks_generated}

Next Steps:
1. Review auto-collected data in ESRS Data Collection tab
2. Complete assigned tasks in Task Management tab
3. Use AI Narrative Assistant for report drafting

Login to continue: ${window.location.origin}

Best regards,
CSRD Automation System`
      });
      results.notifications_sent++;
    } catch (emailError) {
      console.warn('Email notification failed:', emailError);
    }

    return results;
  } catch (error) {
    results.errors.push(error.message);
    throw error;
  }
}