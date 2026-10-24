import { serve } from "@hono/node-server";
import { Hono } from "hono";
import design from "./routes/design";
import build from "./routes/build";

const app = new Hono().basePath("/api");
app.get("/health", (c) => c.json({ ok: true }));
app.route("/design", design); // lane A1
app.route("/build", build); // lane A2

const port = Number(process.env.API_PORT ?? 8787);
serve({ fetch: app.fetch, port });
console.log(`api on :${port}`);
