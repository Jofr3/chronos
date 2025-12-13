import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: "./.wrangler/state/v3/d1/miniflare-D1DatabaseObject/9d6c711ee867741ac70b2433ff786535ee0523fe57d2d00f8a7b8b4bd9317549.sqlite",
  },
} satisfies Config;
