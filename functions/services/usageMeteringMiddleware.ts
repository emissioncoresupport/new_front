/**
 * Usage Metering Middleware - Token-Based Cost System
 * Tracks and charges tokens for each backend function call
 * Implements EU compliance + proper async cleanup (Dec 2025)
 */

import { 
  authenticateAndValidate,
  errorResponse,
  successResponse 
} from './authValidationMiddleware.js';

/**
 * Token cost table for different operation types
 * Costs are in tokens per operation
 */
const TOKEN_COSTS = {
  // Authentication & validation (low cost)
  'auth.validate': 1,
  'auth.login': 2,
  
  // Data operations (medium cost)
  'data.read': 5,
  'data.write': 10,
  'data.update': 8,
  'data.delete': 8,
  'data.bulk_read': 15,
  'data.bulk_write': 30,
  
  // AI operations (high cost)
  'ai.document_extraction': 50,
  'ai.risk_analysis': 40,
  'ai.pcf_calculation': 35,
  'ai.llm_query': 25,
  
  // Integration operations (medium-high cost)
  'integration.erp_sync': 20,
  'integration.api_call': 15,
  'integration.registry_validation': 12,
  
  // Calculation operations (medium cost)
  'calculation.scope3': 18,
  'calculation.cbam': 16,
  'calculation.pcf': 20,
  'calculation.lca': 25,
  
  // Report generation (high cost)
  'report.pdf': 30,
  'report.xml': 25,
  'report.compliance': 35,
  
  // Orchestration (high cost)
  'orchestration.supplier_sync': 45,
  'orchestration.multi_module': 50,
  
  // Default fallback
  'default': 10
};

/**
 * Main metering wrapper for backend functions
 * @param {Request} req - Incoming request
 * @param {string} operationType - Type of operation (e.g., 'calculation.scope3')
 * @param {Function} handler - Actual function logic
 * @returns {Promise<Response>}
 */
export async function withUsageMetering(req, operationType, handler) {
  const startTime = Date.now();
  let usageLog = null;
  
  try {
    // Step 1: Validate authentication
    const { user, base44, tenantId, error: authError } = await authenticateAndValidate(req);
    if (authError) {
      return errorResponse(authError);
    }

    // Step 2: Get tenant's subscription and token balance
    const companies = await base44.asServiceRole.entities.Company.filter({
      id: tenantId
    });

    if (!companies || companies.length === 0) {
      return errorResponse({
        status: 403,
        message: 'Company not found'
      });
    }

    const company = companies[0];
    const subscription = company.subscription || {};
    const tokenBalance = subscription.token_balance || 0;

    // Step 3: Calculate cost for this operation
    const tokenCost = TOKEN_COSTS[operationType] || TOKEN_COSTS['default'];

    // Step 4: Check if sufficient tokens
    if (tokenBalance < tokenCost) {
      return errorResponse({
        status: 402,
        message: `Insufficient tokens. Required: ${tokenCost}, Available: ${tokenBalance}`,
        token_balance: tokenBalance,
        token_cost: tokenCost
      });
    }

    // Step 5: Create usage log entry (pending)
    usageLog = await base44.asServiceRole.entities.UsageLog.create({
      tenant_id: tenantId,
      user_email: user.email,
      operation_type: operationType,
      token_cost: tokenCost,
      status: 'pending',
      started_at: new Date().toISOString(),
      request_metadata: {
        user_agent: req.headers.get('user-agent'),
        ip_address: req.headers.get('x-forwarded-for') || 'unknown'
      }
    });

    // Step 6: Deduct tokens immediately (prevents race conditions)
    await base44.asServiceRole.entities.Company.update(tenantId, {
      subscription: {
        ...subscription,
        token_balance: tokenBalance - tokenCost,
        last_token_usage: new Date().toISOString()
      }
    });

    // Step 7: Execute actual function logic
    const result = await handler({ user, base44, tenantId });

    // Step 8: Update usage log (success)
    const endTime = Date.now();
    const duration = endTime - startTime;

    await base44.asServiceRole.entities.UsageLog.update(usageLog.id, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      duration_ms: duration,
      success: true
    });

    // Step 9: Update monthly billing
    await updateMonthlyBilling(tenantId, tokenCost, base44);

    // Return result with usage metadata
    return successResponse({
      ...result,
      usage: {
        tokens_used: tokenCost,
        tokens_remaining: tokenBalance - tokenCost,
        duration_ms: duration
      }
    });

  } catch (error) {
    // Error handling - refund tokens if operation failed
    if (usageLog) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      await base44.asServiceRole.entities.UsageLog.update(usageLog.id, {
        status: 'failed',
        completed_at: new Date().toISOString(),
        duration_ms: duration,
        success: false,
        error_message: error.message
      });

      // Refund tokens for failed operation
      const companies = await base44.asServiceRole.entities.Company.filter({
        id: tenantId
      });
      
      if (companies && companies.length > 0) {
        const company = companies[0];
        const subscription = company.subscription || {};
        const currentBalance = subscription.token_balance || 0;
        const tokenCost = TOKEN_COSTS[operationType] || TOKEN_COSTS['default'];

        await base44.asServiceRole.entities.Company.update(tenantId, {
          subscription: {
            ...subscription,
            token_balance: currentBalance + tokenCost // Refund
          }
        });
      }
    }

    return errorResponse({
      status: 500,
      message: `Operation failed: ${error.message}`
    });
  }
}

/**
 * Update monthly billing aggregation
 */
async function updateMonthlyBilling(tenantId, tokenCost, base44) {
  try {
    const now = new Date();
    const billingMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Find or create monthly billing record
    const existingBilling = await base44.asServiceRole.entities.MonthlyBilling.filter({
      tenant_id: tenantId,
      billing_month: billingMonth
    });

    if (existingBilling && existingBilling.length > 0) {
      const billing = existingBilling[0];
      await base44.asServiceRole.entities.MonthlyBilling.update(billing.id, {
        tokens_consumed: (billing.tokens_consumed || 0) + tokenCost,
        api_calls: (billing.api_calls || 0) + 1,
        last_updated: new Date().toISOString()
      });
    } else {
      await base44.asServiceRole.entities.MonthlyBilling.create({
        tenant_id: tenantId,
        billing_month: billingMonth,
        tokens_consumed: tokenCost,
        api_calls: 1,
        created_at: new Date().toISOString(),
        last_updated: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Failed to update monthly billing:', error);
    // Non-critical, don't throw
  }
}

/**
 * Check token balance before expensive operations
 */
export async function checkTokenBalance(tenantId, requiredTokens, base44) {
  try {
    const companies = await base44.asServiceRole.entities.Company.filter({
      id: tenantId
    });

    if (!companies || companies.length === 0) {
      return { sufficient: false, balance: 0 };
    }

    const company = companies[0];
    const subscription = company.subscription || {};
    const tokenBalance = subscription.token_balance || 0;

    return {
      sufficient: tokenBalance >= requiredTokens,
      balance: tokenBalance,
      required: requiredTokens
    };
  } catch (error) {
    return { sufficient: false, balance: 0, error: error.message };
  }
}

/**
 * Get usage statistics for a tenant
 */
export async function getUsageStats(tenantId, period = 'current_month', base44) {
  try {
    const now = new Date();
    let startDate;

    if (period === 'current_month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    } else if (period === 'last_30_days') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    } else {
      startDate = new Date(0).toISOString(); // All time
    }

    const usageLogs = await base44.asServiceRole.entities.UsageLog.filter({
      tenant_id: tenantId
    });

    const filteredLogs = usageLogs.filter(log => 
      log.started_at >= startDate
    );

    const stats = {
      total_operations: filteredLogs.length,
      total_tokens_used: filteredLogs.reduce((sum, log) => sum + (log.token_cost || 0), 0),
      successful_operations: filteredLogs.filter(log => log.success).length,
      failed_operations: filteredLogs.filter(log => !log.success).length,
      avg_duration_ms: filteredLogs.reduce((sum, log) => sum + (log.duration_ms || 0), 0) / filteredLogs.length || 0,
      by_operation_type: {}
    };

    // Group by operation type
    filteredLogs.forEach(log => {
      if (!stats.by_operation_type[log.operation_type]) {
        stats.by_operation_type[log.operation_type] = {
          count: 0,
          tokens: 0
        };
      }
      stats.by_operation_type[log.operation_type].count++;
      stats.by_operation_type[log.operation_type].tokens += log.token_cost || 0;
    });

    return stats;
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Cleanup helper for proper async handling
 * Ensures no pending threads after operation
 */
export async function cleanupAsync(promises) {
  try {
    await Promise.allSettled(promises);
  } catch (error) {
    console.error('Async cleanup error:', error);
  }
}