import { useState, useRef } from 'react'
import { parseTranscript, getTranscriptStats } from '../utils/parser.js'
import { evaluateTranscript } from '../utils/evaluator.js'

let sessionCounter = 0
function newId() { return `session-${++sessionCounter}` }

export default function UploadZone({
  apiKey,
  onApiKeyChange,
  onLoadingStart,
  onSessionComplete,
  onError,
}) {
  const [dragOver, setDragOver] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [showPaste, setShowPaste] = useState(false)
  const [sessionContext, setSessionContext] = useState('')
  const fileInputRef = useRef(null)

  async function processRawText(raw, name) {
    onError(null)

    let parsed
    try {
      parsed = parseTranscript(raw)
    } catch (err) {
      onError(`Parse error: ${err.message}`)
      return
    }

    if (!apiKey.trim()) {
      onError('Enter your Anthropic API key before analyzing.')
      return
    }

    const id = newId()
    onLoadingStart(id)

    try {
      const result = await evaluateTranscript(parsed.turns, apiKey.trim(), sessionContext)
      const stats = getTranscriptStats(parsed.turns)
      onSessionComplete({
        id,
        name,
        turns: parsed.turns,
        format: parsed.format,
        warning: parsed.warning,
        wasTruncated: parsed.wasTruncated,
        stats,
        result,
      })
    } catch (err) {
      onError(`Evaluation error: ${err.message}`)
    }
  }

  function handleFile(file) {
    if (!file) return
    const name = file.name.replace(/\.[^.]+$/, '')
    const reader = new FileReader()
    reader.onload = e => processRawText(e.target.result, name)
    reader.readAsText(file)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handlePasteSubmit() {
    if (!pasteText.trim()) return
    processRawText(pasteText, 'Pasted transcript')
    setPasteText('')
    setShowPaste(false)
  }

  return (
    <div className="upload-zone__wrapper">
      <div className="upload-zone__hero">
        <h1 className="upload-zone__title">Evaluate your AI workflow</h1>
        <p className="upload-zone__subtitle">
          Drop a conversation transcript and get a structured analysis of how
          effectively you're using AI as a thought partner.
        </p>
      </div>

      {/* API Key */}
      <div className="upload-zone__api-row">
        <label className="upload-zone__api-label" htmlFor="api-key">
          Gemini API key
        </label>
        <input
          id="api-key"
          className="upload-zone__api-input"
          type="password"
          placeholder="AIza..."
          value={apiKey}
          onChange={e => onApiKeyChange(e.target.value)}
          spellCheck={false}
          autoComplete="off"
        />
        <span className="upload-zone__api-note">Stays in memory only. Never sent to any server.</span>
      </div>

      {/* Drop zone */}
      <div
        className={`upload-zone__drop ${dragOver ? 'upload-zone__drop--over' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
        aria-label="Upload transcript file"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.json"
          className="upload-zone__file-input"
          onChange={e => handleFile(e.target.files[0])}
        />
        <div className="upload-zone__drop-icon">⬆</div>
        <p className="upload-zone__drop-primary">Drop transcript here or click to browse</p>
        <p className="upload-zone__drop-secondary">.txt · .md · .json — Claude.ai, ChatGPT, Cursor, Copilot</p>
      </div>

      {/* Optional session context */}
      <div className="upload-zone__context">
        <label className="upload-zone__context-label" htmlFor="session-context">
          What were you trying to accomplish? <span>(optional)</span>
        </label>
        <input
          id="session-context"
          className="upload-zone__context-input"
          type="text"
          placeholder='e.g. "Exploratory refactor under time pressure" or "Designing auth from scratch"'
          value={sessionContext}
          onChange={e => setSessionContext(e.target.value)}
          maxLength={200}
        />
      </div>

      {/* Paste option */}
      <div className="upload-zone__alt">
        <button
          className="upload-zone__alt-btn"
          onClick={() => setShowPaste(p => !p)}
        >
          {showPaste ? 'Hide paste' : 'Paste transcript instead'}
        </button>
      </div>

      {showPaste && (
        <div className="upload-zone__paste-panel">
          <textarea
            className="upload-zone__paste-area"
            placeholder="Paste your conversation transcript here…"
            value={pasteText}
            onChange={e => setPasteText(e.target.value)}
            rows={10}
            spellCheck={false}
          />
          <button
            className="upload-zone__paste-submit"
            onClick={handlePasteSubmit}
            disabled={!pasteText.trim()}
          >
            Analyze
          </button>
        </div>
      )}
    </div>
  )
}
