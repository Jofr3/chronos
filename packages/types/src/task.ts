// Task types for the Chronos application

// Day of week: 0=Sunday, 1=Monday, ..., 6=Saturday
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Task {
  id: string;
  list_id: string;
  title: string;
  completed: boolean;
  due_date: string | null;
  is_recurring: boolean;
  recurring_days: DayOfWeek[] | null;
  created_at: string;
  updated_at: string;
}

export interface TaskList {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface TaskListWithTasks extends TaskList {
  tasks: Task[];
}

// Request/Response types
export interface CreateTaskListRequest {
  name: string;
}

export interface UpdateTaskListRequest {
  name: string;
}

export interface CreateTaskRequest {
  title: string;
}

export interface UpdateTaskRequest {
  title?: string;
  completed?: boolean;
  due_date?: string | null;
  is_recurring?: boolean;
  recurring_days?: DayOfWeek[] | null;
}
