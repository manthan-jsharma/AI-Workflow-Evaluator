const FORMAT_LABELS = {
  json:        'JSON',
  claude:      'Claude.ai',
  chatgpt:     'ChatGPT',
  cursor:      'Cursor',
  generic:     'Generic',
  alternating: 'Auto',
}

export default function Header({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onCompare,
  view,
}) {
  const hasMultiple = sessions.length >= 2

  return (
    <header className="header">
      <div className="header__brand">
        <span className="header__logo">◈</span>
        <span className="header__name">WorkflowIQ</span>
      </div>

      {sessions.length > 0 && (
        <nav className="header__tabs" aria-label="Sessions">
          {sessions.map(session => (
            <button
              key={session.id}
              className={`header__tab ${activeSessionId === session.id && view !== 'compare' ? 'header__tab--active' : ''}`}
              onClick={() => onSelectSession(session.id)}
            >
              <span className="header__tab-name">{session.name}</span>
              {session.format && (
                <span className="header__tab-format">{FORMAT_LABELS[session.format] ?? session.format}</span>
              )}
              {session.warning && (
                <span className="header__tab-warn" title={session.warning}>⚠</span>
              )}
            </button>
          ))}
        </nav>
      )}

      <div className="header__actions">
        {sessions.length > 0 && (
          <span className="header__unsaved-warn" title="Sessions are lost on page refresh">
            ● unsaved
          </span>
        )}
        {hasMultiple && (
          <button
            className={`header__btn header__btn--compare ${view === 'compare' ? 'header__btn--active' : ''}`}
            onClick={onCompare}
          >
            Compare {sessions.length}
          </button>
        )}
        <button className="header__btn header__btn--new" onClick={onNewSession}>
          + New session
        </button>
      </div>
    </header>
  )
}
