// Integration shell. Each stage is owned by one lane; keep this file tiny so nobody conflicts here.
import { useState } from "react";
import type { RobotSpec, TrainResult } from "../shared/spec";
import Describe from "./stages/Describe";
import Simulate from "./stages/Simulate";
import Build from "./stages/Build";

export default function App() {
  const [spec, setSpec] = useState<RobotSpec | null>(null);
  const [result, setResult] = useState<TrainResult | null>(null);
  if (!spec) return <Describe onSpec={setSpec} />;
  if (!result) return <Simulate spec={spec} onApprove={setResult} />;
  return <Build spec={spec} result={result} />;
}
