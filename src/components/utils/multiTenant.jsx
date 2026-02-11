import { base44 } from '@/api/base44Client';

/**
 * Multi-tenant utilities for data isolation and company context
 */

//Get All users by company
export async function getUserListByCompany(company){
  try {
    const userlist = [
      {
        "id":"1",
        "full_name":"Jose Luis Chamizo",
        "email":"chamodcuba@gmail.com",
        "is_active":true,
        "user_role":"company_admin",
        "job_title":"LCA Tester",
        "last_login":"2026-02-08T22:08:35.141Z",
        "department":"contability",
        "phone":"55698745",
        "assigned_modules": ['CBAM', 'EUDR', 'CSRD', 'DPP', 'PFAS', 'PPWR', 'LCA', 'CCF', 'SupplyLens']
      },
      {
        "id":"2",
        "full_name":"Antonio Placeres",
        "email":"tester@gmail.com",
        "is_active":true,
        "user_role":"auditor",
        "job_title":"Auditar of Emission Core",
        "last_login":"2026-02-08T22:08:35.141Z",
        "department":"economy",
        "phone":"55698745",
        "assigned_modules": ['CBAM', 'EUDR', 'CSRD']
      },
      {
        "id":"3",
        "full_name":"Jorge Luis",
        "email":"jlchamizo@gmail.com",
        "is_active":false,
        "user_role":"data_entry",
        "job_title":"PEF Tester",
        "last_login":"2026-02-08T22:08:35.141Z",
        "department":"contability",
        "phone":"55698745",
        "assigned_modules": ['PPWR', 'LCA', 'CCF', 'SupplyLens']
      }
    ]

    return userlist;
  }
  catch (error) {
    console.error('Failed to get company:', error);
    return [];
  }
}

// Get current user's company
export async function getCurrentCompany() {
  try {
    /*
    const user = await base44.auth.me();
    if (!user.company_id) {
      const users = await base44.entities.User.list();
      const fullUser = users.find(u => u.email === user.email);
      if (!fullUser?.company_id) {
        return null;
      }
      user.company_id = fullUser.company_id;
    }
    const companies = await base44.entities.Company.list();
    return companies.find(c => c.id === user.company_id);
    */
    const user_companies = {
      "id": "company_1",
      "company_name": "Emission Core",
      "company_type": "Importer",
      "eori_number": "adfadfasdf",
      "vat_number": "vat",
      "address": "115 ST",
      "city": "Berlin",
      "postal_code": "rt15225",
      "country": "ge",
      "active_modules": ['CBAM', 'EUDR', 'CSRD', 'DPP', 'PFAS', 'PPWR', 'LCA', 'CCF', 'SupplyLens', 'VSME', 'EUDAMED']
    }
    return user_companies
  } catch (error) {
    console.error('Failed to get company:', error);
    return null;
  }
}

// Get current user
export async function getUserMe() {
  try {

      const res = await fetch(`${import.meta.env.VITE_BASE44_BACKEND_URL}/api/v1/user/me?mail=${sessionStorage.email}`, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json'
        }
      })

      //console.log(`/api/v1/user/me`);

      const data = await res.json();
      //console.log(data);
      //console.log(data.email);
      //console.log("DATAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
      
      if (!res.ok) {
        throw new Error(JSON.stringify(data.detail))
      }

    const user_value = {
      "email": data.email,                
      "role": data.role,                                 
      "isActive": data.isActive,
      "id": data.id,                               
      "uid": data.uid,
      "companyId": data.companyId,
      "tenantId": data.tenantId,
      "is_verified": data.is_verified,                           
      "disabled": data.disabled,                              
      "created_date": data.created_date,     
      "updated_date": data.updated_date,     
      "full_name": data.full_name,   
      "app_id": data.app_id,                             
      "is_service": data.is_service,                             
      "_app_role": data._app_role
    }
    return user_value;
    const user = await base44.auth.me();
    const users = await base44.entities.User.list();
    return users.find(u => u.email === user.email) || user;
  } catch (error) {
    console.error('Failed to get user:', error);
    return null;
  }
}

// Get current user with full details
export async function getCurrentUser() {
  try {
    const res = await fetch(`${import.meta.env.VITE_BASE44_BACKEND_URL}/api/v1/user/user_data?mail=${sessionStorage.email}`, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json'
        }
      })

      //console.log(`/api/v1/user/me`);

      const data = await res.json();
      //console.log(data);
      //console.log(data.email);
      //console.log("DATAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
      
      if (!res.ok) {
        throw new Error(JSON.stringify(data.detail))
      }

    console.log("Current Userrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr");
    console.log(data);
    const user_value = {
      "full_name": data.full_name,
      "department": data.department,
      "job_title": data.job_title,
      "phone": data.phone,
      "language": data.language,
      "user_role": data.user_role,
      "assigned_modules": data.assigned_modules,
      "notification_preferences": {
        "email_notifications": true,
        "deadline_alerts": true,
        "data_requests": true
      }
    }
    return user_value;
    const user = await base44.auth.me();
    const users = await base44.entities.User.list();
    return users.find(u => u.email === user.email) || user;
  } catch (error) {
    console.error('Failed to get user:', error);
    return null;
  }
}

// Check if user has permission
export function hasPermission(user, permission) {
  if (user.role === 'admin') return true;
  if (user.user_role === 'company_admin') return true;
  return user.permissions?.includes(permission) || false;
}

// Check if user can access module
export function canAccessModule(user, moduleName) {
  if (user.role === 'admin') return true;
  if (user.user_role === 'company_admin') return true;
  return user.assigned_modules?.includes(moduleName) || false;
}

// Filter entities by company
export async function getCompanyEntities(entityName, company_id) {
  const allEntities = await base44.entities[entityName].list();
  return allEntities.filter(e => e.created_by === company_id || e.company_id === company_id);
}

// Create audit log entry
export async function createAuditLog(action, entityType, entityId, changes = null, options = {}) {
  try {
    const user = await base44.auth.me();
    const fullUser = await getCurrentUser();
    
    await base44.entities.AuditLog.create({
      company_id: fullUser?.company_id,
      user_email: user.email,
      action,
      entity_type: entityType,
      entity_id: entityId,
      changes,
      module: options.module || 'System',
      severity: options.severity || 'INFO',
      notes: options.notes,
      session_id: sessionStorage.getItem('session_id') || generateSessionId()
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}

// Generate session ID if not exists
function generateSessionId() {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  sessionStorage.setItem('session_id', sessionId);
  return sessionId;
}

// Check if company has active subscription
export function isSubscriptionActive(company) {
  if (!company) return false;
  if (!company.is_active) return false;
  if (!company.license_expires) return true;
  return new Date(company.license_expires) > new Date();
}

// Check if module is enabled for company
export function isModuleEnabled(company, moduleName) {
  if (!company) return false;
  return company.active_modules?.includes(moduleName) || false;
}

// Get company usage stats
export async function getCompanyUsage(company_id) {
  try {
    const users = await base44.entities.User.list();
    const companyUsers = users.filter(u => u.company_id === company_id);
    
    const suppliers = await base44.entities.Supplier.list();
    const companySuppliers = suppliers.filter(s => s.created_by === company_id || s.company_id === company_id);
    
    return {
      users: companyUsers.length,
      suppliers: companySuppliers.length,
    };
  } catch (error) {
    console.error('Failed to get company usage:', error);
    return { users: 0, suppliers: 0 };
  }
}

// Enhanced create with audit logging
export async function createEntityWithAudit(entityName, data, module) {
  const user = await getCurrentUser();
  const entityData = {
    ...data,
    company_id: user?.company_id
  };
  
  const created = await base44.entities[entityName].create(entityData);
  
  await createAuditLog('CREATE', entityName, created.id, { after: created }, { module });
  
  return created;
}

// Enhanced update with audit logging
export async function updateEntityWithAudit(entityName, id, data, module) {
  const entities = await base44.entities[entityName].list();
  const before = entities.find(e => e.id === id);
  
  const updated = await base44.entities[entityName].update(id, data);
  
  await createAuditLog('UPDATE', entityName, id, { before, after: updated }, { module });
  
  return updated;
}

// Enhanced delete with audit logging
export async function deleteEntityWithAudit(entityName, id, module) {
  const entities = await base44.entities[entityName].list();
  const entity = entities.find(e => e.id === id);
  
  await base44.entities[entityName].delete(id);
  
  await createAuditLog('DELETE', entityName, id, { before: entity }, { module, severity: 'WARNING' });
}