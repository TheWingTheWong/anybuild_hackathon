// Lane A2: POST /api/build -> BOM, step-by-step guide (drives 3D highlight), wiring, firmware download
import type { RobotSpec, TrainResult } from "../../shared/spec";
export default function Build({ spec, result }: { spec: RobotSpec; result: TrainResult }) {
  return <pre>{JSON.stringify({ spec: spec.name, fitness: result.fitness })}</pre>;
}
