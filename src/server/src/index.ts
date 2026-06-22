import { serve } from "bun";
import { createDb } from "./db/client";
import { createApp, resolveDatabasePath } from "./app";

const dbPath = resolveDatabasePath();
const db = createDb(dbPath);
const app = createApp(db);

const port = Number(process.env.PORT) || 3000;

console.log(`API listening on http://localhost:${port} (db: ${dbPath})`);

serve({
  fetch: app.fetch,
  port,
});
