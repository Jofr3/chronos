import { component$ } from "@builder.io/qwik";
import type { PropFunction } from "@builder.io/qwik";
import { DAYS_OF_WEEK, formatDuration } from "./types";

interface EditTaskModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  dueDate: string;
  duration: string;
  isRecurring: boolean;
  recurringDays: boolean[];
  onTitleChange$: PropFunction<(value: string) => void>;
  onDescriptionChange$: PropFunction<(value: string) => void>;
  onDueDateChange$: PropFunction<(value: string) => void>;
  onDurationChange$: PropFunction<(value: string) => void>;
  onIsRecurringChange$: PropFunction<(value: boolean) => void>;
  onToggleRecurringDay$: PropFunction<(dayIndex: number) => void>;
  onSave$: PropFunction<() => void>;
  onClose$: PropFunction<() => void>;
}

export const EditTaskModal = component$<EditTaskModalProps>(
  ({
    isOpen,
    title,
    description,
    dueDate,
    duration,
    isRecurring,
    recurringDays,
    onTitleChange$,
    onDescriptionChange$,
    onDueDateChange$,
    onDurationChange$,
    onIsRecurringChange$,
    onToggleRecurringDay$,
    onSave$,
    onClose$,
  }) => {
    if (!isOpen) return null;

    return (
      <div
        class="modal-overlay"
        onClick$={(e) => {
          if (e.target === e.currentTarget) onClose$();
        }}
      >
        <div class="modal-content">
          {/* Modal Header */}
          <div class="modal-header">
            <h2 class="modal-title">Edit Task</h2>
            <button onClick$={onClose$} class="modal-close-btn">
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

          {/* Modal Body */}
          <div class="modal-body">
            {/* Task Title */}
            <div class="modal-field">
              <label class="modal-label">Task Title</label>
              <input
                type="text"
                value={title}
                onInput$={(e) =>
                  onTitleChange$((e.target as HTMLInputElement).value)
                }
                class="modal-input"
              />
            </div>

            {/* Task Description */}
            <div class="modal-field">
              <label class="modal-label">Description</label>
              <textarea
                value={description}
                onInput$={(e) =>
                  onDescriptionChange$((e.target as HTMLTextAreaElement).value)
                }
                class="modal-textarea"
                placeholder="Add details about this task..."
                rows={3}
              />
            </div>

            {/* Duration */}
            <div class="modal-field">
              <label class="modal-label">Duration (minutes)</label>
              <input
                type="number"
                value={duration}
                onInput$={(e) =>
                  onDurationChange$((e.target as HTMLInputElement).value)
                }
                class="modal-input"
                placeholder="e.g., 30, 60, 120"
                min="0"
              />
              {duration && parseInt(duration) > 0 && (
                <div
                  style="font-size: 12px; color: var(--text-tertiary); margin-top: 6px;"
                >
                  {formatDuration(parseInt(duration))}
                </div>
              )}
            </div>

            {/* Task Type: One-shot vs Recurring */}
            <div class="modal-field">
              <label class="modal-label">Task Type</label>
              <div class="modal-task-type-group">
                <button
                  onClick$={() => onIsRecurringChange$(false)}
                  class={`modal-task-type-btn ${!isRecurring ? "active" : ""}`}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  One-shot
                </button>
                <button
                  onClick$={() => onIsRecurringChange$(true)}
                  class={`modal-task-type-btn ${isRecurring ? "active" : ""}`}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M23 4v6h-6M1 20v-6h6" />
                    <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                  </svg>
                  Recurring
                </button>
              </div>
            </div>

            {/* Due Date - shown for One-shot tasks */}
            {!isRecurring && (
              <div class="modal-field">
                <label class="modal-label">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onInput$={(e) =>
                    onDueDateChange$((e.target as HTMLInputElement).value)
                  }
                  class="modal-input"
                />
              </div>
            )}

            {/* Recurring Days */}
            {isRecurring && (
              <div class="modal-field">
                <label class="modal-label">Repeat on</label>
                <div class="modal-recurring-days">
                  {DAYS_OF_WEEK.map((day, index) => (
                    <button
                      key={day}
                      onClick$={() => onToggleRecurringDay$(index)}
                      class={`modal-day-btn ${recurringDays[index] ? "selected" : ""}`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Final Date - shown for Recurring tasks */}
            {isRecurring && (
              <div class="modal-field">
                <label class="modal-label">Final Date</label>
                <div style="display: flex; gap: 8px; align-items: center;">
                  <input
                    type="date"
                    value={dueDate}
                    onInput$={(e) =>
                      onDueDateChange$((e.target as HTMLInputElement).value)
                    }
                    class="modal-input"
                    style="flex: 1;"
                    placeholder="No end date"
                  />
                  <button
                    onClick$={() => onDueDateChange$("")}
                    class="modal-never-btn"
                    type="button"
                  >
                    Never
                  </button>
                </div>
                <div
                  style="font-size: 12px; color: var(--text-tertiary); margin-top: 6px;"
                >
                  {dueDate
                    ? "Task will stop recurring on this date"
                    : "Task will repeat indefinitely"}
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div class="modal-footer">
            <button onClick$={onClose$} class="modal-cancel-btn">
              Cancel
            </button>
            <button onClick$={onSave$} class="modal-save-btn">
              Save Changes
            </button>
          </div>
        </div>
      </div>
    );
  }
);
