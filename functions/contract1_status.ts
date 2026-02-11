import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const DEFAULT_SECTIONS = {
  known_scope: { passed: 0, total: 0, items: [] },
  unknown_scope: { passed: 0, total: 0, items: [] },
  matrix: { passed: 0, total: 0, items: [] },
  tenant: { passed: 0, total: 0, items: [] },
  discipline: { passed: 0, total: 0, items: [] }
};

Deno.serve(async (req) => {
  const correlation_id = crypto.getRandomValues(new Uint8Array(16)).toString();

  try {
    const base44 = createClientFromRequest(req);

    // Determine environment and build
    const companies = await base44.asServiceRole.entities.Company.filter({});
    const company = companies?.[0];
    const environment = company?.data_mode || 'TEST';
    const build_id = company?.app_version || 'unknown';

    // Fetch latest test run
    let latestRun = null;
    try {
      const runs = await base44.asServiceRole.entities.ContractTestRun.filter(
        { suite_name: 'CONTRACT1_MANUAL_ENTRY' },
        '-finished_at_utc',
        1
      );
      latestRun = runs?.[0] || null;
    } catch (err) {
      console.log('ContractTestRun fetch failed:', err.message);
    }

    // Build sections from latest run
    let sections = JSON.parse(JSON.stringify(DEFAULT_SECTIONS));

    if (latestRun && latestRun.results_json) {
      const results = latestRun.results_json.results || [];

      // Categorize test results
      const knownTests = results.filter(r => r.test_id.startsWith('KNOWN_'));
      const unknownTests = results.filter(r => r.test_id.startsWith('UNKNOWN_'));
      const matrixTests = results.filter(r => r.test_id.startsWith('MATRIX_'));
      const tenantTests = results.filter(r => r.test_id.startsWith('TENANT_'));
      const disciplineTests = results.filter(r => r.test_id.startsWith('DISCIPLINE_'));

      sections.known_scope = {
        passed: knownTests.filter(r => r.status === 'PASS').length,
        total: knownTests.length,
        items: knownTests.map(r => ({
          test_id: r.test_id,
          name: r.name,
          status: r.status,
          error_code: r.actual_error_code
        }))
      };

      sections.unknown_scope = {
        passed: unknownTests.filter(r => r.status === 'PASS').length,
        total: unknownTests.length,
        items: unknownTests.map(r => ({
          test_id: r.test_id,
          name: r.name,
          status: r.status,
          error_code: r.actual_error_code
        }))
      };

      sections.matrix = {
        passed: matrixTests.filter(r => r.status === 'PASS').length,
        total: matrixTests.length,
        items: matrixTests.map(r => ({
          test_id: r.test_id,
          name: r.name,
          status: r.status,
          error_code: r.actual_error_code
        }))
      };

      sections.tenant = {
        passed: tenantTests.filter(r => r.status === 'PASS').length,
        total: tenantTests.length,
        items: tenantTests.map(r => ({
          test_id: r.test_id,
          name: r.name,
          status: r.status,
          error_code: r.actual_error_code
        }))
      };

      sections.discipline = {
        passed: disciplineTests.filter(r => r.status === 'PASS').length,
        total: disciplineTests.length,
        items: disciplineTests.map(r => ({
          test_id: r.test_id,
          name: r.name,
          status: r.status,
          error_code: r.actual_error_code
        }))
      };
    }

    const response = {
      environment,
      build_id,
      latest_run: latestRun ? {
        run_id: latestRun.run_id,
        status: latestRun.status,
        started_at_utc: latestRun.started_at_utc,
        finished_at_utc: latestRun.finished_at_utc,
        pass_count: latestRun.pass_count,
        fail_count: latestRun.fail_count,
        total_tests: latestRun.total_tests,
        pass_rate: latestRun.pass_rate,
        results_hash_sha256: latestRun.results_hash_sha256
      } : null,
      sections,
      correlation_id
    };

    return Response.json(response, { status: 200 });
  } catch (error) {
    return Response.json(
      {
        environment: 'unknown',
        build_id: 'unknown',
        latest_run: null,
        sections: DEFAULT_SECTIONS,
        error: error.message,
        error_code: 'STATUS_FETCH_FAILED',
        correlation_id
      },
      { status: 500 }
    );
  }
});