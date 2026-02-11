/**
 * Multi-Tenant Authentication & Validation Middleware
 * Based on EU Green Deal compliance requirements (Dec 2025)
 * Implements JWT validation, tenant isolation, and relationship verification
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Validates JWT token and extracts authenticated user
 * @param {Request} req - Incoming request
 * @returns {Promise<{user, base44, error}>}
 */
export async function validateJWT(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return {
        error: {
          status: 401,
          message: 'Unauthorized: Invalid or missing JWT token'
        }
      };
    }

    return { user, base44, error: null };
  } catch (error) {
    return {
      error: {
        status: 401,
        message: `Authentication failed: ${error.message}`
      }
    };
  }
}

/**
 * Validates tenant relationship and enforces isolation
 * @param {object} user - Authenticated user
 * @param {string} tenantId - Tenant ID to validate
 * @param {object} base44 - Base44 SDK instance
 * @returns {Promise<{valid, error}>}
 */
export async function validateTenantRelationship(user, tenantId, base44) {
  try {
    // User's company_id must match the requested tenant
    if (user.company_id !== tenantId) {
      return {
        valid: false,
        error: {
          status: 403,
          message: 'Forbidden: Tenant isolation violation'
        }
      };
    }

    // Verify tenant exists and is active
    const companies = await base44.asServiceRole.entities.Company.filter({ 
      id: tenantId 
    });

    if (!companies || companies.length === 0) {
      return {
        valid: false,
        error: {
          status: 404,
          message: 'Tenant not found'
        }
      };
    }

    const company = companies[0];
    if (company.status !== 'active') {
      return {
        valid: false,
        error: {
          status: 403,
          message: 'Tenant account is not active'
        }
      };
    }

    return { valid: true, error: null };
  } catch (error) {
    return {
      valid: false,
      error: {
        status: 500,
        message: `Tenant validation failed: ${error.message}`
      }
    };
  }
}

/**
 * Validates document ownership within tenant
 * @param {string} entityType - Entity type (Supplier, Product, etc.)
 * @param {string} entityId - Entity ID
 * @param {string} tenantId - Tenant ID
 * @param {object} base44 - Base44 SDK instance
 * @returns {Promise<{valid, entity, error}>}
 */
export async function validateDocumentRelationship(entityType, entityId, tenantId, base44) {
  try {
    const entity = await base44.asServiceRole.entities[entityType].filter({ 
      id: entityId 
    });

    if (!entity || entity.length === 0) {
      return {
        valid: false,
        error: {
          status: 404,
          message: `${entityType} not found`
        }
      };
    }

    const doc = entity[0];

    // Validate tenant_id or company_id field
    const docTenantId = doc.tenant_id || doc.company_id;
    if (docTenantId !== tenantId) {
      return {
        valid: false,
        error: {
          status: 403,
          message: 'Document does not belong to this tenant'
        }
      };
    }

    return { valid: true, entity: doc, error: null };
  } catch (error) {
    return {
      valid: false,
      error: {
        status: 500,
        message: `Document validation failed: ${error.message}`
      }
    };
  }
}

/**
 * Complete authentication and validation flow
 * @param {Request} req - Incoming request
 * @param {string} entityType - Optional entity type to validate
 * @param {string} entityId - Optional entity ID to validate
 * @returns {Promise<{user, base44, entity, error}>}
 */
export async function authenticateAndValidate(req, entityType = null, entityId = null) {
  // Step 1: Validate JWT
  const { user, base44, error: authError } = await validateJWT(req);
  if (authError) {
    return { error: authError };
  }

  // Step 2: Validate tenant relationship
  const tenantId = user.company_id;
  const { valid: tenantValid, error: tenantError } = await validateTenantRelationship(
    user, 
    tenantId, 
    base44
  );
  if (!tenantValid) {
    return { error: tenantError };
  }

  // Step 3: Validate document relationship (if applicable)
  let entity = null;
  if (entityType && entityId) {
    const { valid: docValid, entity: doc, error: docError } = await validateDocumentRelationship(
      entityType,
      entityId,
      tenantId,
      base44
    );
    if (!docValid) {
      return { error: docError };
    }
    entity = doc;
  }

  return {
    user,
    base44,
    entity,
    tenantId,
    error: null
  };
}

/**
 * Publishes message to async processing queue (PubSub pattern)
 * @param {string} topic - Message topic
 * @param {object} payload - Message payload
 * @param {string} tenantId - Tenant ID for isolation
 * @returns {Promise<{success, messageId, error}>}
 */
export async function publishToQueue(topic, payload, tenantId) {
  try {
    // For now, store in EventOutbox for async processing
    // In production, this would integrate with actual PubSub service
    const base44 = createClientFromRequest(null); // Service role
    
    const message = await base44.asServiceRole.entities.EventOutbox.create({
      tenant_id: tenantId,
      event_type: topic,
      payload: payload,
      status: 'pending',
      created_at: new Date().toISOString(),
      retry_count: 0
    });

    return {
      success: true,
      messageId: message.id,
      error: null
    };
  } catch (error) {
    return {
      success: false,
      error: {
        status: 500,
        message: `Queue publish failed: ${error.message}`
      }
    };
  }
}

/**
 * Helper to create standardized error response
 */
export function errorResponse(error) {
  return Response.json(
    { 
      error: error.message,
      status: 'error',
      timestamp: new Date().toISOString()
    },
    { status: error.status || 500 }
  );
}

/**
 * Helper to create standardized success response
 */
export function successResponse(data, status = 200) {
  return Response.json(
    {
      ...data,
      status: 'success',
      timestamp: new Date().toISOString()
    },
    { status }
  );
}