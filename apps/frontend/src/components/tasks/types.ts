import type { Task, DayOfWeek } from "@chronos/types";

export interface EditModalState {
  isOpen: boolean;
  listId: string | null;
  task: Task | null;
  title: string;
  description: string;
  dueDate: string;
  duration: string;
  isRecurring: boolean;
  recurringDays: boolean[];
}

export const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Format recurring days - shows "Every day" if all days selected
 */
export function formatRecurringDays(days: DayOfWeek[] | null | undefined): string {
  if (!days || days.length === 0) return "";
  if (days.length === 7) return "Every day";
  return days.map((d) => DAYS_OF_WEEK[d]).join(", ");
}

/**
 * Format duration from minutes to human-readable string
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}min`;
}

/**
 * Get initial edit modal state
 */
export function getInitialEditModalState(): EditModalState {
  return {
    isOpen: false,
    listId: null,
    task: null,
    title: "",
    description: "",
    dueDate: "",
    duration: "",
    isRecurring: false,
    recurringDays: [false, false, false, false, false, false, false],
  };
}

/**
 * Convert Task to EditModalState
 */
export function taskToEditModalState(task: Task, listId: string | null): Partial<EditModalState> {
  const days = [false, false, false, false, false, false, false];
  if (task.recurring_days) {
    task.recurring_days.forEach((d) => {
      days[d] = true;
    });
  }

  return {
    isOpen: true,
    listId,
    task,
    title: task.title,
    description: task.description || "",
    dueDate: task.due_date || "",
    duration: task.duration !== null ? task.duration.toString() : "",
    isRecurring: task.is_recurring,
    recurringDays: days,
  };
}
