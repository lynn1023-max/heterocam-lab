export const PlatformKind = {
  Ptz: 'ptz',
  Rail: 'rail',
  Rover: 'rover',
  Quadruped: 'quadruped',
  Uav: 'uav',
} as const

export type PlatformKind = (typeof PlatformKind)[keyof typeof PlatformKind]

export const TaskMode = {
  Manual: 'manual',
  Track: 'track',
  Patrol: 'patrol',
} as const

export type TaskMode = (typeof TaskMode)[keyof typeof TaskMode]

export type Vec3 = [number, number, number]

export type AABB = {
  min: Vec3
  max: Vec3
}

export type Agent = {
  id: string
  name: string
  kind: PlatformKind
  position: Vec3
  yaw: number
  pan: number
  tilt: number
  zoom: number
  bodyPitch: number
  fovY: number
  resolution: [number, number]
  color: string
  mode: TaskMode
  orbitRadius: number
  orbitOffset: number
  battery: number
}

export const EventKind = {
  Beam: 'beam',
  Football: 'football',
} as const

export type EventKind = (typeof EventKind)[keyof typeof EventKind]

export type SubjectPose = 'walk' | 'pose' | 'leap' | 'dribble' | 'kick'

export type SubjectState = {
  position: Vec3
  yaw: number
  phase: number
  pose: SubjectPose
  ball: Vec3
}

export const EVENT_META: Record<EventKind, { label: string; short: string; action: Record<string, string> }> = {
  beam: {
    label: '平衡木赛事转播',
    short: '平衡木',
    action: { walk: '走木', pose: '造型', leap: '跳跃' },
  },
  football: {
    label: '十一人制足球转播',
    short: '足球',
    action: { walk: '开球', dribble: '组织进攻', kick: '射门', pose: '门将扑救' },
  },
}

export type Metrics = {
  visibleIds: string[]
  coverageRatio: number
  meanBaseline: number
  minBaseline: number
  triangulation: number
  gsdCm: Record<string, number>
}

export const KIND_META: Record<
  PlatformKind,
  { label: string; short: string; color: string; hint: string }
> = {
  ptz: {
    label: '固定云台',
    short: 'PTZ',
    color: '#e4c98a',
    hint: '无移动自由度，仅 pan / tilt / zoom',
  },
  rail: {
    label: '滑轨机位',
    short: 'RAIL',
    color: '#c5cdd8',
    hint: '沿吊装轨道一维滑动 + 云台',
  },
  rover: {
    label: '拍摄机器人',
    short: 'ROVER',
    color: '#f0a36b',
    hint: '非完整约束轮式底盘 + 桅杆云台',
  },
  quadruped: {
    label: '拍摄机器狗',
    short: 'DOG',
    color: '#6ee0c5',
    hint: '近完整约束地面机动 + 头部相机',
  },
  uav: {
    label: '航拍无人机',
    short: 'UAV',
    color: '#7eb6ff',
    hint: '三维飞行 + 三轴云台',
  },
}

export const WORLD = {
  half: 12,
  rail: { y: 4.18, z: -6.45, xMin: -8.6, xMax: 8.6 },
  beam: { length: 5.0, height: 1.25, width: 0.14, z: 0, halfX: 2.45 },
  pitch: { halfX: 8.6, halfZ: 5.5, goalW: 2.4, goalH: 2.0 },
}

const WALL: AABB = { min: [-11.2, 0, -8.4], max: [11.2, 6.5, -7.55] }

export const BEAM_OBSTACLES: AABB[] = [
  { min: [-2.4, 0, 5.15], max: [2.4, 1.05, 6.45] },
  { min: [6.1, 0, -1.2], max: [7.4, 1.15, 1.3] },
  { min: [-7.4, 0, -1.2], max: [-6.1, 1.15, 1.3] },
  WALL,
]

export const FOOTBALL_OBSTACLES: AABB[] = [
  { min: [8.45, 0, -1.35], max: [8.95, 2.05, -1.15] },
  { min: [8.45, 0, 1.15], max: [8.95, 2.05, 1.35] },
  { min: [-8.95, 0, -1.35], max: [-8.45, 2.05, -1.15] },
  { min: [-8.95, 0, 1.15], max: [-8.45, 2.05, 1.35] },
  { min: [-3.4, 0, 7.0], max: [3.4, 1.1, 8.15] },
  WALL,
]

export function insidePitch(x: number, z: number, pad = 0) {
  return Math.abs(x) < WORLD.pitch.halfX + pad && Math.abs(z) < WORLD.pitch.halfZ + pad
}

export function obstaclesFor(event: EventKind): AABB[] {
  return event === EventKind.Football ? FOOTBALL_OBSTACLES : BEAM_OBSTACLES
}
