import { storage } from "./storage";
import { sendDeadlineReminder } from "./notificationService";
import { log } from "./index";

const SCHEDULER_INTERVAL_MS = 30 * 60 * 1000;
const REMINDER_WINDOWS = [
  { type: "24_HOURS", withinHours: 24 },
  { type: "2_HOURS", withinHours: 2 },
];

async function sendReminderIfNeeded(
  entityType: string,
  entityId: string,
  entityName: string,
  userId: string | null,
  deadlineDate: Date,
  reminderType: string,
  contextLabel?: string,
): Promise<boolean> {
  if (!userId) return false;

  const alreadySent = await storage.hasDeadlineReminderBeenSent(entityType, entityId, reminderType, userId);
  if (alreadySent) return false;

  await sendDeadlineReminder({
    entityType,
    entityId,
    entityName,
    userId,
    deadlineDate,
    reminderType,
    contextLabel,
  });

  await storage.markDeadlineReminderSent({
    entityType,
    entityId,
    reminderType,
    userId,
  });

  log(`Deadline reminder sent: ${reminderType} for ${entityType} "${entityName}" to user ${userId}`, "deadline-scheduler");
  return true;
}

async function checkTasks(withinHours: number, reminderType: string): Promise<number> {
  let count = 0;
  const items = await storage.getTasksWithUpcomingDeadlines(withinHours);
  for (const task of items) {
    try {
      const sent = await sendReminderIfNeeded(
        "TASK", task.id, task.title, task.assigneeId, task.dueDate!, reminderType,
      );
      if (sent) count++;
    } catch (err: any) {
      log(`Error sending task deadline reminder for ${task.id}: ${err.message}`, "deadline-scheduler");
    }
  }
  return count;
}

async function checkDeliverables(withinHours: number, reminderType: string): Promise<number> {
  let count = 0;
  const items = await storage.getDeliverablesWithUpcomingDesignDeadlines(withinHours);
  for (const d of items) {
    try {
      const sent = await sendReminderIfNeeded(
        "DELIVERABLE", d.id, d.name, d.designerId, d.designDeadline!, reminderType,
        `Design deadline`,
      );
      if (sent) count++;
    } catch (err: any) {
      log(`Error sending deliverable deadline reminder for ${d.id}: ${err.message}`, "deadline-scheduler");
    }
  }
  return count;
}

async function checkSocialPosts(withinHours: number, reminderType: string): Promise<number> {
  let count = 0;
  const items = await storage.getSocialPostsWithUpcomingDeadlines(withinHours);
  for (const post of items) {
    try {
      const recipientId = post.publisherId || post.designerId || post.createdById;
      const sent = await sendReminderIfNeeded(
        "SOCIAL_POST", post.id, `${post.platform} ${post.postFormat}`,
        recipientId, post.scheduledDate!, reminderType,
      );
      if (sent) count++;
    } catch (err: any) {
      log(`Error sending social post deadline reminder for ${post.id}: ${err.message}`, "deadline-scheduler");
    }
  }
  return count;
}

async function checkEmailCampaigns(withinHours: number, reminderType: string): Promise<number> {
  let count = 0;
  const items = await storage.getEmailCampaignsWithUpcomingDeadlines(withinHours);
  for (const email of items) {
    try {
      const recipientId = email.publisherId || email.designerId || email.createdById;
      const sent = await sendReminderIfNeeded(
        "EMAIL_CAMPAIGN", email.id, email.name,
        recipientId, email.scheduledDate!, reminderType,
      );
      if (sent) count++;
    } catch (err: any) {
      log(`Error sending email campaign deadline reminder for ${email.id}: ${err.message}`, "deadline-scheduler");
    }
  }
  return count;
}

async function checkEvents(withinHours: number, reminderType: string): Promise<number> {
  let count = 0;
  const items = await storage.getEventsWithUpcomingDeadlines(withinHours);
  for (const event of items) {
    try {
      const sent = await sendReminderIfNeeded(
        "EVENT", event.id, event.name,
        event.createdById, event.startDate!, reminderType,
      );
      if (sent) count++;
    } catch (err: any) {
      log(`Error sending event deadline reminder for ${event.id}: ${err.message}`, "deadline-scheduler");
    }
  }
  return count;
}

async function checkEventDeliverables(withinHours: number, reminderType: string): Promise<number> {
  let count = 0;
  const items = await storage.getEventDeliverablesWithUpcomingDeadlines(withinHours);
  for (const ed of items) {
    try {
      const sent = await sendReminderIfNeeded(
        "EVENT_DELIVERABLE", ed.id, ed.name,
        ed.assigneeId, ed.dueDate!, reminderType,
      );
      if (sent) count++;
    } catch (err: any) {
      log(`Error sending event deliverable deadline reminder for ${ed.id}: ${err.message}`, "deadline-scheduler");
    }
  }
  return count;
}

async function runDeadlineCheck(): Promise<void> {
  log("Deadline reminder check started", "deadline-scheduler");

  try {
    for (const window of REMINDER_WINDOWS) {
      await checkTasks(window.withinHours, window.type);
      await checkDeliverables(window.withinHours, window.type);
      await checkSocialPosts(window.withinHours, window.type);
      await checkEmailCampaigns(window.withinHours, window.type);
      await checkEvents(window.withinHours, window.type);
      await checkEventDeliverables(window.withinHours, window.type);
    }

    log("Deadline reminder check completed", "deadline-scheduler");
  } catch (err: any) {
    log(`Deadline scheduler error: ${err.message}`, "deadline-scheduler");
  }
}

let schedulerTimer: ReturnType<typeof setInterval> | null = null;

export function startDeadlineScheduler() {
  log("Deadline reminder scheduler started (every 30 minutes)", "deadline-scheduler");
  setTimeout(() => {
    runDeadlineCheck();
  }, 60000);
  schedulerTimer = setInterval(() => {
    runDeadlineCheck();
  }, SCHEDULER_INTERVAL_MS);
}

export function stopDeadlineScheduler() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
    log("Deadline reminder scheduler stopped", "deadline-scheduler");
  }
}
