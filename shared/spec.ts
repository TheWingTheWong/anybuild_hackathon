// THE CONTRACT. Both lanes build against these types. Change only together, on main.
import { z } from "zod";

// --- What Claude designs (lane A produces, lane B consumes) -----------------

export const Axis = z.enum(["pitch", "yaw", "roll"]);

export const Segment = z.object({
  id: z.string().describe("unique joint id, e.g. 'fl_hip'"),
  lengthM: z.number().describe("segment length in meters, 0.02-0.15"),
  axis: Axis,
  rangeDeg: z.tuple([z.number(), z.number()]).describe("joint limits, e.g. [-60, 60]"),
  servo: z.string().describe("catalog id of the servo driving this joint"),
});

export const Limb = z.object({
  id: z.string(),
  mount: z.object({ x: z.number(), y: z.number(), z: z.number() }).describe("attach point on body, meters, body-centered"),
  segments: z.array(Segment),
});

export const RobotSpec = z.object({
  name: z.string(),
  summary: z.string().describe("one sentence, what it is and does"),
  template: z.enum(["quadruped", "hexapod", "biped"]),
  task: z.object({
    goal: z.enum(["walk_forward", "turn_in_place", "climb_step"]),
    notes: z.string(),
  }),
  body: z.object({
    lengthM: z.number(),
    widthM: z.number(),
    heightM: z.number(),
    material: z.enum(["cardboard", "foamboard", "3d_print", "acrylic"]),
  }),
  limbs: z.array(Limb),
  electronics: z.object({
    controller: z.string().describe("catalog id"),
    servoDriver: z.string().nullable().describe("catalog id, needed when more than 6 servos"),
    battery: z.string().describe("catalog id"),
    regulator: z.string().nullable(),
    sensors: z.array(z.string()),
  }),
});
export type RobotSpec = z.infer<typeof RobotSpec>;

// --- What training produces (lane B produces, lane A consumes for firmware) --

// Open-loop gait: angle_i(t) = offset_i + amp_i * sin(2*pi*freqHz*t + phase_i)
export type JointGait = { jointId: string; ampDeg: number; phaseRad: number; offsetDeg: number };
export type GaitParams = { freqHz: number; joints: JointGait[] };

export type TrainProgress = {
  generation: number;
  rolloutsDone: number;
  bestFitness: number;
  meanFitness: number;
  best: GaitParams;
};

export type TrainResult = {
  gait: GaitParams;
  fitness: number;
  rollouts: number;
  distanceM: number; // forward distance in 10 s, best gait, nominal physics
  robustness: number; // share of randomized-physics trials that stayed upright, 0-1
};

// --- What the build step produces (lane A) ----------------------------------

export const BomLine = z.object({
  catalogId: z.string(),
  name: z.string(),
  qty: z.number(),
  unitPriceUsd: z.number().nullable(),
  url: z.string().nullable(),
  vendor: z.string().nullable(),
});

export const BuildStep = z.object({
  n: z.number(),
  title: z.string(),
  body: z.string(),
  highlight: z.array(z.string()).describe("limb/segment ids or catalog ids to highlight in 3D"),
  tools: z.array(z.string()),
  minutes: z.number(),
});

export const BuildPlan = z.object({
  bom: z.array(BomLine),
  steps: z.array(BuildStep),
  wiring: z.array(z.object({ from: z.string(), to: z.string(), note: z.string() })),
});
export type BuildPlan = z.infer<typeof BuildPlan>;
