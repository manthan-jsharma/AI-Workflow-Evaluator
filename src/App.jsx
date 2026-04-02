import { useState } from 'react'
import Header from './components/Header.jsx'
import UploadZone from './components/UploadZone.jsx'
import LoadingAnalysis from './components/LoadingAnalysis.jsx'
import EvaluationDashboard from './components/EvaluationDashboard.jsx'
import ComparisonView from './components/ComparisonView.jsx'

export default function App() {
  // Each session: { id, name, turns, format, warning, wasTruncated, result }
  const [sessions, setSessions] = useState([])
  const [activeSessionId, setActiveSessionId] = useState(null)
  const [loadingSessionId, setLoadingSessionId] = useState(null)
  const [view, setView] = useState('upload') // 'upload' | 'loading' | 'dashboard' | 'compare'
  const [error, setError] = useState(null)
  const [apiKey, setApiKey] = useState('')

  const activeSession = sessions.find(s => s.id === activeSessionId) ?? null

  function handleSessionComplete(session) {
    setSessions(prev => {
      const exists = prev.find(s => s.id === session.id)
      return exists
        ? prev.map(s => s.id === session.id ? session : s)
        : [...prev, session]
    })
    setActiveSessionId(session.id)
    setView('dashboard')
    setError(null)
  }

  function handleNewSession() {
    setView('upload')
    setError(null)
  }

  function handleSelectSession(id) {
    setActiveSessionId(id)
    setView('dashboard')
  }

  function handleCompare() {
    setView('compare')
  }

  function handleLoadingStart(sessionId) {
    setLoadingSessionId(sessionId)
    setView('loading')
  }

  return (
    <div className="app">
      <Header
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        onCompare={handleCompare}
        view={view}
      />

      <main className="app__main">
        {error && (
          <div className="app__error-banner" role="alert">
            <span className="app__error-icon">⚠</span>
            {error}
            <button className="app__error-dismiss" onClick={() => setError(null)}>✕</button>
          </div>
        )}

        {view === 'upload' && (
          <UploadZone
            apiKey={apiKey}
            onApiKeyChange={setApiKey}
            onLoadingStart={handleLoadingStart}
            onSessionComplete={handleSessionComplete}
            onError={setError}
          />
        )}

        {view === 'loading' && (
          <LoadingAnalysis />
        )}

        {view === 'dashboard' && activeSession && (
          <EvaluationDashboard session={activeSession} />
        )}

        {view === 'compare' && (
          <ComparisonView sessions={sessions} onBack={() => setView('dashboard')} />
        )}
      </main>
    </div>
  )
}
