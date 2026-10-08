import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import * as THREE from 'three'
import { cameraPose } from '../sim/kinematics'
import { useSim } from '../sim/store'
import { KIND_META, PlatformKind, WORLD } from '../sim/types'

export const agentCameras = new Map<string, THREE.PerspectiveCamera>()

export function Platforms() {
  const ids = useSim((s) => s.agentIds)
  return (
    <group>
      {ids.map((id) => (
        <Platform key={id} id={id} />
      ))}
    </group>
  )
}

function Platform({ id }: { id: string }) {
  const kind = useSim((s) => s.agents.find((a) => a.id === id)?.kind ?? 'rover')
  const root = useRef<THREE.Group>(null)
  const cam = useRef<THREE.PerspectiveCamera>(null)

  useEffect(() => {
    const c = cam.current
    if (c) agentCameras.set(id, c)
    return () => {
      agentCameras.delete(id)
    }
  }, [id])

  useFrame(({ clock }) => {
    const agent = useSim.getState().agents.find((a) => a.id === id)
    if (!agent || !root.current) return
    root.current.position.set(agent.position[0], agent.position[1], agent.position[2])
    root.current.rotation.y = agent.yaw
    const pose = cameraPose(agent)
    if (cam.current) {
      cam.current.fov = pose.fovY
      cam.current.near = 0.12
      cam.current.far = 30
      cam.current.aspect = 16 / 9
      cam.current.position.set(pose.position[0], pose.position[1], pose.position[2])
      cam.current.rotation.order = 'YXZ'
      cam.current.rotation.set(pose.pitch, pose.yaw, 0)
      cam.current.updateProjectionMatrix()
      cam.current.updateMatrixWorld()
    }
    const dog = root.current.getObjectByName('gait')
    if (dog && agent.kind === PlatformKind.Quadruped) {
      dog.children.forEach((leg, i) => {
        const phase = clock.elapsedTime * 9 + (i % 2 === 0 ? 0 : Math.PI)
        leg.position.y = 0.22 + Math.max(0, Math.sin(phase)) * 0.07
        leg.rotation.x = Math.cos(phase) * 0.35
      })
    }
    const rotors = root.current.getObjectByName('rotors')
    if (rotors) rotors.children.forEach((r) => (r.rotation.y = clock.elapsedTime * 28))
  })

  return (
    <group>
      <perspectiveCamera ref={cam} />
      <group
        ref={root}
        onClick={(e) => {
          e.stopPropagation()
          useSim.getState().select(id)
        }}
      >
        {kind === PlatformKind.Ptz && <PtzModel />}
        {kind === PlatformKind.Rail && <RailModel />}
        {kind === PlatformKind.Rover && <RoverModel />}
        {kind === PlatformKind.Quadruped && <DogModel />}
        {kind === PlatformKind.Uav && <UavModel />}
        <Nameplate id={id} />
      </group>
    </group>
  )
}

function Nameplate({ id }: { id: string }) {
  const name = useSim((s) => s.agents.find((a) => a.id === id)?.name ?? '')
  const kind = useSim((s) => s.agents.find((a) => a.id === id)?.kind ?? 'rover')
  const selected = useSim((s) => s.selectedId === id)
  const y =
    kind === PlatformKind.Uav
      ? 0.45
      : kind === PlatformKind.Rail
        ? WORLD.rail.y + 0.35
        : kind === PlatformKind.Ptz
          ? 1.7
          : 1.55
  return (
    <Billboard position={[0, y, 0]}>
      <Text
        fontSize={selected ? 0.22 : 0.16}
        color={KIND_META[kind].color}
        outlineWidth={0.012}
        outlineColor="#070a0e"
        anchorX="center"
        anchorY="bottom"
      >
        {name}
      </Text>
    </Billboard>
  )
}

function Lens({ color }: { color: string }) {
  return (
    <group position={[0, 0, -0.12]}>
      <mesh rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.07, 0.08, 0.16, 16]} />
        <meshStandardMaterial color="#15181c" metalness={0.4} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0, -0.09]} rotation-x={Math.PI / 2}>
        <circleGeometry args={[0.055, 20]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.45} />
      </mesh>
    </group>
  )
}

function PtzModel() {
  return (
    <group>
      {[ -0.22, 0.22 ].map((x) =>
        [-0.18, 0.18].map((z) => (
          <mesh key={`${x}${z}`} position={[x * 0.9, 0.55, z]} rotation-z={x > 0 ? -0.35 : 0.35} rotation-x={z > 0 ? 0.28 : -0.28}>
            <cylinderGeometry args={[0.025, 0.03, 1.25, 6]} />
            <meshStandardMaterial color="#8b9098" metalness={0.5} roughness={0.4} />
          </mesh>
        )),
      )}
      <mesh position={[0, 0.95, 0]}>
        <cylinderGeometry args={[0.07, 0.09, 0.7, 10]} />
        <meshStandardMaterial color="#2a3038" />
      </mesh>
      <mesh position={[0, 1.32, 0]}>
        <boxGeometry args={[0.22, 0.12, 0.22]} />
        <meshStandardMaterial color="#3a414c" />
      </mesh>
      <group position={[0, 1.38, 0]}>
        <Lens color={KIND_META.ptz.color} />
      </group>
    </group>
  )
}

function RailModel() {
  return (
    <group position={[0, WORLD.rail.y - 0.05, 0]}>
      <mesh>
        <boxGeometry args={[0.42, 0.12, 0.28]} />
        <meshStandardMaterial color="#d0d5dc" metalness={0.45} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.22, 0]}>
        <boxGeometry args={[0.16, 0.28, 0.12]} />
        <meshStandardMaterial color="#2c323b" />
      </mesh>
      <group position={[0, -0.42, 0]} rotation-x={0.55}>
        <Lens color={KIND_META.rail.color} />
      </group>
    </group>
  )
}

function RoverModel() {
  return (
    <group>
      <mesh position={[0, 0.22, 0]} castShadow>
        <boxGeometry args={[0.78, 0.2, 1.05]} />
        <meshStandardMaterial color="#3b2a1f" roughness={0.7} />
      </mesh>
      {[ -0.32, 0.32 ].map((x) =>
        [-0.34, 0.34].map((z) => (
          <mesh key={`${x}${z}`} position={[x, 0.14, z]} rotation-z={Math.PI / 2} castShadow>
            <cylinderGeometry args={[0.13, 0.13, 0.08, 12]} />
            <meshStandardMaterial color="#1a1d22" />
          </mesh>
        )),
      )}
      <mesh position={[0, 0.78, 0]}>
        <cylinderGeometry args={[0.045, 0.05, 1.05, 8]} />
        <meshStandardMaterial color="#8d949e" metalness={0.5} roughness={0.35} />
      </mesh>
      <group position={[0, 1.3, 0]}>
        <mesh>
          <boxGeometry args={[0.2, 0.1, 0.16]} />
          <meshStandardMaterial color="#2a3038" />
        </mesh>
        <Lens color={KIND_META.rover.color} />
      </group>
    </group>
  )
}

function DogModel() {
  const legs = useMemo(
    () => [
      [0.14, 0.22, 0.22],
      [-0.14, 0.22, 0.22],
      [0.14, 0.22, -0.22],
      [-0.14, 0.22, -0.22],
    ],
    [],
  )
  return (
    <group>
      <mesh position={[0, 0.42, 0]} castShadow>
        <boxGeometry args={[0.32, 0.16, 0.58]} />
        <meshStandardMaterial color="#1d2624" roughness={0.55} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.5, 0.18]}>
        <boxGeometry args={[0.22, 0.08, 0.2]} />
        <meshStandardMaterial color={KIND_META.quadruped.color} metalness={0.3} roughness={0.4} />
      </mesh>
      <group name="gait">
        {legs.map((p, i) => (
          <group key={i} position={[p[0], p[1], p[2]]}>
            <mesh position={[0, -0.12, 0]}>
              <boxGeometry args={[0.05, 0.28, 0.05]} />
              <meshStandardMaterial color="#0f1413" />
            </mesh>
          </group>
        ))}
      </group>
      <group position={[0, 0.58, 0.36]}>
        <mesh>
          <boxGeometry args={[0.16, 0.12, 0.16]} />
          <meshStandardMaterial color="#24302e" />
        </mesh>
        <group rotation-x={-0.15}>
          <Lens color={KIND_META.quadruped.color} />
        </group>
      </group>
    </group>
  )
}

function UavModel() {
  const arms: Array<[number, number]> = [
    [0.28, 0.28],
    [0.28, -0.28],
    [-0.28, 0.28],
    [-0.28, -0.28],
  ]
  return (
    <group>
      <mesh castShadow>
        <boxGeometry args={[0.28, 0.1, 0.28]} />
        <meshStandardMaterial color="#1b2430" metalness={0.35} roughness={0.4} />
      </mesh>
      {arms.map(([x, z], i) => (
        <mesh key={i} position={[x * 0.55, 0, z * 0.55]} rotation-y={Math.atan2(x, z)}>
          <boxGeometry args={[0.04, 0.03, 0.42]} />
          <meshStandardMaterial color="#8ea0b5" metalness={0.45} roughness={0.35} />
        </mesh>
      ))}
      <group name="rotors">
        {arms.map(([x, z], i) => (
          <mesh key={i} position={[x, 0.06, z]}>
            <cylinderGeometry args={[0.16, 0.16, 0.02, 16]} />
            <meshStandardMaterial color="#9ecbff" transparent opacity={0.35} />
          </mesh>
        ))}
      </group>
      <group position={[0, -0.16, 0]}>
        <Lens color={KIND_META.uav.color} />
      </group>
    </group>
  )
}

