import { useState, useEffect } from 'react'

const STEPS = [
  { label: 'Parsing transcript', detail: 'Detecting format and extracting turns' },
  { label: 'Building evaluation context', detail: 'Preparing rubric and session metadata' },
  { label: 'Sending to Gemini', detail: 'gemini-2.0-flash · structured JSON output' },
  { label: 'Scoring 6 dimensions', detail: 'Clarity · iteration · phases · autonomy · recovery · scope' },
  { label: 'Generating insights', detail: 'Strengths, improvements, highlight moment' },
]

export default function LoadingAnalysis() {
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep(prev => Math.min(prev + 1, STEPS.length - 1))
    }, 1400)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="loading">
      <div className="loading__spinner" aria-hidden="true">
        <svg viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="20" stroke="var(--border)" strokeWidth="3" />
          <circle
            cx="24" cy="24" r="20"
            stroke="var(--accent)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="80 125"
            className="loading__arc"
          />
        </svg>
      </div>

      <h2 className="loading__title">Analyzing workflow…</h2>

      <ol className="loading__steps">
        {STEPS.map((step, i) => {
          const state = i < activeStep ? 'done' : i === activeStep ? 'active' : 'pending'
          return (
            <li key={i} className={`loading__step loading__step--${state}`}>
              <span className="loading__step-dot" aria-hidden="true">
                {state === 'done' ? '✓' : state === 'active' ? '●' : '○'}
              </span>
              <div className="loading__step-text">
                <span className="loading__step-label">{step.label}</span>
                {state === 'active' && (
                  <span className="loading__step-detail">{step.detail}</span>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
