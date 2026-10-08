import type { SubjectState, Vec3 } from './types'
import { WORLD } from './types'

export type MatchRole = 'gk' | 'field' | 'ref'
export type MatchTeam = 'home' | 'away' | 'ref'

export type MatchPlayer = {
  team: MatchTeam
  role: MatchRole
  position: Vec3
  yaw: number
  phase: number
  pose: SubjectState['pose']
}

export type MatchState = {
  players: MatchPlayer[]
  ball: Vec3
  carrier: number
}

const PERIOD = 16.5

const HOME_SLOTS: Array<[number, number]> = [
  [-0.9, 0],
  [-0.64, 0.78],
  [-0.7, 0.28],
  [-0.7, -0.28],
  [-0.64, -0.78],
  [-0.32, 0.5],
  [-0.24, 0],
  [-0.32, -0.5],
  [0.14, 0.62],
  [0.26, 0.04],
  [0.14, -0.58],
]

const PHASES: Array<{ t0: number; t1: number; idx: number; pose: SubjectState['pose'] }> = [
  { t0: 0, t1: 0.13, idx: 0, pose: 'walk' },
  { t0: 0.13, t1: 0.3, idx: 4, pose: 'dribble' },
  { t0: 0.3, t1: 0.48, idx: 6, pose: 'dribble' },
  { t0: 0.48, t1: 0.66, idx: 8, pose: 'dribble' },
  { t0: 0.66, t1: 0.84, idx: 9, pose: 'dribble' },
  { t0: 0.84, t1: 1, idx: 9, pose: 'kick' },
]

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function ease(t: number) {
  return t * t * (3 - 2 * t)
}

function facing(from: Vec3, to: Vec3) {
  return Math.atan2(-(to[0] - from[0]), -(to[2] - from[2]))
}

function slotWorld(slot: [number, number], attackSign: number): Vec3 {
  const { halfX, halfZ } = WORLD.pitch
  return [slot[0] * attackSign * halfX, 0, slot[1] * halfZ]
}

function pullToward(base: Vec3, ball: Vec3, amount: number, zPad: number): Vec3 {
  const { halfZ } = WORLD.pitch
  return [
    lerp(base[0], ball[0], amount),
    0,
    clamp(lerp(base[2], ball[2], amount), -halfZ + zPad, halfZ - zPad),
  ]
}

function phaseAt(u: number) {
  for (const p of PHASES) {
    if (u < p.t1 || p.t1 === 1) return p
  }
  return PHASES[PHASES.length - 1]
}

export function matchAt(time: number): MatchState {
  const { halfX, halfZ } = WORLD.pitch
  const t = ((time % PERIOD) + PERIOD) % PERIOD
  const u = t / PERIOD
  const phase = phaseAt(u)
  const fromPhase = PHASES.filter((p) => p.t1 <= u).pop() ?? PHASES[0]

  const homeBase = HOME_SLOTS.map((s) => slotWorld(s, 1))
  const awayBase = HOME_SLOTS.map((s) => slotWorld(s, -1))

  const passBlend = 0.045
  const local = (u - phase.t0) / Math.max(phase.t1 - phase.t0, 1e-4)
  const handing =
    u > phase.t0 && u < phase.t0 + passBlend && phase.idx !== fromPhase.idx ? (u - phase.t0) / passBlend : 0

  const carrierIdx = phase.idx
  const prevIdx = handing > 0 ? fromPhase.idx : carrierIdx
  const c0 = homeBase[prevIdx]
  const c1 = homeBase[carrierIdx]

  let ball: Vec3
  const kicking = phase.pose === 'kick'
  if (kicking) {
    const k = ease(local)
    ball = [lerp(c1[0] + 0.45, halfX - 0.25, k), 0.12 + Math.sin(k * Math.PI) * 1.55, lerp(c1[2], 0.08, k)]
  } else if (handing > 0) {
    const h = ease(handing)
    ball = [lerp(c0[0], c1[0], h), 0.12 + Math.sin(h * Math.PI) * 0.55, lerp(c0[2], c1[2], h)]
  } else {
    const ahead = 0.42 + 0.12 * Math.sin(time * 7)
    const yawGuess = facing(c1, homeBase[Math.min(carrierIdx + 1, 9)] ?? c1)
    ball = [c1[0] - Math.sin(yawGuess) * ahead, 0.12, c1[2] - Math.cos(yawGuess) * ahead]
  }

  const players: MatchPlayer[] = []

  for (let i = 0; i < 11; i++) {
    const isGk = i === 0
    const isCarrier = i === carrierIdx
    const amount = isGk ? 0.03 : isCarrier ? 0.0 : 0.11
    let pos = isGk
      ? ([homeBase[0][0], 0, clamp(ball[2] * 0.28, -1.15, 1.15)] as Vec3)
      : pullToward(homeBase[i], ball, amount, 0.55)
    if (isCarrier && !kicking) pos = [c1[0], 0, c1[2]]
    pos = [
      pos[0] + 0.05 * Math.sin(time * 1.3 + i * 0.7),
      0,
      pos[2] + 0.04 * Math.cos(time * 1.1 + i),
    ]
    const look = kicking && isCarrier ? ([halfX, 0, 0] as Vec3) : ball
    players.push({
      team: 'home',
      role: isGk ? 'gk' : 'field',
      position: pos,
      yaw: facing(pos, look),
      phase: time * 9.5 + i,
      pose: isCarrier ? phase.pose : 'walk',
    })
  }

  for (let i = 0; i < 11; i++) {
    const isGk = i === 0
    const amount = isGk ? 0.05 : 0.18
    let pos = isGk
      ? ([awayBase[0][0], 0, clamp(ball[2] * 0.42, -1.2, 1.2)] as Vec3)
      : pullToward(awayBase[i], ball, amount, 0.5)
    if (kicking && isGk) pos = [awayBase[0][0], 0, clamp(ball[2], -1.05, 1.05)]
    pos = [
      pos[0] + 0.04 * Math.sin(time * 1.2 + i + 2),
      0,
      pos[2] + 0.035 * Math.cos(time * 1.05 + i),
    ]
    players.push({
      team: 'away',
      role: isGk ? 'gk' : 'field',
      position: pos,
      yaw: facing(pos, ball),
      phase: time * 9.2 + i + 4,
      pose: kicking && isGk ? 'pose' : 'walk',
    })
  }

  const refPos: Vec3 = [
    clamp(ball[0] - 2.4, -halfX + 1.2, halfX - 1.2),
    0,
    clamp(ball[2] + 1.1, -halfZ + 0.8, halfZ - 0.8),
  ]
  players.push({
    team: 'ref',
    role: 'ref',
    position: refPos,
    yaw: facing(refPos, ball),
    phase: time * 8,
    pose: 'walk',
  })
  const ar1: Vec3 = [clamp(ball[0], -halfX + 0.4, halfX - 0.4), 0, halfZ]
  const ar2: Vec3 = [clamp(-ball[0] * 0.15 + awayBase[2][0], -halfX + 0.4, halfX - 0.4), 0, -halfZ]
  players.push({
    team: 'ref',
    role: 'ref',
    position: ar1,
    yaw: -Math.PI / 2,
    phase: time * 7.2,
    pose: 'walk',
  })
  players.push({
    team: 'ref',
    role: 'ref',
    position: ar2,
    yaw: Math.PI / 2,
    phase: time * 7.4,
    pose: 'walk',
  })
  const fourth: Vec3 = [0.4, 0, halfZ + 0.55]
  players.push({
    team: 'ref',
    role: 'ref',
    position: fourth,
    yaw: Math.PI,
    phase: 0,
    pose: 'pose',
  })

  return { players, ball, carrier: carrierIdx }
}

export function footballSubject(time: number): SubjectState {
  const match = matchAt(time)
  const carrier = match.players[match.carrier]
  return {
    position: [...carrier.position] as Vec3,
    yaw: carrier.yaw,
    phase: carrier.phase,
    pose: carrier.pose,
    ball: match.ball,
  }
}
