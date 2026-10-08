import { EVENT_META, EventKind, KIND_META, PlatformKind, TaskMode } from '../sim/types'
import type { Agent, TaskMode as Mode } from '../sim/types'
import { LIMITS, cameraPose, focalPx } from '../sim/kinematics'
import { useSim } from '../sim/store'

export function Hud() {
  return (
    <>
      <Topbar />
      <aside className="dock left-dock">
        <AgentList />
        <AddPanel />
      </aside>
      <aside className="dock right-dock">
        <Inspector />
        <MetricsPanel />
      </aside>
      <FeedCaptions />
      <HelpCard />
    </>
  )
}

function Topbar() {
  const playing = useSim((s) => s.playing)
  const time = useSim((s) => s.time)
  const n = useSim((s) => s.agents.length)
  const vis = useSim((s) => s.metrics.visibleIds.length)
  const pose = useSim((s) => s.subject.pose)
  const event = useSim((s) => s.event)
  const meta = EVENT_META[event]
  const poseLabel = meta.action[pose] ?? pose
  return (
    <header className="topbar">
      <div className="brand">
        <span className="mark" />
        <div>
          <div className="title">HETEROCAM LAB</div>
          <div className="sub">异构摄像集群 · {meta.label}</div>
        </div>
      </div>
      <div className="event-switch">
        {(Object.values(EventKind) as Array<typeof event>).map((kind) => (
          <button
            key={kind}
            type="button"
            className={event === kind ? 'on' : ''}
            onClick={() => useSim.getState().setEvent(kind)}
          >
            {EVENT_META[kind].short}
          </button>
        ))}
      </div>
      <div className="status">
        <span>T {time.toFixed(1)}s</span>
        <span>{n} 机位</span>
        <span className="ok">{event === EventKind.Football ? '11v11' : meta.short} · {poseLabel}</span>
        <span className={vis > 1 ? 'ok' : ''}>{vis} 路可见运动员</span>
      </div>
      <div className="actions">
        <button type="button" onClick={() => useSim.getState().togglePlaying()}>
          {playing ? '暂停' : '播放'}
        </button>
        <button type="button" onClick={() => useSim.getState().arrangeFormation()}>
          {event === EventKind.Football ? '边线布防' : '环绕编队'}
        </button>
        <button type="button" onClick={() => useSim.getState().reset()}>
          重置
        </button>
        <button type="button" onClick={exportPoses}>
          导出外参
        </button>
      </div>
    </header>
  )
}

function AgentList() {
  const ids = useSim((s) => s.agentIds)
  const selected = useSim((s) => s.selectedId)
  const agents = useSim((s) => s.agents)
  const vis = useSim((s) => s.metrics.visibleIds)
  return (
    <section>
      <h3>集群编队</h3>
      <ul className="agent-list">
        {ids.map((id) => {
          const a = agents.find((x) => x.id === id)
          if (!a) return null
          const meta = KIND_META[a.kind]
          return (
            <li key={id}>
              <button
                type="button"
                className={`agent ${selected === id ? 'on' : ''}`}
                onClick={() => useSim.getState().select(id)}
              >
                <i style={{ background: meta.color }} />
                <span className="aname">{a.name}</span>
                <span className="akind">{meta.short}</span>
                <em className={vis.includes(id) ? 'eye on' : 'eye'}>{vis.includes(id) ? 'LOCK' : 'LOST'}</em>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function AddPanel() {
  const kinds = Object.values(PlatformKind)
  const n = useSim((s) => s.agents.length)
  return (
    <section>
      <h3>加入平台</h3>
      <div className="add-grid">
        {kinds.map((k) => (
          <button
            key={k}
            type="button"
            disabled={n >= 8}
            onClick={() => useSim.getState().addAgent(k)}
          >
            {KIND_META[k].short}
          </button>
        ))}
      </div>
      <p className="hint">单击机位选中 · 双击地面设置路点</p>
    </section>
  )
}

function Inspector() {
  const id = useSim((s) => s.selectedId)
  const agent = useSim((s) => s.agents.find((a) => a.id === id))
  if (!agent) return null
  const meta = KIND_META[agent.kind]
  const pose = cameraPose(agent)
  const lim = LIMITS[agent.kind]
  const fy = focalPx(agent)
  const patch = (partial: Partial<Agent>) => useSim.getState().patchAgent(agent.id, partial)
  return (
    <section>
      <h3>选中平台</h3>
      <div className="idline">
        <b style={{ color: meta.color }}>{agent.name}</b>
        <span>{meta.label}</span>
        <button type="button" className="ghost" onClick={() => useSim.getState().removeAgent(agent.id)}>
          移除
        </button>
      </div>
      <p className="hint">{meta.hint}</p>
      <div className="modes">
        {(Object.values(TaskMode) as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            className={agent.mode === m ? 'on' : ''}
            onClick={() => useSim.getState().setMode(agent.id, m)}
          >
            {m === 'manual' ? '手动' : m === 'track' ? '跟踪' : '巡航'}
          </button>
        ))}
      </div>
      <label>
        云台方位 {((agent.pan * 180) / Math.PI).toFixed(0)}°
        <input
          type="range"
          min={lim.pan[0]}
          max={lim.pan[1]}
          step={0.01}
          value={agent.pan}
          onChange={(e) => patch({ pan: Number(e.target.value), mode: 'manual' })}
        />
      </label>
      <label>
        俯仰 {((agent.tilt * 180) / Math.PI).toFixed(0)}°
        <input
          type="range"
          min={lim.tilt[0]}
          max={lim.tilt[1]}
          step={0.01}
          value={agent.tilt}
          onChange={(e) => patch({ tilt: Number(e.target.value), mode: 'manual' })}
        />
      </label>
      <label>
        变焦 {agent.zoom.toFixed(2)}×
        <input
          type="range"
          min={lim.zoom[0]}
          max={lim.zoom[1]}
          step={0.01}
          value={agent.zoom}
          onChange={(e) => patch({ zoom: Number(e.target.value) })}
        />
      </label>
      <dl className="kv">
        <dt>光学中心</dt>
        <dd>{pose.position.map((v) => v.toFixed(2)).join(' , ')} m</dd>
        <dt>有效视场</dt>
        <dd>
          {pose.fovY.toFixed(1)}° {agent.resolution[0]}×{agent.resolution[1]}
        </dd>
        <dt>等效焦距</dt>
        <dd>fy = {fy.toFixed(0)} px</dd>
        <dt>电量</dt>
        <dd>{agent.battery.toFixed(0)}%</dd>
      </dl>
    </section>
  )
}

function MetricsPanel() {
  const m = useSim((s) => s.metrics)
  const id = useSim((s) => s.selectedId)
  const gsd = m.gsdCm[id] ?? 0
  const frustum = useSim((s) => s.showFrustum)
  const heat = useSim((s) => s.showHeatmap)
  const base = useSim((s) => s.showBaseline)
  return (
    <section>
      <h3>多视几何</h3>
      <dl className="kv">
        <dt>运动员覆盖</dt>
        <dd>{m.visibleIds.length} 路同时可见</dd>
        <dt>赛场覆盖率</dt>
        <dd>{(m.coverageRatio * 100).toFixed(0)}%</dd>
        <dt>平均基线</dt>
        <dd>{m.meanBaseline.toFixed(2)} m</dd>
        <dt>最短基线</dt>
        <dd>{m.minBaseline.toFixed(2)} m</dd>
        <dt>三角化质量</dt>
        <dd>{(m.triangulation * 100).toFixed(0)} / 100</dd>
        <dt>选中 GSD</dt>
        <dd>{gsd.toFixed(1)} cm/px</dd>
      </dl>
      <div className="toggles">
        <button type="button" className={frustum ? 'on' : ''} onClick={() => useSim.getState().toggle('showFrustum')}>
          视锥
        </button>
        <button type="button" className={heat ? 'on' : ''} onClick={() => useSim.getState().toggle('showHeatmap')}>
          热力
        </button>
        <button type="button" className={base ? 'on' : ''} onClick={() => useSim.getState().toggle('showBaseline')}>
          基线
        </button>
      </div>
    </section>
  )
}

function FeedCaptions() {
  const agents = useSim((s) => s.agents)
  const vis = useSim((s) => s.metrics.visibleIds)
  return (
    <div className="feed-captions">
      {agents.map((a) => (
        <button key={a.id} type="button" onClick={() => useSim.getState().select(a.id)}>
          <span style={{ color: KIND_META[a.kind].color }}>{a.name}</span>
          <small>{vis.includes(a.id) ? '运动员在框' : '未入画'}</small>
        </button>
      ))}
    </div>
  )
}

function HelpCard() {
  const on = useSim((s) => s.showHelp)
  return (
    <div className={`help ${on ? '' : 'min'}`}>
      <button type="button" className="help-toggle" onClick={() => useSim.getState().toggle('showHelp')}>
        {on ? '收起操作' : '操作说明'}
      </button>
      {on && (
        <ul>
          <li>
            <kbd>W A S D</kbd> 底盘机动 · 轨道机沿轨
          </li>
          <li>
            <kbd>Q E</kbd> 升/降（无人机）
          </li>
          <li>
            <kbd>↑ ↓ ← →</kbd> 云台 · <kbd>Z X</kbd> 变焦
          </li>
          <li>
            <kbd>C V</kbd> 机器狗侧移 · <kbd>空格</kbd> 暂停
          </li>
          <li>任务：手动遥控 / 跟踪运动员 / 覆盖巡航</li>
          <li>足球为 11v11，机位只允许边线外与看台区，禁止进入场内</li>
        </ul>
      )}
    </div>
  )
}

function exportPoses() {
  const s = useSim.getState()
  const payload = {
    time: s.time,
    event: s.event,
    subject: s.subject,
    cameras: s.agents.map((a) => {
      const pose = cameraPose(a)
      const fy = focalPx(a)
      return {
        name: a.name,
        kind: a.kind,
        mode: a.mode,
        T_wc: {
          t: pose.position,
          rpy_yxz: [pose.pitch, pose.yaw, 0],
        },
        K: {
          fx: fy,
          fy,
          cx: a.resolution[0] / 2,
          cy: a.resolution[1] / 2,
          width: a.resolution[0],
          height: a.resolution[1],
          fovY_deg: pose.fovY,
        },
        seesSubject: s.metrics.visibleIds.includes(a.id),
        gsd_cm_per_px: s.metrics.gsdCm[a.id],
      }
    }),
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `heterocam-poses-${s.time.toFixed(1)}s.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function bindKeys() {
  const down = (e: KeyboardEvent) => {
    const s = useSim.getState()
    if (e.code === 'Space') {
      e.preventDefault()
      if (!e.repeat) s.togglePlaying()
      return
    }
    if (!e.repeat) {
      if (e.code === 'KeyF') s.toggle('showFrustum')
      if (e.code === 'KeyG') s.toggle('showHeatmap')
      if (e.code === 'KeyB') s.toggle('showBaseline')
      const digit = e.code.match(/^Digit([1-8])$/)
      if (digit) {
        const idx = Number(digit[1]) - 1
        if (s.agentIds[idx]) s.select(s.agentIds[idx])
      }
    }
    s.setKey(e.code, true)
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) {
      e.preventDefault()
    }
  }
  const up = (e: KeyboardEvent) => useSim.getState().setKey(e.code, false)
  window.addEventListener('keydown', down)
  window.addEventListener('keyup', up)
  return () => {
    window.removeEventListener('keydown', down)
    window.removeEventListener('keyup', up)
  }
}
