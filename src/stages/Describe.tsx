// Lane A1: prompt box -> POST /api/design -> onSpec(spec)
import type { RobotSpec } from "../../shared/spec";
export default function Describe({ onSpec }: { onSpec: (s: RobotSpec) => void }) {
  return <button onClick={async () => onSpec(await (await fetch("/api/design", { method: "POST" })).json())}>Design</button>;
}
