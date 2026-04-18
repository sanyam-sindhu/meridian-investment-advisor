import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Stepper from '../components/Stepper.jsx'
import { createClient } from '../api.js'

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const ACCEPT = '.pdf,.txt,.csv,.xls,.xlsx'

export default function Profile() {
  const nav = useNavigate()
  const [name, setName] = useState('')
  const [country, setCountry] = useState('India')
  const [notes, setNotes] = useState('')
  const [goals, setGoals] = useState('')
  const [files, setFiles] = useState([])
  const [drag, setDrag] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef(null)

  const canContinue = (notes.trim() || goals.trim() || files.length > 0) && !submitting

  function addFiles(list) {
    const arr = Array.from(list)
    setFiles((prev) => [...prev, ...arr])
  }

  function onDrop(e) {
    e.preventDefault()
    setDrag(false)
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files)
  }

  function removeFile(idx) {
    setFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  async function submit() {
    setError('')
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('name', name || 'Unnamed Client')
      fd.append('country', country)
      fd.append('notes', notes)
      fd.append('goals', goals)
      files.forEach((f) => fd.append('files', f))
      const res = await createClient(fd)
      nav(`/new/assessment/${res.client_id}`)
    } catch (e) {
      setError(e.message || 'Failed to save profile')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <Stepper current={1} />
      <h1>Client Profile</h1>
      <p className="muted">Capture client background, goals, and supporting documents before running analysis.</p>

      {error && <div className="error">{error}</div>}

      <div className="card">
        <div className="card-heading"><h2>Client Information</h2></div>

        <div className="field">
          <label>Client or Household Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ashish Kacholia Family Office" />
        </div>

        <div className="field">
          <label>Country</label>
          <select value={country} onChange={(e) => setCountry(e.target.value)}>
            <option>India</option>
            <option>United States</option>
            <option>United Kingdom</option>
            <option>Singapore</option>
            <option>UAE</option>
            <option>Australia</option>
            <option>Canada</option>
          </select>
        </div>

        <div className="field">
          <label>Background Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Ashish Kacholia, India's most prominent retail investor. ₹500Cr+ portfolio concentrated in small and midcap stocks across manufacturing, chemicals, and consumer sectors." />
        </div>

        <div className="field">
          <label>Client Goals</label>
          <textarea value={goals} onChange={(e) => setGoals(e.target.value)} placeholder="e.g. Long-term wealth compounding via smallcap conviction bets, reduce single-stock concentration risk, optimize LTCG before March 31." />
        </div>
      </div>

      <div className="card">
        <div className="card-heading"><h2>Supporting Documents</h2></div>

        <div
          className={`dropzone ${drag ? 'drag' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
        >
          Drop portfolio statements, tax returns, or investment reports here, or click to browse.
          <small>Accepts PDF, TXT, CSV, XLS, XLSX</small>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPT}
            style={{ display: 'none' }}
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />
        </div>

        {files.length > 0 && (
          <ul className="file-list">
            {files.map((f, i) => (
              <li key={i}>
                <span>{f.name} <span className="muted">· {formatSize(f.size)}</span></span>
                <button onClick={() => removeFile(i)}>remove</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="actions-row">
        <button className="btn secondary" onClick={() => nav('/')}>Cancel</button>
        <button className="btn" disabled={!canContinue} onClick={submit}>
          {submitting ? 'Saving…' : 'Continue to Risk Assessment'}
        </button>
      </div>
    </div>
  )
}
