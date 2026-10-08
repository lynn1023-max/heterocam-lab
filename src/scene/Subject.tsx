import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group, Mesh } from 'three'
import { EventKind } from '../sim/types'
import { matchAt } from '../sim/football'
import type { MatchPlayer } from '../sim/football'
import { useSim } from '../sim/store'

export function Subject() {
  const event = useSim((s) => s.event)
  if (event === EventKind.Football) return <FootballMatch />
  return <Athlete kit="beam" />
}

function FootballMatch() {
  return (
    <group>
      <Squad />
      <Ball />
    </group>
  )
}

function Squad() {
  const root = useRef<Group>(null)
  const seed = matchAt(0).players
  useFrame(() => {
    const g = root.current
    if (!g) return
    const match = matchAt(useSim.getState().time)
    for (let i = 0; i < match.players.length; i++) {
      const child = g.children[i]
      const p = match.players[i]
      if (!child) continue
      child.position.set(p.position[0], p.position[1], p.position[2])
      child.rotation.y = p.yaw
      child.position.y = 0.02 + Math.abs(Math.sin(p.phase)) * (p.pose === 'walk' || p.pose === 'dribble' ? 0.04 : 0)
      const marker = child.getObjectByName('focus')
      if (marker) marker.visible = i === match.carrier
    }
  })
  return (
    <group ref={root}>
      {seed.map((p, i) => (
        <Footballer key={i} player={p} />
      ))}
    </group>
  )
}

function kitColors(player: MatchPlayer) {
  if (player.team === 'ref') return { body: '#1a1c1e', shorts: '#111214', accent: '#f3c14a' }
  if (player.role === 'gk' && player.team === 'home') return { body: '#d6e14a', shorts: '#2a333d', accent: '#f3c14a' }
  if (player.role === 'gk' && player.team === 'away') return { body: '#6ec8e6', shorts: '#1f4d8c', accent: '#f3c14a' }
  if (player.team === 'away') return { body: '#c43b4a', shorts: '#2a1014', accent: '#f3c14a' }
  return { body: '#f4f1ea', shorts: '#1f4d8c', accent: '#f3c14a' }
}

function Footballer({ player }: { player: MatchPlayer }) {
  const kit = kitColors(player)
  const skin = '#e0b89a'
  return (
    <group>
      <mesh position={[0, 1.05, 0]}>
        <capsuleGeometry args={[0.13, 0.34, 4, 8]} />
        <meshStandardMaterial color={kit.body} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.84, 0]}>
        <boxGeometry args={[0.26, 0.2, 0.18]} />
        <meshStandardMaterial color={kit.shorts} />
      </mesh>
      <mesh position={[0, 1.48, 0]}>
        <sphereGeometry args={[0.105, 10, 10]} />
        <meshStandardMaterial color={skin} roughness={0.55} />
      </mesh>
      <mesh name="focus" position={[0, 1.12, 0.1]} visible={false}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color={kit.accent} emissive={kit.accent} emissiveIntensity={0.8} />
      </mesh>
    </group>
  )
}

function Athlete({ kit }: { kit: 'beam' | 'football' }) {
  const root = useRef<Group>(null)
  const lLeg = useRef<Group>(null)
  const rLeg = useRef<Group>(null)
  const lArm = useRef<Group>(null)
  const rArm = useRef<Group>(null)

  useFrame(() => {
    const s = useSim.getState().subject
    if (!root.current) return
    root.current.position.set(s.position[0], s.position[1], s.position[2])
    root.current.rotation.y = s.yaw
    const amp = s.pose === 'dribble' ? 0.48 : s.pose === 'walk' ? 0.32 : 0.04
    const walk = Math.sin(s.phase) * amp
    if (!lLeg.current || !rLeg.current || !lArm.current || !rArm.current) return
    if (s.pose === 'leap') {
      lLeg.current.rotation.set(0.95, 0, 0.08)
      rLeg.current.rotation.set(-0.85, 0, -0.08)
      lArm.current.rotation.set(-1.15, 0, 0.9)
      rArm.current.rotation.set(-0.35, 0, -1.35)
    } else if (s.pose === 'pose') {
      lLeg.current.rotation.set(0.08, 0, 0)
      rLeg.current.rotation.set(-0.05, 0, 0)
      lArm.current.rotation.set(0.15, 0, 1.65)
      rArm.current.rotation.set(0.15, 0, -1.65)
    } else if (s.pose === 'kick') {
      lLeg.current.rotation.set(-1.15, 0, 0)
      rLeg.current.rotation.set(0.42, 0, 0)
      lArm.current.rotation.set(0.55, 0, 0.35)
      rArm.current.rotation.set(-0.85, 0, -0.4)
    } else {
      lLeg.current.rotation.set(walk, 0, 0)
      rLeg.current.rotation.set(-walk, 0, 0)
      lArm.current.rotation.set(-walk * 0.55, 0, 0.18)
      rArm.current.rotation.set(walk * 0.55, 0, -0.18)
    }
  })

  const body = kit === 'football' ? '#f4f1ea' : '#1ec8c0'
  const shorts = kit === 'football' ? '#1f4d8c' : '#1ec8c0'
  const skin = '#e0b89a'
  return (
    <group ref={root}>
      <mesh position={[0, 1.08, 0]} castShadow>
        <capsuleGeometry args={[0.14, 0.36, 6, 12]} />
        <meshStandardMaterial color={body} roughness={0.45} metalness={0.08} />
      </mesh>
      {kit === 'football' && (
        <mesh position={[0, 0.86, 0]}>
          <boxGeometry args={[0.28, 0.22, 0.2]} />
          <meshStandardMaterial color={shorts} />
        </mesh>
      )}
      <mesh position={[0, 1.52, 0]} castShadow>
        <sphereGeometry args={[0.115, 16, 16]} />
        <meshStandardMaterial color={skin} roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.62, -0.02]}>
        <sphereGeometry args={[0.07, 12, 12]} />
        <meshStandardMaterial color="#1a1410" />
      </mesh>
      <mesh position={[0, 1.14, 0.11]}>
        <sphereGeometry args={[0.045, 10, 10]} />
        <meshStandardMaterial color="#f3c14a" emissive="#f3c14a" emissiveIntensity={0.75} />
      </mesh>
      <group ref={lLeg} position={[0.08, 0.7, 0]}>
        <mesh position={[0, -0.26, 0]} castShadow>
          <capsuleGeometry args={[0.045, 0.4, 4, 8]} />
          <meshStandardMaterial color={kit === 'football' ? shorts : skin} />
        </mesh>
      </group>
      <group ref={rLeg} position={[-0.08, 0.7, 0]}>
        <mesh position={[0, -0.26, 0]} castShadow>
          <capsuleGeometry args={[0.045, 0.4, 4, 8]} />
          <meshStandardMaterial color={kit === 'football' ? shorts : skin} />
        </mesh>
      </group>
      <group ref={lArm} position={[0.2, 1.22, 0]}>
        <mesh position={[0, -0.18, 0]} castShadow>
          <capsuleGeometry args={[0.035, 0.3, 4, 8]} />
          <meshStandardMaterial color={skin} />
        </mesh>
      </group>
      <group ref={rArm} position={[-0.2, 1.22, 0]}>
        <mesh position={[0, -0.18, 0]} castShadow>
          <capsuleGeometry args={[0.035, 0.3, 4, 8]} />
          <meshStandardMaterial color={skin} />
        </mesh>
      </group>
    </group>
  )
}

function Ball() {
  const mesh = useRef<Mesh>(null)
  useFrame(() => {
    const b = useSim.getState().subject.ball
    if (!mesh.current) return
    mesh.current.position.set(b[0], b[1], b[2])
    mesh.current.rotation.z += 0.08
  })
  return (
    <mesh ref={mesh}>
      <sphereGeometry args={[0.12, 18, 18]} />
      <meshStandardMaterial color="#f3f5f2" roughness={0.45} />
    </mesh>
  )
}
