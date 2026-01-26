import type { Event, CreateEventRequest, UpdateEventRequest } from "@chronos/types";
import { getApiBaseUrl } from "~/config/env";
import { getAuthToken } from "~/utils/auth";

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

export async function updateEvent(
  eventId: string,
  updates: UpdateEventRequest
): Promise<Event> {
  const token = getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const apiUrl = getApiBaseUrl();
  const response = await fetch(`${apiUrl}/api/events/${eventId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error(`Failed to update event: ${response.statusText}`);
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
