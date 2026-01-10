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
    <div class="calendar-container">
      {/* Header */}
      <div class="calendar-header">
        <button
          onClick$={handleAISchedule}
          disabled={isScheduling.value}
          class="calendar-ai-schedule-btn"
        >
          {isScheduling.value ? "Scheduling..." : "🤖 AI Schedule Tasks"}
        </button>
      </div>

      {/* Schedule Message */}
      {scheduleMessage.value && (
        <div
          class={`calendar-schedule-message ${
            scheduleMessage.value.includes("success") ? "success" : "error"
          }`}
        >
          {scheduleMessage.value}
        </div>
      )}

      {/* Calendar Container */}
      <div class="calendar-wrapper">
        <div ref={calendarRef} id="calendar" />
      </div>
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
