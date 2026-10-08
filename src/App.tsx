import { useEffect } from 'react'
import { EVENT_META } from './sim/types'
import { useSim } from './sim/store'
import { World } from './scene/World'
import { Hud, bindKeys } from './ui/Hud'

export default function App() {
  const event = useSim((s) => s.event)
  useEffect(() => bindKeys(), [])
  useEffect(() => {
    document.title = `HeteroCam Lab · ${EVENT_META[event].label}`
  }, [event])
  return (
    <div className="shell">
      <Hud />
      <div className="viewport">
        <World />
      </div>
    </div>
  )
}
