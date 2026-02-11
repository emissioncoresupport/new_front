import React, { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import eventBus, { CBAM_EVENTS } from './CBAMEventBus';

/**
 * CBAM Real-Time Sync Component
 * Listens to events and automatically refreshes UI across all tabs
 * Eliminates manual refresh needs
 */

export default function CBAMRealTimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Entry events
    const unsubscribeCreated = eventBus.on(CBAM_EVENTS.ENTRY_CREATED, () => {
      queryClient.invalidateQueries({ queryKey: ['cbam-emission-entries'] });
    });

    const unsubscribeUpdated = eventBus.on(CBAM_EVENTS.ENTRY_UPDATED, () => {
      queryClient.invalidateQueries({ queryKey: ['cbam-emission-entries'] });
    });

    const unsubscribeDeleted = eventBus.on(CBAM_EVENTS.ENTRY_DELETED, () => {
      queryClient.invalidateQueries({ queryKey: ['cbam-emission-entries'] });
    });

    const unsubscribeValidated = eventBus.on(CBAM_EVENTS.ENTRY_VALIDATED, () => {
      queryClient.invalidateQueries({ queryKey: ['cbam-emission-entries'] });
    });

    // Verification events
    const unsubscribeVerificationCompleted = eventBus.on(CBAM_EVENTS.VERIFICATION_COMPLETED, () => {
      queryClient.invalidateQueries({ queryKey: ['cbam-emission-entries'] });
      queryClient.invalidateQueries({ queryKey: ['cbam-verification-reports'] });
    });

    // Report events
    const unsubscribeReportGenerated = eventBus.on(CBAM_EVENTS.REPORT_GENERATED, () => {
      queryClient.invalidateQueries({ queryKey: ['cbam-reports'] });
    });

    const unsubscribeReportSubmitted = eventBus.on(CBAM_EVENTS.REPORT_SUBMITTED, () => {
      queryClient.invalidateQueries({ queryKey: ['cbam-reports'] });
    });

    // Certificate events
    const unsubscribeCertPurchased = eventBus.on(CBAM_EVENTS.CERTIFICATE_PURCHASED, () => {
      queryClient.invalidateQueries({ queryKey: ['cbam-certificates'] });
      queryClient.invalidateQueries({ queryKey: ['cbam-purchase-orders'] });
    });

    // Cleanup
    return () => {
      unsubscribeCreated();
      unsubscribeUpdated();
      unsubscribeDeleted();
      unsubscribeValidated();
      unsubscribeVerificationCompleted();
      unsubscribeReportGenerated();
      unsubscribeReportSubmitted();
      unsubscribeCertPurchased();
    };
  }, [queryClient]);

  return null; // This is a logic-only component
}