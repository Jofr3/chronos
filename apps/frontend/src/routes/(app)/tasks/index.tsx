import { component$, useSignal, $, useVisibleTask$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import type { TaskListWithTasks } from "@chronos/types";
import { taskService } from "~/services/task.service";

export default component$(() => {
  const lists = useSignal<TaskListWithTasks[]>([]);
  const newListName = useSignal("");
  const newTaskTitles = useSignal<Record<string, string>>({});
  const isLoading = useSignal(true);
  const error = useSignal<string | null>(null);

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

  return (
    <div>
      <h1 style="margin-top: 0; font-size: 32px; color: #1e293b;">Tasks</h1>

      {/* Error Message */}
      {error.value && (
        <div style="background: #fee; border: 1px solid #fcc; color: #c00; padding: 12px 16px; border-radius: 6px; margin-bottom: 20px;">
          {error.value}
          <button
            onClick$={() => error.value = null}
            style="margin-left: 12px; padding: 4px 8px; background: transparent; border: 1px solid #c00; color: #c00; border-radius: 4px; cursor: pointer;"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Create New List */}
      <div style="background: white; padding: 24px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-top: 24px;">
        <h2 style="margin-top: 0; font-size: 20px; color: #334155;">
          Create New List
        </h2>
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
            placeholder="Enter list name..."
            style="flex: 1; padding: 10px 14px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;"
            disabled={isLoading.value}
          />
          <button
            onClick$={addList}
            disabled={isLoading.value}
            style="padding: 10px 20px; background: #0070f3; color: white; border: none; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer;"
          >
            Add List
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading.value && (
        <div style="background: white; padding: 40px 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-top: 24px; text-align: center; color: #64748b;">
          Loading tasks...
        </div>
      )}

      {/* Empty State */}
      {!isLoading.value && lists.value.length === 0 && (
        <div style="background: white; padding: 40px 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-top: 24px; text-align: center; color: #94a3b8;">
          No lists yet. Create your first list to get started!
        </div>
      )}

      {/* Lists */}
      {!isLoading.value && lists.value.length > 0 && (
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 24px; margin-top: 24px;">
          {lists.value.map((list) => (
            <div key={list.id} style="background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); display: flex; flex-direction: column; max-height: 600px;">
              {/* List Header */}
              <div style="padding: 20px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center;">
                <h3 style="margin: 0; font-size: 18px; color: #1e293b; font-weight: 600;">
                  {list.name}
                </h3>
                <button
                  onClick$={() => deleteList(list.id)}
                  style="padding: 6px 12px; background: #dc2626; color: white; border: none; border-radius: 4px; font-size: 12px; cursor: pointer;"
                >
                  Delete
                </button>
              </div>

              {/* Add Task */}
              <div style="padding: 16px; border-bottom: 1px solid #e5e7eb;">
                <div style="display: flex; gap: 8px;">
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
                    style="flex: 1; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px;"
                  />
                  <button
                    onClick$={() => addTask(list.id)}
                    style="padding: 8px 16px; background: #10b981; color: white; border: none; border-radius: 4px; font-size: 14px; cursor: pointer;"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Tasks */}
              <div style="flex: 1; overflow-y: auto; padding: 16px;">
                {list.tasks.length === 0 ? (
                  <div style="text-align: center; color: #94a3b8; padding: 20px; font-size: 14px;">
                    No tasks yet
                  </div>
                ) : (
                  <ul style="list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px;">
                    {list.tasks.map((task) => (
                      <li
                        key={task.id}
                        style="display: flex; align-items: center; gap: 12px; padding: 12px; background: #f9fafb; border-radius: 6px; border: 1px solid #e5e7eb;"
                      >
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange$={() => toggleTask(list.id, task.id)}
                          style="width: 18px; height: 18px; cursor: pointer;"
                        />
                        <span
                          style={{
                            flex: 1,
                            fontSize: "14px",
                            color: task.completed ? "#9ca3af" : "#1e293b",
                            textDecoration: task.completed ? "line-through" : "none"
                          }}
                        >
                          {task.title}
                        </span>
                        <button
                          onClick$={() => deleteTask(list.id, task.id)}
                          style="padding: 4px 8px; background: #ef4444; color: white; border: none; border-radius: 4px; font-size: 12px; cursor: pointer;"
                        >
                          Delete
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Task Count */}
              <div style="padding: 12px 20px; border-top: 1px solid #e5e7eb; background: #f9fafb; font-size: 13px; color: #64748b;">
                {list.tasks.filter(t => t.completed).length} / {list.tasks.length} completed
              </div>
            </div>
          ))}
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
