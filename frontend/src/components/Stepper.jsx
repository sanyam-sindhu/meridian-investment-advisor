import { Fragment } from 'react'

const STEPS = [
  { id: 1, label: 'Profile' },
  { id: 2, label: 'Assessment' },
  { id: 3, label: 'Analysis' },
  { id: 4, label: 'Decision' },
]

export default function Stepper({ current }) {
  return (
    <div className="stepper">
      {STEPS.map((s, i) => (
        <Fragment key={s.id}>
          <div className={`step ${current === s.id ? 'active' : ''} ${current > s.id ? 'done' : ''}`}>
            <span className="step-num">{s.id}</span>
            <span>{s.label}</span>
          </div>
          {i < STEPS.length - 1 && <span className="step-divider" />}
        </Fragment>
      ))}
    </div>
  )
}
