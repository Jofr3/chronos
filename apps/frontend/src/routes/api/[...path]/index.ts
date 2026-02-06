import type { RequestHandler } from "@builder.io/qwik-city";

const BACKEND_URL = "https://chronos-backend.jofrescari.workers.dev";

export const onRequest: RequestHandler = async ({ url, request, send }) => {
  const target = `${BACKEND_URL}${url.pathname}${url.search}`;

  const headers = new Headers(request.headers);
  headers.delete("host");

  const response = await fetch(target, {
    method: request.method,
    headers,
    body:
      request.method !== "GET" && request.method !== "HEAD"
        ? await request.arrayBuffer()
        : undefined,
  });

  send(response);
};
