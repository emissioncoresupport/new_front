import React, { createContext, useState, useEffect } from 'react';

export const TenantContext = createContext(null);

const DEFAULT_CONTEXT = {
  active_context_type: 'BUYER',
  active_buyer_tenant_id: 'TENANT_DSV_DEMO',
  active_supplier_org_id: null
};

export function TenantContextProvider({ children }) {
  const [context, setContext] = useState(DEFAULT_CONTEXT);
  const [isLoading, setIsLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('tenant_context');
      if (stored) {
        setContext(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load tenant context:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Persist to localStorage whenever context changes
  const updateContext = (newContext) => {
    try {
      localStorage.setItem('tenant_context', JSON.stringify(newContext));
      setContext(newContext);
    } catch (error) {
      console.error('Failed to save tenant context:', error);
    }
  };

  const switchToBuyer = (tenantId = 'TENANT_DSV_DEMO') => {
    updateContext({
      active_context_type: 'BUYER',
      active_buyer_tenant_id: tenantId,
      active_supplier_org_id: null
    });
  };

  const switchToSupplier = (orgId = 'SUP_ORG_DEMO') => {
    updateContext({
      active_context_type: 'SUPPLIER',
      active_buyer_tenant_id: null,
      active_supplier_org_id: orgId
    });
  };

  const value = {
    context,
    updateContext,
    switchToBuyer,
    switchToSupplier,
    isLoading
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}