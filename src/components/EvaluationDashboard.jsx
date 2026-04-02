
// ─── Constants ────────────────────────────────────────────────────────────────

const METRIC_KEYS = [
  'prompt_clarity',
  'iteration_quality',
  'phase_awareness',
  'autonomy_balance',
  'error_recovery',
  'scope_management',
  'ai_extraction',
]

const METRIC_DISPLAY = {
  prompt_clarity:   { name: 'Prompt Clarity',    abbr: 'Clarity' },
  iteration_quality:{ name: 'Iteration Quality', abbr: 'Iteration' },
  phase_awareness:  { name: 'Phase Awareness',   abbr: 'Phases' },
  autonomy_balance: { name: 'Autonomy Balance',  abbr: 'Autonomy' },
  error_recovery:   { name: 'Error Recovery',    abbr: 'Recovery' },
  scope_management: { name: 'Scope Management',  abbr: 'Scope' },
  ai_extraction:    { name: 'AI Extraction',     abbr: 'Extraction' },
}

const GRADE_COLORS = { S: 'var(--grade-s)', A: 'var(--grade-a)', B: 'var(--grade-b)', C: 'var(--grade-c)', D: 'var(--grade-d)', F: 'var(--grade-f)' }

// ─── Score circle ─────────────────────────────────────────────────────────────

function ScoreCircle({ score, grade }) {
  const r = 52
  const circumference = 2 * Math.PI * r
  const filled = (score / 100) * circumference
  const gradeColor = GRADE_COLORS[grade] ?? 'var(--accent)'

  return (
    <div className="score-circle">
      <svg viewBox="0 0 120 120" fill="none" className="score-circle__svg">
        <circle cx="60" cy="60" r={r} stroke="var(--bg-elevated)" strokeWidth="8" />
        <circle
          cx="60" cy="60" r={r}
          stroke={gradeColor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          transform="rotate(-90 60 60)"
          className="score-circle__arc"
        />
      </svg>
      <div className="score-circle__inner">
        <span className="score-circle__score">{score}</span>
        <span className="score-circle__grade" style={{ color: gradeColor }}>{grade}</span>
      </div>
    </div>
  )
}

// ─── Radar chart (pure SVG) ────────────────────────────────────────────────────

function RadarChart({ metrics }) {
  const cx = 120, cy = 120, maxR = 90
  const keys = METRIC_KEYS
  const n = keys.length
  const angleStep = (2 * Math.PI) / n
  const startAngle = -Math.PI / 2

  function polarToXY(angle, r) {
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)]
  }

  // Grid rings at 25%, 50%, 75%, 100%
  const rings = [0.25, 0.5, 0.75, 1]

  // Axis lines
  const axes = keys.map((_, i) => {
    const angle = startAngle + i * angleStep
    const [x, y] = polarToXY(angle, maxR)
    return { x, y, angle }
  })

  // Data polygon
  const dataPoints = keys.map((key, i) => {
    const score = metrics[key]?.score ?? 0
    const r = (score / 10) * maxR
    const angle = startAngle + i * angleStep
    return polarToXY(angle, r)
  })
  const dataPath = dataPoints.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x},${y}`).join(' ') + ' Z'

  // Labels
  const labels = keys.map((key, i) => {
    const angle = startAngle + i * angleStep
    const labelR = maxR + 22
    const [x, y] = polarToXY(angle, labelR)
    return { x, y, text: METRIC_DISPLAY[key].abbr }
  })

  return (
    <div className="radar">
      <h3 className="radar__title">Skill Radar</h3>
      <svg viewBox="0 0 240 240" className="radar__svg">
        {/* Grid rings */}
        {rings.map((ratio, ri) => {
          const points = keys.map((_, i) => {
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

        {/* Axis lines */}
        {axes.map((ax, i) => (
          <line key={i} x1={cx} y1={cy} x2={ax.x} y2={ax.y} stroke="var(--border)" strokeWidth="1" />
        ))}

        {/* Data polygon */}
        <path d={dataPath} fill="var(--accent)" fillOpacity="0.15" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" />

        {/* Data dots */}
        {dataPoints.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="4" fill="var(--accent)" />
        ))}

        {/* Labels */}
        {labels.map((lbl, i) => (
          <text
            key={i}
            x={lbl.x}
            y={lbl.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="var(--text-secondary)"
            fontSize="11"
            fontFamily="var(--font-body)"
          >
            {lbl.text}
          </text>
        ))}
      </svg>
    </div>
  )
}

// ─── Metric card ──────────────────────────────────────────────────────────────

function MetricCard({ metricKey, data }) {
  const display = METRIC_DISPLAY[metricKey]
  const score = data?.score ?? 0
  const confidence = data?.confidence ?? 0
  const filledDots = Math.round(confidence * 5)

  const scoreColor =
    score >= 8 ? 'var(--green)' :
    score >= 6 ? 'var(--blue)' :
    score >= 4 ? 'var(--yellow)' :
    'var(--red)'

  return (
    <div className="metric-card">
      <div className="metric-card__header">
        <span className="metric-card__name">{display.name}</span>
        {data?.label && <span className="metric-card__label">{data.label}</span>}
      </div>

      <div className="metric-card__score-row">
        <span className="metric-card__score" style={{ color: scoreColor }}>{score}</span>
        <span className="metric-card__max">/10</span>
        <div className="metric-card__bar-wrap">
          <div className="metric-card__bar" style={{ width: `${score * 10}%`, background: scoreColor }} />
        </div>
      </div>

      <div className="metric-card__confidence">
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className={`metric-card__dot ${i < filledDots ? 'metric-card__dot--filled' : ''}`}
          />
        ))}
        <span className="metric-card__confidence-label">confidence</span>
      </div>

      {data?.reasoning && (
        <p className="metric-card__reasoning">{data.reasoning}</p>
      )}
    </div>
  )
}

// ─── Prompt length distribution bar ───────────────────────────────────────────

function PromptLengthBar({ distribution }) {
  const { short = 0, medium = 0, long = 0 } = distribution ?? {}
  const total = short + medium + long
  if (total === 0) return null

  const pct = v => Math.round((v / total) * 100)

  return (
    <div className="prompt-dist">
      <div className="prompt-dist__title">Prompt length distribution</div>
      <div className="prompt-dist__bar">
        {short > 0 && (
          <div className="prompt-dist__seg prompt-dist__seg--short" style={{ width: `${pct(short)}%` }}>
            {pct(short)}%
          </div>
        )}
        {medium > 0 && (
          <div className="prompt-dist__seg prompt-dist__seg--medium" style={{ width: `${pct(medium)}%` }}>
            {pct(medium)}%
          </div>
        )}
        {long > 0 && (
          <div className="prompt-dist__seg prompt-dist__seg--long" style={{ width: `${pct(long)}%` }}>
            {pct(long)}%
          </div>
        )}
      </div>
      <div className="prompt-dist__legend">
        <span className="prompt-dist__legend-item prompt-dist__legend-item--short">Short &lt;80 chars ({short})</span>
        <span className="prompt-dist__legend-item prompt-dist__legend-item--medium">Medium 80–300 ({medium})</span>
        <span className="prompt-dist__legend-item prompt-dist__legend-item--long">Long &gt;300 ({long})</span>
      </div>
    </div>
  )
}

// ─── Transcript preview ────────────────────────────────────────────────────────

function TranscriptPreview({ turns }) {
  const preview = turns.slice(0, 6)
  const remaining = turns.length - preview.length

  return (
    <div className="transcript-preview">
      <h3 className="transcript-preview__title">Transcript preview</h3>
      <div className="transcript-preview__turns">
        {preview.map((turn, i) => (
          <div key={i} className={`transcript-turn transcript-turn--${turn.role}`}>
            <span className="transcript-turn__role">{turn.role === 'user' ? 'You' : 'AI'}</span>
            <p className="transcript-turn__content">{turn.content.slice(0, 280)}{turn.content.length > 280 ? '…' : ''}</p>
          </div>
        ))}
        {remaining > 0 && (
          <div className="transcript-preview__more">+{remaining} more turns not shown</div>
        )}
      </div>
    </div>
  )
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

export default function EvaluationDashboard({ session }) {
  const { result, stats, turns, format, warning, wasTruncated, name } = session
  const { metrics, phases_detected = [], strengths = [], improvements = [], highlight_moment, anti_pattern } = result

  const FORMAT_LABELS = { json: 'JSON', claude: 'Claude.ai', chatgpt: 'ChatGPT', cursor: 'Cursor', generic: 'Generic', alternating: 'Auto-detect' }

  return (
    <div className="dashboard">
      {/* ── Warnings ── */}
      {(warning || wasTruncated) && (
        <div className="dashboard__warnings">
          {wasTruncated && (
            <div className="dashboard__warn-chip dashboard__warn-chip--trunc">
              ⚠ Transcript truncated to last 12,000 chars
            </div>
          )}
          {warning && (
            <div className="dashboard__warn-chip dashboard__warn-chip--format">
              ⚠ {warning}
            </div>
          )}
        </div>
      )}

      {/* ── Hero row ── */}
      <div className="dashboard__hero">
        <div className="dashboard__hero-left">
          <ScoreCircle score={result.overall_score} grade={result.overall_grade} />
          <div className="dashboard__hero-meta">
            <h2 className="dashboard__session-name">{name}</h2>
            <p className="dashboard__summary">{result.summary}</p>
            <div className="dashboard__leverage">
              <span className="dashboard__leverage-label">AI leverage</span>
              <span className="dashboard__leverage-bar-wrap">
                <span
                  className="dashboard__leverage-bar"
                  style={{ width: `${result.ai_leverage_score}%` }}
                />
              </span>
              <span className="dashboard__leverage-pct">{result.ai_leverage_score}%</span>
            </div>
            <div className="dashboard__tags">
              {result.session_type && (
                <span className="dashboard__tag">{result.session_type}</span>
              )}
              <span className="dashboard__tag dashboard__tag--format">
                {FORMAT_LABELS[format] ?? format}
              </span>
            </div>
          </div>
        </div>

        <RadarChart metrics={metrics} />
      </div>

      {/* ── Stat strip ── */}
      <div className="dashboard__stat-strip">
        {[
          { label: 'Total turns',   value: stats.totalTurns },
          { label: 'User turns',    value: stats.userTurns },
          { label: 'Words',         value: stats.wordCount.toLocaleString() },
          { label: 'Code blocks',   value: stats.codeBlockCount },
          { label: 'Avg prompt',    value: `${stats.avgPromptLength} chars` },
        ].map(s => (
          <div key={s.label} className="dashboard__stat">
            <span className="dashboard__stat-value">{s.value}</span>
            <span className="dashboard__stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Phases ── */}
      {phases_detected.length > 0 && (
        <div className="dashboard__phases">
          <span className="dashboard__phases-label">Phases detected</span>
          {phases_detected.map(p => (
            <span key={p} className="dashboard__phase-chip">{p}</span>
          ))}
        </div>
      )}

      {/* ── Prompt length distribution ── */}
      <PromptLengthBar distribution={stats.promptLengthDistribution} />

      {/* ── 6 metric cards ── */}
      <div className="dashboard__metrics">
        {METRIC_KEYS.map(key => (
          <MetricCard key={key} metricKey={key} data={metrics[key]} />
        ))}
      </div>

      {/* ── Strengths / Improvements ── */}
      <div className="dashboard__insights">
        <div className="dashboard__insight-col">
          <h3 className="dashboard__insight-title dashboard__insight-title--strength">Strengths</h3>
          <ul className="dashboard__insight-list">
            {strengths.map((s, i) => (
              <li key={i} className="dashboard__insight-item dashboard__insight-item--strength">{s}</li>
            ))}
          </ul>
        </div>
        <div className="dashboard__insight-col">
          <h3 className="dashboard__insight-title dashboard__insight-title--improve">To improve</h3>
          <ul className="dashboard__insight-list">
            {improvements.map((s, i) => (
              <li key={i} className="dashboard__insight-item dashboard__insight-item--improve">{s}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Highlight + Anti-pattern ── */}
      <div className="dashboard__moments">
        {highlight_moment && (
          <div className="dashboard__moment dashboard__moment--highlight">
            <div className="dashboard__moment-label">Highlight moment</div>
            <p className="dashboard__moment-text">{highlight_moment}</p>
          </div>
        )}
        {anti_pattern && (
          <div className="dashboard__moment dashboard__moment--anti">
            <div className="dashboard__moment-label">Anti-pattern</div>
            <p className="dashboard__moment-text">{anti_pattern}</p>
          </div>
        )}
      </div>

      {/* ── Transcript preview ── */}
      <TranscriptPreview turns={turns} />
    </div>
  )
}
