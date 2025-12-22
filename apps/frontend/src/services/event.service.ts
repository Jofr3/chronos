import type { Event, CreateEventRequest } from "@chronos/types";
import { getApiBaseUrl } from "~/config/env";

// Helper to get auth token from cookie
function getAuthToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/chronos_auth_token=([^;]+)/);
  return match ? match[1] : null;
}

export async function getEvents(
  startDate?: string,
  endDate?: string
): Promise<Event[]> {
  const token = getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const apiUrl = getApiBaseUrl();
  let url = `${apiUrl}/api/events`;
  
  const params = new URLSearchParams();
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);
  
  if (params.toString()) {
    url += `?${params.toString()}`;
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch events: ${response.statusText}`);
  }

  const result = await response.json();
  return result.data || [];
}

export async function createEvent(
  eventData: CreateEventRequest
): Promise<Event> {
  const token = getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const apiUrl = getApiBaseUrl();
  const response = await fetch(`${apiUrl}/api/events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(eventData),
  });

  if (!response.ok) {
    throw new Error(`Failed to create event: ${response.statusText}`);
  }

  const result = await response.json();
  return result.data;
}

export async function deleteEvent(eventId: string): Promise<void> {
  const token = getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const apiUrl = getApiBaseUrl();
  const response = await fetch(`${apiUrl}/api/events/${eventId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to delete event: ${response.statusText}`);
  }
}
