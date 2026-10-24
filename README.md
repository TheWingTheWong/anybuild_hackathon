# AnyBuild

Describe a robot → Claude designs it in 3D → the browser trains it in 1,024 physics simulations → approve → parts list with live prices, build guide and firmware.

```sh
pnpm install
cp .env.example .env   # add ANTHROPIC_API_KEY
pnpm dev               # http://localhost:5173
```

Team workflow, lanes and timeline: [plan.md](plan.md). Agent rules: [AGENTS.md](AGENTS.md).
