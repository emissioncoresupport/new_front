import { base44 } from "@/api/base44Client";

export async function checkAndSendReminders() {
  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  
  const tasks = await base44.entities.VSMETask.list();
  const collaborators = await base44.entities.VSMECollaborator.list();

  for (const task of tasks) {
    if (task.status === 'completed' || task.status === 'cancelled') continue;
    
    const dueDate = task.due_date ? new Date(task.due_date) : null;
    if (!dueDate) continue;

    const collaborator = collaborators.find(c => c.email === task.assigned_to);
    const notifPrefs = collaborator?.notification_preferences || { email: true, reminders: true };
    
    if (!notifPrefs.reminders) continue;

    let shouldNotify = false;
    let notificationType = 'task_reminder';
    let title = '';
    let message = '';

    // Check if overdue
    if (dueDate < now && (!task.last_reminder_date || new Date(task.last_reminder_date) < now - 24*60*60*1000)) {
      shouldNotify = true;
      notificationType = 'task_overdue';
      title = `Overdue Task: ${task.title}`;
      message = `Your task "${task.title}" for disclosure ${task.disclosure_code} was due on ${dueDate.toLocaleDateString()}. Please complete it as soon as possible.`;
    }
    // Check if due within 3 days
    else if (dueDate <= threeDaysFromNow && dueDate > now && task.reminder_count < 2) {
      shouldNotify = true;
      notificationType = 'task_reminder';
      title = `Upcoming Deadline: ${task.title}`;
      message = `Your task "${task.title}" for disclosure ${task.disclosure_code} is due on ${dueDate.toLocaleDateString()}.`;
    }

    if (shouldNotify) {
      // Create notification
      await base44.entities.VSMENotification.create({
        recipient_email: task.assigned_to,
        notification_type: notificationType,
        related_entity_id: task.id,
        related_entity_type: 'task',
        title,
        message,
        sent_via_email: notifPrefs.email
      });

      // Send email if enabled
      if (notifPrefs.email) {
        try {
          await base44.integrations.Core.SendEmail({
            to: task.assigned_to,
            subject: title,
            body: message
          });
        } catch (e) {
          console.error('Failed to send reminder email:', e);
        }
      }

      // Update task
      await base44.entities.VSMETask.update(task.id, {
        last_reminder_date: now.toISOString(),
        reminder_count: (task.reminder_count || 0) + 1,
        status: dueDate < now ? 'overdue' : task.status
      });
    }
  }

  return { sent: tasks.length, processed: tasks.length };
}

export async function notifyNewMessage(message) {
  const notification = await base44.entities.VSMENotification.create({
    recipient_email: message.recipient_email,
    notification_type: 'new_message',
    related_entity_id: message.id,
    related_entity_type: 'message',
    title: `New message from ${message.sender_name}`,
    message: message.message.substring(0, 100) + '...',
    sent_via_email: true
  });

  return notification;
}