// Lane B1 owns this. Lane A2 uses it in the build guide (highlight + exploded). Keep the props stable.
import type { RobotSpec } from "../../shared/spec";

export type Trajectory = { fps: number; frames: Float64Array[] }; // qpos per frame, recorded in a worker

export type ViewerProps = {
  spec: RobotSpec;
  trajectory?: Trajectory; // replay this instead of live sim
  highlight?: string[]; // limb/segment ids to glow (build steps)
  exploded?: boolean; // pull limbs away from the body (build steps)
};

export default function Viewer({ spec }: ViewerProps) {
  return <div style={{ height: 400, display: "grid", placeItems: "center" }}>3D: {spec.name}</div>;
}
