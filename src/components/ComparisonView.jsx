
const METRIC_KEYS = [
  'prompt_clarity',
  'iteration_quality',
  'phase_awareness',
  'autonomy_balance',
  'error_recovery',
  'scope_management',
  'ai_extraction',
]

const METRIC_ABBR = {
  prompt_clarity:    'Clarity',
  iteration_quality: 'Iteration',
  phase_awareness:   'Phases',
  autonomy_balance:  'Autonomy',
  error_recovery:    'Recovery',
  scope_management:  'Scope',
  ai_extraction:     'Extraction',
}

const GRADE_COLORS = {
  S: 'var(--grade-s)',
  A: 'var(--grade-a)',
  B: 'var(--grade-b)',
  C: 'var(--grade-c)',
  D: 'var(--grade-d)',
  F: 'var(--grade-f)',
}

const SESSION_COLORS = [
  'var(--accent)',
  'var(--green)',
  'var(--yellow)',
  'var(--orange)',
  'var(--blue)',
]

// ─── Radar overlay (multi-session) ────────────────────────────────────────────

function ComparisonRadar({ sessions }) {
  const cx = 130, cy = 130, maxR = 100
  const n = METRIC_KEYS.length
  const angleStep = (2 * Math.PI) / n
  const startAngle = -Math.PI / 2

  function polarToXY(angle, r) {
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)]
  }

  const rings = [0.25, 0.5, 0.75, 1]
  const axes = METRIC_KEYS.map((_, i) => {
    const angle = startAngle + i * angleStep
    const [x, y] = polarToXY(angle, maxR)
    return { x, y }
  })

  const labels = METRIC_KEYS.map((key, i) => {
    const angle = startAngle + i * angleStep
    const [x, y] = polarToXY(angle, maxR + 20)
    return { x, y, text: METRIC_ABBR[key] }
  })

  return (
    <div className="comp-radar">
      <h3 className="comp-section__title">Skill Radar — Overlay</h3>
      <svg viewBox="0 0 260 260" className="comp-radar__svg">
        {rings.map((ratio, ri) => {
          const points = METRIC_KEYS.map((_, i) => {
            const angle = startAngle + i * angleStep
            return polarToXY(angle, maxR * ratio).join(',')
          })
          return (
            <polygon
              key={ri}
              points={points.join(' ')}
              fill="none"
              stroke="var(--border)"
              strokeWidth="1"
            />
          )
        })}

        {axes.map((ax, i) => (
          <line key={i} x1={cx} y1={cy} x2={ax.x} y2={ax.y} stroke="var(--border)" strokeWidth="1" />
        ))}

        {sessions.map((session, si) => {
          if (!session.result?.metrics) return null
          const color = SESSION_COLORS[si % SESSION_COLORS.length]
          const points = METRIC_KEYS.map((key, i) => {
            const score = session.result.metrics[key]?.score ?? 0
            const r = (score / 10) * maxR
            const angle = startAngle + i * angleStep
            return polarToXY(angle, r)
          })
          const path = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x},${y}`).join(' ') + ' Z'
          return (
            <g key={session.id}>
              <path
                d={path}
                fill={color}
                fillOpacity="0.08"
                stroke={color}
                strokeWidth="2"
                strokeLinejoin="round"
              />
              {points.map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r="3" fill={color} />
              ))}
            </g>
          )
        })}

        {labels.map((lbl, i) => (
          <text
            key={i}
            x={lbl.x}
            y={lbl.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="var(--text-secondary)"
            fontSize="10"
            fontFamily="var(--font-body)"
          >
            {lbl.text}
          </text>
        ))}
      </svg>

      {/* Legend */}
      <div className="comp-radar__legend">
        {sessions.map((session, si) => (
          <div key={session.id} className="comp-radar__legend-item">
            <span
              className="comp-radar__legend-dot"
              style={{ background: SESSION_COLORS[si % SESSION_COLORS.length] }}
            />
            <span className="comp-radar__legend-name">{session.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Bar chart per metric ─────────────────────────────────────────────────────

function MetricBarChart({ sessions }) {
  return (
    <div className="comp-bars">
      <h3 className="comp-section__title">Metric comparison</h3>
      <div className="comp-bars__grid">
        {METRIC_KEYS.map(key => (
          <div key={key} className="comp-bar-group">
            <div className="comp-bar-group__label">{METRIC_ABBR[key]}</div>
            <div className="comp-bar-group__bars">
              {sessions.map((session, si) => {
                const score = session.result?.metrics?.[key]?.score ?? 0
                const color = SESSION_COLORS[si % SESSION_COLORS.length]
                return (
                  <div key={session.id} className="comp-bar-group__row">
                    <span
                      className="comp-bar-group__session"
                      style={{ color }}
                    >
                      {session.name.slice(0, 16)}{session.name.length > 16 ? '…' : ''}
                    </span>
                    <div className="comp-bar-group__track">
                      <div
                        className="comp-bar-group__fill"
                        style={{ width: `${score * 10}%`, background: color }}
                      />
                    </div>
                    <span className="comp-bar-group__score">{score}</span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Summary table ────────────────────────────────────────────────────────────

function SummaryTable({ sessions }) {
  return (
    <div className="comp-table-wrap">
      <h3 className="comp-section__title">Session summary</h3>
      <table className="comp-table">
        <thead>
          <tr>
            <th>Session</th>
            <th>Score</th>
            <th>Grade</th>
            <th>AI Leverage</th>
            <th>Turns</th>
            <th>Type</th>
            {METRIC_KEYS.map(k => (
              <th key={k}>{METRIC_ABBR[k]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sessions.map((session, si) => {
            const r = session.result
            const color = SESSION_COLORS[si % SESSION_COLORS.length]
            const gradeColor = GRADE_COLORS[r?.overall_grade] ?? 'var(--text-primary)'
            return (
              <tr key={session.id}>
                <td>
                  <span className="comp-table__session-dot" style={{ background: color }} />
                  {session.name}
                </td>
                <td className="comp-table__num">{r?.overall_score ?? '—'}</td>
                <td>
                  <span className="comp-table__grade" style={{ color: gradeColor }}>
                    {r?.overall_grade ?? '—'}
                  </span>
                </td>
                <td className="comp-table__num">{r?.ai_leverage_score != null ? `${r.ai_leverage_score}%` : '—'}</td>
                <td className="comp-table__num">{session.stats?.totalTurns ?? '—'}</td>
                <td className="comp-table__type">{r?.session_type ?? '—'}</td>
                {METRIC_KEYS.map(k => (
                  <td key={k} className="comp-table__num">
                    {r?.metrics?.[k]?.score ?? '—'}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ComparisonView({ sessions, onBack }) {
  const evaluated = sessions.filter(s => s.result)

  if (evaluated.length < 2) {
    return (
      <div className="comp-empty">
        <p>Need at least 2 evaluated sessions to compare.</p>
        <button className="comp-back-btn" onClick={onBack}>← Back</button>
      </div>
    )
  }

  return (
    <div className="comparison">
      <div className="comparison__header">
        <button className="comp-back-btn" onClick={onBack}>← Back</button>
        <h2 className="comparison__title">Comparing {evaluated.length} sessions</h2>
      </div>

      <div className="comparison__body">
        <div className="comparison__top">
          <ComparisonRadar sessions={evaluated} />
          <MetricBarChart sessions={evaluated} />
        </div>
        <SummaryTable sessions={evaluated} />
      </div>
    </div>
  )
}
