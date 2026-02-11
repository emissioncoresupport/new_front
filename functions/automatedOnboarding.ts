/**
 * Automated Supplier Onboarding
 * Generates personalized onboarding workflows based on supplier profile
 */

export default async function automatedOnboarding(context) {
  const { base44, data } = context;
  const { supplier_id } = data;

  const supplier = await base44.entities.Supplier.filter({ id: supplier_id });
  if (!supplier.length) throw new Error("Supplier not found");

  const supplierData = supplier[0];

  // AI determines relevant compliance requirements
  const complianceAnalysis = await base44.integrations.Core.InvokeLLM({
    prompt: `Analyze supplier profile and determine applicable compliance requirements.

Supplier: ${supplierData.legal_name}
Country: ${supplierData.country}
Industry: ${supplierData.nace_code}
Tier: ${supplierData.tier}

Determine which regulations apply:
- CBAM (Carbon Border Adjustment Mechanism)
- EUDR (Deforestation Regulation)
- PFAS (Forever Chemicals)
- PPWR (Packaging & Waste)
- CSRD (Sustainability Reporting)
- Conflict Minerals

For each applicable regulation, recommend:
1. Priority level
2. Required data points
3. Estimated effort
4. Risk if non-compliant`,
    response_json_schema: {
      type: "object",
      properties: {
        applicable_regulations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              regulation: { type: "string" },
              priority: { type: "string" },
              reason: { type: "string" },
              required_tasks: { type: "array", items: { type: "string" } }
            }
          }
        },
        onboarding_duration_estimate: { type: "string" },
        risk_areas: { type: "array", items: { type: "string" } }
      }
    }
  });

  // Create onboarding tasks
  const taskPriority = { high: 1, medium: 2, low: 3 };
  let tasksCreated = 0;

  for (const reg of complianceAnalysis.applicable_regulations) {
    for (let i = 0; i < reg.required_tasks.length; i++) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (7 * (i + 1))); // Stagger tasks weekly

      await base44.entities.OnboardingTask.create({
        supplier_id: supplier_id,
        title: reg.required_tasks[i],
        description: `${reg.regulation} Compliance: ${reg.reason}`,
        task_type: reg.regulation.toLowerCase().includes('cbam') ? 'cbam_data' :
                   reg.regulation.toLowerCase().includes('eudr') ? 'eudr_data' :
                   reg.regulation.toLowerCase().includes('pfas') ? 'pfas_declaration' :
                   'data_collection',
        priority: reg.priority.toLowerCase(),
        status: 'pending',
        due_date: dueDate.toISOString().split('T')[0],
        assigned_to: supplierData.contact_email || context.user.email
      });

      tasksCreated++;
    }
  }

  // Update supplier flags
  await base44.entities.Supplier.update(supplier_id, {
    cbam_relevant: complianceAnalysis.applicable_regulations.some(r => r.regulation.includes('CBAM')),
    eudr_relevant: complianceAnalysis.applicable_regulations.some(r => r.regulation.includes('EUDR')),
    pfas_relevant: complianceAnalysis.applicable_regulations.some(r => r.regulation.includes('PFAS')),
    ppwr_relevant: complianceAnalysis.applicable_regulations.some(r => r.regulation.includes('PPWR'))
  });

  // Send welcome email
  await base44.integrations.Core.SendEmail({
    to: supplierData.contact_email || context.user.email,
    subject: `Welcome to Supplier Onboarding - ${supplierData.legal_name}`,
    body: `Dear ${supplierData.legal_name},

Welcome to our supplier collaboration platform!

We've identified ${complianceAnalysis.applicable_regulations.length} applicable compliance requirements for your business:
${complianceAnalysis.applicable_regulations.map(r => `- ${r.regulation}: ${r.reason}`).join('\n')}

You have ${tasksCreated} onboarding tasks assigned. Please log in to your portal to get started.

Estimated onboarding time: ${complianceAnalysis.onboarding_duration_estimate}

Access your portal: [Portal Link]

Best regards,
Compliance Team`
  });

  return {
    status: "success",
    tasks_created: tasksCreated,
    applicable_regulations: complianceAnalysis.applicable_regulations,
    estimated_duration: complianceAnalysis.onboarding_duration_estimate
  };
}