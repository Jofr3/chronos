import type { DrizzleClient } from "../db/client";
import type { TimeConstraint, DayOfWeek, ActiveConstraint } from "@chronos/types";
import * as constraintQueries from "../db/queries/constraints";

export class ConstraintService {
  constructor(private db: DrizzleClient) {}

  async getAllConstraints(userId: string): Promise<TimeConstraint[]> {
    return constraintQueries.getUserConstraints(this.db, userId);
  }

  async getConstraint(
    constraintId: string,
    userId: string
  ): Promise<TimeConstraint | null> {
    return constraintQueries.getConstraintById(this.db, constraintId, userId);
  }

  async createConstraint(
    userId: string,
    data: {
      name: string;
      start_time: string;
      end_time: string;
      date?: string | null;
      is_recurring?: boolean;
      recurring_days?: DayOfWeek[] | null;
    }
  ): Promise<TimeConstraint> {
    // Validate time format
    this.validateTimeFormat(data.start_time);
    this.validateTimeFormat(data.end_time);

    // Validate that end_time is after start_time
    if (data.start_time >= data.end_time) {
      throw new Error("End time must be after start time");
    }

    // Validate recurring constraint has recurring_days
    if (data.is_recurring && (!data.recurring_days || data.recurring_days.length === 0)) {
      throw new Error("Recurring constraints must specify at least one day");
    }

    // Validate one-time constraint has a date
    if (!data.is_recurring && !data.date) {
      throw new Error("One-time constraints must specify a date");
    }

    const constraintId = crypto.randomUUID();
    return constraintQueries.createConstraint(this.db, constraintId, userId, data);
  }

  async updateConstraint(
    constraintId: string,
    userId: string,
    updates: {
      name?: string;
      start_time?: string;
      end_time?: string;
      date?: string | null;
      is_recurring?: boolean;
      recurring_days?: DayOfWeek[] | null;
    }
  ): Promise<TimeConstraint | null> {
    // Validate time format if provided
    if (updates.start_time) this.validateTimeFormat(updates.start_time);
    if (updates.end_time) this.validateTimeFormat(updates.end_time);

    // Get current constraint to validate updates
    const current = await this.getConstraint(constraintId, userId);
    if (!current) return null;

    const newStartTime = updates.start_time ?? current.start_time;
    const newEndTime = updates.end_time ?? current.end_time;

    if (newStartTime >= newEndTime) {
      throw new Error("End time must be after start time");
    }

    return constraintQueries.updateConstraint(
      this.db,
      constraintId,
      userId,
      updates
    );
  }

  async deleteConstraint(constraintId: string, userId: string): Promise<boolean> {
    return constraintQueries.deleteConstraint(this.db, constraintId, userId);
  }

  /**
   * Get active constraints for specific dates
   * Used by AI scheduler
   */
  async getActiveConstraintsForDates(
    userId: string,
    dates: string[]
  ): Promise<ActiveConstraint[]> {
    return constraintQueries.getActiveConstraintsForDates(this.db, userId, dates);
  }

  private validateTimeFormat(time: string): void {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(time)) {
      throw new Error(
        `Invalid time format: ${time}. Expected HH:MM (24-hour format)`
      );
    }
  }
}
