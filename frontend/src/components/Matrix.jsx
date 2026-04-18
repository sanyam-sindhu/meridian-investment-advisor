import { useMemo, useState } from 'react'

const W = 560
const H = 380
const PAD = 44

const COLORS = {
  implement: '#15803d',
  consider: '#1e3a5f',
  reject: '#94a3b8',
}

export default function Matrix({ rows }) {
  const [hover, setHover] = useState(null)

  const points = useMemo(() => rows.map((r) => ({
    id: r.client_id,
    name: r.client_name,
    strategy: r.strategy_name,
    decision: r.decision,
    feas: r.feasibility,
    imp: r.impact,
    ret: r.projected_return,
    cost: r.implementation_cost,
  })), [rows])

  const x = (v) => PAD + (v / 100) * (W - PAD * 2)
  const y = (v) => H - PAD - (v / 100) * (H - PAD * 2)

  const midX = x(50)
  const midY = y(50)

  return (
    <div className="matrix-wrap">
      <div className="matrix-legend">
        <span><span className="legend-dot" style={{ background: COLORS.implement }} />Implement</span>
        <span><span className="legend-dot" style={{ background: COLORS.consider }} />Consider</span>
        <span><span className="legend-dot" style={{ background: COLORS.reject }} />Reject</span>
      </div>
      <svg width={W} height={H} style={{ border: '1px solid #e4e4e7', background: '#fff', fontFamily: '-apple-system, sans-serif' }}>
        <rect x={PAD} y={PAD} width={W - PAD * 2} height={H - PAD * 2} fill="#fafafa" stroke="#e4e4e7" />

        <line x1={midX} y1={PAD} x2={midX} y2={H - PAD} stroke="#d4d4d8" strokeDasharray="3 3" />
        <line x1={PAD} y1={midY} x2={W - PAD} y2={midY} stroke="#d4d4d8" strokeDasharray="3 3" />

        <text x={W - PAD - 6} y={PAD + 14} textAnchor="end" fontSize="10" fill="#94a3b8">Quick Wins</text>
        <text x={PAD + 6} y={PAD + 14} textAnchor="start" fontSize="10" fill="#94a3b8">Strategic</text>
        <text x={W - PAD - 6} y={H - PAD - 6} textAnchor="end" fontSize="10" fill="#94a3b8">Fill-ins</text>
        <text x={PAD + 6} y={H - PAD - 6} textAnchor="start" fontSize="10" fill="#94a3b8">Low Priority</text>

        {[0, 25, 50, 75, 100].map((t) => (
          <g key={`xt${t}`}>
            <line x1={x(t)} y1={H - PAD} x2={x(t)} y2={H - PAD + 4} stroke="#94a3b8" />
            <text x={x(t)} y={H - PAD + 16} textAnchor="middle" fontSize="10" fill="#64748b">{t}</text>
          </g>
        ))}
        {[0, 25, 50, 75, 100].map((t) => (
          <g key={`yt${t}`}>
            <line x1={PAD - 4} y1={y(t)} x2={PAD} y2={y(t)} stroke="#94a3b8" />
            <text x={PAD - 8} y={y(t) + 3} textAnchor="end" fontSize="10" fill="#64748b">{t}</text>
          </g>
        ))}

        <text x={W / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="#334155">Feasibility Score</text>
        <text x={12} y={H / 2} textAnchor="middle" fontSize="11" fill="#334155" transform={`rotate(-90 12 ${H / 2})`}>Impact Score</text>

        {points.map((p) => (
          <circle
            key={p.id}
            cx={x(p.feas)}
            cy={y(p.imp)}
            r={5}
            fill={COLORS[p.decision] || '#64748b'}
            stroke="#fff"
            strokeWidth={1}
            style={{ cursor: 'pointer' }}
            onMouseEnter={(e) => setHover({ p, sx: e.clientX, sy: e.clientY })}
            onMouseMove={(e) => setHover({ p, sx: e.clientX, sy: e.clientY })}
            onMouseLeave={() => setHover(null)}
          />
        ))}
      </svg>

      {hover && (
        <div style={{
          position: 'fixed',
          left: hover.sx + 12,
          top: hover.sy + 12,
          background: '#0f172a',
          color: '#fff',
          padding: '8px 10px',
          fontSize: 12,
          fontFamily: '-apple-system, sans-serif',
          pointerEvents: 'none',
          zIndex: 1000,
          maxWidth: 240,
        }}>
          <div style={{ fontWeight: 600 }}>{hover.p.name}</div>
          <div style={{ opacity: 0.8 }}>{hover.p.strategy}</div>
          <div style={{ marginTop: 4 }}>Feasibility {hover.p.feas} · Impact {hover.p.imp}</div>
          <div>Projected return {hover.p.ret}%</div>
        </div>
      )}
    </div>
  )
}
