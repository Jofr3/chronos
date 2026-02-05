import { Hono } from "hono";
import type { Env } from "../types/env";
import { authMiddleware, getAuthUserId, type ProtectedContext } from "../middleware/auth";
import {
  successResponse,
  validationError,
  handleError,
  errorResponse,
  ErrorCodes,
} from "../utils/responses";
import { createDrizzleClient } from "../db/client";
import { TaskService } from "../services/task.service";
import { ConstraintService } from "../services/constraint.service";
import * as eventQueries from "../db/queries/events";

const ai = new Hono<{ Bindings: Env; Variables: { userId: string } }>();

// POST /api/ai/chat - Chat with AI (public endpoint)
ai.post("/chat", async (c) => {
  try {
    const { prompt } = await c.req.json<{ prompt: string }>();

    if (!prompt || typeof prompt !== "string") {
      return validationError(c, "Prompt is required and must be a string");
    }

    const response = await c.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      prompt,
    });

    return successResponse(c, response);
  } catch (error) {
    return errorResponse(
      c,
      ErrorCodes.AI_ERROR,
      error instanceof Error ? error.message : "AI request failed",
      500
    );
  }
});

// POST /api/ai/schedule - AI-powered task scheduling (protected)
ai.post("/schedule_old", authMiddleware, async (c: ProtectedContext) => {
  try {
    const userId = getAuthUserId(c);
    const db = createDrizzleClient(c.env.DB);
    const taskService = new TaskService(db);

    // Get tasks eligible for scheduling
    const tasks = await taskService.getSchedulableTasks(userId);

    // Create ID mapping (fake ID -> real ID) and anonymize tasks for AI
    const idMapping: Array<{ fake_id: string; real_id: string }> = [];
    const anonymizedTasks = tasks.map((task, index) => {
      const fake_id = `t${index}`;
      idMapping.push({ fake_id, real_id: task.id });
      return {
        ...task,
        id: fake_id,
      };
    });

    // Generate available dates (today + 14 days)
    const availableDates: string[] = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      availableDates.push(date.toISOString().split("T")[0]);
    }

    // Call AI to schedule tasks
    console.log("Calling AI with tasks:", anonymizedTasks.length);
    let aiResponse;
    try {
      aiResponse = await c.env.AI.run("@cf/qwen/qwq-32b", {
        messages: [
          {
            role: "system",
            content: `You are a task scheduling assistant. Respond ONLY with valid JSON.
Return an object with a "scheduled" array containing objects with "task_id" and "date" fields.
Example: {"scheduled": [{"task_id": "t0", "date": "2026-01-27"}]}`
          },
          {
            role: "user",
            content: `Schedule these tasks to appropriate dates.

TASKS:
${JSON.stringify(anonymizedTasks, null, 2)}

AVAILABLE DATES:
${JSON.stringify(availableDates)}

RULES:
IMPORTANT: If a task has a due_date, schedule it ON that exact date
- Only tasks with due_date: null can be scheduled on any available date
- Spread tasks without due_date evenly across available dates
- Schedule tasks only ONCE`

          }
        ],
        max_tokens: 512,
        response_format: {
          type: "json_schema",
          json_schema: {
            type: "object",
            properties: {
              scheduled: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    task_id: { type: "string" },
                    date: { type: "string" }
                  },
                  required: ["task_id", "date"]
                }
              }
            },
            required: ["scheduled"]
          }
        }
      });
      console.log("AI response:", JSON.stringify(aiResponse));
    } catch (aiError) {
      console.error("AI call failed:", aiError);
      throw aiError;
    }

    // Parse AI response
    let scheduledTasks: Array<{ task_id: string; date: string }> = [];
    try {
      const response = (aiResponse as { response?: { scheduled?: Array<{ task_id: string; date: string }> } }).response;
      scheduledTasks = response?.scheduled || [];
    } catch (parseError) {
      console.error("Failed to parse AI response:", aiResponse);
    }

    // Enrich scheduled tasks with duration info for time scheduling
    const tasksWithDuration = scheduledTasks.map((scheduled) => {
      const task = anonymizedTasks.find((t) => t.id === scheduled.task_id);
      return {
        ...scheduled,
        title: task?.title || "",
        duration: task?.duration || 60, // Default 60 minutes if not set
      };
    });

    // Second AI call: assign times within each day
    console.log("Calling AI to assign times...");
    let timeResponse;
    try {
      timeResponse = await c.env.AI.run("@cf/qwen/qwq-32b", {
        messages: [
          {
            role: "system",
            content: `You are a task scheduling assistant. Respond ONLY with valid JSON.
Return an object with a "scheduled" array containing objects with "task_id", "date", "start_time", and "end_time" fields.
Times should be in HH:MM format (24-hour). Schedule tasks between 09:00 and 18:00.
Example: {"scheduled": [{"task_id": "t0", "date": "2026-01-27", "start_time": "09:00", "end_time": "10:00"}]}`
          },
          {
            role: "user",
            content: `Assign specific times to these scheduled tasks.

TASKS WITH DATES:
${JSON.stringify(tasksWithDuration, null, 2)}

RULES:
- Use the duration field (in minutes) to calculate end_time from start_time
- Schedule tasks between 09:00 and 18:00
- Avoid overlapping tasks on the same day
- Leave small gaps between tasks when possible`
          }
        ],
        max_tokens: 1024,
        response_format: {
          type: "json_schema",
          json_schema: {
            type: "object",
            properties: {
              scheduled: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    task_id: { type: "string" },
                    date: { type: "string" },
                    start_time: { type: "string" },
                    end_time: { type: "string" }
                  },
                  required: ["task_id", "date", "start_time", "end_time"]
                }
              }
            },
            required: ["scheduled"]
          }
        }
      });
      console.log("Time response:", JSON.stringify(timeResponse));
    } catch (aiError) {
      console.error("Time scheduling AI call failed:", aiError);
      throw aiError;
    }

    // Parse time scheduling response
    let finalSchedule: Array<{ task_id: string; date: string; start_time: string; end_time: string }> = [];
    try {
      const rawResponse = (timeResponse as { response?: string | { scheduled?: Array<{ task_id: string; date: string; start_time: string; end_time: string }> } }).response;

      // Handle both string and object responses
      if (typeof rawResponse === "string") {
        const parsed = JSON.parse(rawResponse);
        finalSchedule = parsed.scheduled || [];
      } else {
        finalSchedule = rawResponse?.scheduled || [];
      }
    } catch (parseError) {
      console.error("Failed to parse time response:", timeResponse);
    }

    // Map fake IDs back to real IDs
    const result = finalSchedule.map((scheduled) => {
      const mapping = idMapping.find((m) => m.fake_id === scheduled.task_id);
      return {
        task_id: mapping?.real_id || scheduled.task_id,
        date: scheduled.date,
        start_time: scheduled.start_time,
        end_time: scheduled.end_time,
      };
    });

    // Get existing events for scheduled tasks
    const taskIds = result.map((r) => r.task_id);
    const existingEvents = await eventQueries.getEventsByTaskIds(db, taskIds);
    const existingEventMap = new Map(existingEvents.map((e) => [e.task_id, e.id]));

    // Create or update events
    const createdEvents: Awaited<ReturnType<typeof eventQueries.createEvent>>[] = [];
    const updatedEvents: Awaited<ReturnType<typeof eventQueries.updateEvent>>[] = [];

    for (const scheduled of result) {
      const existingEventId = existingEventMap.get(scheduled.task_id);

      if (existingEventId) {
        // Update existing event
        const updated = await eventQueries.updateEvent(db, existingEventId, userId, {
          date: scheduled.date,
          start_time: scheduled.start_time,
          end_time: scheduled.end_time,
        });
        if (updated) updatedEvents.push(updated);
      } else {
        // Create new event
        const eventId = crypto.randomUUID();
        const created = await eventQueries.createEvent(
          db,
          eventId,
          userId,
          scheduled.task_id,
          scheduled.date,
          scheduled.start_time,
          scheduled.end_time
        );
        createdEvents.push(created);
      }
    }

    return successResponse(c, {
      scheduled: result,
      created: createdEvents.length,
      updated: updatedEvents.length,
    });
  } catch (error) {
    return handleError(c, error, "schedule tasks");
  }
});

ai.post("/schedule", authMiddleware, async (c: ProtectedContext) => {
  try {
    const userId = getAuthUserId(c);
    const db = createDrizzleClient(c.env.DB);
    const taskService = new TaskService(db);

    // Get tasks eligible for scheduling
    const tasks = await taskService.getSchedulableTasks(userId);
    console.log("Raw tasks from DB:", JSON.stringify(tasks, null, 2));

    // Generate available dates (today + 14 days)
    const allAvailableDates: string[] = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      allAvailableDates.push(date.toISOString().split("T")[0]);
    }

    // Helper function to get dates matching specific days of week within the 14-day window
    const getDatesForRecurringDays = (recurringDays: number[]): string[] => {
      const matchingDates: string[] = [];
      for (const dateStr of allAvailableDates) {
        const date = new Date(dateStr + "T00:00:00");
        const dayOfWeek = date.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
        if (recurringDays.includes(dayOfWeek)) {
          matchingDates.push(dateStr);
        }
      }
      return matchingDates;
    };

    // Helper to determine time period from a specific time (HH:MM)
    const getTimePeriodFromTime = (time: string): TimePeriod => {
      const [hours] = time.split(":").map(Number);
      if (hours >= 6 && hours < 12) return "morning";
      if (hours >= 12 && hours < 17) return "afternoon";
      return "evening";
    };

    // Create ID mapping (fake ID -> real ID) and anonymize tasks for AI
    const idMapping: Array<{ fake_id: string; real_id: string; is_recurring: boolean; duration: number; available_dates: string[]; preferred_start_time?: string }> = [];
    const todayStr = allAvailableDates[0]; // First date is today
    const anonymizedTasks = tasks.map((task, index) => {
      const fake_id = `t${index}`;

      // Determine available dates for this task
      let available_dates: string[];

      if (task.is_recurring && task.recurring_days && task.recurring_days.length > 0) {
        // Recurring task: get all dates within the 14-day window that match the recurring days
        available_dates = getDatesForRecurringDays(task.recurring_days);
        // If no matching dates found, fall back to all available dates
        if (available_dates.length === 0) {
          available_dates = allAvailableDates;
        }
      } else if (!task.due_date) {
        // Non-recurring task without due_date can be scheduled on any date
        available_dates = allAvailableDates;
      } else if (task.due_date < todayStr) {
        // Task with past due_date is overdue - prioritize today, AI will move to later date if full
        available_dates = [todayStr];
      } else if (allAvailableDates.includes(task.due_date)) {
        // Task with due_date within the scheduling window
        available_dates = [task.due_date];
      } else {
        // Task with due_date beyond the scheduling window - schedule on any available date
        available_dates = allAvailableDates;
      }

      const duration = task.duration || 60;
      const preferred_start_time = task.preferred_start_time || undefined;

      console.log(`Task ${fake_id} (${task.title}): preferred_start_time = ${preferred_start_time}`);

      idMapping.push({ fake_id, real_id: task.id, is_recurring: task.is_recurring, duration, available_dates, preferred_start_time });

      const taskObj: {
        id: string;
        title: string;
        duration: number;
        available_dates: string[];
        is_recurring?: boolean;
        preferred_time_period?: TimePeriod;
      } = {
        id: fake_id,
        title: task.title,
        duration,
        available_dates,
      };

      // Only include is_recurring if true to avoid confusing the AI
      if (task.is_recurring) {
        taskObj.is_recurring = true;
      }

      // If task has preferred_start_time, convert it to time_period for AI
      if (preferred_start_time) {
        taskObj.preferred_time_period = getTimePeriodFromTime(preferred_start_time);
      }

      return taskObj;
    });


    // Call AI to schedule tasks - AI picks DATE and TIME_PERIOD based on task title
    console.log("Calling AI with tasks:", anonymizedTasks);
    let aiResponse;
    try {
      aiResponse = await c.env.AI.run("@cf/qwen/qwq-32b", {
        messages: [
          {
            role: "system",
            content: `You are a task scheduling assistant. Respond ONLY with valid JSON.
Return an object with a "scheduled" array containing objects with "task_id", "date", and "time_period" fields.
time_period must be one of: "morning" (6am-12pm), "afternoon" (12pm-5pm), or "evening" (5pm-10pm).
Choose time_period based on the task title - e.g., "make dinner" should be evening, "morning jog" should be morning.
Example: {"scheduled": [{"task_id": "t0", "date": "2026-01-27", "time_period": "evening"}]}`
          },
          {
            role: "user",
            content: `Assign dates and time periods to these tasks.

TASKS:
${JSON.stringify(anonymizedTasks, null, 2)}

RULES:
- Each task has an available_dates array - you MUST schedule the task on one of those dates
- If a task has preferred_time_period field, USE that time period (it represents the user's preference)
- Otherwise, choose time_period based on the task title:
  * morning (6am-12pm): breakfast, morning routine, gym, workout, exercise, jog, run
  * afternoon (12pm-5pm): lunch, work tasks, meetings, errands, shopping, groceries
  * evening (5pm-10pm): dinner, cooking, relaxation, family time, homework, study
- If the title doesn't suggest a specific time and no preferred_time_period is set, use "afternoon" as default
- IMPORTANT: Pack as many tasks as possible into the same day before using the next day
- For tasks with is_recurring=true: pick the FIRST date from available_dates
- Schedule each task only ONCE in your response`
          }
        ],
        max_tokens: 512,
        response_format: {
          type: "json_schema",
          json_schema: {
            type: "object",
            properties: {
              scheduled: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    task_id: { type: "string" },
                    date: { type: "string" },
                    time_period: { type: "string", enum: ["morning", "afternoon", "evening"] }
                  },
                  required: ["task_id", "date", "time_period"]
                }
              }
            },
            required: ["scheduled"]
          }
        }
      });
      console.log("AI response:", JSON.stringify(aiResponse));
    } catch (aiError) {
      console.error("AI call failed:", aiError);
      throw aiError;
    }

    // Parse AI response
    type TimePeriod = "morning" | "afternoon" | "evening";
    let scheduledTasks: Array<{ task_id: string; date: string; time_period: TimePeriod }> = [];
    try {
      const rawResponse = (aiResponse as { response?: string | { scheduled?: Array<{ task_id: string; date: string; time_period: TimePeriod }> } }).response;

      // Handle both string and object responses
      if (typeof rawResponse === "string") {
        const parsed = JSON.parse(rawResponse);
        scheduledTasks = parsed.scheduled || [];
      } else {
        scheduledTasks = rawResponse?.scheduled || [];
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", aiResponse);
    }

    // Helper to convert time string to minutes since midnight
    const timeToMinutes = (time: string): number => {
      const [hours, minutes] = time.split(":").map(Number);
      return hours * 60 + minutes;
    };

    // Helper to convert minutes since midnight to time string
    const minutesToTime = (minutes: number): string => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
    };

    // Track blocked time slots per date: Map<date, Array<{start: minutes, end: minutes}>>
    const blockedSlots = new Map<string, Array<{ start: number; end: number }>>();

    const getBlockedSlots = (date: string): Array<{ start: number; end: number }> => {
      if (!blockedSlots.has(date)) {
        blockedSlots.set(date, []);
      }
      return blockedSlots.get(date)!;
    };

    const addBlockedSlot = (date: string, start: number, end: number) => {
      const slots = getBlockedSlots(date);
      slots.push({ start, end });
      // Sort by start time
      slots.sort((a, b) => a.start - b.start);
    };

    // Inject constraint zones into blocked slots
    const constraintService = new ConstraintService(db);
    const activeConstraints = await constraintService.getActiveConstraintsForDates(
      userId,
      allAvailableDates
    );

    for (const constraint of activeConstraints) {
      const startMinutes = timeToMinutes(constraint.start_time);
      const endMinutes = timeToMinutes(constraint.end_time);
      addBlockedSlot(constraint.date, startMinutes, endMinutes);
    }

    // Time period boundaries
    const timePeriods = {
      morning: { start: timeToMinutes("06:00"), end: timeToMinutes("12:00") },
      afternoon: { start: timeToMinutes("12:00"), end: timeToMinutes("17:00") },
      evening: { start: timeToMinutes("17:00"), end: timeToMinutes("22:00") },
    };

    // Find next available time slot on a date within a specific time range
    const findSlotInRange = (date: string, duration: number, rangeStart: number, rangeEnd: number): { start: number; end: number } | null => {
      const gap = 5; // 5 minute gap between tasks
      const slots = getBlockedSlots(date);
      let candidateStart = rangeStart;

      for (const slot of slots) {
        // Skip slots entirely before our range
        if (slot.end <= rangeStart) continue;
        // Stop if slot starts after our range
        if (slot.start >= rangeEnd) break;

        // Can we fit before this blocked slot (within range)?
        if (candidateStart + duration <= slot.start && candidateStart + duration <= rangeEnd) {
          return { start: candidateStart, end: candidateStart + duration };
        }
        // Move candidate to after this slot + gap
        candidateStart = Math.max(candidateStart, slot.end + gap);
      }

      // Check if we can fit after all blocked slots (within range)
      if (candidateStart + duration <= rangeEnd) {
        return { start: candidateStart, end: candidateStart + duration };
      }

      return null; // No available slot in this range
    };

    // Find available slot, preferring a specific time if provided, otherwise using time period
    const findAvailableSlot = (date: string, duration: number, preferredPeriod: TimePeriod = "afternoon", preferredStartTime?: string): { start: number; end: number } | null => {
      // If preferred start time is specified, try to find a slot close to that time
      if (preferredStartTime) {
        const preferredMinutes = timeToMinutes(preferredStartTime);
        const gap = 5;
        const slots = getBlockedSlots(date);

        // Try to schedule exactly at preferred time
        let canScheduleAtPreferred = true;
        for (const slot of slots) {
          if (preferredMinutes < slot.end && preferredMinutes + duration > slot.start) {
            canScheduleAtPreferred = false;
            break;
          }
        }
        if (canScheduleAtPreferred && preferredMinutes >= timePeriods.morning.start && preferredMinutes + duration <= timePeriods.evening.end) {
          return { start: preferredMinutes, end: preferredMinutes + duration };
        }

        // If exact time is not available, try to find closest available slot in same period
        const period = getTimePeriodFromTime(preferredStartTime);
        const range = timePeriods[period];

        // Search for closest slot to preferred time within the same period
        let closestSlot: { start: number; end: number } | null = null;
        let minDistance = Infinity;

        for (let candidateStart = range.start; candidateStart + duration <= range.end; candidateStart += gap) {
          const candidateEnd = candidateStart + duration;
          let isAvailable = true;

          for (const slot of slots) {
            if (candidateStart < slot.end && candidateEnd > slot.start) {
              isAvailable = false;
              break;
            }
          }

          if (isAvailable) {
            const distance = Math.abs(candidateStart - preferredMinutes);
            if (distance < minDistance) {
              minDistance = distance;
              closestSlot = { start: candidateStart, end: candidateEnd };
            }
          }
        }

        if (closestSlot) return closestSlot;
      }

      // Fall back to standard time period-based scheduling
      const preferred = timePeriods[preferredPeriod];
      let slot = findSlotInRange(date, duration, preferred.start, preferred.end);
      if (slot) return slot;

      // Fall back to other periods in order: afternoon -> morning -> evening
      const fallbackOrder: TimePeriod[] = ["afternoon", "morning", "evening"].filter(p => p !== preferredPeriod) as TimePeriod[];
      for (const period of fallbackOrder) {
        const range = timePeriods[period];
        slot = findSlotInRange(date, duration, range.start, range.end);
        if (slot) return slot;
      }

      return null; // No available slot in any period
    };

    // Separate recurring and non-recurring tasks
    const recurringScheduled: Array<{ task_id: string; date: string; time_period: TimePeriod; mapping: typeof idMapping[0] }> = [];
    const nonRecurringScheduled: Array<{ task_id: string; date: string; time_period: TimePeriod; mapping: typeof idMapping[0] }> = [];

    for (const scheduled of scheduledTasks) {
      const mapping = idMapping.find((m) => m.fake_id === scheduled.task_id);
      if (!mapping) continue;

      const time_period = scheduled.time_period || "afternoon";

      if (mapping.is_recurring) {
        recurringScheduled.push({ ...scheduled, time_period, mapping });
      } else {
        nonRecurringScheduled.push({ ...scheduled, time_period, mapping });
      }
    }

    console.log("Recurring tasks:", recurringScheduled.map(r => ({ task_id: r.task_id, dates: r.mapping.available_dates, duration: r.mapping.duration, time_period: r.time_period })));
    console.log("Non-recurring tasks:", nonRecurringScheduled.map(r => ({ task_id: r.task_id, date: r.date, duration: r.mapping.duration, time_period: r.time_period })));

    // First, assign times to recurring tasks and block those slots on ALL their available dates
    const result: Array<{ task_id: string; date: string; start_time: string; end_time: string }> = [];

    // Helper to find a slot that works on ALL dates for a recurring task
    const findRecurringSlot = (availableDates: string[], duration: number, preferredPeriod: TimePeriod, preferredStartTime?: string): { start: number; end: number } | null => {
      const gap = 5;

      // If preferred start time is specified, try that exact time first
      if (preferredStartTime) {
        const preferredMinutes = timeToMinutes(preferredStartTime);
        const candidateEnd = preferredMinutes + duration;
        let fitsAllDates = true;

        // Check if this exact time works on all dates
        for (const date of availableDates) {
          const slots = getBlockedSlots(date);
          for (const slot of slots) {
            if (preferredMinutes < slot.end && candidateEnd > slot.start) {
              fitsAllDates = false;
              break;
            }
          }
          if (!fitsAllDates) break;
        }

        if (fitsAllDates && preferredMinutes >= timePeriods.morning.start && candidateEnd <= timePeriods.evening.end) {
          return { start: preferredMinutes, end: candidateEnd };
        }

        // If exact time doesn't work, try to find closest slot in same period
        const period = getTimePeriodFromTime(preferredStartTime);
        const range = timePeriods[period];
        let closestSlot: { start: number; end: number } | null = null;
        let minDistance = Infinity;

        for (let candidateStart = range.start; candidateStart + duration <= range.end; candidateStart += gap) {
          const candidateEnd = candidateStart + duration;
          let fitsAllDates = true;

          for (const date of availableDates) {
            const slots = getBlockedSlots(date);
            for (const slot of slots) {
              if (candidateStart < slot.end && candidateEnd > slot.start) {
                fitsAllDates = false;
                break;
              }
            }
            if (!fitsAllDates) break;
          }

          if (fitsAllDates) {
            const distance = Math.abs(candidateStart - preferredMinutes);
            if (distance < minDistance) {
              minDistance = distance;
              closestSlot = { start: candidateStart, end: candidateEnd };
            }
          }
        }

        if (closestSlot) return closestSlot;
      }

      // Fall back to period-based search
      const periodOrder: TimePeriod[] = [preferredPeriod, ...["afternoon", "morning", "evening"].filter(p => p !== preferredPeriod) as TimePeriod[]];

      for (const period of periodOrder) {
        const range = timePeriods[period];
        // Try each possible start time in this period
        for (let candidateStart = range.start; candidateStart + duration <= range.end; candidateStart += gap) {
          const candidateEnd = candidateStart + duration;
          let fitsAllDates = true;

          // Check if this slot is free on all available dates
          for (const date of availableDates) {
            const slots = getBlockedSlots(date);
            for (const slot of slots) {
              // Check for overlap
              if (candidateStart < slot.end && candidateEnd > slot.start) {
                fitsAllDates = false;
                break;
              }
            }
            if (!fitsAllDates) break;
          }

          if (fitsAllDates) {
            return { start: candidateStart, end: candidateEnd };
          }
        }
      }
      return null;
    };

    for (const { time_period, mapping } of recurringScheduled) {
      const availableDates = mapping.available_dates;
      const duration = mapping.duration;

      const foundSlot = findRecurringSlot(availableDates, duration, time_period, mapping.preferred_start_time);

      if (foundSlot) {
        console.log(`Recurring task ${mapping.fake_id}: assigned ${minutesToTime(foundSlot.start)}-${minutesToTime(foundSlot.end)} (preferred: ${time_period}${mapping.preferred_start_time ? `, exact time: ${mapping.preferred_start_time}` : ''}) on dates:`, availableDates);
        // Block this slot on ALL available dates and create events
        for (const date of availableDates) {
          addBlockedSlot(date, foundSlot.start, foundSlot.end);
          result.push({
            task_id: mapping.real_id,
            date,
            start_time: minutesToTime(foundSlot.start),
            end_time: minutesToTime(foundSlot.end),
          });
        }
      } else {
        console.log(`Recurring task ${mapping.fake_id}: NO SLOT FOUND that works on all dates`);
      }
    }

    // Helper to verify a slot doesn't overlap with existing blocked slots
    const isSlotValid = (date: string, slotStart: number, slotEnd: number): boolean => {
      const slots = getBlockedSlots(date);
      for (const blocked of slots) {
        // Check for any overlap
        if (slotStart < blocked.end && slotEnd > blocked.start) {
          console.log(`Slot ${minutesToTime(slotStart)}-${minutesToTime(slotEnd)} overlaps with blocked ${minutesToTime(blocked.start)}-${minutesToTime(blocked.end)}`);
          return false;
        }
      }
      return true;
    };

    // Then, assign times to non-recurring tasks
    console.log("Blocked slots before non-recurring:", Object.fromEntries([...blockedSlots.entries()].map(([d, slots]) => [d, slots.map(s => `${minutesToTime(s.start)}-${minutesToTime(s.end)}`)])));

    for (const { date, time_period, mapping } of nonRecurringScheduled) {
      let scheduled = false;
      const slot = findAvailableSlot(date, mapping.duration, time_period, mapping.preferred_start_time);

      // Validate the slot before using it
      if (slot && isSlotValid(date, slot.start, slot.end)) {
        console.log(`Non-recurring task ${mapping.fake_id}: assigned ${minutesToTime(slot.start)}-${minutesToTime(slot.end)} (preferred: ${time_period}${mapping.preferred_start_time ? `, exact time: ${mapping.preferred_start_time}` : ''}) on ${date}`);
        addBlockedSlot(date, slot.start, slot.end);
        result.push({
          task_id: mapping.real_id,
          date,
          start_time: minutesToTime(slot.start),
          end_time: minutesToTime(slot.end),
        });
        scheduled = true;
      } else {
        console.log(`Non-recurring task ${mapping.fake_id}: no valid slot on ${date}, trying alternatives...`);

        // First try the task's available dates
        for (const altDate of mapping.available_dates) {
          if (altDate === date) continue;
          const altSlot = findAvailableSlot(altDate, mapping.duration, time_period, mapping.preferred_start_time);
          if (altSlot && isSlotValid(altDate, altSlot.start, altSlot.end)) {
            console.log(`Non-recurring task ${mapping.fake_id}: scheduled on alternative date ${altDate}`);
            addBlockedSlot(altDate, altSlot.start, altSlot.end);
            result.push({
              task_id: mapping.real_id,
              date: altDate,
              start_time: minutesToTime(altSlot.start),
              end_time: minutesToTime(altSlot.end),
            });
            scheduled = true;
            break;
          }
        }

        // If still not scheduled, try ALL available dates as overflow
        // This handles the case where a task's due_date day is full
        if (!scheduled) {
          console.log(`Non-recurring task ${mapping.fake_id}: trying overflow to any available date...`);
          for (const overflowDate of allAvailableDates) {
            if (overflowDate === date || mapping.available_dates.includes(overflowDate)) continue;
            const overflowSlot = findAvailableSlot(overflowDate, mapping.duration, time_period, mapping.preferred_start_time);
            if (overflowSlot && isSlotValid(overflowDate, overflowSlot.start, overflowSlot.end)) {
              console.log(`Non-recurring task ${mapping.fake_id}: overflow to ${overflowDate} at ${minutesToTime(overflowSlot.start)}-${minutesToTime(overflowSlot.end)}`);
              addBlockedSlot(overflowDate, overflowSlot.start, overflowSlot.end);
              result.push({
                task_id: mapping.real_id,
                date: overflowDate,
                start_time: minutesToTime(overflowSlot.start),
                end_time: minutesToTime(overflowSlot.end),
              });
              scheduled = true;
              break;
            }
          }
        }

        if (!scheduled) {
          console.log(`Non-recurring task ${mapping.fake_id}: FAILED to schedule on any date!`);
        }
      }
    }

    // Delete existing events from today onward for tasks being scheduled, then create fresh
    // (preserves historical events before today)
    const taskIds = [...new Set(result.map((r) => r.task_id))];
    const deletedCount = await eventQueries.deleteEventsByTaskIds(db, taskIds, userId, todayStr);
    console.log(`Deleted ${deletedCount} existing events (from ${todayStr} onward) for tasks being scheduled`);

    // Create new events for all scheduled tasks
    const createdEvents: Awaited<ReturnType<typeof eventQueries.createEvent>>[] = [];

    for (const scheduled of result) {
      const eventId = crypto.randomUUID();
      const created = await eventQueries.createEvent(
        db,
        eventId,
        userId,
        scheduled.task_id,
        scheduled.date,
        scheduled.start_time,
        scheduled.end_time
      );
      createdEvents.push(created);
    }

    // Update task due_dates (only for non-recurring tasks, once per task)
    const processedTaskIds = new Set<string>();
    for (const scheduled of result) {
      const mapping = idMapping.find((m) => m.real_id === scheduled.task_id);
      const isRecurring = mapping?.is_recurring || false;

      // Only update due_date for non-recurring tasks
      if (!isRecurring && !processedTaskIds.has(scheduled.task_id)) {
        processedTaskIds.add(scheduled.task_id);
        await taskService.updateTask(scheduled.task_id, userId, {
          due_date: scheduled.date,
        });
      }
    }

    return successResponse(c, {
      scheduled: result,
      deleted: deletedCount,
      created: createdEvents.length,
    });
  } catch (error) {
    return handleError(c, error, "schedule tasks");
  }
});

export default ai;
