import {
  component$,
  useSignal,
  $,
  useVisibleTask$,
  useStore,
} from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import type { TimeConstraint, DayOfWeek } from "@chronos/types";
import { constraintService } from "~/services/constraint.service";

interface ConstraintModalState {
  isOpen: boolean;
  isEditing: boolean;
  editingId: string | null;
  name: string;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  recurringDays: DayOfWeek[];
  date: string;
}

const getInitialModalState = (): ConstraintModalState => ({
  isOpen: false,
  isEditing: false,
  editingId: null,
  name: "",
  startTime: "09:00",
  endTime: "17:00",
  isRecurring: true,
  recurringDays: [1, 2, 3, 4, 5], // Mon-Fri default
  date: "",
});

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const formatRecurringDays = (days: DayOfWeek[] | null): string => {
  if (!days || days.length === 0) return "None";
  if (days.length === 7) return "Every day";
  if (
    days.length === 5 &&
    [1, 2, 3, 4, 5].every((d) => days.includes(d as DayOfWeek))
  ) {
    return "Weekdays";
  }
  if (
    days.length === 2 &&
    days.includes(0) &&
    days.includes(6)
  ) {
    return "Weekends";
  }
  return days.map((d) => DAY_LABELS[d]).join(", ");
};

export default component$(() => {
  const constraints = useSignal<TimeConstraint[]>([]);
  const isLoading = useSignal(true);
  const error = useSignal<string | null>(null);
  const isSaving = useSignal(false);

  const modal = useStore<ConstraintModalState>(getInitialModalState());

  const loadConstraints = $(async () => {
    try {
      isLoading.value = true;
      error.value = null;
      constraints.value = await constraintService.getAllConstraints();
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to load constraints";
    } finally {
      isLoading.value = false;
    }
  });

  const openCreateModal = $(() => {
    Object.assign(modal, getInitialModalState());
    modal.isOpen = true;
  });

  const openEditModal = $((constraint: TimeConstraint) => {
    modal.isOpen = true;
    modal.isEditing = true;
    modal.editingId = constraint.id;
    modal.name = constraint.name;
    modal.startTime = constraint.start_time;
    modal.endTime = constraint.end_time;
    modal.isRecurring = constraint.is_recurring;
    modal.recurringDays = constraint.recurring_days || [];
    modal.date = constraint.date || "";
  });

  const closeModal = $(() => {
    Object.assign(modal, getInitialModalState());
  });

  const toggleDay = $((day: DayOfWeek) => {
    if (modal.recurringDays.includes(day)) {
      modal.recurringDays = modal.recurringDays.filter((d) => d !== day);
    } else {
      modal.recurringDays = [...modal.recurringDays, day].sort((a, b) => a - b);
    }
  });

  const saveConstraint = $(async () => {
    if (!modal.name.trim()) {
      error.value = "Name is required";
      return;
    }
    if (!modal.startTime || !modal.endTime) {
      error.value = "Start and end time are required";
      return;
    }
    if (modal.startTime >= modal.endTime) {
      error.value = "End time must be after start time";
      return;
    }
    if (modal.isRecurring && modal.recurringDays.length === 0) {
      error.value = "Select at least one day for recurring constraints";
      return;
    }
    if (!modal.isRecurring && !modal.date) {
      error.value = "Date is required for one-time constraints";
      return;
    }

    try {
      isSaving.value = true;
      error.value = null;

      const data = {
        name: modal.name.trim(),
        start_time: modal.startTime,
        end_time: modal.endTime,
        is_recurring: modal.isRecurring,
        recurring_days: modal.isRecurring ? modal.recurringDays : null,
        date: modal.isRecurring ? null : modal.date,
      };

      if (modal.isEditing && modal.editingId) {
        const updated = await constraintService.updateConstraint(
          modal.editingId,
          data
        );
        constraints.value = constraints.value.map((c) =>
          c.id === modal.editingId ? updated : c
        );
      } else {
        const created = await constraintService.createConstraint(data);
        constraints.value = [...constraints.value, created];
      }

      closeModal();
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to save constraint";
    } finally {
      isSaving.value = false;
    }
  });

  const deleteConstraint = $(async (id: string) => {
    if (!confirm("Delete this constraint zone?")) return;

    try {
      await constraintService.deleteConstraint(id);
      constraints.value = constraints.value.filter((c) => c.id !== id);
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to delete constraint";
    }
  });

  useVisibleTask$(async () => {
    await loadConstraints();
  });

  return (
    <div class="settings-page">
      <div class="settings-container">
        <div class="settings-header">
          <a href="/tasks" class="settings-back-link">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to Tasks
          </a>
          <h1 class="settings-title">Settings</h1>
        </div>

        <section class="settings-section">
          <div class="settings-section-header">
            <div>
              <h2 class="settings-section-title">Constraint Zones</h2>
              <p class="settings-section-desc">
                Define time blocks where the AI scheduler cannot place tasks
              </p>
            </div>
            <button class="settings-add-btn" onClick$={openCreateModal}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add Zone
            </button>
          </div>

          {isLoading.value ? (
            <div class="settings-loading">Loading...</div>
          ) : constraints.value.length === 0 ? (
            <div class="settings-empty">
              <p>No constraint zones defined yet.</p>
              <p class="settings-empty-hint">
                Add zones like "Work hours" or "Sleep time" to prevent the AI
                from scheduling tasks during those periods.
              </p>
            </div>
          ) : (
            <div class="constraint-list">
              {constraints.value.map((constraint) => (
                <div class="constraint-item" key={constraint.id}>
                  <div class="constraint-info">
                    <div class="constraint-name">{constraint.name}</div>
                    <div class="constraint-details">
                      <span class="constraint-time">
                        {constraint.start_time} - {constraint.end_time}
                      </span>
                      <span class="constraint-schedule">
                        {constraint.is_recurring
                          ? formatRecurringDays(constraint.recurring_days)
                          : constraint.date}
                      </span>
                    </div>
                  </div>
                  <div class="constraint-actions">
                    <button
                      class="constraint-action-btn"
                      onClick$={() => openEditModal(constraint)}
                      title="Edit"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      class="constraint-action-btn constraint-action-btn--delete"
                      onClick$={() => deleteConstraint(constraint.id)}
                      title="Delete"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {error.value && <div class="settings-error">{error.value}</div>}
        </section>
      </div>

      {/* Create/Edit Modal */}
      {modal.isOpen && (
        <div class="modal-overlay" onClick$={closeModal}>
          <div
            class="modal-content"
            onClick$={(e) => e.stopPropagation()}
          >
            <div class="modal-header">
              <h3 class="modal-title">
                {modal.isEditing ? "Edit Constraint Zone" : "Add Constraint Zone"}
              </h3>
              <button class="modal-close-btn" onClick$={closeModal}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div class="modal-body">
              <div class="modal-field">
                <label class="modal-label">Name</label>
                <input
                  type="text"
                  class="modal-input"
                  placeholder="e.g., Work, Sleep, Lunch"
                  value={modal.name}
                  onInput$={(e) => {
                    modal.name = (e.target as HTMLInputElement).value;
                  }}
                />
              </div>

              <div class="modal-field">
                <label class="modal-label">Time Range</label>
                <div class="modal-time-range">
                  <input
                    type="time"
                    class="modal-input"
                    value={modal.startTime}
                    onInput$={(e) => {
                      modal.startTime = (e.target as HTMLInputElement).value;
                    }}
                  />
                  <span class="modal-time-separator">to</span>
                  <input
                    type="time"
                    class="modal-input"
                    value={modal.endTime}
                    onInput$={(e) => {
                      modal.endTime = (e.target as HTMLInputElement).value;
                    }}
                  />
                </div>
              </div>

              <div class="modal-field">
                <label class="modal-label">Schedule Type</label>
                <div class="modal-task-type-group">
                  <button
                    type="button"
                    class={`modal-task-type-btn ${modal.isRecurring ? "active" : ""}`}
                    onClick$={() => {
                      modal.isRecurring = true;
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path d="M17 3a2.85 2.85 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                    </svg>
                    Recurring
                  </button>
                  <button
                    type="button"
                    class={`modal-task-type-btn ${!modal.isRecurring ? "active" : ""}`}
                    onClick$={() => {
                      modal.isRecurring = false;
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
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
                    One-time
                  </button>
                </div>
              </div>

              {modal.isRecurring ? (
                <div class="modal-field">
                  <label class="modal-label">Repeat on</label>
                  <div class="modal-recurring-days">
                    {DAY_LABELS.map((label, index) => (
                      <button
                        key={index}
                        type="button"
                        class={`modal-day-btn ${
                          modal.recurringDays.includes(index as DayOfWeek)
                            ? "selected"
                            : ""
                        }`}
                        onClick$={() => toggleDay(index as DayOfWeek)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div class="modal-field">
                  <label class="modal-label">Date</label>
                  <input
                    type="date"
                    class="modal-input"
                    value={modal.date}
                    onInput$={(e) => {
                      modal.date = (e.target as HTMLInputElement).value;
                    }}
                  />
                </div>
              )}
            </div>

            <div class="modal-footer">
              <button class="modal-cancel-btn" onClick$={closeModal}>
                Cancel
              </button>
              <button
                class="modal-save-btn"
                onClick$={saveConstraint}
                disabled={isSaving.value}
              >
                {isSaving.value ? "Saving..." : modal.isEditing ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export const head: DocumentHead = {
  title: "Settings - Chronos",
};
