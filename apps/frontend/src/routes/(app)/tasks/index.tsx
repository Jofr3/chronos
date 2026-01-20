import {
  component$,
  useSignal,
  $,
  useVisibleTask$,
  useStore,
} from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import type { TaskListWithTasks, Task, DayOfWeek, TaskPriority } from "@chronos/types";
import { taskService } from "~/services/task.service";

interface EditModalState {
  isOpen: boolean;
  listId: string | null;
  task: Task | null;
  title: string;
  description: string;
  dueDate: string;
  priority: TaskPriority;
  duration: string; // Store as string for input, convert to number on save
  isRecurring: boolean;
  recurringDays: boolean[];
}

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Helper function to format recurring days - shows "Every day" if all days selected
const formatRecurringDays = (days: number[] | null | undefined): string => {
  if (!days || days.length === 0) return "";
  if (days.length === 7) return "Every day";
  return days.map((d) => DAYS_OF_WEEK[d]).join(", ");
};

// Helper function to format duration from minutes to human-readable string
const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes}min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}min`;
};

export default component$(() => {
  const lists = useSignal<TaskListWithTasks[]>([]);
  const tasksWithoutList = useSignal<Task[]>([]);
  const newTaskTitles = useSignal<Record<string, string>>({});
  const isLoading = useSignal(true);
  const error = useSignal<string | null>(null);
  const isCreatingList = useSignal(false);
  const newListName = useSignal("");

  // Edit modal state
  const editModal = useStore<EditModalState>({
    isOpen: false,
    listId: null,
    task: null,
    title: "",
    description: "",
    dueDate: "",
    priority: "none",
    duration: "",
    isRecurring: false,
    recurringDays: [false, false, false, false, false, false, false],
  });

  // Load lists and tasks without list on mount
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    try {
      isLoading.value = true;
      error.value = null;
      const [allLists, tasksNoList] = await Promise.all([
        taskService.getAllTaskLists(),
        taskService.getTasksWithoutList(),
      ]);
      lists.value = allLists;
      tasksWithoutList.value = tasksNoList;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to load tasks";
      console.error("Error loading tasks:", err);
    } finally {
      isLoading.value = false;
    }
  });

  const startCreatingList = $(() => {
    isCreatingList.value = true;
    newListName.value = "";
  });

  const cancelCreatingList = $(() => {
    isCreatingList.value = false;
    newListName.value = "";
  });

  const confirmCreateList = $(async () => {
    if (newListName.value.trim()) {
      try {
        const newList = await taskService.createTaskList(newListName.value.trim());
        lists.value = [...lists.value, { ...newList, tasks: [] }];
      } catch (err) {
        error.value =
          err instanceof Error ? err.message : "Failed to create list";
        console.error("Error creating list:", err);
      }
    }
    isCreatingList.value = false;
    newListName.value = "";
  });

  const deleteList = $(async (listId: string) => {
    try {
      await taskService.deleteTaskList(listId);
      lists.value = lists.value.filter((list) => list.id !== listId);
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to delete list";
      console.error("Error deleting list:", err);
    }
  });

  const addTask = $(async (listId: string) => {
    const taskTitle = newTaskTitles.value[listId];
    if (taskTitle?.trim()) {
      try {
        const newTask = await taskService.createTask(listId, taskTitle.trim());
        lists.value = lists.value.map((list) => {
          if (list.id === listId) {
            return { ...list, tasks: [...list.tasks, newTask] };
          }
          return list;
        });
        newTaskTitles.value = { ...newTaskTitles.value, [listId]: "" };
      } catch (err) {
        error.value =
          err instanceof Error ? err.message : "Failed to create task";
        console.error("Error creating task:", err);
      }
    }
  });

  const toggleTask = $(async (listId: string | null, taskId: string) => {
    // Handle tasks from "New events" list
    if (listId === null) {
      const task = tasksWithoutList.value.find((t) => t.id === taskId);
      if (task) {
        try {
          const updatedTask = await taskService.updateTask(taskId, {
            completed: !task.completed,
          });
          tasksWithoutList.value = tasksWithoutList.value.map((t) =>
            t.id === taskId ? updatedTask : t,
          );
        } catch (err) {
          error.value =
            err instanceof Error ? err.message : "Failed to update task";
          console.error("Error updating task:", err);
        }
      }
      return;
    }

    // Handle regular list tasks
    const list = lists.value.find((l) => l.id === listId);
    const task = list?.tasks.find((t) => t.id === taskId);

    if (task) {
      try {
        const updatedTask = await taskService.updateTask(taskId, {
          completed: !task.completed,
        });
        lists.value = lists.value.map((l) => {
          if (l.id === listId) {
            return {
              ...l,
              tasks: l.tasks.map((t) => (t.id === taskId ? updatedTask : t)),
            };
          }
          return l;
        });
      } catch (err) {
        error.value =
          err instanceof Error ? err.message : "Failed to update task";
        console.error("Error updating task:", err);
      }
    }
  });

  const deleteTask = $(async (listId: string | null, taskId: string) => {
    try {
      await taskService.deleteTask(taskId);

      // Handle tasks from "New events" list
      if (listId === null) {
        tasksWithoutList.value = tasksWithoutList.value.filter(
          (t) => t.id !== taskId,
        );
        return;
      }

      // Handle regular list tasks
      lists.value = lists.value.map((list) => {
        if (list.id === listId) {
          return { ...list, tasks: list.tasks.filter((t) => t.id !== taskId) };
        }
        return list;
      });
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to delete task";
      console.error("Error deleting task:", err);
    }
  });

  const updateTaskTitle = $((listId: string, value: string) => {
    newTaskTitles.value = { ...newTaskTitles.value, [listId]: value };
  });

  // Open edit modal
  const openEditModal = $((listId: string | null, task: Task) => {
    editModal.isOpen = true;
    editModal.listId = listId;
    editModal.task = task;
    editModal.title = task.title;
    editModal.description = task.description || "";
    editModal.dueDate = task.due_date || "";
    editModal.priority = task.priority;
    editModal.duration = task.duration !== null ? task.duration.toString() : "";
    editModal.isRecurring = task.is_recurring;
    // Convert DayOfWeek[] to boolean[]
    const days = [false, false, false, false, false, false, false];
    if (task.recurring_days) {
      task.recurring_days.forEach((d) => {
        days[d] = true;
      });
    }
    editModal.recurringDays = days;
  });

  // Close edit modal
  const closeEditModal = $(() => {
    editModal.isOpen = false;
    editModal.listId = null;
    editModal.task = null;
    editModal.title = "";
    editModal.description = "";
    editModal.dueDate = "";
    editModal.priority = "none";
    editModal.duration = "";
    editModal.isRecurring = false;
    editModal.recurringDays = [false, false, false, false, false, false, false];
  });

  // Save task edits
  const saveTaskEdits = $(async () => {
    if (!editModal.task) return;

    try {
      // Convert boolean[] to DayOfWeek[]
      const recurringDays: DayOfWeek[] | null = editModal.isRecurring
        ? editModal.recurringDays
            .map((selected, index) => (selected ? (index as DayOfWeek) : null))
            .filter((d): d is DayOfWeek => d !== null)
        : null;

      // Parse duration
      const duration = editModal.duration.trim()
        ? parseInt(editModal.duration, 10)
        : null;

      const updatedTask = await taskService.updateTask(editModal.task.id, {
        title: editModal.title,
        description: editModal.description || null,
        due_date: editModal.dueDate || null,
        priority: editModal.priority,
        duration: duration,
        is_recurring: editModal.isRecurring,
        recurring_days: recurringDays,
      });

      // Handle tasks from "New events" list
      if (editModal.listId === null) {
        tasksWithoutList.value = tasksWithoutList.value.map((t) =>
          t.id === editModal.task!.id ? updatedTask : t,
        );
      } else {
        // Handle regular list tasks
        lists.value = lists.value.map((l) => {
          if (l.id === editModal.listId) {
            return {
              ...l,
              tasks: l.tasks.map((t) =>
                t.id === editModal.task!.id ? updatedTask : t,
              ),
            };
          }
          return l;
        });
      }

      closeEditModal();
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to update task";
      console.error("Error updating task:", err);
    }
  });

  // Toggle recurring day
  const toggleRecurringDay = $((dayIndex: number) => {
    const newDays = [...editModal.recurringDays];
    newDays[dayIndex] = !newDays[dayIndex];
    editModal.recurringDays = newDays;
  });

  return (
    <div class="tasks-container">
      {/* Error Message */}
      {error.value && (
        <div class="error-message">
          <span>{error.value}</span>
          <button
            onClick$={() => (error.value = null)}
            class="error-close-btn"
          >
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
      )}

      {/* Loading State */}
      {isLoading.value && (
        <div class="loading-state">
          <div>Loading...</div>
        </div>
      )}

      {/* Lists Grid */}
      {!isLoading.value && (
        <div class="lists-grid">
          {/* New Events List (hardcoded for calendar tasks) */}
          {tasksWithoutList.value.length > 0 && (
            <div
              key="new-events"
              class="task-list-card new-events-list"
              style="animation-delay: 0s;"
            >
              {/* List Header */}
              <div class="list-header">
                <div>
                  <h3 class="list-title">
                    📅 New events
                  </h3>
                </div>
              </div>

              {/* Tasks List */}
              <div class="tasks-list">
                <div class="tasks-list-items">
                  {tasksWithoutList.value.map((task, taskIndex) => (
                    <div
                      key={task.id}
                      class="task-item"
                      style={`animation-delay: ${taskIndex * 0.05}s;`}
                      onClick$={(e) => {
                        const target = e.target as HTMLElement;
                        if (target.closest('.task-action-btn, .task-checkbox')) return;
                        toggleTask(null, task.id);
                      }}
                    >
                      {/* Custom Checkbox */}
                      <button
                        onClick$={(e) => {
                          e.stopPropagation();
                          toggleTask(null, task.id);
                        }}
                        class={`task-checkbox ${task.completed ? 'completed' : ''}`}
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
                        <span
                          class={`task-title ${task.completed ? 'completed' : ''}`}
                        >
                          {task.title}
                        </span>
                        {/* Task metadata */}
                        {(task.due_date || task.is_recurring || task.priority !== "none") && (
                          <div class="task-metadata">
                            {task.priority !== "none" && (
                              <span class={`task-priority priority-${task.priority}`}>
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                  stroke="none"
                                >
                                  <path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z" />
                                </svg>
                              </span>
                            )}
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
                                  <rect
                                    x="3"
                                    y="4"
                                    width="18"
                                    height="18"
                                    rx="2"
                                    ry="2"
                                  />
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
                                  <path d="M3.51 9a9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
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
                          openEditModal(null, task);
                        }}
                        class="task-action-btn edit"
                        title="Edit task"
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <circle cx="12" cy="5" r="2" />
                          <circle cx="12" cy="12" r="2" />
                          <circle cx="12" cy="19" r="2" />
                        </svg>
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick$={(e) => {
                          e.stopPropagation();
                          deleteTask(null, task.id);
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
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* Regular Lists */}
          {lists.value.map((list, listIndex) => (
            <div
              key={list.id}
              class="task-list-card"
              style={`animation-delay: ${listIndex * 0.1}s;`}
            >
              {/* List Header */}
              <div class="list-header">
                <div>
                  <h3 class="list-title">
                    {list.name}
                  </h3>
                </div>
                <button
                  onClick$={() => deleteList(list.id)}
                  class="list-delete-btn"
                  title="Delete list"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14" />
                  </svg>
                </button>
              </div>

              {/* Add Task Input */}
              <div class="add-task-container">
                <div class="add-task-input-group">
                  <input
                    type="text"
                    value={newTaskTitles.value[list.id] || ""}
                    onInput$={(e) =>
                      updateTaskTitle(
                        list.id,
                        (e.target as HTMLInputElement).value,
                      )
                    }
                    onKeyPress$={(e) => {
                      if (e.key === "Enter") {
                        addTask(list.id);
                      }
                    }}
                    placeholder="Add a task..."
                    class="add-task-input"
                  />
                  <button
                    onClick$={() => addTask(list.id)}
                    class="add-task-btn"
                    title="Add task"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Tasks List */}
              <div class="tasks-list">
                {list.tasks.length === 0 ? (
                  <div class="tasks-list-empty">
                    No tasks yet
                  </div>
                ) : (
                  <div class="tasks-list-items">
                    {list.tasks.map((task, taskIndex) => (
                      <div
                        key={task.id}
                        class="task-item"
                        style={`animation-delay: ${taskIndex * 0.05}s;`}
                        onClick$={(e) => {
                          // Don't toggle if clicking on action buttons or checkbox
                          const target = e.target as HTMLElement;
                          if (target.closest('.task-action-btn, .task-checkbox')) return;
                          toggleTask(list.id, task.id);
                        }}
                      >
                        {/* Custom Checkbox */}
                        <button
                          onClick$={(e) => {
                            e.stopPropagation();
                            toggleTask(list.id, task.id);
                          }}
                          class={`task-checkbox ${task.completed ? 'completed' : ''}`}
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
                          <span
                            class={`task-title ${task.completed ? 'completed' : ''}`}
                          >
                            {task.title}
                          </span>
                          {/* Task metadata */}
                          {(task.due_date || task.is_recurring || task.priority !== "none") && (
                            <div class="task-metadata">
                              {task.priority !== "none" && (
                                <span class={`task-priority priority-${task.priority}`}>
                                  <svg
                                    width="12"
                                    height="12"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                    stroke="none"
                                  >
                                    <path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z" />
                                  </svg>
                                </span>
                              )}
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
                                    <rect
                                      x="3"
                                      y="4"
                                      width="18"
                                      height="18"
                                      rx="2"
                                      ry="2"
                                    />
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
                            openEditModal(list.id, task);
                          }}
                          class="task-action-btn edit"
                          title="Edit task"
                        >
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <circle cx="12" cy="5" r="2" />
                            <circle cx="12" cy="12" r="2" />
                            <circle cx="12" cy="19" r="2" />
                          </svg>
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick$={(e) => {
                            e.stopPropagation();
                            deleteTask(list.id, task.id);
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
                    ))}
                  </div>
                )}
              </div>

            </div>
          ))}

          {/* Add List Button / New List Input */}
          {isCreatingList.value ? (
            <div class="task-list-card new-list-card">
              <div class="list-header">
                <input
                  type="text"
                  value={newListName.value}
                  onInput$={(e) =>
                    (newListName.value = (e.target as HTMLInputElement).value)
                  }
                  onKeyDown$={(e) => {
                    if (e.key === "Enter") {
                      confirmCreateList();
                    } else if (e.key === "Escape") {
                      cancelCreatingList();
                    }
                  }}
                  onBlur$={() => {
                    if (!newListName.value.trim()) {
                      cancelCreatingList();
                    }
                  }}
                  placeholder="List name..."
                  class="new-list-input"
                  autoFocus
                />
              </div>
            </div>
          ) : (
            <button
              onClick$={startCreatingList}
              class="add-list-card"
              disabled={isLoading.value}
              style={`animation-delay: ${(lists.value.length + (tasksWithoutList.value.length > 0 ? 1 : 0)) * 0.1}s;`}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span>Add List</span>
            </button>
          )}
        </div>
      )}

      {/* Edit Task Modal */}
      {editModal.isOpen && (
        <div
          class="modal-overlay"
          onClick$={(e) => {
            if (e.target === e.currentTarget) closeEditModal();
          }}
        >
          <div class="modal-content">
            {/* Modal Header */}
            <div class="modal-header">
              <h2 class="modal-title">
                Edit Task
              </h2>
              <button
                onClick$={closeEditModal}
                class="modal-close-btn"
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

            {/* Modal Body */}
            <div class="modal-body">
              {/* Task Title */}
              <div class="modal-field">
                <label class="modal-label">
                  Task Title
                </label>
                <input
                  type="text"
                  value={editModal.title}
                  onInput$={(e) =>
                    (editModal.title = (e.target as HTMLInputElement).value)
                  }
                  class="modal-input"
                />
              </div>

              {/* Task Description */}
              <div class="modal-field">
                <label class="modal-label">
                  Description
                </label>
                <textarea
                  value={editModal.description}
                  onInput$={(e) =>
                    (editModal.description = (e.target as HTMLTextAreaElement).value)
                  }
                  class="modal-textarea"
                  placeholder="Add details about this task..."
                  rows={3}
                />
              </div>

              {/* Priority */}
              <div class="modal-field">
                <label class="modal-label">
                  Priority
                </label>
                <div class="modal-priority-group">
                  <button
                    onClick$={() => (editModal.priority = "high")}
                    class={`modal-priority-btn priority-high ${editModal.priority === "high" ? 'active' : ''}`}
                  >
                    High
                  </button>
                  <button
                    onClick$={() => (editModal.priority = "normal")}
                    class={`modal-priority-btn priority-normal ${editModal.priority === "normal" ? 'active' : ''}`}
                  >
                    Normal
                  </button>
                  <button
                    onClick$={() => (editModal.priority = "low")}
                    class={`modal-priority-btn priority-low ${editModal.priority === "low" ? 'active' : ''}`}
                  >
                    Low
                  </button>
                  <button
                    onClick$={() => (editModal.priority = "none")}
                    class={`modal-priority-btn priority-none ${editModal.priority === "none" ? 'active' : ''}`}
                  >
                    None
                  </button>
                </div>
              </div>

              {/* Duration */}
              <div class="modal-field">
                <label class="modal-label">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  value={editModal.duration}
                  onInput$={(e) =>
                    (editModal.duration = (e.target as HTMLInputElement).value)
                  }
                  class="modal-input"
                  placeholder="e.g., 30, 60, 120"
                  min="0"
                />
                {editModal.duration && parseInt(editModal.duration) > 0 && (
                  <div style="font-size: 12px; color: var(--text-tertiary); margin-top: 6px;">
                    {formatDuration(parseInt(editModal.duration))}
                  </div>
                )}
              </div>

              {/* Task Type: One-shot vs Recurring */}
              <div class="modal-field">
                <label class="modal-label">
                  Task Type
                </label>
                <div class="modal-task-type-group">
                  <button
                    onClick$={() => (editModal.isRecurring = false)}
                    class={`modal-task-type-btn ${!editModal.isRecurring ? 'active' : ''}`}
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
                    onClick$={() => (editModal.isRecurring = true)}
                    class={`modal-task-type-btn ${editModal.isRecurring ? 'active' : ''}`}
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
              {!editModal.isRecurring && (
                <div class="modal-field">
                  <label class="modal-label">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={editModal.dueDate}
                    onInput$={(e) =>
                      (editModal.dueDate = (e.target as HTMLInputElement).value)
                    }
                    class="modal-input"
                  />
                </div>
              )}

              {/* Recurring Days */}
              {editModal.isRecurring && (
                <div class="modal-field">
                  <label class="modal-label">
                    Repeat on
                  </label>
                  <div class="modal-recurring-days">
                    {DAYS_OF_WEEK.map((day, index) => (
                      <button
                        key={day}
                        onClick$={() => toggleRecurringDay(index)}
                        class={`modal-day-btn ${editModal.recurringDays[index] ? 'selected' : ''}`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Final Date - shown for Recurring tasks */}
              {editModal.isRecurring && (
                <div class="modal-field">
                  <label class="modal-label">
                    Final Date
                  </label>
                  <div style="display: flex; gap: 8px; align-items: center;">
                    <input
                      type="date"
                      value={editModal.dueDate}
                      onInput$={(e) =>
                        (editModal.dueDate = (e.target as HTMLInputElement).value)
                      }
                      class="modal-input"
                      style="flex: 1;"
                      placeholder="No end date"
                    />
                    <button
                      onClick$={() => (editModal.dueDate = "")}
                      class="modal-never-btn"
                      type="button"
                    >
                      Never
                    </button>
                  </div>
                  <div style="font-size: 12px; color: var(--text-tertiary); margin-top: 6px;">
                    {editModal.dueDate ? "Task will stop recurring on this date" : "Task will repeat indefinitely"}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div class="modal-footer">
              <button
                onClick$={closeEditModal}
                class="modal-cancel-btn"
              >
                Cancel
              </button>
              <button
                onClick$={saveTaskEdits}
                class="modal-save-btn"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export const head: DocumentHead = {
  title: "Tasks - Chronos",
  meta: [
    {
      name: "description",
      content: "Task management page",
    },
  ],
};
