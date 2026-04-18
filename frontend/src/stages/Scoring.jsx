import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Stepper from '../components/Stepper.jsx'
import { getAnalysis, implementDecision, getClient } from '../api.js'

function scoreTier(s) {
  if (s >= 75) return { cls: 'green', label: 'High' }
  if (s >= 50) return { cls: 'amber', label: 'Moderate' }
  return { cls: 'red', label: 'Low' }
}

function money(n, country = 'India') {
  if (n === null || n === undefined) return '—'
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (country === 'India') {
    if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(2)} Cr`
    if (abs >= 100000)   return `${sign}₹${(abs / 100000).toFixed(2)} L`
    if (abs >= 1000)     return `${sign}₹${(abs / 1000).toFixed(1)}K`
    return `${sign}₹${abs.toLocaleString('en-IN')}`
  }
  if (abs >= 1000000) return `${sign}$${(abs / 1000000).toFixed(2)}M`
  if (abs >= 1000)    return `${sign}$${(abs / 1000).toFixed(1)}K`
  return `${sign}$${abs.toLocaleString()}`
}

export default function Scoring() {
  const { cid } = useParams()
  const nav = useNavigate()
  const [analysis, setAnalysis] = useState(null)
  const [client, setClient] = useState(null)
  const [strategy, setStrategy] = useState('')
  const [decision, setDecision] = useState('implement')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        const [a, c] = await Promise.all([getAnalysis(cid), getClient(cid)])
        setAnalysis(a)
        setClient(c)
        setStrategy(`${c.name} – Rebalancing Plan`)
      } catch (e) {
        setError(e.message || 'Failed to load analysis')
      }
    })()
  }, [cid])

  if (error) return (
    <div>
      <Stepper current={4} />
      <div className="error">{error}</div>
    </div>
  )
  if (!analysis) return <div><Stepper current={4} /><p className="muted">Loading…</p></div>

  const rec = analysis.recommendation || {}
  const portfolio = analysis.portfolio || {}
  const risk = analysis.risk || {}

  const feas = rec.feasibility_score ?? 0
  const imp = rec.impact_score ?? 0
  const feasTier = scoreTier(feas)
  const impTier = scoreTier(imp)

  async function submit() {
    setError('')
    setSubmitting(true)
    try {
      await implementDecision(cid, strategy, decision)
      nav('/')
    } catch (e) {
      setError(e.message || 'Failed to save decision')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <Stepper current={4} />
      <h1>Recommendation Scoring</h1>
      <p className="muted">Review scores, findings, and financial projections before committing a decision.</p>

      <div className="score-grid">
        <div className={`score-card ${feasTier.cls}`}>
          <div className="label">Feasibility Score</div>
          <div className="value">{feas}<span className="out">/100</span></div>
          <div className="note">{feasTier.label} — {feas >= 75 ? 'Easy to implement' : feas >= 50 ? 'Moderate complexity' : 'Difficult, high barriers'}</div>
        </div>
        <div className={`score-card ${impTier.cls}`}>
          <div className="label">Impact Score</div>
          <div className="value">{imp}<span className="out">/100</span></div>
          <div className="note">{impTier.label} — {imp >= 75 ? 'Strong portfolio improvement' : imp >= 50 ? 'Moderate impact' : 'Limited impact'}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-heading"><h2>Financial Projections</h2></div>
        <div className="financial-grid">
          <div className="cell">
            <div className="label">Projected Annual Return</div>
            <div className="value">{rec.projected_annual_return ?? '—'}%</div>
          </div>
          <div className="cell">
            <div className="label">Current Annual Return</div>
            <div className="value">{rec.current_annual_return ?? '—'}%</div>
          </div>
          <div className="cell">
            <div className="label">3-Year Projected Value</div>
            <div className="value">{money(rec.projected_3yr_value, client?.country)}</div>
          </div>
          <div className="cell">
            <div className="label">Implementation Cost</div>
            <div className="value">{money(rec.implementation_cost, client?.country)}</div>
          </div>
          <div className="cell">
            <div className="label">Tax Implications</div>
            <div className="value">{money(rec.tax_implications, client?.country)}</div>
          </div>
          <div className="cell">
            <div className="label">Return Improvement</div>
            <div className="value">+{rec.return_improvement_pct ?? '—'}%</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-heading"><h2>Agent Findings</h2></div>

        <h3>Portfolio</h3>
        <ul className="findings-list">
          {(portfolio.findings || []).map((f, i) => <li key={i}>{f}</li>)}
        </ul>

        <h3>Risk</h3>
        <ul className="findings-list">
          {(risk.findings || []).map((f, i) => <li key={i}>{f}</li>)}
        </ul>

        <h3>Recommended Actions</h3>
        <ul className="findings-list">
          {(rec.actions || []).map((f, i) => <li key={i}>{f}</li>)}
        </ul>

        <h3>Identified Risks</h3>
        <ul className="findings-list">
          {(rec.risks || []).map((f, i) => <li key={i}>{f}</li>)}
        </ul>
      </div>

      <div className="card">
        <div className="card-heading"><h2>Decision</h2></div>
        <div className="field">
          <label>Strategy Name</label>
          <input type="text" value={strategy} onChange={(e) => setStrategy(e.target.value)} />
        </div>
        <div className="decision-row">
          {['implement', 'consider', 'reject'].map((d) => (
            <button
              key={d}
              className={`decision-btn ${decision === d ? `selected ${d}` : ''}`}
              onClick={() => setDecision(d)}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="actions-row">
        <button className="btn secondary" onClick={() => nav(-1)}>Back</button>
        <button className="btn" disabled={submitting || !strategy.trim()} onClick={submit}>
          {submitting ? 'Saving…' : 'Save to Portfolio'}
        </button>
      </div>
    </div>
  )
}
