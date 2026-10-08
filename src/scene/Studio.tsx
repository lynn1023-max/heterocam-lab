import { Grid, Text } from '@react-three/drei'
import { EventKind, WORLD } from '../sim/types'
import { useSim } from '../sim/store'

export function Studio() {
  const event = useSim((s) => s.event)
  return (
    <group>
      <color attach="background" args={['#071018']} />
      <fog attach="fog" args={['#071018', 30, 68]} />
      <hemisphereLight args={['#cfe4f4', '#1a2230', 0.7]} />
      <ambientLight intensity={0.32} />
      <directionalLight position={[6, 14, 4]} intensity={1.35} />
      <spotLight position={[0, 8.2, 0.4]} angle={0.55} penumbra={0.4} intensity={52} color="#fff4dd" />
      <spotLight position={[-3.4, 7.2, 2.2]} angle={0.38} penumbra={0.55} intensity={22} color="#9ad8ff" />
      <spotLight position={[3.4, 7.2, 2.2]} angle={0.38} penumbra={0.55} intensity={18} color="#ffd7a8" />

      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[WORLD.half * 2.2, WORLD.half * 2.2]} />
        <meshStandardMaterial color="#101820" roughness={0.94} />
      </mesh>

      <Grid
        position={[0, 0.04, 0]}
        args={[24, 24]}
        cellSize={0.5}
        cellThickness={0.45}
        cellColor="#1a2c3c"
        sectionSize={4}
        sectionThickness={1}
        sectionColor="#2c4a62"
        fadeDistance={28}
        fadeStrength={1.4}
        infiniteGrid={false}
      />

      {event === EventKind.Football ? <FootballArena /> : <BeamArena />}

      <mesh position={[0, 3.15, WORLD.rail.z - 1.05]}>
        <boxGeometry args={[22, 6.6, 0.18]} />
        <meshStandardMaterial color="#0f1822" roughness={0.9} />
      </mesh>
      <Text key={`${event}-title`} position={[0, 4.55, WORLD.rail.z - 0.92]} fontSize={0.42} color="#e4c98a" anchorX="center">
        {event === EventKind.Football ? 'FOOTBALL' : 'BALANCE BEAM'}
      </Text>
      <Text key={`${event}-sub`} position={[0, 3.95, WORLD.rail.z - 0.92]} fontSize={0.22} color="#8b9aa8" anchorX="center">
        {event === EventKind.Football ? '11 v 11  ·  MATCH PLAY' : "WOMEN'S INDIVIDUAL FINAL"}
      </Text>

      <group position={[0, WORLD.rail.y, WORLD.rail.z]}>
        <mesh>
          <boxGeometry args={[18.2, 0.08, 0.18]} />
          <meshStandardMaterial color="#8d939c" metalness={0.55} roughness={0.35} />
        </mesh>
        <mesh position={[0, 0.16, 0]}>
          <boxGeometry args={[18.2, 0.05, 0.05]} />
          <meshStandardMaterial color="#c5ccd4" metalness={0.7} roughness={0.25} />
        </mesh>
      </group>
    </group>
  )
}

function BeamArena() {
  const beam = WORLD.beam
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.015, 0]} receiveShadow>
        <planeGeometry args={[11, 7.2]} />
        <meshStandardMaterial color="#16324a" roughness={0.86} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.03, 0]} receiveShadow>
        <planeGeometry args={[8.2, 3.1]} />
        <meshStandardMaterial color="#1c6aa8" roughness={0.72} />
      </mesh>
      <BalanceBeam />
      <mesh position={[0, 0.08, 0]} receiveShadow>
        <boxGeometry args={[6.4, 0.1, 1.35]} />
        <meshStandardMaterial color="#d8d4c6" roughness={0.65} />
      </mesh>
      <mesh position={[-beam.halfX - 0.55, 0.12, 0]}>
        <boxGeometry args={[1.1, 0.2, 1.5]} />
        <meshStandardMaterial color="#c43b4a" roughness={0.6} />
      </mesh>
      <mesh position={[beam.halfX + 0.55, 0.12, 0]}>
        <boxGeometry args={[1.1, 0.2, 1.5]} />
        <meshStandardMaterial color="#c43b4a" roughness={0.6} />
      </mesh>
      <JudgesTable />
      <GearCrate position={[6.75, 0, 0.05]} />
      <GearCrate position={[-6.75, 0, 0.05]} />
      <LightStand position={[-4.2, 0, 3.4]} />
      <LightStand position={[4.2, 0, 3.4]} />
    </group>
  )
}

function FootballArena() {
  const { halfX, halfZ, goalW, goalH } = WORLD.pitch
  const w = halfX * 2
  const d = halfZ * 2
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.016, 0]} receiveShadow>
        <planeGeometry args={[w + 1.6, d + 1.4]} />
        <meshStandardMaterial color="#1a5a32" roughness={0.88} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.028, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#237a3e" roughness={0.78} />
      </mesh>
      <LineMark args={[0.08, 0.02, d]} position={[0, 0.04, 0]} />
      <LineMark args={[w, 0.02, 0.08]} position={[0, 0.04, halfZ]} />
      <LineMark args={[w, 0.02, 0.08]} position={[0, 0.04, -halfZ]} />
      <LineMark args={[0.08, 0.02, d]} position={[halfX, 0.04, 0]} />
      <LineMark args={[0.08, 0.02, d]} position={[-halfX, 0.04, 0]} />
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.041, 0]}>
        <ringGeometry args={[1.72, 1.82, 48]} />
        <meshStandardMaterial color="#f2f4f0" />
      </mesh>
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.04, 12]} />
        <meshStandardMaterial color="#f2f4f0" />
      </mesh>
      <PenaltyBox x={halfX - 2.05} />
      <PenaltyBox x={-(halfX - 2.05)} />
      <Goal x={halfX} width={goalW} height={goalH} />
      <Goal x={-halfX} width={goalW} height={goalH} />
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <CornerFlag key={`${sx}${sz}`} position={[sx * (halfX - 0.08), 0, sz * (halfZ - 0.08)]} />
        )),
      )}
      <Bench />
      <LightStand position={[-7.6, 0, 7.15]} />
      <LightStand position={[7.6, 0, 7.15]} />
    </group>
  )
}

function LineMark({
  args,
  position,
}: {
  args: [number, number, number]
  position: [number, number, number]
}) {
  return (
    <mesh position={position}>
      <boxGeometry args={args} />
      <meshStandardMaterial color="#f2f4f0" roughness={0.55} />
    </mesh>
  )
}

function PenaltyBox({ x }: { x: number }) {
  return (
    <group position={[x, 0.04, 0]}>
      <LineMark args={[4.1, 0.02, 0.07]} position={[0, 0, 2.55]} />
      <LineMark args={[4.1, 0.02, 0.07]} position={[0, 0, -2.55]} />
      <LineMark args={[0.07, 0.02, 5.1]} position={[x > 0 ? -2.05 : 2.05, 0, 0]} />
    </group>
  )
}

function Goal({ x, width, height }: { x: number; width: number; height: number }) {
  const inward = x > 0 ? -1 : 1
  return (
    <group position={[x, 0, 0]}>
      {[-width / 2, width / 2].map((z) => (
        <mesh key={z} position={[inward * 0.04, height / 2, z]}>
          <boxGeometry args={[0.08, height, 0.08]} />
          <meshStandardMaterial color="#e8ece8" metalness={0.35} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[inward * 0.04, height, 0]}>
        <boxGeometry args={[0.08, 0.08, width + 0.08]} />
        <meshStandardMaterial color="#e8ece8" metalness={0.35} roughness={0.4} />
      </mesh>
      <mesh position={[inward * 0.55, height / 2, 0]}>
        <boxGeometry args={[1.0, height - 0.08, width]} />
        <meshStandardMaterial color="#c5d4de" transparent opacity={0.18} roughness={0.3} />
      </mesh>
    </group>
  )
}

function CornerFlag({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.02, 0.025, 1.4, 6]} />
        <meshStandardMaterial color="#d8dde3" />
      </mesh>
      <mesh position={[0.08, 1.28, 0]}>
        <boxGeometry args={[0.18, 0.14, 0.02]} />
        <meshStandardMaterial color="#c43b4a" />
      </mesh>
    </group>
  )
}

function Bench() {
  return (
    <group position={[0, 0, 7.55]}>
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[6.4, 0.08, 0.9]} />
        <meshStandardMaterial color="#1e2a36" />
      </mesh>
      {[-2.4, -1.6, -0.8, 0.8, 1.6, 2.4].map((x, i) => (
        <group key={x} position={[x, 0.59, 0]}>
          <mesh position={[0, 0.42, 0]}>
            <capsuleGeometry args={[0.1, 0.22, 4, 8]} />
            <meshStandardMaterial color={i < 3 ? '#f4f1ea' : '#c43b4a'} />
          </mesh>
          <mesh position={[0, 0.7, 0]}>
            <sphereGeometry args={[0.09, 10, 10]} />
            <meshStandardMaterial color="#d2b196" />
          </mesh>
        </group>
      ))}
      <Text position={[0, 1.18, 0.48]} fontSize={0.16} color="#6ee0c5" anchorX="center">
        TECHNICAL AREA
      </Text>
    </group>
  )
}

function BalanceBeam() {
  const { length, height, width } = WORLD.beam
  return (
    <group>
      <mesh position={[0, height - 0.05, 0]} castShadow>
        <boxGeometry args={[length, 0.1, width]} />
        <meshStandardMaterial color="#cfc6b4" roughness={0.55} />
      </mesh>
      <mesh position={[0, height + 0.01, 0]}>
        <boxGeometry args={[length, 0.02, width * 0.85]} />
        <meshStandardMaterial color="#8a1f2b" roughness={0.5} />
      </mesh>
      {[-1.85, 1.85].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, height / 2, 0.16]}>
            <boxGeometry args={[0.12, height, 0.08]} />
            <meshStandardMaterial color="#8d939c" metalness={0.4} roughness={0.4} />
          </mesh>
          <mesh position={[0, height / 2, -0.16]}>
            <boxGeometry args={[0.12, height, 0.08]} />
            <meshStandardMaterial color="#8d939c" metalness={0.4} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.06, 0]}>
            <boxGeometry args={[0.55, 0.1, 0.55]} />
            <meshStandardMaterial color="#2a333d" />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function JudgesTable() {
  return (
    <group position={[0, 0, 5.75]}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[4.6, 0.08, 1.05]} />
        <meshStandardMaterial color="#1e2a36" />
      </mesh>
      <mesh position={[0, 0.26, 0]}>
        <boxGeometry args={[4.4, 0.52, 0.9]} />
        <meshStandardMaterial color="#15202b" />
      </mesh>
      {[-1.4, 0, 1.4].map((x) => (
        <group key={x} position={[x, 0.59, -0.12]}>
          <mesh position={[0, 0.55, 0]}>
            <capsuleGeometry args={[0.1, 0.28, 4, 8]} />
            <meshStandardMaterial color="#3d4c5c" />
          </mesh>
          <mesh position={[0, 0.86, 0]}>
            <sphereGeometry args={[0.09, 10, 10]} />
            <meshStandardMaterial color="#d2b196" />
          </mesh>
        </group>
      ))}
      <Text position={[0, 1.12, 0.52]} fontSize={0.16} color="#6ee0c5" anchorX="center">
        JUDGES
      </Text>
    </group>
  )
}

function GearCrate({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={[position[0], 0.55, position[2]]} castShadow>
      <boxGeometry args={[1.15, 1.1, 2.3]} />
      <meshStandardMaterial color="#2a333d" roughness={0.8} />
    </mesh>
  )
}

function LightStand({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.45, 0]}>
        <cylinderGeometry args={[0.04, 0.05, 2.9, 8]} />
        <meshStandardMaterial color="#9aa3ad" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, 2.92, 0.1]} rotation-x={0.35}>
        <boxGeometry args={[0.42, 0.16, 0.26]} />
        <meshStandardMaterial color="#d7c09a" emissive="#ffd7a0" emissiveIntensity={0.6} />
      </mesh>
    </group>
  )
}
