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
import { getEvents } from "~/services/event.service";
import type { Event } from "@chronos/types";

export default component$(() => {
  const calendarRef = useSignal<HTMLDivElement>();
  const calendarInstance = useSignal<NoSerialize<Calendar>>();
  const isScheduling = useSignal(false);
  const scheduleMessage = useSignal<string>("");
  const isLoadingEvents = useSignal(true);

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

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ cleanup }) => {
    if (!calendarRef.value) return;

    const calendar = new Calendar(calendarRef.value, {
      plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
      initialView: "dayGridMonth",
      headerToolbar: {
        left: "prev,next today",
        center: "title",
        right: "dayGridMonth,timeGridWeek,timeGridDay",
      },
      editable: true,
      selectable: true,
      selectMirror: true,
      dayMaxEvents: true,
      weekends: true,
      height: "auto",
      events: [],
      // Event handlers
      dateClick: (info) => {
        console.log("Date clicked:", info.dateStr);
      },
      eventClick: (info) => {
        console.log("Event clicked:", info.event.title);
      },
      select: (info) => {
        console.log("Date range selected:", info.startStr, "to", info.endStr);
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
    <div style="max-width: 1400px; margin: 0 auto;">
      {/* Header */}
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 40px;">
        <h1 style="margin: 0; font-size: 28px; color: var(--text-primary); font-weight: 600; letter-spacing: -0.5px;">
          Calendar
        </h1>
        <button
          onClick$={handleAISchedule}
          disabled={isScheduling.value}
          style={{
            padding: "12px 24px",
            background: "var(--accent-primary)",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: "500",
            cursor: isScheduling.value ? "not-allowed" : "pointer",
            opacity: isScheduling.value ? "0.6" : "1",
            transition: "all 0.2s",
          }}
        >
          {isScheduling.value ? "Scheduling..." : "🤖 AI Schedule Tasks"}
        </button>
      </div>

      {/* Schedule Message */}
      {scheduleMessage.value && (
        <div
          style={{
            padding: "12px 16px",
            marginBottom: "20px",
            background: scheduleMessage.value.includes("success")
              ? "rgba(34, 197, 94, 0.1)"
              : "rgba(239, 68, 68, 0.1)",
            color: scheduleMessage.value.includes("success")
              ? "rgb(34, 197, 94)"
              : "rgb(239, 68, 68)",
            borderRadius: "8px",
            border: `1px solid ${
              scheduleMessage.value.includes("success")
                ? "rgba(34, 197, 94, 0.3)"
                : "rgba(239, 68, 68, 0.3)"
            }`,
          }}
        >
          {scheduleMessage.value}
        </div>
      )}

      {/* Calendar Container */}
      <div
        style="background: var(--bg-secondary); border-radius: 16px; padding: 24px; border: 1px solid var(--border-color);"
      >
        <div ref={calendarRef} id="calendar" />
      </div>

      {/* FullCalendar Custom Styles */}
      <style>{`
        /* FullCalendar Theme Overrides */
        .fc {
          --fc-border-color: var(--border-color);
          --fc-button-bg-color: var(--bg-tertiary);
          --fc-button-border-color: var(--border-color);
          --fc-button-text-color: var(--text-primary);
          --fc-button-hover-bg-color: var(--bg-elevated);
          --fc-button-hover-border-color: var(--border-color-light);
          --fc-button-active-bg-color: var(--accent-primary);
          --fc-button-active-border-color: var(--accent-primary);
          --fc-page-bg-color: var(--bg-secondary);
          --fc-neutral-bg-color: var(--bg-tertiary);
          --fc-list-event-hover-bg-color: var(--bg-elevated);
          --fc-today-bg-color: rgba(139, 92, 246, 0.1);
          --fc-event-bg-color: var(--accent-primary);
          --fc-event-border-color: var(--accent-primary);
          --fc-event-text-color: white;
          font-family: inherit;
        }

        .fc .fc-toolbar-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .fc .fc-button {
          font-weight: 500;
          font-size: 0.875rem;
          padding: 8px 16px;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .fc .fc-button:focus {
          box-shadow: none;
        }

        .fc .fc-button-primary:not(:disabled).fc-button-active,
        .fc .fc-button-primary:not(:disabled):active {
          background-color: var(--accent-primary);
          border-color: var(--accent-primary);
        }

        .fc .fc-col-header-cell-cushion {
          color: var(--text-secondary);
          font-weight: 500;
          padding: 12px 4px;
        }

        .fc .fc-daygrid-day-number {
          color: var(--text-secondary);
          font-size: 0.875rem;
          padding: 8px;
        }

        .fc .fc-daygrid-day.fc-day-today .fc-daygrid-day-number {
          color: var(--accent-primary);
          font-weight: 600;
        }

        .fc .fc-daygrid-day-top {
          flex-direction: row;
        }

        .fc .fc-daygrid-day-frame {
          min-height: 100px;
        }

        .fc .fc-event {
          border-radius: 4px;
          font-size: 0.8125rem;
          padding: 2px 6px;
          cursor: pointer;
        }

        .fc .fc-daygrid-event {
          margin: 2px 4px;
        }

        .fc .fc-timegrid-slot {
          height: 48px;
        }

        .fc .fc-timegrid-slot-label-cushion {
          color: var(--text-tertiary);
          font-size: 0.75rem;
        }

        .fc .fc-scrollgrid {
          border-radius: 8px;
          overflow: hidden;
        }

        .fc .fc-scrollgrid-section > td {
          border: none;
        }

        .fc th {
          border-color: var(--border-color);
        }

        .fc td {
          border-color: var(--border-color);
        }

        .fc .fc-highlight {
          background: rgba(139, 92, 246, 0.15);
        }

        .fc .fc-daygrid-more-link {
          color: var(--accent-primary);
          font-weight: 500;
        }

        .fc .fc-popover {
          background: var(--bg-elevated);
          border-color: var(--border-color);
          border-radius: 8px;
          box-shadow: var(--shadow-lg);
        }

        .fc .fc-popover-header {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }
      `}</style>
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
