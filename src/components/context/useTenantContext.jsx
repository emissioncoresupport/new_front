import { useContext } from 'react';
import { TenantContext } from './TenantContext';

export function useTenantContext() {
  const context = useContext(TenantContext);
  
  if (!context) {
    throw new Error('useTenantContext must be used within TenantContextProvider');
  }
  
  return context;
}