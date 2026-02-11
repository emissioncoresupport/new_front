/**
 * CBAM Event Bus
 * Real-time cross-component communication for data synchronization
 * Eliminates need for manual refreshes
 */

class CBAMEventBus {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * Subscribe to events
   */
  on(eventName, callback) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    this.listeners.get(eventName).push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(eventName);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * Emit event to all subscribers
   */
  emit(eventName, data) {
    const callbacks = this.listeners.get(eventName);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${eventName}:`, error);
        }
      });
    }
  }

  /**
   * Remove all listeners for an event
   */
  off(eventName) {
    this.listeners.delete(eventName);
  }

  /**
   * Clear all listeners
   */
  clear() {
    this.listeners.clear();
  }
}

// Singleton instance
const eventBus = new CBAMEventBus();

/**
 * Predefined CBAM Events
 */
export const CBAM_EVENTS = {
  // Entry lifecycle
  ENTRY_CREATED: 'entry:created',
  ENTRY_UPDATED: 'entry:updated',
  ENTRY_DELETED: 'entry:deleted',
  ENTRY_VALIDATED: 'entry:validated',
  
  // Verification
  VERIFICATION_REQUESTED: 'verification:requested',
  VERIFICATION_COMPLETED: 'verification:completed',
  
  // Reports
  REPORT_GENERATED: 'report:generated',
  REPORT_SUBMITTED: 'report:submitted',
  
  // Certificates
  CERTIFICATE_PURCHASED: 'certificate:purchased',
  CERTIFICATE_SURRENDERED: 'certificate:surrendered',
  
  // Suppliers
  SUPPLIER_DATA_RECEIVED: 'supplier:data_received',
  
  // Calculations
  CALCULATION_COMPLETED: 'calculation:completed'
};

/**
 * React hook for event bus
 */
export function useCBAMEvent(eventName, callback) {
  React.useEffect(() => {
    const unsubscribe = eventBus.on(eventName, callback);
    return unsubscribe;
  }, [eventName, callback]);
}

export default eventBus;