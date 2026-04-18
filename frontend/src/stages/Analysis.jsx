import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Stepper from '../components/Stepper.jsx'
import { streamAnalysis } from '../api.js'

const AGENTS = [
  { id: 'portfolio', name: 'Portfolio Analysis Agent', weight: 0.25, short: 'PA',
    purpose: 'Asset allocation and diversification' },
  { id: 'risk', name: 'Risk Assessment Agent', weight: 0.25, short: 'RA',
    purpose: 'Concentration, liquidity, risk-adjusted returns' },
  { id: 'recommendation', name: 'Investment Recommendation Agent', weight: 0.50, short: 'IR',
    purpose: 'Synthesis and action plan' },
]

function Metric({ label, value }) {
  return (
    <div className="metric">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
    </div>
  )
}

function renderMetrics(id, m) {
  if (!m) return null
  if (id === 'portfolio') {
    return (
      <div className="agent-metrics">
        <Metric label="Documents analyzed" value={m.documents_analyzed ?? '—'} />
        <Metric label="Holdings identified" value={m.holdings_identified ?? '—'} />
        <Metric label="Asset classes" value={m.asset_classes ?? '—'} />
        <Metric label="Diversification score" value={`${m.diversification_score ?? '—'}/100`} />
      </div>
    )
  }
  if (id === 'risk') {
    return (
      <div className="agent-metrics">
        <Metric label="Risk metrics" value={m.risk_metrics_calculated ?? '—'} />
        <Metric label="Compliance checks" value={`${m.compliance_checks ?? '—'}/${m.compliance_checks ?? '—'}`} />
        <Metric label="Risk events" value={m.risk_events ?? '—'} />
        <Metric label="Risk score" value={`${m.risk_score ?? '—'}/100`} />
      </div>
    )
  }
  if (id === 'recommendation') {
    return (
      <div className="agent-metrics">
        <Metric label="Recommendations" value={m.recommendations_count ?? '—'} />
        <Metric label="Return improvement" value={`${m.return_improvement_pct ?? '—'}%`} />
        <Metric label="Tax efficiency gain" value={`${m.tax_efficiency_gain_pct ?? '—'}%`} />
        <Metric label="Implementation cost" value={`$${(m.implementation_cost ?? 0).toLocaleString()}`} />
      </div>
    )
  }
  return null
}

export default function Analysis() {
  const { cid } = useParams()
  const nav = useNavigate()
  const [state, setState] = useState({
    portfolio: { status: 'queued', progress: 0, metrics: null },
    risk: { status: 'queued', progress: 0, metrics: null },
    recommendation: { status: 'queued', progress: 0, metrics: null },
  })
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const esRef = useRef(null)

  useEffect(() => {
    const es = streamAnalysis(cid, (event) => {
      if (event.type === 'error') {
        setError(event.message || 'Analysis failed')
        return
      }
      if (event.type === 'done') {
        setDone(true)
        return
      }
      const { agent, status, progress, metrics } = event
      setState((prev) => ({
        ...prev,
        [agent]: {
          status: status || prev[agent].status,
          progress: progress ?? prev[agent].progress,
          metrics: metrics ?? prev[agent].metrics,
        },
      }))
    })
    esRef.current = es
    return () => es.close()
  }, [cid])

  const overall = Math.round(
    AGENTS.reduce((sum, a) => sum + a.weight * state[a.id].progress, 0)
  )

  return (
    <div>
      <Stepper current={3} />
      <h1>AI-Powered Analysis</h1>
      <p className="muted">Three specialized agents process the client profile sequentially.</p>

      {error && <div className="error">{error}</div>}

      <div className="overall-progress">
        <span className="label">Overall progress</span>
        <div className="progress"><div className="progress-fill" style={{ width: `${overall}%` }} /></div>
        <span className="pct">{overall}%</span>
      </div>

      <div className="agents">
        {AGENTS.map((a) => {
          const s = state[a.id]
          return (
            <div key={a.id} className="agent-card">
              <div className="agent-head">
                <div className="agent-name">
                  <div className="agent-avatar">{a.short}</div>
                  <div>
                    <div>{a.name}</div>
                    <div className="muted" style={{ fontSize: 11, fontWeight: 400 }}>
                      {a.purpose} · weight {Math.round(a.weight * 100)}%
                    </div>
                  </div>
                </div>
                <span className={`agent-status ${s.status}`}>{s.status}</span>
              </div>
              <div className="progress"><div className="progress-fill" style={{ width: `${s.progress}%` }} /></div>
              {renderMetrics(a.id, s.metrics)}
            </div>
          )
        })}
      </div>

      <div className="actions-row">
        <button className="btn secondary" onClick={() => nav(-1)}>Back</button>
        <button className="btn" disabled={!done} onClick={() => nav(`/new/scoring/${cid}`)}>
          Continue to Recommendations
        </button>
      </div>
    </div>
  )
}
