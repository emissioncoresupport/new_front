/**
 * Step Factory Registry - ZERO circular dependencies
 * 
 * Uses dynamic imports (React.lazy) to break circular dependency cycles
 * between the wizard registry and step components.
 * 
 * NO direct top-level imports of step modules - all loaded via lazy factories.
 */

export const stepLoaders = {
  Step2RegistryDriven: () => import('../steps/Step2RegistryDriven'),
  Step2SupplierMasterData: () => import('../steps/Step2SupplierMasterData'),
};

/**
 * Get a lazy-loaded step component
 * Returns React.lazy wrapped component ready for Suspense
 */
export const getStepComponent = (stepKey) => {
  if (!stepLoaders[stepKey]) {
    console.warn(`[stepFactory] Unknown step: ${stepKey}`);
    return null;
  }
  return stepLoaders[stepKey];
};

/**
 * Usage in wizard:
 * 
 * const Step2Component = React.useMemo(
 *   () => React.lazy(getStepComponent('Step2RegistryDriven')),
 *   []
 * );
 * 
 * <React.Suspense fallback={<div>Loading...</div>}>
 *   <Step2Component {...props} />
 * </React.Suspense>
 */