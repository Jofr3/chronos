import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./types/env";
import users from "./routes/users";
import auth from "./routes/auth";
import tasks from "./routes/tasks";
import ai from "./routes/ai";
import events from "./routes/events";
import constraints from "./routes/constraints";

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use("/*", cors());

// Routes
app.route("/api/users", users);
app.route("/api/auth", auth);
app.route("/api/tasks", tasks);
app.route("/api/ai", ai);
app.route("/api/events", events);
app.route("/api/constraints", constraints);

export default app;
