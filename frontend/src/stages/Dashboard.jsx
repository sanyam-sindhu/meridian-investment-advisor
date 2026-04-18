import { useState, useEffect, useMemo, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import { listPortfolio, deleteFromPortfolio, seedDemo } from '../api.js'
import Matrix from '../components/Matrix.jsx'
import { exportPortfolioPdf, exportClientPdf } from '../exportPdf.js'

function ScorePill({ score }) {
  const cls = score >= 75 ? 'green' : score >= 50 ? 'amber' : 'red'
  return <span className={`score-pill ${cls}`}>{score}</span>
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

const COLUMNS = [
  { key: 'client_name', label: 'Client', numeric: false },
  { key: 'strategy_name', label: 'Strategy', numeric: false },
  { key: 'decision', label: 'Decision', numeric: false },
  { key: 'feasibility', label: 'Feasibility', numeric: true },
  { key: 'impact', label: 'Impact', numeric: true },
  { key: 'projected_return', label: 'Proj. Return', numeric: true },
  { key: 'implementation_cost', label: 'Impl. Cost', numeric: true },
]

export default function Dashboard() {
  const nav = useNavigate()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState('client_name')
  const [sortDir, setSortDir] = useState('asc')
  const [expanded, setExpanded] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const data = await listPortfolio()
      setRows(data)
    } finally {
      setLoading(false)
    }
  }

  async function onSeed() {
    await seedDemo()
    await load()
  }

  async function onDelete(cid) {
    if (!confirm('Remove this recommendation from the portfolio?')) return
    await deleteFromPortfolio(cid)
    await load()
  }

  function changeSort(key) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  const sorted = useMemo(() => {
    const arr = [...rows]
    arr.sort((a, b) => {
      const va = a[sortKey]
      const vb = b[sortKey]
      if (va === vb) return 0
      const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb))
      return sortDir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [rows, sortKey, sortDir])

  return (
    <div>
      <h1>Portfolio Dashboard</h1>
      <p className="muted">Aggregate view of client recommendations, positioned across feasibility and impact.</p>

      <div className="toolbar">
        <div className="muted">{rows.length} client{rows.length === 1 ? '' : 's'} in portfolio</div>
        <div className="toolbar-right">
          <button className="btn secondary small" onClick={onSeed}>Load Demo Data</button>
          <button className="btn secondary small" onClick={() => exportPortfolioPdf(sorted)} disabled={!rows.length}>Export PDF</button>
          <button className="btn small" onClick={() => nav('/new/profile')}>New Client</button>
        </div>
      </div>

      {loading && <div className="empty">Loading portfolio…</div>}

      {!loading && rows.length === 0 && (
        <div className="empty">
          No client recommendations yet. Start a new client or load demo data to explore the dashboard.
        </div>
      )}

      {!loading && rows.length > 0 && (
        <>
          <div className="card" style={{ padding: 0, overflow: 'auto' }}>
            <table className="portfolio-table">
              <thead>
                <tr>
                  <th style={{ width: 30 }}></th>
                  {COLUMNS.map((c) => (
                    <th
                      key={c.key}
                      className={sortKey === c.key ? 'sorted' : ''}
                      onClick={() => changeSort(c.key)}
                      style={{ textAlign: c.numeric ? 'right' : 'left' }}
                    >
                      {c.label}{sortKey === c.key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                    </th>
                  ))}
                  <th style={{ width: 80, textAlign: 'right' }}></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => (
                  <Fragment key={r.client_id}>
                    <tr className={expanded === r.client_id ? 'expanded' : ''}>
                      <td>
                        <button className="row-toggle" onClick={() => setExpanded(expanded === r.client_id ? null : r.client_id)}>
                          {expanded === r.client_id ? '▾' : '▸'}
                        </button>
                      </td>
                      <td>{r.client_name}</td>
                      <td>{r.strategy_name}</td>
                      <td><span className={`badge ${r.decision}`}>{r.decision}</span></td>
                      <td style={{ textAlign: 'right' }}><ScorePill score={r.feasibility} /></td>
                      <td style={{ textAlign: 'right' }}><ScorePill score={r.impact} /></td>
                      <td style={{ textAlign: 'right' }}>{r.projected_return}%</td>
                      <td style={{ textAlign: 'right' }}>{money(r.implementation_cost, r.country)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn link small" onClick={() => onDelete(r.client_id)}>remove</button>
                      </td>
                    </tr>
                    {expanded === r.client_id && (
                      <tr>
                        <td colSpan={9} style={{ padding: 0 }}>
                          <div className="detail">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                              <div>
                                <h4>Portfolio findings</h4>
                                <ul className="findings-list">
                                  {(r.portfolio?.findings || []).map((f, i) => <li key={i}>{f}</li>)}
                                </ul>
                                <h4>Risk findings</h4>
                                <ul className="findings-list">
                                  {(r.risk?.findings || []).map((f, i) => <li key={i}>{f}</li>)}
                                </ul>
                              </div>
                              <div>
                                <h4>Recommended actions</h4>
                                <ul className="findings-list">
                                  {(r.recommendation?.actions || []).map((f, i) => <li key={i}>{f}</li>)}
                                </ul>
                                <h4>Risks &amp; considerations</h4>
                                <ul className="findings-list">
                                  {(r.recommendation?.risks || []).map((f, i) => <li key={i}>{f}</li>)}
                                </ul>
                                <h4>Projections</h4>
                                <div className="muted" style={{ fontSize: 12 }}>
                                  Current {r.current_return}% → Projected {r.projected_return}% ·
                                  3yr value {money(r.projected_3yr_value, r.country)} ·
                                  Tax impact {money(r.tax_implications, r.country)}
                                </div>
                              </div>
                            </div>
                            <div style={{ marginTop: 12 }}>
                              <button className="btn secondary small" onClick={() => exportClientPdf(r)}>Export Client Report</button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card">
            <div className="card-heading"><h2>Feasibility &amp; Impact Matrix</h2></div>
            <Matrix rows={sorted} />
          </div>
        </>
      )}
    </div>
  )
}
