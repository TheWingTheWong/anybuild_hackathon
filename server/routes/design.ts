// Lane A1: POST /api/design { prompt } -> RobotSpec (Claude structured output). See plan.md.
import { Hono } from "hono";
import quadruped from "../../shared/fixtures/quadruped.json";

const design = new Hono();
design.post("/", (c) => c.json(quadruped)); // stub until A1 lands
export default design;
