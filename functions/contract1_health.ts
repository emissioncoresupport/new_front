import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Try to read one ContractTestRun
    const runs = await base44.asServiceRole.entities.ContractTestRun.list('-created_date', 1);
    
    return Response.json(
      {
        status: 'healthy',
        test_runner_available: true,
        latest_run_exists: runs.length > 0,
        latest_run_id: runs.length > 0 ? runs[0].run_id : null
      },
      { status: 200 }
    );
  } catch (error) {
    return Response.json(
      {
        status: 'unhealthy',
        error: error.message,
        test_runner_available: false
      },
      { status: 503 }
    );
  }
});