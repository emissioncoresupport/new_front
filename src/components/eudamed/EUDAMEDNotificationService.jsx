/**
 * EUDAMED Notification Service
 */

import { base44 } from '@/api/base44Client';

/**
 * Create a notification
 */
export const createNotification = async (
  type,
  title,
  message,
  entityType = null,
  entityId = null,
  entityReference = null,
  priority = 'medium',
  deadlineDate = null,
  metadata = {}
) => {
  try {
    const notification = await base44.entities.Notification.create({
      type,
      priority,
      title,
      message,
      entity_type: entityType,
      entity_id: entityId,
      entity_reference: entityReference,
      deadline_date: deadlineDate,
      read: false,
      metadata
    });

    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error);
    throw error;
  }
};

/**
 * Mark notification as read
 */
export const markAsRead = async (notificationId) => {
  try {
    const user = await base44.auth.me().catch(() => ({ email: 'system' }));
    
    await base44.entities.Notification.update(notificationId, {
      read: true,
      read_by: user.email,
      read_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
  }
};

/**
 * Create notification for new audit log entry requiring review
 */
export const notifyAuditReview = async (auditLog) => {
  // Only notify for critical failures or specific action types
  if (auditLog.outcome === 'failure' || 
      auditLog.action_type === 'report_submission' ||
      auditLog.action_type === 'data_deletion') {
    
    const priority = auditLog.outcome === 'failure' ? 'high' : 'medium';
    
    await createNotification(
      'audit_review',
      `Audit Review Required: ${auditLog.action_type}`,
      `${auditLog.action_description} - Outcome: ${auditLog.outcome}. Review audit trail for details.`,
      auditLog.entity_type,
      auditLog.entity_id,
      auditLog.entity_reference,
      priority,
      null,
      { audit_log_id: auditLog.id }
    );
  }
};

/**
 * Get unread notification count
 */
export const getUnreadCount = async () => {
  try {
    const notifications = await base44.entities.Notification.list();
    return notifications.filter(n => !n.read).length;
  } catch (error) {
    return 0;
  }
};