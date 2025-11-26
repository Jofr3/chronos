import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./types/env";
import users from "./routes/users";

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use("/*", cors());

// Health check
app.get("/", (c) => {
  return c.json({
    success: true,
    message: "Chronos API is running",
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.route("/api/users", users);

export default app;
