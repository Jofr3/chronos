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
import {
  TaskItem,
  EditTaskModal,
  type EditModalState,
  getInitialEditModalState,
  taskToEditModalState,
} from "~/components/tasks";

export default component$(() => {
  const lists = useSignal<TaskListWithTasks[]>([]);
  const tasksWithoutList = useSignal<Task[]>([]);
  const newTaskTitles = useSignal<Record<string, string>>({});
  const isLoading = useSignal(true);
  const error = useSignal<string | null>(null);
  const isCreatingList = useSignal(false);
  const newListName = useSignal("");

  // Edit modal state
  const editModal = useStore<EditModalState>(getInitialEditModalState());

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
        error.value = err instanceof Error ? err.message : "Failed to create list";
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
      error.value = err instanceof Error ? err.message : "Failed to delete list";
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
        error.value = err instanceof Error ? err.message : "Failed to create task";
      }
    }
  });

  const toggleTask = $(async (listId: string | null, taskId: string) => {
    if (listId === null) {
      const task = tasksWithoutList.value.find((t) => t.id === taskId);
      if (task) {
        try {
          const updatedTask = await taskService.updateTask(taskId, {
            completed: !task.completed,
          });
          tasksWithoutList.value = tasksWithoutList.value.map((t) =>
            t.id === taskId ? updatedTask : t
          );
        } catch (err) {
          error.value = err instanceof Error ? err.message : "Failed to update task";
        }
      }
      return;
    }

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
        error.value = err instanceof Error ? err.message : "Failed to update task";
      }
    }
  });

  const deleteTask = $(async (listId: string | null, taskId: string) => {
    try {
      await taskService.deleteTask(taskId);

      if (listId === null) {
        tasksWithoutList.value = tasksWithoutList.value.filter((t) => t.id !== taskId);
        return;
      }

      lists.value = lists.value.map((list) => {
        if (list.id === listId) {
          return { ...list, tasks: list.tasks.filter((t) => t.id !== taskId) };
        }
        return list;
      });
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to delete task";
    }
  });

  const updateTaskTitle = $((listId: string, value: string) => {
    newTaskTitles.value = { ...newTaskTitles.value, [listId]: value };
  });

  const openEditModal = $((listId: string | null, task: Task) => {
    const state = taskToEditModalState(task, listId);
    Object.assign(editModal, state);
  });

  const closeEditModal = $(() => {
    Object.assign(editModal, getInitialEditModalState());
  });

  const saveTaskEdits = $(async () => {
    if (!editModal.task) return;

    try {
      const recurringDays: DayOfWeek[] | null = editModal.isRecurring
        ? editModal.recurringDays
            .map((selected, index) => (selected ? (index as DayOfWeek) : null))
            .filter((d): d is DayOfWeek => d !== null)
        : null;

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

      if (editModal.listId === null) {
        tasksWithoutList.value = tasksWithoutList.value.map((t) =>
          t.id === editModal.task!.id ? updatedTask : t
        );
      } else {
        lists.value = lists.value.map((l) => {
          if (l.id === editModal.listId) {
            return {
              ...l,
              tasks: l.tasks.map((t) =>
                t.id === editModal.task!.id ? updatedTask : t
              ),
            };
          }
          return l;
        });
      }

      closeEditModal();
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to update task";
    }
  });

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
          <button onClick$={() => (error.value = null)} class="error-close-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
          {/* New Events List */}
          {tasksWithoutList.value.length > 0 && (
            <div key="new-events" class="task-list-card new-events-list" style="animation-delay: 0s;">
              <div class="list-header">
                <div>
                  <h3 class="list-title">New events</h3>
                </div>
              </div>
              <div class="tasks-list">
                <div class="tasks-list-items">
                  {tasksWithoutList.value.map((task, taskIndex) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      listId={null}
                      index={taskIndex}
                      onToggle$={toggleTask}
                      onEdit$={openEditModal}
                      onDelete$={deleteTask}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Regular Lists */}
          {lists.value.map((list, listIndex) => (
            <div key={list.id} class="task-list-card" style={`animation-delay: ${listIndex * 0.1}s;`}>
              <div class="list-header">
                <div>
                  <h3 class="list-title">{list.name}</h3>
                </div>
                <button onClick$={() => deleteList(list.id)} class="list-delete-btn" title="Delete list">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14" />
                  </svg>
                </button>
              </div>

              <div class="add-task-container">
                <div class="add-task-input-group">
                  <input
                    type="text"
                    value={newTaskTitles.value[list.id] || ""}
                    onInput$={(e) => updateTaskTitle(list.id, (e.target as HTMLInputElement).value)}
                    onKeyPress$={(e) => {
                      if (e.key === "Enter") addTask(list.id);
                    }}
                    placeholder="Add a task..."
                    class="add-task-input"
                  />
                  <button onClick$={() => addTask(list.id)} class="add-task-btn" title="Add task">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </button>
                </div>
              </div>

              <div class="tasks-list">
                {list.tasks.length === 0 ? (
                  <div class="tasks-list-empty">No tasks yet</div>
                ) : (
                  <div class="tasks-list-items">
                    {list.tasks.map((task, taskIndex) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        listId={list.id}
                        index={taskIndex}
                        onToggle$={toggleTask}
                        onEdit$={openEditModal}
                        onDelete$={deleteTask}
                      />
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
                  onInput$={(e) => (newListName.value = (e.target as HTMLInputElement).value)}
                  onKeyDown$={(e) => {
                    if (e.key === "Enter") confirmCreateList();
                    else if (e.key === "Escape") cancelCreatingList();
                  }}
                  onBlur$={() => {
                    if (!newListName.value.trim()) cancelCreatingList();
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
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span>Add List</span>
            </button>
          )}
        </div>
      )}

      {/* Edit Task Modal */}
      <EditTaskModal
        isOpen={editModal.isOpen}
        title={editModal.title}
        description={editModal.description}
        dueDate={editModal.dueDate}
        priority={editModal.priority as TaskPriority}
        duration={editModal.duration}
        isRecurring={editModal.isRecurring}
        recurringDays={editModal.recurringDays}
        onTitleChange$={$((value: string) => (editModal.title = value))}
        onDescriptionChange$={$((value: string) => (editModal.description = value))}
        onDueDateChange$={$((value: string) => (editModal.dueDate = value))}
        onPriorityChange$={$((value: TaskPriority) => (editModal.priority = value))}
        onDurationChange$={$((value: string) => (editModal.duration = value))}
        onIsRecurringChange$={$((value: boolean) => (editModal.isRecurring = value))}
        onToggleRecurringDay$={toggleRecurringDay}
        onSave$={saveTaskEdits}
        onClose$={closeEditModal}
      />
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
