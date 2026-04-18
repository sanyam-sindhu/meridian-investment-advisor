import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Stepper from '../components/Stepper.jsx'
import { saveAssessment } from '../api.js'

const QUESTIONS = [
  { id: 'timeline', q: "What is the client's investment timeline?", hint: 'e.g. 10–15 years to retirement' },
  { id: 'risk', q: 'How would you describe their risk tolerance?', hint: 'conservative, moderate, or aggressive' },
  { id: 'income', q: 'What are their ongoing income requirements?', hint: 'monthly draw, supplemental, or none' },
  { id: 'liquidity', q: 'Any near-term liquidity needs we should plan for?', hint: 'major purchases, emergency reserves' },
  { id: 'tax', q: 'What tax considerations apply?', hint: 'AMT exposure, high bracket, state tax' },
  { id: 'goals_detail', q: 'What are the primary financial goals?', hint: 'retirement, wealth transfer, philanthropy' },
  { id: 'existing', q: 'Other accounts or assets held elsewhere?', hint: '401k, real estate, pensions' },
  { id: 'constraints', q: 'Any investment restrictions or preferences?', hint: 'ESG, sector exclusions, restricted stock' },
]

const THRESHOLD = 0.7

const STORAGE_KEY = (cid) => `assessment_${cid}`

export default function Assessment() {
  const { cid } = useParams()
  const nav = useNavigate()

  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY(cid)) || 'null')
  const [idx, setIdx] = useState(saved?.idx ?? 0)
  const [answers, setAnswers] = useState(saved?.answers ?? {})
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const scrollRef = useRef(null)

  const answered = Object.keys(answers).length
  const coverage = answered / QUESTIONS.length
  const canContinue = coverage >= THRESHOLD

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY(cid), JSON.stringify({ idx, answers }))
  }, [idx, answers, cid])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [answers, idx])

  function submitAnswer() {
    const text = draft.trim()
    if (!text) return
    const current = QUESTIONS[idx]
    setAnswers((prev) => ({ ...prev, [current.id]: text }))
    setDraft('')
    setIdx((i) => Math.min(i + 1, QUESTIONS.length - 1))
  }

  function onKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submitAnswer()
    }
  }

  function skip() {
    setIdx((i) => Math.min(i + 1, QUESTIONS.length - 1))
    setDraft('')
  }

  async function goNext() {
    setError('')
    try {
      await saveAssessment(cid, answers, coverage)
      localStorage.removeItem(STORAGE_KEY(cid))
      nav(`/new/analysis/${cid}`)
    } catch (e) {
      setError(e.message || 'Failed to save assessment')
    }
  }

  const current = QUESTIONS[idx]
  const allAnswered = answered === QUESTIONS.length

  return (
    <div>
      <Stepper current={2} />
      <h1>Risk &amp; Goals Assessment</h1>
      <p className="muted">Answer the prompts below. A minimum of {Math.round(THRESHOLD * 100)}% coverage is required before analysis.</p>

      {error && <div className="error">{error}</div>}

      <div className="card">
        <div className="chat" ref={scrollRef}>
          {QUESTIONS.slice(0, idx + 1).map((q, i) => (
            <div key={q.id}>
              <div className="msg agent">
                <div className="msg-label">Advisory Assistant</div>
                {q.q}
                {!answers[q.id] && <div className="muted" style={{ marginTop: 2 }}>{q.hint}</div>}
              </div>
              {answers[q.id] && (
                <div className="msg advisor">
                  <div className="msg-label">Advisor</div>
                  {answers[q.id]}
                </div>
              )}
            </div>
          ))}
          {allAnswered && (
            <div className="msg agent">
              <div className="msg-label">Advisory Assistant</div>
              All questions answered. You can review above or continue to analysis.
            </div>
          )}
        </div>

        {!allAnswered && (
          <div style={{ marginTop: 12 }}>
            <div className="field">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKey}
                placeholder={`Answer: ${current.q}`}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn secondary small" onClick={skip}>Skip</button>
              <button className="btn small" onClick={submitAnswer} disabled={!draft.trim()}>Submit</button>
            </div>
          </div>
        )}

        <div className="coverage">
          <span>Coverage {Math.round(coverage * 100)}%</span>
          <div className="coverage-bar">
            <div className="coverage-bar-fill" style={{ width: `${coverage * 100}%` }} />
          </div>
          <span className="muted">{answered} of {QUESTIONS.length}</span>
        </div>
      </div>

      <div className="actions-row">
        <button className="btn secondary" onClick={() => nav(-1)}>Back</button>
        <button className="btn" disabled={!canContinue} onClick={goNext}>Continue to Analysis</button>
      </div>
    </div>
  )
}
