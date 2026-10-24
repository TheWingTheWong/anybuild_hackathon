// Lane A2: POST /api/build { spec, train } -> BuildPlan (BOM with live prices, steps, wiring). See plan.md.
import { Hono } from "hono";

const build = new Hono();
build.post("/", (c) => c.json({ bom: [], steps: [], wiring: [] })); // stub until A2 lands
export default build;
