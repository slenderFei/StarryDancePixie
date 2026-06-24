import React, { lazy, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'

const Scene3D = lazy(() => import('./Scene3D'))

function GameCanvas({ hidden }) {
  return (
    <div className={`canvas-container ${hidden ? 'canvas-container--hidden' : ''}`}>
      <Canvas
        camera={{ position: [0, 0, 10], fov: 60 }}
        dpr={[1, 1.45]}
        performance={{ min: 0.65 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <Suspense fallback={null}>
          <Scene3D />
        </Suspense>
      </Canvas>
    </div>
  )
}

export default GameCanvas
