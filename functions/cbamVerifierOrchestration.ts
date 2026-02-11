import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * CBAM Verifier Orchestration Engine
 * Auto-assignment, workload balancing, opinion tracking
 * Per Annex V - Verification requirements
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, params } = await req.json();

    switch (action) {
      case 'assign_verifier':
        return await assignVerifier(base44, params);
      
      case 'get_workload':
        return await getVerifierWorkload(base44, params);
      
      case 'submit_opinion':
        return await submitVerificationOpinion(base44, params);
      
      case 'track_progress':
        return await trackVerificationProgress(base44, params);
      
      default:
        return Response.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function assignVerifier(base44, params) {
  const { entry_ids, assignment_mode } = params;
  
  // Fetch all accredited verifiers
  const verifiers = await base44.asServiceRole.entities.CBAMVerifier.filter({
    accreditation_status: 'active',
    available: true
  });
  
  if (!verifiers.length) {
    return Response.json({ 
      error: 'No accredited verifiers available',
      action_required: 'Add verifiers to system'
    }, { status: 400 });
  }
  
  // Get current workload for each verifier
  const workloads = await Promise.all(
    verifiers.map(async (v) => {
      const requests = await base44.asServiceRole.entities.CBAMVerificationRequest.filter({
        verifier_id: v.id,
        status: { $in: ['pending', 'assigned', 'in_progress'] }
      });
      
      return {
        verifier: v,
        current_workload: requests.length,
        capacity_remaining: (v.max_concurrent_requests || 50) - requests.length
      };
    })
  );
  
  const assignments = [];
  
  for (const entry_id of entry_ids) {
    let selectedVerifier;
    
    if (assignment_mode === 'round_robin') {
      // Round-robin: pick verifier with lowest workload
      workloads.sort((a, b) => a.current_workload - b.current_workload);
      selectedVerifier = workloads[0].verifier;
      workloads[0].current_workload++;
    } else if (assignment_mode === 'expertise') {
      // Expertise-based: match sector specialization
      const entries = await base44.asServiceRole.entities.CBAMEmissionEntry.filter({ id: entry_id });
      const entry = entries[0];
      
      const sectorMatch = workloads.find(w => 
        w.verifier.sector_expertise?.includes(entry.aggregated_goods_category)
      );
      
      selectedVerifier = sectorMatch ? sectorMatch.verifier : workloads[0].verifier;
    } else {
      // Random
      selectedVerifier = verifiers[Math.floor(Math.random() * verifiers.length)];
    }
    
    // Create verification request
    const request = await base44.asServiceRole.entities.CBAMVerificationRequest.create({
      request_id: `VER-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      entry_id,
      verifier_id: selectedVerifier.id,
      request_type: 'operator_report',
      requested_date: new Date().toISOString(),
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'assigned',
      assigned_to: selectedVerifier.email,
      priority: 'medium'
    });
    
    // Notify verifier
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: selectedVerifier.email,
      subject: `New CBAM Verification Assignment - ${request.request_id}`,
      body: `
        You have been assigned a new CBAM verification request.
        
        Request ID: ${request.request_id}
        Type: Operator Emission Report
        Due Date: ${request.due_date}
        Priority: ${request.priority}
        
        Access verification portal: ${Deno.env.get('BASE_URL')}/CBAM?tab=verification
      `
    });
    
    assignments.push({
      entry_id,
      verifier: selectedVerifier.organization_name,
      verifier_email: selectedVerifier.email,
      request_id: request.request_id
    });
  }
  
  return Response.json({
    success: true,
    assignments_created: assignments.length,
    assignments
  });
}

async function getVerifierWorkload(base44, params) {
  const verifiers = await base44.asServiceRole.entities.CBAMVerifier.list();
  
  const workloadReport = await Promise.all(
    verifiers.map(async (v) => {
      const requests = await base44.asServiceRole.entities.CBAMVerificationRequest.filter({
        verifier_id: v.id
      });
      
      const byStatus = requests.reduce((acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      }, {});
      
      const overdue = requests.filter(r => 
        r.due_date && new Date(r.due_date) < new Date() && r.status !== 'completed'
      ).length;
      
      return {
        verifier_id: v.id,
        organization: v.organization_name,
        email: v.email,
        total_requests: requests.length,
        pending: byStatus.pending || 0,
        in_progress: byStatus.in_progress || 0,
        completed: byStatus.completed || 0,
        overdue,
        capacity: v.max_concurrent_requests || 50,
        utilization_percent: Math.round((requests.filter(r => r.status !== 'completed').length / (v.max_concurrent_requests || 50)) * 100)
      };
    })
  );
  
  return Response.json({
    success: true,
    verifiers: workloadReport,
    total_verifiers: verifiers.length
  });
}

async function submitVerificationOpinion(base44, params) {
  const { request_id, opinion, findings, site_visit_conducted } = params;
  
  const requests = await base44.asServiceRole.entities.CBAMVerificationRequest.filter({ 
    request_id 
  });
  
  if (!requests.length) {
    return Response.json({ error: 'Request not found' }, { status: 404 });
  }
  
  const request = requests[0];
  
  // Create verification report
  const report = await base44.asServiceRole.entities.CBAMVerificationReport.create({
    request_id,
    entry_id: request.entry_id,
    verifier_id: request.verifier_id,
    verification_opinion: opinion, // satisfactory | satisfactory_with_comments | unsatisfactory
    findings: findings || [],
    site_visit_conducted: site_visit_conducted || false,
    report_date: new Date().toISOString(),
    reporting_year: new Date().getFullYear()
  });
  
  // Update request status
  await base44.asServiceRole.entities.CBAMVerificationRequest.update(request.id, {
    status: 'completed',
    completed_date: new Date().toISOString(),
    verification_report_id: report.id
  });
  
  // Update entry validation status
  const validationStatus = opinion === 'satisfactory' ? 'manual_verified' : 'flagged';
  
  await base44.asServiceRole.entities.CBAMEmissionEntry.update(request.entry_id, {
    validation_status: validationStatus,
    verified_by: request.assigned_to,
    verification_date: new Date().toISOString()
  });
  
  return Response.json({
    success: true,
    report_id: report.id,
    opinion,
    entry_updated: true
  });
}

async function trackVerificationProgress(base44, params) {
  const { company_id } = params;
  
  const entries = await base44.asServiceRole.entities.CBAMEmissionEntry.filter({
    company_id
  });
  
  const requests = await base44.asServiceRole.entities.CBAMVerificationRequest.list();
  
  const stats = {
    total_entries: entries.length,
    verified: entries.filter(e => e.validation_status === 'manual_verified').length,
    in_verification: requests.filter(r => r.status === 'in_progress').length,
    pending: requests.filter(r => r.status === 'pending').length,
    completed: requests.filter(r => r.status === 'completed').length
  };
  
  stats.verification_rate = stats.total_entries > 0 
    ? Math.round((stats.verified / stats.total_entries) * 100)
    : 0;
  
  return Response.json({
    success: true,
    ...stats
  });
}