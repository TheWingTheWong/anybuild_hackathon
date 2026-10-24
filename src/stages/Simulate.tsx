// Lane B: 3D viewer + training (src/viewer, src/sim). Calls onApprove(result) when the user approves.
import type { RobotSpec, TrainResult } from "../../shared/spec";
export default function Simulate({ spec, onApprove }: { spec: RobotSpec; onApprove: (r: TrainResult) => void }) {
  return <div><pre>{spec.name}</pre><button onClick={() => onApprove({ gait: { freqHz: 1, joints: [] }, fitness: 0, rollouts: 0, distanceM: 0, robustness: 0 })}>Approve</button></div>;
}
