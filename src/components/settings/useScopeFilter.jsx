import { useState, useEffect } from 'react';

/**
 * Custom hook to apply scope filtering to queries
 * Usage: const scopeFilter = useScopeFilter();
 * Then: base44.entities.MyEntity.filter({ ...scopeFilter, other: 'filters' })
 */
export function useScopeFilter() {
  const [scopeFilter, setScopeFilter] = useState({});

  useEffect(() => {
    const handleScopeChange = (event) => {
      const scope = event.detail;
      
      if (!scope) {
        setScopeFilter({});
        return;
      }

      // Build filter based on scope type
      const filter = {};
      
      if (scope.legal_entity_ids && scope.legal_entity_ids.length > 0) {
        filter.legal_entity_id = { $in: scope.legal_entity_ids };
      }
      
      if (scope.site_ids && scope.site_ids.length > 0) {
        filter.site_id = { $in: scope.site_ids };
      }

      setScopeFilter(filter);
    };

    window.addEventListener('scopeChanged', handleScopeChange);
    return () => window.removeEventListener('scopeChanged', handleScopeChange);
  }, []);

  return scopeFilter;
}