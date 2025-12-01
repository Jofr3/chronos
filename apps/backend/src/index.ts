import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./types/env";
import users from "./routes/users";
import auth from "./routes/auth";

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use("/*", cors());

// Routes
app.route("/api/users", users);
app.route("/api/auth", auth);

export default app;
