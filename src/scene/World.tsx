import { useLayoutEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { EventKind } from '../sim/types'
import { useSim } from '../sim/store'
import { Feeds } from './Feeds'
import { Platforms } from './Platforms'
import { Studio } from './Studio'
import { Subject } from './Subject'
import { Viz } from './Viz'

function SimClock() {
  useFrame((_, dt) => {
    useSim.getState().tick(Math.min(dt, 0.05))
  }, -3)
  return null
}

function EventView() {
  const event = useSim((s) => s.event)
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as unknown as
    | { target: { set: (x: number, y: number, z: number) => void }; update?: () => void }
    | undefined
  useLayoutEffect(() => {
    if (event === EventKind.Football) {
      camera.position.set(0.8, 9.4, 16.4)
      controls?.target.set(0, 0.7, 0)
    } else {
      camera.position.set(7.4, 4.8, 9.6)
      controls?.target.set(0, 1.85, 0)
    }
    controls?.update?.()
  }, [event, camera, controls])
  return null
}

function FloorPick() {
  return (
    <mesh
      rotation-x={-Math.PI / 2}
      position={[0, 0.045, 0]}
      onDoubleClick={(e) => {
        e.stopPropagation()
        useSim.getState().setWaypoint([e.point.x, 0, e.point.z])
      }}
    >
      <planeGeometry args={[24, 24]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  )
}

export function World() {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [7.4, 4.8, 9.6], fov: 45, near: 0.1, far: 90 }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.12,
      }}
      onCreated={({ camera }) => {
        camera.layers.enable(1)
        camera.layers.enable(2)
      }}
    >
      <SimClock />
      <Studio />
      <Subject />
      <Platforms />
      <Viz />
      <FloorPick />
      <Feeds />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        maxPolarAngle={Math.PI * 0.48}
        minDistance={4}
        maxDistance={36}
        target={[0, 1.85, 0]}
      />
      <EventView />
    </Canvas>
  )
}
