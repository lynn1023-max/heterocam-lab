import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { heatmapData } from '../sim/coverage'
import { cameraPose } from '../sim/kinematics'
import { useSim } from '../sim/store'

export function Viz() {
  return (
    <group
      onUpdate={(g) => {
        g.traverse((o) => o.layers.set(1))
      }}
    >
      <Frustums />
      <Heatmap />
      <Baselines />
      <Waypoint />
    </group>
  )
}

function Frustums() {
  const ids = useSim((s) => s.agentIds)
  const on = useSim((s) => s.showFrustum)
  if (!on) return null
  return (
    <group>
      {ids.map((id) => (
        <Frustum key={id} id={id} />
      ))}
    </group>
  )
}

function Frustum({ id }: { id: string }) {
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(8 * 3), 3))
    g.setIndex([0, 1, 0, 2, 0, 3, 0, 4, 1, 2, 2, 3, 3, 4, 4, 1])
    return g
  }, [])
  const line = useRef<THREE.LineSegments>(null)

  useFrame(() => {
    const agent = useSim.getState().agents.find((a) => a.id === id)
    if (!agent || !line.current) return
    const selected = useSim.getState().selectedId === id
    const pose = cameraPose(agent)
    const dist = 2.8
    const aspect = 16 / 9
    const h = Math.tan((pose.fovY * Math.PI) / 360) * dist
    const w = h * aspect
    const corners = [
      [0, 0, 0],
      [-w, h, -dist],
      [w, h, -dist],
      [w, -h, -dist],
      [-w, -h, -dist],
    ]
    const eul = new THREE.Euler(pose.pitch, pose.yaw, 0, 'YXZ')
    const q = new THREE.Quaternion().setFromEuler(eul)
    const arr = geom.attributes.position.array as Float32Array
    corners.forEach((c, i) => {
      const v = new THREE.Vector3(...c).applyQuaternion(q)
      arr[i * 3] = pose.position[0] + v.x
      arr[i * 3 + 1] = pose.position[1] + v.y
      arr[i * 3 + 2] = pose.position[2] + v.z
    })
    geom.attributes.position.needsUpdate = true
    const mat = line.current.material as THREE.LineBasicMaterial
    mat.color.set(agent.color)
    mat.opacity = selected ? 0.95 : 0.42
  })

  useEffect(() => {
    geom.computeBoundingSphere()
  }, [geom])

  return (
    <lineSegments ref={line} geometry={geom} frustumCulled={false}>
      <lineBasicMaterial transparent opacity={0.5} />
    </lineSegments>
  )
}

function Heatmap() {
  const on = useSim((s) => s.showHeatmap)
  const tex = useMemo(() => {
    const t = new THREE.DataTexture(new Uint8Array(40 * 40 * 4), 40, 40)
    t.format = THREE.RGBAFormat
    t.minFilter = THREE.LinearFilter
    t.magFilter = THREE.LinearFilter
    t.needsUpdate = true
    return t
  }, [])
  const last = useRef(0)

  useFrame(({ clock }) => {
    if (!on) return
    if (clock.elapsedTime - last.current < 0.28) return
    last.current = clock.elapsedTime
    const { data } = heatmapData(useSim.getState().agents, 40)
    ;(tex.image.data as Uint8Array).set(data)
    tex.needsUpdate = true
  })

  if (!on) return null
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.05, 0]}>
      <planeGeometry args={[16, 16]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} />
    </mesh>
  )
}

function Baselines() {
  const on = useSim((s) => s.showBaseline)
  const geom = useMemo(() => new THREE.BufferGeometry(), [])
  const ref = useRef<THREE.LineSegments>(null)

  useFrame(() => {
    if (!on || !ref.current) return
    const { agents, metrics } = useSim.getState()
    const vis = agents.filter((a) => metrics.visibleIds.includes(a.id))
    const pts: number[] = []
    for (let i = 0; i < vis.length; i++) {
      for (let j = i + 1; j < vis.length; j++) {
        const a = cameraPose(vis[i]).position
        const b = cameraPose(vis[j]).position
        pts.push(a[0], a[1], a[2], b[0], b[1], b[2])
      }
    }
    geom.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
  })

  if (!on) return null
  return (
    <lineSegments ref={ref} geometry={geom} frustumCulled={false}>
      <lineBasicMaterial color="#f3c14a" transparent opacity={0.45} />
    </lineSegments>
  )
}

function Waypoint() {
  const p = useSim((s) => s.waypoint)
  if (!p) return null
  return (
    <mesh position={[p[0], 0.08, p[2]]}>
      <ringGeometry args={[0.22, 0.32, 24]} />
      <meshBasicMaterial color="#6ee0c5" />
    </mesh>
  )
}
