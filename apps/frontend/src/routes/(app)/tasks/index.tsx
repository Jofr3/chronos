import {
  component$,
  useSignal,
  $,
  useVisibleTask$,
  useStore,
  noSerialize,
  type NoSerialize,
} from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import type { TaskListWithTasks, Task, DayOfWeek, Event } from "@chronos/types";
import { taskService } from "~/services/task.service";
import { getEvents, createEvent, updateEvent } from "~/services/event.service";
import { getApiBaseUrl } from "~/config/env";
import { Calendar } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import {
  type EditModalState,
  getInitialEditModalState,
  taskToEditModalState,
  formatRecurringDays,
  formatDuration,
} from "~/components/tasks";

export default component$(() => {
  // ===== TASKS STATE =====
  const lists = useSignal<TaskListWithTasks[]>([]);
  const tasksWithoutList = useSignal<Task[]>([]);
  const activeListId = useSignal<string | null>(null);
  const newTaskTitle = useSignal("");
  const isLoading = useSignal(true);
  const error = useSignal<string | null>(null);
  const isCreatingList = useSignal(false);
  const newListName = useSignal("");

  // Edit modal state
  const editModal = useStore<EditModalState>(getInitialEditModalState());

  // ===== CALENDAR STATE =====
  const calendarRef = useSignal<HTMLDivElement>();
  const calendarInstance = useSignal<NoSerialize<Calendar>>();
  const currentView = useSignal("dayGridMonth");
  const calendarTitle = useSignal("");
  const isScheduling = useSignal(false);
  const scheduleMessage = useSignal<string>("");

  // Event creation modal state
  const createEventModal = useSignal({
    isOpen: false,
    title: "",
    date: "",
    startTime: "",
    endTime: "",
  });
  const isCreatingEvent = useSignal(false);
  const createEventError = useSignal<string | null>(null);

  // Task menu state
  const openMenuTaskId = useSignal<string | null>(null);

  // ===== TASKS LOGIC =====
  const addTask = $(async () => {
    if (!newTaskTitle.value.trim()) return;
    try {
      if (activeListId.value) {
        const newTask = await taskService.createTask(activeListId.value, newTaskTitle.value.trim());
        lists.value = lists.value.map((list) => {
          if (list.id === activeListId.value) {
            return { ...list, tasks: [...list.tasks, newTask] };
          }
          return list;
        });
      } else {
        const newTask = await taskService.createTaskWithoutList(newTaskTitle.value.trim());
        tasksWithoutList.value = [...tasksWithoutList.value, newTask];
      }
      newTaskTitle.value = "";
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to create task";
    }
  });

  const createList = $(async () => {
    if (!newListName.value.trim()) {
      isCreatingList.value = false;
      return;
    }
    try {
      const newList = await taskService.createTaskList(newListName.value.trim());
      lists.value = [...lists.value, { ...newList, tasks: [] }];
      activeListId.value = newList.id;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to create list";
    }
    isCreatingList.value = false;
    newListName.value = "";
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

  const loadEvents = $(async () => {
    try {
      const events = await getEvents();
      const calendarEvents = events.map((event: Event) => ({
        id: event.id,
        title: event.title,
        start: `${event.date}T${event.start_time}`,
        end: `${event.date}T${event.end_time}`,
        extendedProps: {
          task_id: event.task_id,
        },
      }));
      if (calendarInstance.value) {
        calendarInstance.value.removeAllEvents();
        calendarInstance.value.addEventSource(calendarEvents);
      }
    } catch (err) {
      console.error("Failed to load events:", err);
    }
  });

  const deleteTask = $(async (listId: string | null, taskId: string) => {
    try {
      await taskService.deleteTask(taskId);
      if (listId === null) {
        tasksWithoutList.value = tasksWithoutList.value.filter((t) => t.id !== taskId);
      } else {
        lists.value = lists.value.map((list) => {
          if (list.id === listId) {
            return { ...list, tasks: list.tasks.filter((t) => t.id !== taskId) };
          }
          return list;
        });
      }
      // Refresh calendar to remove associated events
      await loadEvents();
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to delete task";
    } finally {
      openMenuTaskId.value = null;
    }
  });

  const findTaskById = $((taskId: string): { task: Task; listId: string | null } | null => {
    // Check tasks without list
    const taskWithoutList = tasksWithoutList.value.find((t) => t.id === taskId);
    if (taskWithoutList) {
      return { task: taskWithoutList, listId: null };
    }
    // Check tasks in lists
    for (const list of lists.value) {
      const task = list.tasks.find((t) => t.id === taskId);
      if (task) {
        return { task, listId: list.id };
      }
    }
    return null;
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

  // ===== CALENDAR LOGIC =====
  const handlePrev = $(() => {
    if (calendarInstance.value) {
      calendarInstance.value.prev();
      calendarTitle.value = calendarInstance.value.view.title;
    }
  });

  const handleNext = $(() => {
    if (calendarInstance.value) {
      calendarInstance.value.next();
      calendarTitle.value = calendarInstance.value.view.title;
    }
  });

  const handleToday = $(() => {
    if (calendarInstance.value) {
      calendarInstance.value.today();
      calendarTitle.value = calendarInstance.value.view.title;
    }
  });

  const handleChangeView = $((viewName: string) => {
    if (calendarInstance.value) {
      calendarInstance.value.changeView(viewName);
      currentView.value = viewName;
      calendarTitle.value = calendarInstance.value.view.title;
    }
  });

  const handleAISchedule = $(async () => {
    isScheduling.value = true;
    scheduleMessage.value = "";
    try {
      const match = document.cookie.match(/chronos_auth_token=([^;]+)/);
      const token = match ? match[1] : null;
      if (!token) {
        scheduleMessage.value = "Authentication required";
        return;
      }
      const apiUrl = getApiBaseUrl();
      const response = await fetch(`${apiUrl}/api/ai/schedule`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        scheduleMessage.value = `Failed to schedule: ${response.status}`;
        return;
      }
      const result = await response.json();
      if (result.success) {
        scheduleMessage.value = result.message || "Tasks scheduled!";
        await loadEvents();
        // Refresh tasks to reflect updated due dates
        const [allLists, tasksNoList] = await Promise.all([
          taskService.getAllTaskLists(),
          taskService.getTasksWithoutList(),
        ]);
        lists.value = allLists;
        tasksWithoutList.value = tasksNoList;
      } else {
        scheduleMessage.value = result.error?.message || "Failed to schedule";
      }
    } catch (err) {
      scheduleMessage.value = err instanceof Error ? err.message : "Scheduling error";
    } finally {
      isScheduling.value = false;
    }
  });

  const handleEventResize = $(async (eventId: string, taskId: string, start: Date, end: Date) => {
    try {
      const endTime = end.toTimeString().slice(0, 5);

      // Calculate new duration in minutes
      const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);

      // Update event end time and task duration in parallel
      await Promise.all([
        updateEvent(eventId, { end_time: endTime }),
        taskService.updateTask(taskId, { duration: durationMinutes > 0 ? durationMinutes : null }),
      ]);

      // Refresh tasks to reflect the duration change in the UI
      const [allLists, tasksNoList] = await Promise.all([
        taskService.getAllTaskLists(),
        taskService.getTasksWithoutList(),
      ]);
      lists.value = allLists;
      tasksWithoutList.value = tasksNoList;
    } catch (err) {
      console.error("Failed to resize event:", err);
      // Reload events to revert the visual change
      await loadEvents();
    }
  });

  const handleEventDrop = $(async (eventId: string, taskId: string, start: Date, end: Date) => {
    try {
      const date = start.toISOString().split("T")[0];
      const startTime = start.toTimeString().slice(0, 5);
      const endTime = end.toTimeString().slice(0, 5);

      // Update event date/times and task due_date in parallel
      await Promise.all([
        updateEvent(eventId, { date, start_time: startTime, end_time: endTime }),
        taskService.updateTask(taskId, { due_date: date }),
      ]);

      // Refresh tasks to reflect the due_date change in the UI
      const [allLists, tasksNoList] = await Promise.all([
        taskService.getAllTaskLists(),
        taskService.getTasksWithoutList(),
      ]);
      lists.value = allLists;
      tasksWithoutList.value = tasksNoList;
    } catch (err) {
      console.error("Failed to move event:", err);
      // Reload events to revert the visual change
      await loadEvents();
    }
  });

  const openCreateEventModal = $((dateStr: string, startTime: string, endTime: string) => {
    createEventModal.value = {
      isOpen: true,
      title: "",
      date: dateStr,
      startTime,
      endTime,
    };
    createEventError.value = null;
  });

  const closeCreateEventModal = $(() => {
    createEventModal.value = {
      isOpen: false,
      title: "",
      date: "",
      startTime: "",
      endTime: "",
    };
    createEventError.value = null;
  });

  const handleCreateEvent = $(async () => {
    if (!createEventModal.value.title.trim()) {
      createEventError.value = "Event title is required";
      return;
    }
    isCreatingEvent.value = true;
    createEventError.value = null;
    try {
      const task = await taskService.createTaskWithoutList(createEventModal.value.title);
      const [startHours, startMinutes] = createEventModal.value.startTime.split(':').map(Number);
      const [endHours, endMinutes] = createEventModal.value.endTime.split(':').map(Number);
      const durationMinutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
      await taskService.updateTask(task.id, {
        due_date: createEventModal.value.date,
        duration: durationMinutes > 0 ? durationMinutes : null,
      });
      await createEvent({
        date: createEventModal.value.date,
        start_time: createEventModal.value.startTime,
        end_time: createEventModal.value.endTime,
        task_id: task.id,
      });
      await loadEvents();
      // Also refresh tasks
      const tasksNoList = await taskService.getTasksWithoutList();
      tasksWithoutList.value = tasksNoList;
      closeCreateEventModal();
    } catch (err) {
      createEventError.value = err instanceof Error ? err.message : "Failed to create event";
    } finally {
      isCreatingEvent.value = false;
    }
  });

  // ===== INITIALIZATION =====
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async ({ cleanup }) => {
    // Load tasks
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

    // Initialize calendar
    if (!calendarRef.value) return;
    const calendar = new Calendar(calendarRef.value, {
      plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
      initialView: "timeGridWeek",
      headerToolbar: false,
      editable: true,
      selectable: true,
      selectMirror: true,
      dayMaxEvents: true,
      weekends: true,
      height: "100%",
      scrollTime: "06:00:00",
      slotDuration: "00:10:00",
      allDaySlot: false,
      events: [],
      select: (info) => {
        const startDate = new Date(info.start);
        const endDate = new Date(info.end);
        const date = startDate.toISOString().split("T")[0];
        const startTime = startDate.toTimeString().slice(0, 5);
        const endTime = endDate.toTimeString().slice(0, 5);
        openCreateEventModal(date, startTime, endTime);
        if (calendar) calendar.unselect();
      },
      eventResize: (info) => {
        const taskId = info.event.extendedProps.task_id;
        handleEventResize(info.event.id, taskId, info.event.start!, info.event.end!);
      },
      eventDrop: (info) => {
        const taskId = info.event.extendedProps.task_id;
        handleEventDrop(info.event.id, taskId, info.event.start!, info.event.end!);
      },
      eventClick: async (info) => {
        try {
          const taskId = info.event.extendedProps.task_id;
          if (!taskId) {
            console.error("Event has no task_id");
            return;
          }
          const found = await findTaskById(taskId);
          if (found) {
            await openEditModal(found.listId, found.task);
          } else {
            console.error("Task not found for id:", taskId);
          }
        } catch (err) {
          console.error("Failed to open task from event:", err);
        }
      },
    });
    calendar.render();
    calendarInstance.value = noSerialize(calendar);
    calendarTitle.value = calendar.view.title;

    // Load events
    loadEvents();

    cleanup(() => {
      calendar.destroy();
    });
  });

  // Helper: compute visible tasks
  const visibleTasks = (() => {
    if (activeListId.value === null) {
      const allTasks: { task: Task; listId: string | null }[] = [];
      tasksWithoutList.value.forEach((t) => allTasks.push({ task: t, listId: null }));
      lists.value.forEach((list) => {
        list.tasks.forEach((t) => allTasks.push({ task: t, listId: list.id }));
      });
      return allTasks;
    }
    const list = lists.value.find((l) => l.id === activeListId.value);
    if (list) {
      return list.tasks.map((t) => ({ task: t, listId: list.id }));
    }
    return [];
  })();

  const pendingTasks = visibleTasks.filter((t) => !t.task.completed);
  const completedTasks = visibleTasks.filter((t) => t.task.completed);

  const LIST_COLORS = ["#3b82f6", "#22c55e", "#a855f7", "#f59e0b", "#ef4444", "#06b6d4"];

  return (
    <>
      {/* Error Message */}
      {error.value && (
        <div class="error">
          <span>{error.value}</span>
          <button onClick$={() => (error.value = null)} class="error-close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* ===== LEFT PANEL: Tasks ===== */}
      <section
        class="tasks-panel"
        onClick$={(e) => {
          const target = e.target as HTMLElement;
          if (!target.closest(".task-menu-wrapper")) {
            openMenuTaskId.value = null;
          }
        }}
      >
        <div class="tasks-header">
          {/* List Tabs */}
          <div class="list-tabs">
            <div class="list-tabs-inner">
              <button
                class={`list-tab ${activeListId.value === null ? 'active' : ''}`}
                onClick$={() => { activeListId.value = null; }}
              >
                <span class="list-tab-dot" style={{ background: "#6b7280" }}></span>
                All
              </button>
              {lists.value.map((list, i) => (
                <button
                  key={list.id}
                  class={`list-tab ${activeListId.value === list.id ? 'active' : ''}`}
                  onClick$={() => { activeListId.value = list.id; }}
                >
                  <span class="list-tab-dot" style={{ background: LIST_COLORS[i % LIST_COLORS.length] }}></span>
                  {list.name}
                </button>
              ))}
              {isCreatingList.value ? (
                <input
                  class="list-tab-input"
                  type="text"
                  placeholder="List name..."
                  value={newListName.value}
                  onInput$={(e) => { newListName.value = (e.target as HTMLInputElement).value; }}
                  onKeyDown$={(e) => {
                    if (e.key === "Enter") createList();
                    else if (e.key === "Escape") { isCreatingList.value = false; newListName.value = ""; }
                  }}
                  onBlur$={() => createList()}
                  autoFocus
                />
              ) : (
                <button
                  class="list-tab-add"
                  title="Add list"
                  onClick$={() => { isCreatingList.value = true; }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* New Task Input */}
          <div class="new-task">
            <div class="new-task-inner">
              <span class="new-task-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </span>
              <input
                class="new-task-input"
                type="text"
                placeholder="New task..."
                value={newTaskTitle.value}
                onInput$={(e) => { newTaskTitle.value = (e.target as HTMLInputElement).value; }}
                onKeyPress$={(e) => {
                  if (e.key === "Enter") addTask();
                }}
              />
            </div>
          </div>
        </div>

        {/* Task List */}
        <div class="task-list">
          {isLoading.value ? (
            <div class="loading">Loading...</div>
          ) : (
            <div class="task-list-items">
              {/* Pending Tasks */}
              {pendingTasks.map(({ task, listId }) => (
                <div
                  key={task.id}
                  class="task-item"
                  onClick$={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.closest(".task-checkbox-wrapper") || target.closest(".task-menu-wrapper")) return;
                    openEditModal(listId, task);
                  }}
                >
                  <div class="task-checkbox-wrapper">
                    <input
                      type="checkbox"
                      class="task-checkbox"
                      checked={task.completed}
                      onClick$={(e) => {
                        e.stopPropagation();
                        toggleTask(listId, task.id);
                      }}
                    />
                  </div>
                  <div class="task-content">
                    <span class="task-title">{task.title}</span>
                    <div class="task-meta">
                      {task.due_date && (
                        <span class="task-date">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                          </svg>
                          {new Date(task.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </span>
                      )}
                      {task.duration && task.duration > 0 && (
                        <span class="task-duration">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          {formatDuration(task.duration)}
                        </span>
                      )}
                      {task.is_recurring && (
                        <span class="task-recurring">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M23 4v6h-6M1 20v-6h6" />
                            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                          </svg>
                          {formatRecurringDays(task.recurring_days)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div class={`task-menu-wrapper ${openMenuTaskId.value === task.id ? 'open' : ''}`}>
                    <button
                      class="task-menu-btn"
                      onClick$={(e) => {
                        e.stopPropagation();
                        openMenuTaskId.value = openMenuTaskId.value === task.id ? null : task.id;
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="5" r="2" />
                        <circle cx="12" cy="12" r="2" />
                        <circle cx="12" cy="19" r="2" />
                      </svg>
                    </button>
                    {openMenuTaskId.value === task.id && (
                      <div class="task-menu-dropdown">
                        <button
                          class="task-menu-item danger"
                          onClick$={(e) => {
                            e.stopPropagation();
                            deleteTask(listId, task.id);
                          }}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Completed Tasks */}
              {completedTasks.length > 0 && (
                <div class="completed-divider">
                  {completedTasks.map(({ task, listId }) => (
                    <div
                      key={task.id}
                      class="task-item completed"
                      onClick$={(e) => {
                        const target = e.target as HTMLElement;
                        if (target.closest(".task-checkbox-wrapper") || target.closest(".task-menu-wrapper")) return;
                        openEditModal(listId, task);
                      }}
                    >
                      <div class="task-checkbox-wrapper">
                        <input
                          type="checkbox"
                          class="task-checkbox"
                          checked={task.completed}
                          onClick$={(e) => {
                            e.stopPropagation();
                            toggleTask(listId, task.id);
                          }}
                        />
                      </div>
                      <div class="task-content">
                        <span class="task-title">{task.title}</span>
                      </div>
                      <div class={`task-menu-wrapper ${openMenuTaskId.value === task.id ? 'open' : ''}`}>
                        <button
                          class="task-menu-btn"
                          onClick$={(e) => {
                            e.stopPropagation();
                            openMenuTaskId.value = openMenuTaskId.value === task.id ? null : task.id;
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="5" r="2" />
                            <circle cx="12" cy="12" r="2" />
                            <circle cx="12" cy="19" r="2" />
                          </svg>
                        </button>
                        {openMenuTaskId.value === task.id && (
                          <div class="task-menu-dropdown">
                            <button
                              class="task-menu-item danger"
                              onClick$={(e) => {
                                e.stopPropagation();
                                deleteTask(listId, task.id);
                              }}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                              </svg>
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ===== RIGHT PANEL: Calendar ===== */}
      <main class="calendar-panel">
        {/* Calendar Header */}
        <header class="calendar-header">
          <div class="calendar-header-left">
            <h2 class="calendar-title">{calendarTitle.value}</h2>
            <div class="calendar-view-toggle">
              <button
                class={`calendar-view-btn ${currentView.value === "dayGridMonth" ? "active" : ""}`}
                onClick$={() => handleChangeView("dayGridMonth")}
              >
                Month
              </button>
              <button
                class={`calendar-view-btn ${currentView.value === "timeGridWeek" ? "active" : ""}`}
                onClick$={() => handleChangeView("timeGridWeek")}
              >
                Week
              </button>
              <button
                class={`calendar-view-btn ${currentView.value === "timeGridDay" ? "active" : ""}`}
                onClick$={() => handleChangeView("timeGridDay")}
              >
                Day
              </button>
            </div>
            <button
              class="ai-schedule-btn"
              onClick$={handleAISchedule}
              disabled={isScheduling.value}
            >
              {isScheduling.value ? "Scheduling..." : "Schedule"}
            </button>
          </div>
          <div class="calendar-header-right">
            <button class="calendar-nav-btn" onClick$={handlePrev}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button class="calendar-today-btn" onClick$={handleToday}>
              Today
            </button>
            <button class="calendar-nav-btn" onClick$={handleNext}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        </header>

        {/* Calendar Body */}
        <div class="calendar-body">
          <div ref={calendarRef} id="calendar" style={{ flex: 1 }} />
        </div>
      </main>

      {/* Schedule Message */}
      {scheduleMessage.value && (
        <div class={`schedule-message ${scheduleMessage.value.includes("success") || scheduleMessage.value.includes("scheduled") ? "success" : "error"}`}>
          {scheduleMessage.value}
        </div>
      )}

      {/* ===== Edit Task Modal ===== */}
      {editModal.isOpen && (
        <div
          class="modal-overlay"
          onClick$={(e) => {
            if (e.target === e.currentTarget) closeEditModal();
          }}
        >
          <div class="modal-content">
            <div class="modal-header">
              <h2 class="modal-title">Edit Task</h2>
              <button onClick$={closeEditModal} class="modal-close-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div class="modal-body">
              <div class="modal-field">
                <label class="modal-label">Title</label>
                <input
                  type="text"
                  value={editModal.title}
                  onInput$={(e) => editModal.title = (e.target as HTMLInputElement).value}
                  class="modal-input"
                />
              </div>
              <div class="modal-field">
                <label class="modal-label">Description</label>
                <textarea
                  value={editModal.description}
                  onInput$={(e) => editModal.description = (e.target as HTMLTextAreaElement).value}
                  class="modal-textarea"
                  placeholder="Add details..."
                  rows={3}
                />
              </div>
              <div class="modal-field">
                <label class="modal-label">Duration (min)</label>
                <input
                  type="number"
                  value={editModal.duration}
                  onInput$={(e) => editModal.duration = (e.target as HTMLInputElement).value}
                  class="modal-input"
                  placeholder="e.g., 30"
                  min="0"
                />
              </div>
              <div class="modal-field">
                <label class="modal-label">Type</label>
                <div class="modal-task-type-group">
                  <button
                    onClick$={() => editModal.isRecurring = false}
                    class={`modal-task-type-btn ${!editModal.isRecurring ? "active" : ""}`}
                  >
                    One-shot
                  </button>
                  <button
                    onClick$={() => editModal.isRecurring = true}
                    class={`modal-task-type-btn ${editModal.isRecurring ? "active" : ""}`}
                  >
                    Recurring
                  </button>
                </div>
              </div>
              {!editModal.isRecurring && (
                <div class="modal-field">
                  <label class="modal-label">Due Date</label>
                  <input
                    type="date"
                    value={editModal.dueDate}
                    onInput$={(e) => editModal.dueDate = (e.target as HTMLInputElement).value}
                    class="modal-input"
                  />
                </div>
              )}
              {editModal.isRecurring && (
                <div class="modal-field">
                  <label class="modal-label">Repeat on</label>
                  <div class="modal-recurring-days">
                    {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
                      <button
                        key={index}
                        onClick$={() => toggleRecurringDay(index)}
                        class={`modal-day-btn ${editModal.recurringDays[index] ? "selected" : ""}`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {editModal.isRecurring && (
                <div class="modal-field">
                  <label class="modal-label">End Date</label>
                  <input
                    type="date"
                    value={editModal.dueDate}
                    onInput$={(e) => editModal.dueDate = (e.target as HTMLInputElement).value}
                    class="modal-input"
                    placeholder="No end date"
                  />
                </div>
              )}
            </div>
            <div class="modal-footer">
              <button onClick$={closeEditModal} class="modal-cancel-btn">Cancel</button>
              <button onClick$={saveTaskEdits} class="modal-save-btn">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Create Event Modal ===== */}
      {createEventModal.value.isOpen && (
        <div
          class="modal-overlay"
          onClick$={(e) => {
            if (e.target === e.currentTarget) closeCreateEventModal();
          }}
        >
          <div class="modal-content">
            <div class="modal-header">
              <h2 class="modal-title">Create Event</h2>
              <button onClick$={closeCreateEventModal} class="modal-close-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div class="modal-body">
              <div class="modal-field">
                <label class="modal-label">Event Title</label>
                <input
                  type="text"
                  value={createEventModal.value.title}
                  onInput$={(e) => {
                    createEventModal.value = {
                      ...createEventModal.value,
                      title: (e.target as HTMLInputElement).value,
                    };
                  }}
                  onKeyPress$={(e) => {
                    if (e.key === "Enter") handleCreateEvent();
                  }}
                  class="modal-input"
                  placeholder="Enter event title..."
                  autoFocus
                />
              </div>
              <div class="modal-field">
                <label class="modal-label">Date & Time</label>
                <div class="event-datetime">
                  <div class="event-datetime-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <span>{new Date(createEventModal.value.date).toLocaleDateString()}</span>
                  </div>
                  <div class="event-datetime-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span>{createEventModal.value.startTime} - {createEventModal.value.endTime}</span>
                  </div>
                </div>
              </div>
              {createEventError.value && (
                <div class="modal-error">{createEventError.value}</div>
              )}
            </div>
            <div class="modal-footer">
              <button
                onClick$={closeCreateEventModal}
                class="modal-cancel-btn"
                disabled={isCreatingEvent.value}
              >
                Cancel
              </button>
              <button
                onClick$={handleCreateEvent}
                class="modal-save-btn"
                disabled={isCreatingEvent.value}
              >
                {isCreatingEvent.value ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

export const head: DocumentHead = {
  title: "Dashboard - Chronos",
  meta: [
    {
      name: "description",
      content: "Task management and calendar dashboard",
    },
  ],
};
