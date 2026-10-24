# Rules for AI agents in this repo

Read `plan.md` first. It's the source of truth: lanes, the contract, timeline and fallbacks.

1. **Stay in your lane.** Your lane is in your worktree folder name (`simforge-a1` → lane A1). Only edit the files plan.md §4 assigns to it. If you need a change elsewhere, stop and tell your human.
2. **The contract is frozen**: `shared/**`, `src/viewer/Viewer.tsx` props, `src/App.tsx`, `server/index.ts`, `package.json` and the lockfile. Don't edit them, and don't add dependencies. Ask your human.
3. **Build against fixtures.** `shared/fixtures/quadruped.json` is a valid `RobotSpec`. Don't wait for another lane.
4. **One numbered task at a time** from your lane's section of plan.md. When it works, run `pnpm typecheck`, commit with a plain message, and say what to click to see it.
5. **Claude API:** `@anthropic-ai/sdk` directly (no AI SDK), model `claude-opus-5-5`, structured outputs via `zodOutputFormat` from `@anthropic-ai/sdk/helpers/zod`, web search tool `web_search_20260209`. No `temperature`, no prefill, no forced `tool_choice`. The key only lives on the server (`.env`).
6. **Don't rabbit-hole.** If something has failed for 10 minutes, use the fallback in plan.md §8 and tell your human.
7. Use your worktree's ports from `.env` (`WEB_PORT`, `API_PORT`). Never kill other dev servers.
