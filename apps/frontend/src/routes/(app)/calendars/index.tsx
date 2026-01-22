import {
  component$,
  useSignal,
  useVisibleTask$,
  noSerialize,
  type NoSerialize,
  $,
} from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { Calendar } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { getApiBaseUrl } from "~/config/env";
import { getEvents, createEvent } from "~/services/event.service";
import { taskService } from "~/services/task.service";
import type { Event } from "@chronos/types";

export default component$(() => {
  const calendarRef = useSignal<HTMLDivElement>();
  const calendarInstance = useSignal<NoSerialize<Calendar>>();
  const isScheduling = useSignal(false);
  const scheduleMessage = useSignal<string>("");
  const isLoadingEvents = useSignal(true);

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

  // Navigation handlers
  const handlePrev = $(() => {
    if (calendarInstance.value) {
      calendarInstance.value.prev();
    }
  });

  const handleNext = $(() => {
    if (calendarInstance.value) {
      calendarInstance.value.next();
    }
  });

  const handleToday = $(() => {
    if (calendarInstance.value) {
      calendarInstance.value.today();
    }
  });

  const handleChangeView = $((viewName: string) => {
    if (calendarInstance.value) {
      calendarInstance.value.changeView(viewName);
    }
  });

  const loadEvents = $(async () => {
    try {
      const events = await getEvents();

      // Convert events to FullCalendar format
      const calendarEvents = events.map((event: Event) => ({
        id: event.id,
        title: event.title,
        start: `${event.date}T${event.start_time}`,
        end: `${event.date}T${event.end_time}`,
        extendedProps: {
          task_id: event.task_id,
        },
      }));

      // Update calendar with events
      if (calendarInstance.value) {
        calendarInstance.value.removeAllEvents();
        calendarInstance.value.addEventSource(calendarEvents);
      }

      isLoadingEvents.value = false;
    } catch (error) {
      console.error("Failed to load events:", error);
      isLoadingEvents.value = false;
    }
  });

  const handleAISchedule = $(async () => {
    isScheduling.value = true;
    scheduleMessage.value = "";

    try {
      // Get auth token from cookie
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

      // Check if response is ok before parsing JSON
      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error:", response.status, errorText);
        scheduleMessage.value = `Failed to schedule: ${response.status} ${response.statusText}`;
        return;
      }

      const result = await response.json();

      if (result.success) {
        scheduleMessage.value = result.message || "Tasks scheduled successfully!";
        // Refresh calendar events
        await loadEvents();
      } else {
        scheduleMessage.value = result.error?.message || "Failed to schedule tasks";
      }
    } catch (error) {
      console.error("Schedule error:", error);
      scheduleMessage.value = error instanceof Error
        ? `Error: ${error.message}`
        : "An error occurred while scheduling tasks";
    } finally {
      isScheduling.value = false;
    }
  });

  // Open create event modal
  const openCreateEventModal = $((dateStr: string, startTime: string, endTime: string) => {
    createEventModal.value = {
      isOpen: true,
      title: "",
      date: dateStr,
      startTime: startTime,
      endTime: endTime,
    };
    createEventError.value = null;
  });

  // Close create event modal
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

  // Handle event creation
  const handleCreateEvent = $(async () => {
    if (!createEventModal.value.title.trim()) {
      createEventError.value = "Event title is required";
      return;
    }

    isCreatingEvent.value = true;
    createEventError.value = null;

    try {
      // First, create a task with the same title (list_id will be null)
      const task = await taskService.createTaskWithoutList(createEventModal.value.title);

      // Calculate duration in minutes from start and end time
      const [startHours, startMinutes] = createEventModal.value.startTime.split(':').map(Number);
      const [endHours, endMinutes] = createEventModal.value.endTime.split(':').map(Number);
      const durationMinutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);

      // Set the task's due_date and duration to match the event
      await taskService.updateTask(task.id, {
        due_date: createEventModal.value.date,
        duration: durationMinutes > 0 ? durationMinutes : null,
      });

      // Then, create the event and link it to the task
      await createEvent({
        date: createEventModal.value.date,
        start_time: createEventModal.value.startTime,
        end_time: createEventModal.value.endTime,
        task_id: task.id,
      });

      // Refresh calendar events
      await loadEvents();

      // Close modal
      closeCreateEventModal();
    } catch (error) {
      console.error("Failed to create event:", error);
      createEventError.value = error instanceof Error
        ? error.message
        : "Failed to create event";
    } finally {
      isCreatingEvent.value = false;
    }
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ cleanup }) => {
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
      scrollTime: "04:00:00",
      slotDuration: "00:10:00",
      allDaySlot: false,
      events: [],
      // Event handlers
      dateClick: (info) => {
        console.log("Date clicked:", info.dateStr);
      },
      eventClick: (info) => {
        console.log("Event clicked:", info.event.title);
      },
      select: (info) => {
        // Extract date and time from selection
        const startDate = new Date(info.start);
        const endDate = new Date(info.end);

        // Format date as YYYY-MM-DD
        const date = startDate.toISOString().split("T")[0];

        // Format times as HH:MM
        const startTime = startDate.toTimeString().slice(0, 5);
        const endTime = endDate.toTimeString().slice(0, 5);

        // Open modal with selected date and time
        openCreateEventModal(date, startTime, endTime);

        // Unselect after opening modal
        if (calendar) {
          calendar.unselect();
        }
      },
    });

    calendar.render();
    calendarInstance.value = noSerialize(calendar);

    // Load events after calendar is initialized
    loadEvents();

    cleanup(() => {
      calendar.destroy();
    });
  });

  return (
    <div class="calendar-container">
      {/* Main Content Area */}
      <div class="calendar-main">
        {/* Calendar Wrapper */}
        <div class="calendar-wrapper">
          <div ref={calendarRef} id="calendar" />
        </div>

        {/* Sidebar */}
        <div class="calendar-sidebar">
          {/* Navigation */}
          <div class="sidebar-section">
            <div class="sidebar-nav-buttons">
              <button onClick$={handlePrev} class="sidebar-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
                Prev
              </button>
              <button onClick$={handleToday} class="sidebar-btn">
                Today
              </button>
              <button onClick$={handleNext} class="sidebar-btn">
                Next
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>
          </div>

          {/* View Options */}
          <div class="sidebar-section">
            <div class="sidebar-view-buttons">
              <button onClick$={() => handleChangeView("dayGridMonth")} class="sidebar-btn">
                Month
              </button>
              <button onClick$={() => handleChangeView("timeGridWeek")} class="sidebar-btn">
                Week
              </button>
              <button onClick$={() => handleChangeView("timeGridDay")} class="sidebar-btn">
                Day
              </button>
            </div>
          </div>

          {/* AI Schedule */}
          <div class="sidebar-section">
            <button
              onClick$={handleAISchedule}
              disabled={isScheduling.value}
              class="sidebar-btn sidebar-ai-btn"
            >
              {isScheduling.value ? "Scheduling..." : "Schedule Tasks"}
            </button>

            {/* Schedule Message */}
            {scheduleMessage.value && (
              <div
                class={`sidebar-message ${
                  scheduleMessage.value.includes("success") ? "success" : "error"
                }`}
              >
                {scheduleMessage.value}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Event Modal */}
      {createEventModal.value.isOpen && (
        <div
          class="modal-overlay"
          onClick$={(e) => {
            if (e.target === e.currentTarget) closeCreateEventModal();
          }}
        >
          <div class="modal-content">
            {/* Modal Header */}
            <div class="modal-header">
              <h2 class="modal-title">Create Event</h2>
              <button
                onClick$={closeCreateEventModal}
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
              {/* Event Title */}
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
                    if (e.key === "Enter") {
                      handleCreateEvent();
                    }
                  }}
                  class="modal-input"
                  placeholder="Enter event title..."
                  autoFocus
                />
              </div>

              {/* Date and Time Info */}
              <div class="modal-field">
                <label class="modal-label">Date & Time</label>
                <div class="event-datetime-info">
                  <div class="event-date-display">
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
                    <span>
                      {new Date(createEventModal.value.date).toLocaleDateString()}
                    </span>
                  </div>
                  <div class="event-time-display">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span>
                      {createEventModal.value.startTime} - {createEventModal.value.endTime}
                    </span>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {createEventError.value && (
                <div class="modal-error">
                  {createEventError.value}
                </div>
              )}
            </div>

            {/* Modal Footer */}
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
                {isCreatingEvent.value ? "Creating..." : "Create Event"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export const head: DocumentHead = {
  title: "Calendar - Chronos",
  meta: [
    {
      name: "description",
      content: "Calendar view for task scheduling",
    },
  ],
};
