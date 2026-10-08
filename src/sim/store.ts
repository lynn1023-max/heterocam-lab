import { create } from 'zustand'
import { circleHits, evaluateMetrics } from './coverage'
import {
  LIMITS,
  cameraPose,
  clamp,
  defaultCluster,
  forward,
  lookAtPanTilt,
  makeAgent,
  sidelineAnchor,
  spawnOffPitch,
  subjectAim,
  subjectAt,
  wrapPi,
} from './kinematics'
import { EventKind, PlatformKind, WORLD, insidePitch, obstaclesFor } from './types'
import type { AABB, Agent, EventKind as EventKindT, Metrics, PlatformKind as PlatformKindT, SubjectState, TaskMode, Vec3 } from './types'

type SimState = {
  playing: boolean
  time: number
  event: EventKindT
  agents: Agent[]
  agentIds: string[]
  selectedId: string
  subject: SubjectState
  metrics: Metrics
  keys: Record<string, boolean>
  waypoint: Vec3 | null
  showFrustum: boolean
  showHeatmap: boolean
  showBaseline: boolean
  showHelp: boolean
  tick: (dt: number) => void
  setPlaying: (v: boolean) => void
  togglePlaying: () => void
  setEvent: (event: EventKindT) => void
  select: (id: string) => void
  patchAgent: (id: string, partial: Partial<Agent>) => void
  setMode: (id: string, mode: TaskMode) => void
  addAgent: (kind: PlatformKindT) => void
  removeAgent: (id: string) => void
  setKey: (code: string, down: boolean) => void
  setWaypoint: (p: Vec3 | null) => void
  reset: () => void
  arrangeFormation: () => void
  toggle: (key: 'showFrustum' | 'showHeatmap' | 'showBaseline' | 'showHelp') => void
}

function snapshot(event: EventKindT = EventKind.Beam) {
  const agents = defaultCluster(event)
  const subject = subjectAt(0, event)
  const boxes = obstaclesFor(event)
  return {
    playing: true,
    time: 0,
    event,
    agents,
    agentIds: agents.map((a) => a.id),
    selectedId: agents.find((a) => a.kind === PlatformKind.Quadruped)?.id ?? agents[0].id,
    subject,
    metrics: evaluateMetrics(agents, subject, boxes),
    keys: {} as Record<string, boolean>,
    waypoint: null as Vec3 | null,
    showFrustum: true,
    showHeatmap: false,
    showBaseline: true,
    showHelp: true,
  }
}

function pressed(keys: Record<string, boolean>, ...codes: string[]) {
  return codes.some((c) => keys[c])
}

function applyLook(agent: Agent, subject: SubjectState) {
  const pose = cameraPose(agent)
  const target = subjectAim(subject)
  const look = lookAtPanTilt(pose.position, target, agent.yaw)
  const lim = LIMITS[agent.kind]
  agent.pan = clamp(look.pan, lim.pan[0], lim.pan[1])
  agent.tilt = clamp(look.tilt, lim.tilt[0], lim.tilt[1])
}

function tryMove(agent: Agent, next: Vec3, boxes: AABB[], event: EventKindT) {
  const lim = LIMITS[agent.kind]
  if (circleHits(next, lim.radius, boxes, WORLD.half)) return false
  if (event === EventKind.Football && insidePitch(next[0], next[2], lim.radius + 0.18)) return false
  agent.position = next
  return true
}

function steerToward(
  agent: Agent,
  tx: number,
  tz: number,
  dt: number,
  holonomic: boolean,
  boxes: AABB[],
  event: EventKindT,
) {
  const lim = LIMITS[agent.kind]
  const dx = tx - agent.position[0]
  const dz = tz - agent.position[2]
  const dist = Math.hypot(dx, dz)
  if (dist < 0.18) return
  const wantYaw = Math.atan2(-dx, -dz)
  const err = wrapPi(wantYaw - agent.yaw)
  if (holonomic) {
    agent.yaw = wrapPi(agent.yaw + clamp(err, -lim.yawRate * dt, lim.yawRate * dt))
    const sp = Math.min(lim.speed, dist * 1.6)
    const [fx, fz] = forward(agent.yaw)
    tryMove(agent, [agent.position[0] + fx * sp * dt, agent.position[1], agent.position[2] + fz * sp * dt], boxes, event)
  } else {
    agent.yaw = wrapPi(agent.yaw + clamp(err, -lim.yawRate * dt, lim.yawRate * dt))
    const throttle = Math.cos(err) > 0.2 ? Math.min(lim.speed, dist * 1.4) : 0
    const [fx, fz] = forward(agent.yaw)
    tryMove(agent, [
      agent.position[0] + fx * throttle * dt,
      agent.position[1],
      agent.position[2] + fz * throttle * dt,
    ], boxes, event)
  }
}

function stepAgent(
  agent: Agent,
  dt: number,
  keys: Record<string, boolean>,
  selected: boolean,
  subject: SubjectState,
  waypoint: Vec3 | null,
  playing: boolean,
  boxes: AABB[],
  event: EventKindT,
) {
  const lim = LIMITS[agent.kind]
  const next: Agent = {
    ...agent,
    position: [...agent.position] as Vec3,
  }

  if (playing && next.kind !== PlatformKind.Ptz && next.kind !== PlatformKind.Rail) {
    next.battery = clamp(next.battery - dt * 0.22, 4, 100)
  }

  if (selected) {
    const yawL = pressed(keys, 'KeyA') ? 1 : 0
    const yawR = pressed(keys, 'KeyD') ? 1 : 0
    const fwd = pressed(keys, 'KeyW') ? 1 : 0
    const back = pressed(keys, 'KeyS') ? 1 : 0
    const up = pressed(keys, 'KeyQ') ? 1 : 0
    const down = pressed(keys, 'KeyE') ? 1 : 0
    const panL = pressed(keys, 'ArrowLeft') ? 1 : 0
    const panR = pressed(keys, 'ArrowRight') ? 1 : 0
    const tiltU = pressed(keys, 'ArrowUp') ? 1 : 0
    const tiltD = pressed(keys, 'ArrowDown') ? 1 : 0
    const zoomIn = pressed(keys, 'KeyZ') ? 1 : 0
    const zoomOut = pressed(keys, 'KeyX') ? 1 : 0

    next.pan = clamp(next.pan + (panR - panL) * 1.4 * dt, lim.pan[0], lim.pan[1])
    next.tilt = clamp(next.tilt + (tiltU - tiltD) * 1.1 * dt, lim.tilt[0], lim.tilt[1])
    next.zoom = clamp(next.zoom + (zoomIn - zoomOut) * 1.6 * dt, lim.zoom[0], lim.zoom[1])

    if (next.kind === PlatformKind.Ptz) {
      next.pan = clamp(next.pan + (yawR - yawL) * 1.3 * dt, lim.pan[0], lim.pan[1])
      next.tilt = clamp(next.tilt + (up - down) * 0.9 * dt, lim.tilt[0], lim.tilt[1])
    } else if (next.kind === PlatformKind.Rail) {
      const x = clamp(next.position[0] + (fwd - back) * lim.speed * dt, WORLD.rail.xMin, WORLD.rail.xMax)
      next.position = [x, 0, WORLD.rail.z]
      next.pan = clamp(next.pan + (yawR - yawL) * 1.2 * dt, lim.pan[0], lim.pan[1])
    } else if (next.kind === PlatformKind.Rover) {
      next.yaw = wrapPi(next.yaw + (yawR - yawL) * lim.yawRate * dt)
      const [fx, fz] = forward(next.yaw)
      const v = (fwd - back) * lim.speed
      tryMove(next, [next.position[0] + fx * v * dt, 0, next.position[2] + fz * v * dt], boxes, event)
    } else if (next.kind === PlatformKind.Quadruped) {
      const [fx, fz] = forward(next.yaw)
      const [rx, rz] = [-fz, fx]
      next.yaw = wrapPi(next.yaw + (yawR - yawL) * lim.yawRate * dt)
      const v = (fwd - back) * lim.speed
      const s = (pressed(keys, 'KeyC') ? -1 : 0) + (pressed(keys, 'KeyV') ? 1 : 0)
      tryMove(next, [
        next.position[0] + (fx * v + rx * s * lim.speed * 0.7) * dt,
        0,
        next.position[2] + (fz * v + rz * s * lim.speed * 0.7) * dt,
      ], boxes, event)
      next.bodyPitch = lerpPose(next.bodyPitch, -0.12 * (fwd - back), dt * 6)
    } else if (next.kind === PlatformKind.Uav) {
      next.yaw = wrapPi(next.yaw + (yawR - yawL) * lim.yawRate * dt)
      const [fx, fz] = forward(next.yaw)
      const [rx, rz] = [-fz, fx]
      const v = (fwd - back) * lim.speed
      const strafe = 0
      const y = clamp(next.position[1] + (up - down) * 2.1 * dt, lim.height[0], lim.height[1])
      tryMove(next, [
        next.position[0] + (fx * v + rx * strafe) * dt,
        y,
        next.position[2] + (fz * v + rz * strafe) * dt,
      ], boxes, event)
      next.position[1] = y
    }
  }

  if (playing && next.mode === 'patrol') {
    if (next.kind === PlatformKind.Rail) {
      const x = clamp(subject.position[0] * 1.15, WORLD.rail.xMin, WORLD.rail.xMax)
      next.position[0] = lerpPose(next.position[0], x, dt * 1.8)
    } else if (next.kind !== PlatformKind.Ptz) {
      if (event === EventKind.Football) {
        const anchor = sidelineAnchor(next, subject.position[0])
        steerToward(next, anchor[0], anchor[2], dt, next.kind !== PlatformKind.Rover, boxes, event)
        if (next.kind === PlatformKind.Uav) {
          next.position[1] = lerpPose(next.position[1], anchor[1], dt * 1.2)
        }
      } else {
        const ang = subject.phase * 0.08 + next.orbitOffset
        const tx = subject.position[0] + Math.sin(ang) * next.orbitRadius
        const tz = subject.position[2] + Math.cos(ang) * next.orbitRadius
        steerToward(next, tx, tz, dt, next.kind !== PlatformKind.Rover, boxes, event)
        if (next.kind === PlatformKind.Uav) {
          next.position[1] = lerpPose(next.position[1], 2.9 + 0.45 * Math.sin(ang), dt * 1.4)
        }
      }
    }
  }

  if (playing && waypoint && selected && next.mode === 'manual') {
    if (next.kind === PlatformKind.Rail) {
      next.position[0] = lerpPose(
        next.position[0],
        clamp(waypoint[0], WORLD.rail.xMin, WORLD.rail.xMax),
        dt * 2,
      )
    } else if (next.kind !== PlatformKind.Ptz) {
      const wx = waypoint[0]
      const wz =
        event === EventKind.Football && insidePitch(waypoint[0], waypoint[2], 0.2)
          ? WORLD.pitch.halfZ + 0.95
          : waypoint[2]
      steerToward(next, wx, wz, dt, next.kind !== PlatformKind.Rover, boxes, event)
    }
  }

  if (next.mode !== 'manual') applyLook(next, subject)

  if (!selected) next.bodyPitch = lerpPose(next.bodyPitch, 0, dt * 4)
  return next
}

function lerpPose(a: number, b: number, t: number) {
  return a + (b - a) * Math.min(1, t)
}

export const useSim = create<SimState>((set, get) => ({
  ...snapshot(),
  tick: (dt) => {
    const s = get()
    const time = s.playing ? s.time + dt : s.time
    const subject = s.playing ? subjectAt(time, s.event) : s.subject
    const boxes = obstaclesFor(s.event)
    const wp = s.waypoint
    const arrived =
      wp !== null && s.agents.some((a) => a.id === s.selectedId && dist2d(a.position, wp) < 0.35)
    const waypoint = arrived ? null : s.waypoint
    const agents = s.agents.map((a) =>
      stepAgent(a, dt, s.keys, a.id === s.selectedId, subject, waypoint, s.playing, boxes, s.event),
    )
    const metrics = evaluateMetrics(agents, subject, boxes)
    set({ time, subject, agents, metrics, waypoint })
  },
  setPlaying: (v) => set({ playing: v }),
  togglePlaying: () => set({ playing: !get().playing }),
  setEvent: (event) => {
    const prev = get()
    set({
      ...snapshot(event),
      showFrustum: prev.showFrustum,
      showHeatmap: prev.showHeatmap,
      showBaseline: prev.showBaseline,
      showHelp: prev.showHelp,
    })
  },
  select: (id) => set({ selectedId: id }),
  patchAgent: (id, partial) =>
    set({
      agents: get().agents.map((a) => (a.id === id ? { ...a, ...partial } : a)),
    }),
  setMode: (id, mode) =>
    set({
      agents: get().agents.map((a) => (a.id === id ? { ...a, mode } : a)),
    }),
  addAgent: (kind) => {
    let added = makeAgent(kind, get().agents.length, get().agents)
    if (get().event === EventKind.Football) added = { ...added, ...spawnOffPitch(kind, get().agents.length) }
    const agents = [...get().agents, added]
    set({ agents, agentIds: agents.map((a) => a.id), selectedId: added.id })
  },
  removeAgent: (id) => {
    const agents = get().agents.filter((a) => a.id !== id)
    if (!agents.length) return
    set({
      agents,
      agentIds: agents.map((a) => a.id),
      selectedId: get().selectedId === id ? agents[0].id : get().selectedId,
    })
  },
  setKey: (code, down) => set({ keys: { ...get().keys, [code]: down } }),
  setWaypoint: (p) => {
    if (p && get().event === EventKind.Football && insidePitch(p[0], p[2], 0.25)) {
      const z = p[2] >= 0 ? WORLD.pitch.halfZ + 0.95 : -WORLD.pitch.halfZ - 0.9
      set({ waypoint: [p[0], 0, z] })
      return
    }
    set({ waypoint: p })
  },
  reset: () => set(snapshot(get().event)),
  arrangeFormation: () => {
    const { agents, subject, event } = get()
    const mobiles = agents.filter(
      (a) => a.kind !== PlatformKind.Ptz && a.kind !== PlatformKind.Rail,
    )
    const next = agents.map((a) => {
      const i = mobiles.findIndex((m) => m.id === a.id)
      if (i < 0) return a
      if (event === EventKind.Football) {
        const { halfZ } = WORLD.pitch
        const span = mobiles.length <= 1 ? 0 : (i / (mobiles.length - 1) - 0.5) * 10
        const copy = {
          ...a,
          position: a.kind === PlatformKind.Uav
            ? ([WORLD.pitch.halfX + 1.45, 5.6, span * 0.2] as Vec3)
            : ([span, 0, halfZ + 0.95] as Vec3),
          yaw: Math.PI,
          mode: 'track' as TaskMode,
        }
        applyLook(copy, subject)
        return copy
      }
      const ang = (i / mobiles.length) * Math.PI * 2 + 0.4
      const r = a.kind === PlatformKind.Uav ? 5.1 : a.kind === PlatformKind.Quadruped ? 3.1 : 4.3
      const copy = {
        ...a,
        position: [
          subject.position[0] + Math.sin(ang) * r,
          a.kind === PlatformKind.Uav ? 3.1 : 0,
          subject.position[2] + Math.cos(ang) * r,
        ] as Vec3,
        yaw: wrapPi(Math.atan2(-Math.sin(ang), -Math.cos(ang)) + Math.PI),
        mode: 'track' as TaskMode,
      }
      applyLook(copy, subject)
      return copy
    })
    set({ agents: next, waypoint: null })
  },
  toggle: (key) => set({ [key]: !get()[key] }),
}))

function dist2d(a: Vec3, b: Vec3) {
  return Math.hypot(a[0] - b[0], a[2] - b[2])
}
