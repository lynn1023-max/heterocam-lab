import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useSim } from '../sim/store'
import { agentCameras } from './Platforms'

const FEED_W = 320
const FEED_H = 180

export function Feeds() {
  const ids = useSim((s) => s.agentIds)
  const fbos = useMemo(() => new Map<string, THREE.WebGLRenderTarget>(), [])

  ids.forEach((id) => {
    if (!fbos.has(id)) {
      const rt = new THREE.WebGLRenderTarget(FEED_W, FEED_H, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
      })
      rt.texture.colorSpace = THREE.SRGBColorSpace
      fbos.set(id, rt)
    }
  })

  return (
    <>
      <FeedCapture fbos={fbos} />
      <FeedStrip ids={ids} fbos={fbos} />
    </>
  )
}

function FeedCapture({ fbos }: { fbos: Map<string, THREE.WebGLRenderTarget> }) {
  const { gl, scene } = useThree()
  useFrame(() => {
    const prev = gl.getRenderTarget()
    try {
      const ids = useSim.getState().agentIds
      for (const id of ids) {
        const cam = agentCameras.get(id)
        const fbo = fbos.get(id)
        if (!cam || !fbo) continue
        gl.setRenderTarget(fbo)
        gl.render(scene, cam)
      }
    } finally {
      gl.setRenderTarget(prev)
    }
  }, -1)
  return null
}

function FeedStrip({
  ids,
  fbos,
}: {
  ids: string[]
  fbos: Map<string, THREE.WebGLRenderTarget>
}) {
  const group = useRef<THREE.Group>(null)
  const { camera, size } = useThree()

  useFrame(() => {
    if (!group.current) return
    group.current.position.copy(camera.position)
    group.current.quaternion.copy(camera.quaternion)
  })

  const n = Math.max(ids.length, 1)
  const aspect = size.width / Math.max(size.height, 1)
  const dist = 1.15
  const fov = 'fov' in camera ? (camera.fov * Math.PI) / 180 : 0.73
  const h = 2 * Math.tan(fov / 2) * dist
  const w = h * aspect
  const tileH = h * 0.2
  const tileW = (w * 0.94) / n
  const y = -h * 0.5 + tileH * 0.62 + 0.02

  return (
    <group
      ref={group}
      onUpdate={(g) => {
        g.traverse((o) => o.layers.set(2))
      }}
    >
      {ids.map((id, i) => (
        <FeedTile
          key={id}
          id={id}
          fbo={fbos.get(id)}
          position={[-w / 2 + (i + 0.5) * (w / n), y, -dist]}
          size={[tileW * 0.93, tileH]}
        />
      ))}
    </group>
  )
}

function FeedTile({
  id,
  fbo,
  position,
  size,
}: {
  id: string
  fbo?: THREE.WebGLRenderTarget
  position: [number, number, number]
  size: [number, number]
}) {
  const mat = useRef<THREE.MeshBasicMaterial>(null)
  useFrame(() => {
    if (mat.current && fbo) mat.current.map = fbo.texture
  })
  return (
    <mesh
      position={position}
      onClick={(e) => {
        e.stopPropagation()
        useSim.getState().select(id)
      }}
    >
      <planeGeometry args={size} />
      <meshBasicMaterial ref={mat} toneMapped={false} />
    </mesh>
  )
}
