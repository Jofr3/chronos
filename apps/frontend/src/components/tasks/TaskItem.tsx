import { component$ } from "@builder.io/qwik";
import type { PropFunction } from "@builder.io/qwik";
import type { Task } from "@chronos/types";
import { formatRecurringDays } from "./types";

interface TaskItemProps {
  task: Task;
  listId: string | null;
  index: number;
  onToggle$: PropFunction<(listId: string | null, taskId: string) => void>;
  onEdit$: PropFunction<(listId: string | null, task: Task) => void>;
  onDelete$: PropFunction<(listId: string | null, taskId: string) => void>;
}

export const TaskItem = component$<TaskItemProps>(
  ({ task, listId, index, onToggle$, onEdit$, onDelete$ }) => {
    return (
      <div
        class="task-item"
        style={`animation-delay: ${index * 0.05}s;`}
        onClick$={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest(".task-action-btn, .task-checkbox")) return;
          onToggle$(listId, task.id);
        }}
      >
        {/* Custom Checkbox */}
        <button
          onClick$={(e) => {
            e.stopPropagation();
            onToggle$(listId, task.id);
          }}
          class={`task-checkbox ${task.completed ? "completed" : ""}`}
        >
          {task.completed && (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--bg-primary)"
              stroke-width="3"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          )}
        </button>

        {/* Task Content */}
        <div class="task-content">
          <span class={`task-title ${task.completed ? "completed" : ""}`}>
            {task.title}
          </span>
          {/* Task metadata */}
          {(task.due_date || task.is_recurring) && (
            <div class="task-metadata">
              {task.due_date && (
                <span class="task-due-date">
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  {new Date(task.due_date).toLocaleDateString()}
                </span>
              )}
              {task.is_recurring && (
                <span class="task-recurring">
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M23 4v6h-6M1 20v-6h6" />
                    <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                  </svg>
                  {formatRecurringDays(task.recurring_days)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Edit Button */}
        <button
          onClick$={(e) => {
            e.stopPropagation();
            onEdit$(listId, task);
          }}
          class="task-action-btn edit"
          title="Edit task"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </button>

        {/* Delete Button */}
        <button
          onClick$={(e) => {
            e.stopPropagation();
            onDelete$(listId, task.id);
          }}
          class="task-action-btn delete"
          title="Delete task"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  }
);
