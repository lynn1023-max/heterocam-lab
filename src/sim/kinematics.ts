import type { Agent, EventKind as EventKindT, SubjectState, Vec3 } from './types'
import { EventKind, KIND_META, PlatformKind, WORLD, insidePitch } from './types'
import { footballSubject } from './football'

export const TAU = Math.PI * 2

export function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

export function wrapPi(a: number) {
  let x = a
  while (x > Math.PI) x -= TAU
  while (x < -Math.PI) x += TAU
  return x
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

export function dist2(a: Vec3, b: Vec3) {
  const dx = a[0] - b[0]
  const dz = a[2] - b[2]
  return Math.hypot(dx, dz)
}

export function forward(yaw: number): [number, number] {
  return [-Math.sin(yaw), -Math.cos(yaw)]
}

function beamAt(time: number): SubjectState {
  const beam = WORLD.beam
  const period = 9.2
  const t = ((time % period) + period) % period
  const u = t / period
  const goingPos = u < 0.5
  const local = goingPos ? u * 2 : (u - 0.5) * 2
  const eased = local * local * (3 - 2 * local)
  const x = goingPos
    ? -beam.halfX + eased * beam.halfX * 2
    : beam.halfX - eased * beam.halfX * 2
  let pose: SubjectState['pose'] = 'walk'
  let hop = 0
  if (local > 0.36 && local < 0.48) pose = 'pose'
  if (local > 0.56 && local < 0.74) {
    pose = 'leap'
    hop = Math.sin(((local - 0.56) / 0.18) * Math.PI) * 0.46
  }
  const yaw = goingPos ? -Math.PI / 2 : Math.PI / 2
  return {
    position: [x, beam.height + hop, beam.z],
    yaw,
    phase: time * 8.2,
    pose,
    ball: [x, -2, beam.z],
  }
}

export function subjectAt(time: number, event: EventKindT = EventKind.Beam): SubjectState {
  return event === EventKind.Football ? footballSubject(time) : beamAt(time)
}

export function sidelineAnchor(agent: Agent, followX: number): Vec3 {
  const { halfX, halfZ } = WORLD.pitch
  const x = clamp(followX, -halfX + 0.8, halfX - 0.8)
  const main = agent.position[2] >= 0
  if (agent.kind === PlatformKind.Uav) {
    const side = agent.position[0] >= 0 ? 1 : -1
    return [side * (halfX + 1.45), 5.6, clamp(x * 0.12, -halfZ + 1.2, halfZ - 1.2)]
  }
  const z = main ? halfZ + 0.95 : Math.min(WORLD.rail.z + 0.2, -halfZ - 0.9)
  return [x, 0, z]
}

export function confineOffPitch(pos: Vec3, radius: number): Vec3 {
  if (!insidePitch(pos[0], pos[2], radius + 0.12)) return pos
  const { halfX, halfZ } = WORLD.pitch
  const dx = halfX + radius + 0.2 - Math.abs(pos[0])
  const dz = halfZ + radius + 0.2 - Math.abs(pos[2])
  if (dz <= dx) {
    const z = (pos[2] >= 0 ? 1 : -1) * (halfZ + radius + 0.2)
    return [pos[0], pos[1], z]
  }
  const x = (pos[0] >= 0 ? 1 : -1) * (halfX + radius + 0.2)
  return [x, pos[1], pos[2]]
}

export function subjectAim(subject: SubjectState): Vec3 {
  return [subject.position[0], subject.position[1] + 1.12, subject.position[2]]
}

export type Limits = {
  pan: [number, number]
  tilt: [number, number]
  zoom: [number, number]
  speed: number
  yawRate: number
  radius: number
  height: [number, number]
}

export const LIMITS: Record<PlatformKind, Limits> = {
  ptz: {
    pan: [-Math.PI, Math.PI],
    tilt: [-1.05, 0.55],
    zoom: [1, 4.2],
    speed: 0,
    yawRate: 0,
    radius: 0.22,
    height: [0, 0],
  },
  rail: {
    pan: [-Math.PI, Math.PI],
    tilt: [-1.35, 0.2],
    zoom: [1, 3.6],
    speed: 2.4,
    yawRate: 0,
    radius: 0.3,
    height: [WORLD.rail.y, WORLD.rail.y],
  },
  rover: {
    pan: [-2.7, 2.7],
    tilt: [-0.72, 0.55],
    zoom: [1, 3.1],
    speed: 2.15,
    yawRate: 1.85,
    radius: 0.55,
    height: [0, 0],
  },
  quadruped: {
    pan: [-0.85, 0.85],
    tilt: [-0.5, 0.62],
    zoom: [1, 2.4],
    speed: 2.7,
    yawRate: 2.4,
    radius: 0.42,
    height: [0, 0],
  },
  uav: {
    pan: [-Math.PI, Math.PI],
    tilt: [-1.4, 0.25],
    zoom: [1, 2.8],
    speed: 3.4,
    yawRate: 1.7,
    radius: 0.38,
    height: [1.4, 7.2],
  },
}

export type CameraPose = {
  position: Vec3
  yaw: number
  pitch: number
  fovY: number
}

export function cameraPose(agent: Agent): CameraPose {
  const [x, y, z] = agent.position
  const [fx, fz] = forward(agent.yaw)
  const fovY = agent.fovY / agent.zoom
  switch (agent.kind) {
    case PlatformKind.Ptz:
      return {
        position: [x, y + 1.38, z],
        yaw: agent.yaw + agent.pan,
        pitch: agent.tilt,
        fovY,
      }
    case PlatformKind.Rail:
      return {
        position: [x, WORLD.rail.y - 0.22, WORLD.rail.z],
        yaw: agent.yaw + agent.pan,
        pitch: agent.tilt,
        fovY,
      }
    case PlatformKind.Rover:
      return {
        position: [x, 1.3, z],
        yaw: agent.yaw + agent.pan,
        pitch: agent.tilt,
        fovY,
      }
    case PlatformKind.Quadruped:
      return {
        position: [x + fx * 0.34, 0.64 + Math.sin(agent.bodyPitch) * 0.04, z + fz * 0.34],
        yaw: agent.yaw + agent.pan,
        pitch: agent.tilt + agent.bodyPitch * 0.45,
        fovY,
      }
    case PlatformKind.Uav:
      return {
        position: [x, y - 0.2, z],
        yaw: agent.yaw + agent.pan,
        pitch: agent.tilt,
        fovY,
      }
  }
}

export function lookAtPanTilt(
  camPos: Vec3,
  target: Vec3,
  bodyYaw: number,
): { pan: number; tilt: number } {
  const dx = target[0] - camPos[0]
  const dy = target[1] - camPos[1]
  const dz = target[2] - camPos[2]
  const worldYaw = Math.atan2(-dx, -dz)
  const horiz = Math.hypot(dx, dz)
  const elev = Math.atan2(dy, horiz)
  return { pan: wrapPi(worldYaw - bodyYaw), tilt: elev }
}

export function pointInFront(pose: CameraPose, p: Vec3, aspect = 16 / 9, near = 0.15, far = 32) {
  const dx = p[0] - pose.position[0]
  const dy = p[1] - pose.position[1]
  const dz = p[2] - pose.position[2]
  const cy = Math.cos(pose.yaw)
  const sy = Math.sin(pose.yaw)
  const lx = cy * dx - sy * dz
  const lz = sy * dx + cy * dz
  const cp = Math.cos(pose.pitch)
  const sp = Math.sin(pose.pitch)
  const camX = lx
  const camY = cp * dy + sp * lz
  const camZ = -sp * dy + cp * lz
  if (camZ > -near || camZ < -far) return false
  const halfH = Math.tan((pose.fovY * Math.PI) / 360) * -camZ
  const halfW = halfH * aspect
  return Math.abs(camX) <= halfW && Math.abs(camY) <= halfH
}

export function makeAgent(kind: PlatformKind, index: number, occupied: Agent[]): Agent {
  const n = occupied.filter((a) => a.kind === kind).length
  const id = `${kind}-${Date.now().toString(36)}-${n}`
  const name = `${KIND_META[kind].short}-${String(n + 1).padStart(2, '0')}`
  const slot = occupied.length
  const seeds: Record<PlatformKind, Partial<Agent>> = {
    ptz: {
      position: slot % 2 === 0 ? [-6.1, 0, 3.35] : [6.2, 0, 3.1],
      yaw: slot % 2 === 0 ? 0.45 : -0.4,
      fovY: 38,
      resolution: [1920, 1080],
      orbitRadius: 0,
      tilt: 0.08,
    },
    rail: {
      position: [0, 0, WORLD.rail.z],
      yaw: Math.PI,
      fovY: 42,
      resolution: [3840, 2160],
      tilt: -0.55,
      orbitRadius: 0,
    },
    rover: {
      position: [3.8 + n * 1.2, 0, 4.8],
      yaw: 0.2,
      fovY: 48,
      resolution: [1920, 1080],
      orbitRadius: 4.4,
      orbitOffset: 0.4,
    },
    quadruped: {
      position: [-3.6 - n * 1.1, 0, 4.6],
      yaw: -0.15,
      fovY: 55,
      resolution: [1280, 720],
      orbitRadius: 3.2,
      orbitOffset: 2.1,
    },
    uav: {
      position: [-1.2, 3.4, 6.4],
      yaw: 0.1,
      fovY: 62,
      resolution: [1920, 1080],
      tilt: -0.48,
      orbitRadius: 5.2,
      orbitOffset: 3.4,
    },
  }
  return {
    id,
    name,
    kind,
    position: [0, 0, 0],
    yaw: 0,
    pan: 0,
    tilt: 0.05,
    zoom: 1,
    bodyPitch: 0,
    fovY: 50,
    resolution: [1920, 1080],
    color: KIND_META[kind].color,
    mode: 'track',
    orbitRadius: 4,
    orbitOffset: index * 1.05,
    battery: 92 - n * 4,
    ...seeds[kind],
  }
}

export function defaultCluster(event: EventKindT = EventKind.Beam): Agent[] {
  const empty: Agent[] = []
  const cluster: Agent[] = [
    { ...makeAgent(PlatformKind.Ptz, 0, empty), name: 'PTZ-L', mode: 'track', position: [-6.05, 0, 3.4], yaw: 0.52 },
  ]
  cluster.push({
    ...makeAgent(PlatformKind.Ptz, 1, cluster),
    name: 'PTZ-R',
    mode: 'track',
    position: [6.15, 0, 3.15],
    yaw: -0.48,
  })
  cluster.push({
    ...makeAgent(PlatformKind.Rail, 2, cluster),
    name: 'RAIL-1',
    mode: 'track',
    position: [1.8, 0, WORLD.rail.z],
    yaw: Math.PI,
    tilt: -0.55,
  })
  cluster.push({
    ...makeAgent(PlatformKind.Rover, 3, cluster),
    name: 'ROVER-1',
    mode: 'patrol',
    position: [4.05, 0, 4.85],
  })
  cluster.push({
    ...makeAgent(PlatformKind.Quadruped, 4, cluster),
    name: 'DOG-1',
    mode: 'manual',
    position: [-3.55, 0, 4.55],
  })
  cluster.push({
    ...makeAgent(PlatformKind.Uav, 5, cluster),
    name: 'UAV-1',
    mode: 'patrol',
    position: [-1.4, 3.35, 6.55],
    tilt: -0.48,
  })
  if (event === EventKind.Football) {
    const { halfX, halfZ } = WORLD.pitch
    cluster[0] = {
      ...cluster[0],
      name: 'PTZ-L',
      position: [-halfX - 0.55, 0, halfZ + 0.7],
      yaw: 0.15,
      mode: 'track',
    }
    cluster[1] = {
      ...cluster[1],
      name: 'PTZ-R',
      position: [halfX + 0.55, 0, halfZ + 0.7],
      yaw: -0.15,
      mode: 'track',
    }
    cluster[2] = { ...cluster[2], position: [0, 0, WORLD.rail.z], yaw: Math.PI, tilt: -0.62 }
    cluster[3] = {
      ...cluster[3],
      name: 'ROVER-1',
      position: [5.4, 0, halfZ + 0.95],
      yaw: Math.PI,
      mode: 'patrol',
      orbitRadius: 0,
    }
    cluster[4] = {
      ...cluster[4],
      name: 'DOG-1',
      position: [-5.4, 0, halfZ + 0.95],
      yaw: Math.PI,
      mode: 'manual',
      orbitRadius: 0,
    }
    cluster[5] = {
      ...cluster[5],
      name: 'UAV-1',
      position: [halfX + 1.45, 5.6, 2.4],
      yaw: Math.PI / 2,
      tilt: -0.62,
      mode: 'patrol',
      orbitRadius: 0,
    }
  }
  return cluster
}

export function spawnOffPitch(kind: PlatformKind, n: number): Partial<Agent> {
  const { halfX, halfZ } = WORLD.pitch
  const x = ((n % 5) - 2) * 2.1
  if (kind === PlatformKind.Rail) return { position: [0, 0, WORLD.rail.z], yaw: Math.PI }
  if (kind === PlatformKind.Ptz) {
    const left = n % 2 === 0
    return {
      position: [left ? -halfX - 0.55 : halfX + 0.55, 0, n < 2 ? halfZ + 0.7 : -halfZ - 0.55],
      yaw: left ? 0.2 : -0.2,
    }
  }
  if (kind === PlatformKind.Uav) {
    return { position: [(n % 2 === 0 ? 1 : -1) * (halfX + 1.45), 5.6, 2.4], yaw: Math.PI, tilt: -0.7 }
  }
  return { position: [x, 0, halfZ + 0.95], yaw: Math.PI }
}

export function focalPx(agent: Agent) {
  const [, h] = agent.resolution
  const fy = h / 2 / Math.tan(((agent.fovY / agent.zoom) * Math.PI) / 360)
  return fy
}
