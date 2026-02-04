// Time constraint (constraint zone) types for the Chronos application

import type { DayOfWeek } from "./task";

export interface TimeConstraint {
  id: string;
  user_id: string;
  name: string;
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
  date: string | null; // YYYY-MM-DD for one-time, null for recurring
  is_recurring: boolean;
  recurring_days: DayOfWeek[] | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// Request types
export interface CreateTimeConstraintRequest {
  name: string;
  start_time: string;
  end_time: string;
  date?: string | null; // For one-time constraints
  is_recurring?: boolean;
  recurring_days?: DayOfWeek[] | null; // For recurring constraints
}

export interface UpdateTimeConstraintRequest {
  name?: string;
  start_time?: string;
  end_time?: string;
  date?: string | null;
  is_recurring?: boolean;
  recurring_days?: DayOfWeek[] | null;
}

// Helper type for AI scheduler - represents an active constraint on a specific date
export interface ActiveConstraint {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  date: string; // The resolved date this constraint applies to
}
