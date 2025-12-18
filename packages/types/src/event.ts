// Event types for the Chronos application

export interface Event {
  id: string;
  user_id: string;
  task_id: string | null;
  title: string;
  date: string; // ISO date string (YYYY-MM-DD)
  start_time: string; // Time in HH:MM format
  end_time: string; // Time in HH:MM format
  created_at: string;
  updated_at: string;
}

export interface CreateEventRequest {
  task_id?: string | null;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
}

export interface AIScheduleEvent {
  date: string;
  start_time: string;
  end_time: string;
}

export interface AIScheduleResponse {
  events: Array<{
    task_id: string;
    title: string;
    date: string;
    start_time: string;
    end_time: string;
  }>;
}
