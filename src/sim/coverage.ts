import { cameraPose, dist2, pointInFront, subjectAim } from './kinematics'
import type { AABB, Agent, Metrics, SubjectState, Vec3 } from './types'

function slabRay(from: Vec3, to: Vec3, box: AABB) {
  const dx = to[0] - from[0]
  const dy = to[1] - from[1]
  const dz = to[2] - from[2]
  let tmin = 0
  let tmax = 1
  const axes: Array<[number, number, number, number]> = [
    [from[0], dx, box.min[0], box.max[0]],
    [from[1], dy, box.min[1], box.max[1]],
    [from[2], dz, box.min[2], box.max[2]],
  ]
  for (const [o, d, mn, mx] of axes) {
    if (Math.abs(d) < 1e-8) {
      if (o < mn || o > mx) return false
      continue
    }
    let t1 = (mn - o) / d
    let t2 = (mx - o) / d
    if (t1 > t2) {
      const tmp = t1
      t1 = t2
      t2 = tmp
    }
    tmin = Math.max(tmin, t1)
    tmax = Math.min(tmax, t2)
    if (tmin > tmax) return false
  }
  return tmax > 0 && tmin < 1 && tmin > 0.02
}

export function occluded(from: Vec3, to: Vec3, boxes: AABB[]) {
  return boxes.some((b) => slabRay(from, to, b))
}

export function seesSubject(agent: Agent, subject: SubjectState, boxes: AABB[]) {
  const pose = cameraPose(agent)
  const chest = subjectAim(subject)
  if (!pointInFront(pose, chest)) return false
  return !occluded(pose.position, chest, boxes)
}

export function circleHits(pos: Vec3, radius: number, boxes: AABB[], half: number) {
  if (Math.abs(pos[0]) > half - radius || Math.abs(pos[2]) > half - radius) return true
  for (const b of boxes) {
    if (b.min[1] > 2.2) continue
    const cx = clampRange(pos[0], b.min[0], b.max[0])
    const cz = clampRange(pos[2], b.min[2], b.max[2])
    const dx = pos[0] - cx
    const dz = pos[2] - cz
    if (dx * dx + dz * dz < radius * radius) return true
  }
  return false
}

function clampRange(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

export function evaluateMetrics(agents: Agent[], subject: SubjectState, boxes: AABB[]): Metrics {
  const visibleIds = agents.filter((a) => seesSubject(a, subject, boxes)).map((a) => a.id)
  const vis = agents.filter((a) => visibleIds.includes(a.id))
  const baselines: number[] = []
  for (let i = 0; i < vis.length; i++) {
    for (let j = i + 1; j < vis.length; j++) {
      const pa = cameraPose(vis[i]).position
      const pb = cameraPose(vis[j]).position
      baselines.push(Math.hypot(pa[0] - pb[0], pa[1] - pb[1], pa[2] - pb[2]))
    }
  }
  let triangulation = 0
  if (vis.length >= 2) {
    const target = subjectAim(subject)
    const scores: number[] = []
    for (let i = 0; i < vis.length; i++) {
      for (let j = i + 1; j < vis.length; j++) {
        const a = cameraPose(vis[i]).position
        const b = cameraPose(vis[j]).position
        const va = [target[0] - a[0], target[1] - a[1], target[2] - a[2]] as Vec3
        const vb = [target[0] - b[0], target[1] - b[1], target[2] - b[2]] as Vec3
        const na = Math.hypot(...va) || 1
        const nb = Math.hypot(...vb) || 1
        const cos = clampRange((va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]) / (na * nb), -1, 1)
        const ang = Math.acos(cos)
        const ideal = 1 - Math.abs(ang - Math.PI / 3) / (Math.PI / 2)
        scores.push(clampRange(ideal, 0, 1))
      }
    }
    triangulation = scores.reduce((s, v) => s + v, 0) / scores.length
  }

  const gsdCm: Record<string, number> = {}
  for (const a of agents) {
    const pose = cameraPose(a)
    const depth = dist2(pose.position, subject.position)
    const fov = (pose.fovY * Math.PI) / 180
    const heightM = 2 * Math.tan(fov / 2) * Math.max(depth, 0.4)
    gsdCm[a.id] = (heightM / a.resolution[1]) * 100
  }

  const coverageRatio = sampleCoverage(agents, boxes)

  return {
    visibleIds,
    coverageRatio,
    meanBaseline: baselines.length ? baselines.reduce((s, v) => s + v, 0) / baselines.length : 0,
    minBaseline: baselines.length ? Math.min(...baselines) : 0,
    triangulation,
    gsdCm,
  }
}

export function sampleCoverage(agents: Agent[], boxes: AABB[], res = 28) {
  const size = 10
  let hit = 0
  let total = 0
  for (let j = 0; j < res; j++) {
    for (let i = 0; i < res; i++) {
      const x = -size / 2 + (i / (res - 1)) * size
      const z = -size / 2 + (j / (res - 1)) * size
      const p: Vec3 = [x, 0.08, z]
      if (occluded([x, 4, z], p, boxes) && Math.abs(z + 8) < 1) continue
      total += 1
      const n = agents.reduce((acc, a) => acc + (pointInFront(cameraPose(a), p) ? 1 : 0), 0)
      if (n > 0) hit += 1
    }
  }
  return total ? hit / total : 0
}

export function heatmapData(agents: Agent[], res = 40) {
  const size = 16
  const data = new Uint8Array(res * res * 4)
  for (let j = 0; j < res; j++) {
    for (let i = 0; i < res; i++) {
      const x = -size / 2 + (i / (res - 1)) * size
      const z = -size / 2 + (j / (res - 1)) * size
      let n = 0
      const p: Vec3 = [x, 0.06, z]
      for (const a of agents) {
        if (pointInFront(cameraPose(a), p, 16 / 9, 0.2, 22)) n += 1
      }
      const t = Math.min(n / 4, 1)
      const k = (j * res + i) * 4
      data[k] = Math.round(20 + t * 40 + (t > 0.5 ? (t - 0.5) * 280 : 0))
      data[k + 1] = Math.round(40 + t * 180)
      data[k + 2] = Math.round(70 + (1 - t) * 80 + t * 40)
      data[k + 3] = Math.round(t === 0 ? 0 : 55 + t * 120)
    }
  }
  return { data, res, size }
}
