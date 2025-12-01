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
      <h1 style="margin-top: 0; font-size: 36px; color: var(--text-primary); font-weight: 700;">Tasks</h1>

      {/* Error Message */}
      {error.value && (
        <div style="background: var(--bg-secondary); border: 1px solid var(--accent-primary); color: var(--accent-primary); padding: 14px 18px; border-radius: 10px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between;">
          <span>{error.value}</span>
          <button
            onClick$={() => error.value = null}
            style="padding: 6px 12px; background: transparent; border: 1px solid var(--accent-primary); color: var(--accent-primary); border-radius: 6px; cursor: pointer; font-weight: 500; transition: all 0.2s;"
            onMouseOver$={(e) => {
              (e.target as HTMLElement).style.background = "var(--accent-primary)";
              (e.target as HTMLElement).style.color = "white";
            }}
            onMouseOut$={(e) => {
              (e.target as HTMLElement).style.background = "transparent";
              (e.target as HTMLElement).style.color = "var(--accent-primary)";
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Create New List */}
      <div style="background: var(--bg-secondary); padding: 28px; border-radius: 12px; box-shadow: var(--shadow-md); margin-top: 28px; border: 1px solid var(--border-color);">
        <h2 style="margin-top: 0; font-size: 22px; color: var(--text-primary); font-weight: 600; margin-bottom: 20px;">
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
            style="flex: 1; padding: 12px 16px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 14px; background: var(--bg-tertiary); color: var(--text-primary); transition: border-color 0.2s;"
            onFocus$={(e) => (e.target as HTMLElement).style.borderColor = "var(--accent-primary)"}
            onBlur$={(e) => (e.target as HTMLElement).style.borderColor = "var(--border-color)"}
            disabled={isLoading.value}
          />
          <button
            onClick$={addList}
            disabled={isLoading.value}
            style="padding: 12px 24px; background: var(--accent-gradient); color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: var(--shadow-sm); transition: all 0.2s;"
            onMouseOver$={(e) => {
              (e.target as HTMLElement).style.transform = "translateY(-2px)";
              (e.target as HTMLElement).style.boxShadow = "var(--shadow-accent)";
            }}
            onMouseOut$={(e) => {
              (e.target as HTMLElement).style.transform = "translateY(0)";
              (e.target as HTMLElement).style.boxShadow = "var(--shadow-sm)";
            }}
          >
            Add List
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading.value && (
        <div style="background: var(--bg-secondary); padding: 48px 24px; border-radius: 12px; box-shadow: var(--shadow-md); margin-top: 28px; text-align: center; color: var(--text-secondary); border: 1px solid var(--border-color);">
          <div style="font-size: 18px; font-weight: 500;">Loading tasks...</div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading.value && lists.value.length === 0 && (
        <div style="background: var(--bg-secondary); padding: 48px 24px; border-radius: 12px; box-shadow: var(--shadow-md); margin-top: 28px; text-align: center; color: var(--text-secondary); border: 1px solid var(--border-color);">
          <div style="font-size: 48px; margin-bottom: 16px;">📋</div>
          <div style="font-size: 18px; font-weight: 500; color: var(--text-primary); margin-bottom: 8px;">No lists yet</div>
          <div>Create your first list to get started!</div>
        </div>
      )}

      {/* Lists */}
      {!isLoading.value && lists.value.length > 0 && (
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 24px; margin-top: 28px;">
          {lists.value.map((list) => (
            <div key={list.id} style="background: var(--bg-secondary); border-radius: 12px; box-shadow: var(--shadow-md); display: flex; flex-direction: column; max-height: 650px; border: 1px solid var(--border-color); transition: all 0.3s;"
              onMouseOver$={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--accent-primary)";
                (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-accent)";
              }}
              onMouseOut$={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border-color)";
                (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-md)";
              }}
            >
              {/* List Header */}
              <div style="padding: 24px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: var(--bg-tertiary); border-radius: 12px 12px 0 0;">
                <h3 style="margin: 0; font-size: 20px; color: var(--text-primary); font-weight: 600;">
                  {list.name}
                </h3>
                <button
                  onClick$={() => deleteList(list.id)}
                  style="padding: 8px 14px; background: var(--accent-primary); color: white; border: none; border-radius: 6px; font-size: 13px; cursor: pointer; font-weight: 600; transition: all 0.2s;"
                  onMouseOver$={(e) => {
                    (e.target as HTMLElement).style.background = "var(--accent-primary-hover)";
                    (e.target as HTMLElement).style.transform = "scale(1.05)";
                  }}
                  onMouseOut$={(e) => {
                    (e.target as HTMLElement).style.background = "var(--accent-primary)";
                    (e.target as HTMLElement).style.transform = "scale(1)";
                  }}
                >
                  Delete
                </button>
              </div>

              {/* Add Task */}
              <div style="padding: 20px; border-bottom: 1px solid var(--border-color); background: var(--bg-elevated);">
                <div style="display: flex; gap: 10px;">
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
                    style="flex: 1; padding: 10px 14px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 14px; background: var(--bg-tertiary); color: var(--text-primary); transition: border-color 0.2s;"
                    onFocus$={(e) => (e.target as HTMLElement).style.borderColor = "var(--accent-secondary)"}
                    onBlur$={(e) => (e.target as HTMLElement).style.borderColor = "var(--border-color)"}
                  />
                  <button
                    onClick$={() => addTask(list.id)}
                    style="padding: 10px 18px; background: var(--success); color: white; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; font-weight: 600; transition: all 0.2s;"
                    onMouseOver$={(e) => {
                      (e.target as HTMLElement).style.background = "var(--success-hover)";
                      (e.target as HTMLElement).style.transform = "scale(1.05)";
                    }}
                    onMouseOut$={(e) => {
                      (e.target as HTMLElement).style.background = "var(--success)";
                      (e.target as HTMLElement).style.transform = "scale(1)";
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Tasks */}
              <div style="flex: 1; overflow-y: auto; padding: 20px;">
                {list.tasks.length === 0 ? (
                  <div style="text-align: center; color: var(--text-tertiary); padding: 32px; font-size: 14px;">
                    <div style="font-size: 32px; margin-bottom: 12px;">✓</div>
                    <div>No tasks yet</div>
                  </div>
                ) : (
                  <ul style="list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px;">
                    {list.tasks.map((task) => (
                      <li
                        key={task.id}
                        style="display: flex; align-items: center; gap: 12px; padding: 14px; background: var(--bg-tertiary); border-radius: 8px; border: 1px solid var(--border-color); transition: all 0.2s;"
                        onMouseOver$={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor = "var(--border-color-light)";
                          (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)";
                        }}
                        onMouseOut$={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor = "var(--border-color)";
                          (e.currentTarget as HTMLElement).style.background = "var(--bg-tertiary)";
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange$={() => toggleTask(list.id, task.id)}
                          style="width: 20px; height: 20px; cursor: pointer; accent-color: var(--accent-secondary);"
                        />
                        <span
                          style={{
                            flex: 1,
                            fontSize: "14px",
                            color: task.completed ? "var(--text-tertiary)" : "var(--text-primary)",
                            textDecoration: task.completed ? "line-through" : "none",
                            fontWeight: task.completed ? "400" : "500"
                          }}
                        >
                          {task.title}
                        </span>
                        <button
                          onClick$={() => deleteTask(list.id, task.id)}
                          style="padding: 6px 10px; background: var(--error); color: white; border: none; border-radius: 6px; font-size: 12px; cursor: pointer; font-weight: 600; transition: all 0.2s;"
                          onMouseOver$={(e) => {
                            (e.target as HTMLElement).style.background = "var(--error-hover)";
                            (e.target as HTMLElement).style.transform = "scale(1.05)";
                          }}
                          onMouseOut$={(e) => {
                            (e.target as HTMLElement).style.background = "var(--error)";
                            (e.target as HTMLElement).style.transform = "scale(1)";
                          }}
                        >
                          Delete
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Task Count */}
              <div style="padding: 16px 24px; border-top: 1px solid var(--border-color); background: var(--bg-tertiary); font-size: 13px; color: var(--text-secondary); font-weight: 500; border-radius: 0 0 12px 12px;">
                <span style="color: var(--accent-secondary);">{list.tasks.filter(t => t.completed).length}</span> / {list.tasks.length} completed
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
