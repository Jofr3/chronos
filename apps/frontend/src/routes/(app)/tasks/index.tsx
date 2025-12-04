import { component$, useSignal, $, useVisibleTask$, useStore } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import type { TaskListWithTasks, Task, DayOfWeek } from "@chronos/types";
import { taskService } from "~/services/task.service";

interface EditModalState {
  isOpen: boolean;
  listId: string | null;
  task: Task | null;
  title: string;
  dueDate: string;
  isRecurring: boolean;
  recurringDays: boolean[];
}

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default component$(() => {
  const lists = useSignal<TaskListWithTasks[]>([]);
  const newListName = useSignal("");
  const newTaskTitles = useSignal<Record<string, string>>({});
  const isLoading = useSignal(true);
  const error = useSignal<string | null>(null);
  
  // Edit modal state
  const editModal = useStore<EditModalState>({
    isOpen: false,
    listId: null,
    task: null,
    title: "",
    dueDate: "",
    isRecurring: false,
    recurringDays: [false, false, false, false, false, false, false],
  });

  // Load lists on mount
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    try {
      isLoading.value = true;
      error.value = null;
      lists.value = await taskService.getAllTaskLists();
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to load tasks";
      console.error("Error loading tasks:", err);
    } finally {
      isLoading.value = false;
    }
  });

  const addList = $(async () => {
    if (newListName.value.trim()) {
      try {
        const newList = await taskService.createTaskList(newListName.value.trim());
        lists.value = [...lists.value, { ...newList, tasks: [] }];
        newListName.value = "";
      } catch (err) {
        error.value = err instanceof Error ? err.message : "Failed to create list";
        console.error("Error creating list:", err);
      }
    }
  });

  const deleteList = $(async (listId: string) => {
    try {
      await taskService.deleteTaskList(listId);
      lists.value = lists.value.filter(list => list.id !== listId);
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to delete list";
      console.error("Error deleting list:", err);
    }
  });

  const addTask = $(async (listId: string) => {
    const taskTitle = newTaskTitles.value[listId];
    if (taskTitle?.trim()) {
      try {
        const newTask = await taskService.createTask(listId, taskTitle.trim());
        lists.value = lists.value.map(list => {
          if (list.id === listId) {
            return { ...list, tasks: [...list.tasks, newTask] };
          }
          return list;
        });
        newTaskTitles.value = { ...newTaskTitles.value, [listId]: "" };
      } catch (err) {
        error.value = err instanceof Error ? err.message : "Failed to create task";
        console.error("Error creating task:", err);
      }
    }
  });

  const toggleTask = $(async (listId: string, taskId: string) => {
    const list = lists.value.find(l => l.id === listId);
    const task = list?.tasks.find(t => t.id === taskId);
    
    if (task) {
      try {
        const updatedTask = await taskService.updateTask(taskId, { completed: !task.completed });
        lists.value = lists.value.map(l => {
          if (l.id === listId) {
            return {
              ...l,
              tasks: l.tasks.map(t => t.id === taskId ? updatedTask : t)
            };
          }
          return l;
        });
      } catch (err) {
        error.value = err instanceof Error ? err.message : "Failed to update task";
        console.error("Error updating task:", err);
      }
    }
  });

  const deleteTask = $(async (listId: string, taskId: string) => {
    try {
      await taskService.deleteTask(taskId);
      lists.value = lists.value.map(list => {
        if (list.id === listId) {
          return { ...list, tasks: list.tasks.filter(t => t.id !== taskId) };
        }
        return list;
      });
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to delete task";
      console.error("Error deleting task:", err);
    }
  });

  const updateTaskTitle = $((listId: string, value: string) => {
    newTaskTitles.value = { ...newTaskTitles.value, [listId]: value };
  });

  // Open edit modal
  const openEditModal = $((listId: string, task: Task) => {
    editModal.isOpen = true;
    editModal.listId = listId;
    editModal.task = task;
    editModal.title = task.title;
    editModal.dueDate = task.due_date || "";
    editModal.isRecurring = task.is_recurring;
    // Convert DayOfWeek[] to boolean[]
    const days = [false, false, false, false, false, false, false];
    if (task.recurring_days) {
      task.recurring_days.forEach(d => { days[d] = true; });
    }
    editModal.recurringDays = days;
  });

  // Close edit modal
  const closeEditModal = $(() => {
    editModal.isOpen = false;
    editModal.listId = null;
    editModal.task = null;
    editModal.title = "";
    editModal.dueDate = "";
    editModal.isRecurring = false;
    editModal.recurringDays = [false, false, false, false, false, false, false];
  });

  // Save task edits
  const saveTaskEdits = $(async () => {
    if (!editModal.task || !editModal.listId) return;
    
    try {
      // Convert boolean[] to DayOfWeek[]
      const recurringDays: DayOfWeek[] | null = editModal.isRecurring 
        ? editModal.recurringDays
            .map((selected, index) => selected ? index as DayOfWeek : null)
            .filter((d): d is DayOfWeek => d !== null)
        : null;
      
      const updatedTask = await taskService.updateTask(editModal.task.id, {
        title: editModal.title,
        due_date: editModal.dueDate || null,
        is_recurring: editModal.isRecurring,
        recurring_days: recurringDays,
      });
      
      lists.value = lists.value.map(l => {
        if (l.id === editModal.listId) {
          return {
            ...l,
            tasks: l.tasks.map(t => t.id === editModal.task!.id ? updatedTask : t)
          };
        }
        return l;
      });
      
      closeEditModal();
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to update task";
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
    <div style="max-width: 1400px; margin: 0 auto;">
      {/* Header */}
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 40px;">
        <h1 style="margin: 0; font-size: 28px; color: var(--text-primary); font-weight: 600; letter-spacing: -0.5px;">
          Tasks
        </h1>
        <span style="font-size: 13px; color: var(--text-tertiary);">
          {lists.value.reduce((acc, l) => acc + l.tasks.filter(t => t.completed).length, 0)} of {lists.value.reduce((acc, l) => acc + l.tasks.length, 0)} completed
        </span>
      </div>

      {/* Error Message */}
      {error.value && (
        <div style="background: rgba(239, 68, 68, 0.1); color: var(--error); padding: 12px 16px; border-radius: 8px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; font-size: 14px;">
          <span>{error.value}</span>
          <button
            onClick$={() => error.value = null}
            style="padding: 4px 8px; background: transparent; border: none; color: var(--error); cursor: pointer; opacity: 0.7; transition: opacity 0.2s;"
            onMouseOver$={(e) => (e.target as HTMLElement).style.opacity = "1"}
            onMouseOut$={(e) => (e.target as HTMLElement).style.opacity = "0.7"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      )}

      {/* Create New List */}
      <div style="margin-bottom: 32px;">
        <div style="display: flex; gap: 12px; align-items: center;">
          <input
            type="text"
            value={newListName.value}
            onInput$={(e) => newListName.value = (e.target as HTMLInputElement).value}
            onKeyPress$={(e) => {
              if (e.key === "Enter") {
                addList();
              }
            }}
            placeholder="Create a new list..."
            style="flex: 1; padding: 14px 18px; border: 1px solid var(--border-color); border-radius: 10px; font-size: 15px; background: var(--bg-secondary); color: var(--text-primary); transition: all 0.2s; outline: none;"
            onFocus$={(e) => {
              (e.target as HTMLElement).style.borderColor = "var(--text-tertiary)";
              (e.target as HTMLElement).style.background = "var(--bg-tertiary)";
            }}
            onBlur$={(e) => {
              (e.target as HTMLElement).style.borderColor = "var(--border-color)";
              (e.target as HTMLElement).style.background = "var(--bg-secondary)";
            }}
            disabled={isLoading.value}
          />
          <button
            onClick$={addList}
            disabled={isLoading.value}
            style="padding: 14px 24px; background: var(--text-primary); color: var(--bg-primary); border: none; border-radius: 10px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; opacity: 0.9;"
            onMouseOver$={(e) => (e.target as HTMLElement).style.opacity = "1"}
            onMouseOut$={(e) => (e.target as HTMLElement).style.opacity = "0.9"}
          >
            Add List
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading.value && (
        <div style="padding: 60px 24px; text-align: center; color: var(--text-tertiary);">
          <div style="font-size: 14px;">Loading...</div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading.value && lists.value.length === 0 && (
        <div style="padding: 80px 24px; text-align: center;">
          <div style="width: 48px; height: 48px; margin: 0 auto 20px; border: 2px dashed var(--border-color); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="1.5">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </div>
          <div style="font-size: 15px; color: var(--text-secondary); margin-bottom: 4px;">No lists yet</div>
          <div style="font-size: 13px; color: var(--text-tertiary);">Create your first list to get started</div>
        </div>
      )}

      {/* Lists Grid */}
      {!isLoading.value && lists.value.length > 0 && (
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 20px;">
          {lists.value.map((list) => (
            <div 
              key={list.id} 
              style="background: var(--bg-secondary); border-radius: 16px; display: flex; flex-direction: column; max-height: 500px; border: 1px solid var(--border-color); transition: border-color 0.2s;"
              onMouseOver$={(e) => (e.currentTarget as HTMLElement).style.borderColor = "var(--border-color-light)"}
              onMouseOut$={(e) => (e.currentTarget as HTMLElement).style.borderColor = "var(--border-color)"}
            >
              {/* List Header */}
              <div style="padding: 20px 20px 16px; display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                  <h3 style="margin: 0 0 4px; font-size: 16px; color: var(--text-primary); font-weight: 600;">
                    {list.name}
                  </h3>
                  <span style="font-size: 12px; color: var(--text-tertiary);">
                    {list.tasks.filter(t => t.completed).length}/{list.tasks.length} tasks
                  </span>
                </div>
                <button
                  onClick$={() => deleteList(list.id)}
                  style="padding: 6px; background: transparent; border: none; color: var(--text-tertiary); cursor: pointer; border-radius: 6px; transition: all 0.2s; display: flex; align-items: center; justify-content: center;"
                  onMouseOver$={(e) => {
                    (e.target as HTMLElement).style.color = "var(--error)";
                    (e.target as HTMLElement).style.background = "rgba(239, 68, 68, 0.1)";
                  }}
                  onMouseOut$={(e) => {
                    (e.target as HTMLElement).style.color = "var(--text-tertiary)";
                    (e.target as HTMLElement).style.background = "transparent";
                  }}
                  title="Delete list"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14"/>
                  </svg>
                </button>
              </div>

              {/* Add Task Input */}
              <div style="padding: 0 20px 16px;">
                <div style="display: flex; gap: 8px; align-items: center;">
                  <input
                    type="text"
                    value={newTaskTitles.value[list.id] || ""}
                    onInput$={(e) => updateTaskTitle(list.id, (e.target as HTMLInputElement).value)}
                    onKeyPress$={(e) => {
                      if (e.key === "Enter") {
                        addTask(list.id);
                      }
                    }}
                    placeholder="Add a task..."
                    style="flex: 1; padding: 10px 14px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 14px; background: var(--bg-tertiary); color: var(--text-primary); transition: all 0.2s; outline: none;"
                    onFocus$={(e) => (e.target as HTMLElement).style.borderColor = "var(--text-tertiary)"}
                    onBlur$={(e) => (e.target as HTMLElement).style.borderColor = "var(--border-color)"}
                  />
                  <button
                    onClick$={() => addTask(list.id)}
                    style="padding: 10px; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 8px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; color: var(--text-secondary);"
                    onMouseOver$={(e) => {
                      (e.target as HTMLElement).style.borderColor = "var(--text-tertiary)";
                      (e.target as HTMLElement).style.color = "var(--text-primary)";
                    }}
                    onMouseOut$={(e) => {
                      (e.target as HTMLElement).style.borderColor = "var(--border-color)";
                      (e.target as HTMLElement).style.color = "var(--text-secondary)";
                    }}
                    title="Add task"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 5v14M5 12h14"/>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Tasks List */}
              <div style="flex: 1; overflow-y: auto; padding: 0 12px 12px;">
                {list.tasks.length === 0 ? (
                  <div style="text-align: center; color: var(--text-tertiary); padding: 24px 12px; font-size: 13px;">
                    No tasks yet
                  </div>
                ) : (
                  <div style="display: flex; flex-direction: column; gap: 2px;">
                    {list.tasks.map((task) => (
                      <div
                        key={task.id}
                        class="task-item"
                        style="display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 8px; transition: background 0.15s; cursor: default;"
                        onMouseOver$={(e) => (e.currentTarget as HTMLElement).style.background = "var(--bg-tertiary)"}
                        onMouseOut$={(e) => (e.currentTarget as HTMLElement).style.background = "transparent"}
                      >
                        {/* Custom Checkbox */}
                        <button
                          onClick$={() => toggleTask(list.id, task.id)}
                          style={{
                            width: "20px",
                            height: "20px",
                            borderRadius: "6px",
                            border: task.completed ? "none" : "2px solid var(--border-color-light)",
                            background: task.completed ? "var(--success)" : "transparent",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "all 0.2s",
                            flexShrink: "0",
                            padding: "0"
                          }}
                        >
                          {task.completed && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
                              <path d="M20 6L9 17l-5-5"/>
                            </svg>
                          )}
                        </button>
                        
                        {/* Task Content */}
                        <div style="flex: 1; min-width: 0;">
                          <span
                            style={{
                              display: "block",
                              fontSize: "14px",
                              color: task.completed ? "var(--text-tertiary)" : "var(--text-primary)",
                              textDecoration: task.completed ? "line-through" : "none",
                              transition: "all 0.2s"
                            }}
                          >
                            {task.title}
                          </span>
                          {/* Task metadata */}
                          {(task.due_date || task.is_recurring) && (
                            <div style="display: flex; gap: 8px; margin-top: 4px; align-items: center;">
                              {task.due_date && (
                                <span style="font-size: 11px; color: var(--text-tertiary); display: flex; align-items: center; gap: 4px;">
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                    <line x1="16" y1="2" x2="16" y2="6"/>
                                    <line x1="8" y1="2" x2="8" y2="6"/>
                                    <line x1="3" y1="10" x2="21" y2="10"/>
                                  </svg>
                                  {new Date(task.due_date).toLocaleDateString()}
                                </span>
                              )}
                              {task.is_recurring && (
                                <span style="font-size: 11px; color: var(--accent-secondary); display: flex; align-items: center; gap: 4px;">
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M23 4v6h-6M1 20v-6h6"/>
                                    <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
                                  </svg>
                                  {task.recurring_days?.map(d => DAYS_OF_WEEK[d]).join(", ")}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {/* 3-dot Menu Button */}
                        <button
                          onClick$={() => openEditModal(list.id, task)}
                          style="padding: 4px; background: transparent; border: none; color: var(--text-tertiary); cursor: pointer; border-radius: 4px; transition: all 0.15s; display: flex; align-items: center; justify-content: center;"
                          onMouseOver$={(e) => (e.target as HTMLElement).style.color = "var(--text-primary)"}
                          onMouseOut$={(e) => (e.target as HTMLElement).style.color = "var(--text-tertiary)"}
                          class="task-action-btn"
                          title="Edit task"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="5" r="2"/>
                            <circle cx="12" cy="12" r="2"/>
                            <circle cx="12" cy="19" r="2"/>
                          </svg>
                        </button>
                        
                        {/* Delete Button */}
                        <button
                          onClick$={() => deleteTask(list.id, task.id)}
                          style="padding: 4px; background: transparent; border: none; color: var(--text-tertiary); cursor: pointer; border-radius: 4px; transition: all 0.15s; display: flex; align-items: center; justify-content: center;"
                          onMouseOver$={(e) => (e.target as HTMLElement).style.color = "var(--error)"}
                          onMouseOut$={(e) => (e.target as HTMLElement).style.color = "var(--text-tertiary)"}
                          class="task-action-btn"
                          title="Delete task"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 6L6 18M6 6l12 12"/>
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              {list.tasks.length > 0 && (
                <div style="padding: 16px 20px; border-top: 1px solid var(--border-color);">
                  <div style="height: 4px; background: var(--bg-tertiary); border-radius: 2px; overflow: hidden;">
                    <div 
                      style={{
                        height: "100%",
                        width: `${(list.tasks.filter(t => t.completed).length / list.tasks.length) * 100}%`,
                        background: "var(--success)",
                        borderRadius: "2px",
                        transition: "width 0.3s ease"
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Edit Task Modal */}
      {editModal.isOpen && (
        <div 
          style="position: fixed; inset: 0; background: rgba(0, 0, 0, 0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px);"
          onClick$={(e) => {
            if (e.target === e.currentTarget) closeEditModal();
          }}
        >
          <div style="background: var(--bg-secondary); border-radius: 16px; width: 100%; max-width: 480px; margin: 20px; border: 1px solid var(--border-color); overflow: hidden;">
            {/* Modal Header */}
            <div style="padding: 20px 24px; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between;">
              <h2 style="margin: 0; font-size: 18px; font-weight: 600; color: var(--text-primary);">Edit Task</h2>
              <button
                onClick$={closeEditModal}
                style="padding: 6px; background: transparent; border: none; color: var(--text-tertiary); cursor: pointer; border-radius: 6px; display: flex; align-items: center; justify-content: center; transition: all 0.2s;"
                onMouseOver$={(e) => {
                  (e.target as HTMLElement).style.color = "var(--text-primary)";
                  (e.target as HTMLElement).style.background = "var(--bg-tertiary)";
                }}
                onMouseOut$={(e) => {
                  (e.target as HTMLElement).style.color = "var(--text-tertiary)";
                  (e.target as HTMLElement).style.background = "transparent";
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            
            {/* Modal Body */}
            <div style="padding: 24px;">
              {/* Task Title */}
              <div style="margin-bottom: 20px;">
                <label style="display: block; font-size: 13px; font-weight: 500; color: var(--text-secondary); margin-bottom: 8px;">
                  Task Title
                </label>
                <input
                  type="text"
                  value={editModal.title}
                  onInput$={(e) => editModal.title = (e.target as HTMLInputElement).value}
                  style="width: 100%; padding: 12px 14px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 14px; background: var(--bg-tertiary); color: var(--text-primary); outline: none; transition: border-color 0.2s;"
                  onFocus$={(e) => (e.target as HTMLElement).style.borderColor = "var(--text-tertiary)"}
                  onBlur$={(e) => (e.target as HTMLElement).style.borderColor = "var(--border-color)"}
                />
              </div>
              
              {/* Due Date */}
              <div style="margin-bottom: 20px;">
                <label style="display: block; font-size: 13px; font-weight: 500; color: var(--text-secondary); margin-bottom: 8px;">
                  Due Date
                </label>
                <input
                  type="date"
                  value={editModal.dueDate}
                  onInput$={(e) => editModal.dueDate = (e.target as HTMLInputElement).value}
                  style="width: 100%; padding: 12px 14px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 14px; background: var(--bg-tertiary); color: var(--text-primary); outline: none; transition: border-color 0.2s; color-scheme: dark;"
                  onFocus$={(e) => (e.target as HTMLElement).style.borderColor = "var(--text-tertiary)"}
                  onBlur$={(e) => (e.target as HTMLElement).style.borderColor = "var(--border-color)"}
                />
              </div>
              
              {/* Task Type: One-shot vs Recurring */}
              <div style="margin-bottom: 20px;">
                <label style="display: block; font-size: 13px; font-weight: 500; color: var(--text-secondary); margin-bottom: 12px;">
                  Task Type
                </label>
                <div style="display: flex; gap: 12px;">
                  <button
                    onClick$={() => editModal.isRecurring = false}
                    style={{
                      flex: "1",
                      padding: "12px 16px",
                      border: editModal.isRecurring ? "1px solid var(--border-color)" : "1px solid var(--accent-secondary)",
                      borderRadius: "8px",
                      background: editModal.isRecurring ? "transparent" : "rgba(255, 136, 51, 0.1)",
                      color: editModal.isRecurring ? "var(--text-secondary)" : "var(--accent-secondary)",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "500",
                      transition: "all 0.2s",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px"
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    One-shot
                  </button>
                  <button
                    onClick$={() => editModal.isRecurring = true}
                    style={{
                      flex: "1",
                      padding: "12px 16px",
                      border: !editModal.isRecurring ? "1px solid var(--border-color)" : "1px solid var(--accent-secondary)",
                      borderRadius: "8px",
                      background: !editModal.isRecurring ? "transparent" : "rgba(255, 136, 51, 0.1)",
                      color: !editModal.isRecurring ? "var(--text-secondary)" : "var(--accent-secondary)",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "500",
                      transition: "all 0.2s",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px"
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M23 4v6h-6M1 20v-6h6"/>
                      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
                    </svg>
                    Recurring
                  </button>
                </div>
              </div>
              
              {/* Recurring Days */}
              {editModal.isRecurring && (
                <div style="margin-bottom: 20px;">
                  <label style="display: block; font-size: 13px; font-weight: 500; color: var(--text-secondary); margin-bottom: 12px;">
                    Repeat on
                  </label>
                  <div style="display: flex; gap: 8px;">
                    {DAYS_OF_WEEK.map((day, index) => (
                      <button
                        key={day}
                        onClick$={() => toggleRecurringDay(index)}
                        style={{
                          width: "44px",
                          height: "44px",
                          borderRadius: "8px",
                          border: editModal.recurringDays[index] ? "1px solid var(--success)" : "1px solid var(--border-color)",
                          background: editModal.recurringDays[index] ? "rgba(16, 185, 129, 0.15)" : "transparent",
                          color: editModal.recurringDays[index] ? "var(--success)" : "var(--text-tertiary)",
                          cursor: "pointer",
                          fontSize: "12px",
                          fontWeight: "500",
                          transition: "all 0.2s",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Modal Footer */}
            <div style="padding: 16px 24px; border-top: 1px solid var(--border-color); display: flex; gap: 12px; justify-content: flex-end;">
              <button
                onClick$={closeEditModal}
                style="padding: 10px 20px; border: 1px solid var(--border-color); border-radius: 8px; background: transparent; color: var(--text-secondary); cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.2s;"
                onMouseOver$={(e) => {
                  (e.target as HTMLElement).style.borderColor = "var(--text-tertiary)";
                  (e.target as HTMLElement).style.color = "var(--text-primary)";
                }}
                onMouseOut$={(e) => {
                  (e.target as HTMLElement).style.borderColor = "var(--border-color)";
                  (e.target as HTMLElement).style.color = "var(--text-secondary)";
                }}
              >
                Cancel
              </button>
              <button
                onClick$={saveTaskEdits}
                style="padding: 10px 24px; border: none; border-radius: 8px; background: var(--text-primary); color: var(--bg-primary); cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.2s; opacity: 0.9;"
                onMouseOver$={(e) => (e.target as HTMLElement).style.opacity = "1"}
                onMouseOut$={(e) => (e.target as HTMLElement).style.opacity = "0.9"}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline styles for hover effects */}
      <style>{`
        .task-action-btn { opacity: 0 !important; }
        .task-item:hover .task-action-btn { opacity: 1 !important; }
      `}</style>
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
