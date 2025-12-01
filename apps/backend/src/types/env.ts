import type { D1 } from "@chronos/types/database";

export interface Env {
  DB: D1;
  JWT_SECRET: string;
}
