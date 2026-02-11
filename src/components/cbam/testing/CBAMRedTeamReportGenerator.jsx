/**
 * CBAM RED-TEAM TEST REPORT GENERATOR
 * Regulator-Grade Failure Documentation
 */

export default function CBAMRedTeamReportGenerator() {
  const generateReport = (testResults) => {
    const report = {
      title: 'CBAM RED-TEAM STRESS TEST REPORT',
      date: new Date().toISOString(),
      version: '2026-01-20',
      executive_summary: generateExecutiveSummary(testResults),
      scenario_results: testResults,
      critical_findings: extractCriticalFindings(testResults),
      compliance_gaps: extractComplianceGaps(testResults),
      financial_risk_summary: calculateFinancialRisk(testResults),
      production_readiness: assessProductionReadiness(testResults)
    };

    return report;
  };

  const generateExecutiveSummary = (testResults) => {
    const totalScenarios = testResults.length;
    const failedScenarios = testResults.filter(r => r.passed === false).length;
    const failedTests = testResults
      .flatMap(r => r.tests || [])
      .filter(t => !t.pass);

    const highSeverityFailures = failedTests.filter(t => t.severity === 'HIGH');
    const totalFinancialRisk = failedTests.reduce((sum, t) => {
      const amount = parseFloat(t.financial_risk?.replace(/[€,]/g, '') || '0');
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    return {
      total_scenarios_executed: totalScenarios,
      scenarios_passed: totalScenarios - failedScenarios,
      scenarios_failed: failedScenarios,
      total_test_cases: testResults.flatMap(r => r.tests || []).length,
      test_cases_passed: testResults.flatMap(r => r.tests || []).filter(t => t.pass).length,
      test_cases_failed: failedTests.length,
      high_severity_failures: highSeverityFailures.length,
      critical_issues: highSeverityFailures.filter(t => t.severity === 'CRITICAL').length,
      estimated_total_financial_risk: totalFinancialRisk,
      production_ready: failedScenarios === 0 && highSeverityFailures.length === 0,
      recommendation: failedScenarios === 0 && highSeverityFailures.length === 0
        ? 'APPROVED FOR PRODUCTION'
        : failedScenarios <= 2 && highSeverityFailures.length <= 3
        ? 'CONDITIONAL PRODUCTION (with mitigations)'
        : 'NOT PRODUCTION READY'
    };
  };

  const extractCriticalFindings = (testResults) => {
    return testResults
      .flatMap((scenario) =>
        (scenario.tests || []).map((test) => ({
          scenario: scenario.scenario,
          test: test.test,
          severity: test.severity,
          passed: test.pass,
          compliance_risk: test.compliance_risk,
          financial_risk: test.financial_risk
        }))
      )
      .filter(f => (f.severity === 'HIGH' || f.severity === 'CRITICAL') && !f.passed);
  };

  const extractComplianceGaps = (testResults) => {
    const gaps = {};

    testResults
      .flatMap(r => r.tests || [])
      .forEach(t => {
        if (!t.pass) {
          const ref = t.compliance_risk || 'Unknown';
          gaps[ref] = (gaps[ref] || 0) + 1;
        }
      });

    return Object.entries(gaps).map(([ref, count]) => ({
      regulation: ref,
      gap_count: count
    }));
  };

  const calculateFinancialRisk = (testResults) => {
    const risks = [];

    testResults
      .flatMap(r => r.tests || [])
      .forEach(t => {
        if (!t.pass && t.financial_risk) {
          risks.push({
            scenario: t.test,
            amount: t.financial_risk,
            severity: t.severity
          });
        }
      });

    const totalRisk = risks.reduce((sum, r) => {
      const amount = parseFloat(r.amount?.replace(/[€,]/g, '') || '0');
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    return {
      identified_risks: risks,
      total_quantifiable_risk_eur: totalRisk,
      unquantifiable_risks: risks.filter(r => r.amount.includes('Unknown')).length,
      recommendation: totalRisk > 1000000
        ? 'Immediate remediation required'
        : totalRisk > 100000
        ? 'Remediation before Q2 2026 submission'
        : 'Monitor and document'
    };
  };

  const assessProductionReadiness = (testResults) => {
    const failedTests = testResults
      .flatMap(r => r.tests || [])
      .filter(t => !t.pass);

    const criticalFailures = failedTests.filter(t => 
      t.severity === 'CRITICAL' || 
      (t.severity === 'HIGH' && 
       (t.compliance_risk.includes('blocking') || 
        t.compliance_risk.includes('mandatory')))
    );

    const readinessScore = Math.max(0, 100 - (criticalFailures.length * 10) - (failedTests.length * 2));

    return {
      readiness_score: readinessScore,
      critical_blockers: criticalFailures.length,
      non_critical_issues: failedTests.length - criticalFailures.length,
      status: readinessScore >= 95
        ? 'PRODUCTION READY'
        : readinessScore >= 80
        ? 'PRODUCTION READY WITH MITIGATIONS'
        : readinessScore >= 60
        ? 'NOT READY - MAJOR ISSUES'
        : 'NOT READY - CRITICAL FAILURES',
      recommendation: criticalFailures.length > 0
        ? 'Fix critical failures before production deployment'
        : failedTests.length > 0
        ? 'Address non-critical issues within 30 days'
        : 'Ready for production'
    };
  };

  return {
    generateReport
  };
}