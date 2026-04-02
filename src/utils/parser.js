/**
 * parser.js — 6-tier transcript parser
 *
 * Tier priority:
 *   1. JSON          — starts with { or [
 *   2. Claude.ai     — **Bold** role header, newline after, no colon
 *   3. ChatGPT       — "X said:" pattern
 *   4. Cursor        — role name followed by ─── underline
 *   5. Generic label — User: / AI: / Human: / Assistant: etc.
 *   6. Alternating   — double-newline blocks, user-first assumption
 *
 * Mixed format falls through entirely — no partial recovery.
 * Returns: { turns, format, warning }
 *   turns: [{ role: 'user'|'assistant', content: string }]
 *   format: string (which tier matched)
 *   warning: string|null (set for alternating-block fallback)
 */

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normaliseRole(raw) {
  const r = raw.trim().toLowerCase()
  if (['user', 'human', 'you', 'me', 'engineer', 'dev', 'developer'].includes(r)) return 'user'
  if (['assistant', 'ai', 'claude', 'chatgpt', 'gpt', 'gpt-4', 'gpt-3', 'copilot', 'cursor'].includes(r)) return 'assistant'
  // Fallback: if it contains "user" or "human" lean user, else assistant
  if (r.includes('user') || r.includes('human')) return 'user'
  return 'assistant'
}

function cleanContent(str) {
  return str.trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

// ─── Tier 1: JSON ────────────────────────────────────────────────────────────

function tryJSON(raw) {
  const trimmed = raw.trim()
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null

  let parsed
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    return null
  }

  // Handle array of turn objects
  if (Array.isArray(parsed)) {
    const turns = []
    for (const item of parsed) {
      // Support various key shapes: {role, content}, {role, message}, {sender, text}
      const role = item.role ?? item.sender ?? item.from ?? item.author
      const content = item.content ?? item.message ?? item.text ?? item.body
      if (!role || content === undefined) return null
      turns.push({ role: normaliseRole(String(role)), content: cleanContent(String(content)) })
    }
    return turns.length > 0 ? { turns, format: 'json' } : null
  }

  // Handle {messages: [...]} wrapper (ChatGPT export shape)
  if (parsed.messages && Array.isArray(parsed.messages)) {
    const turns = []
    for (const item of parsed.messages) {
      const role = item.role ?? item.sender
      // ChatGPT exports can have 'system' role — skip those
      if (!role || String(role).toLowerCase() === 'system') continue
      const content = item.content ?? item.text
      if (content === undefined) return null
      const text = typeof content === 'string'
        ? content
        : Array.isArray(content)
          ? content.map(p => p.text ?? p.value ?? '').join('\n')
          : String(content)
      turns.push({ role: normaliseRole(String(role)), content: cleanContent(text) })
    }
    return turns.length > 0 ? { turns, format: 'json' } : null
  }

  return null
}

// ─── Tier 2: Claude.ai markdown export ───────────────────────────────────────
// Pattern: **RoleName**\n\nContent\n\n**RoleName**\n\n...
// The bold text is the role; there is NO colon after it.

const CLAUDE_HEADER = /^\*\*([^*]+)\*\*\s*$/

function tryClaude(raw) {
  const lines = raw.split('\n')

  // Quick probe: must have at least one **bold** line
  if (!lines.some(l => CLAUDE_HEADER.test(l))) return null

  const turns = []
  let currentRole = null
  let contentLines = []

  function flushTurn() {
    if (currentRole !== null) {
      const content = cleanContent(contentLines.join('\n'))
      if (content) turns.push({ role: normaliseRole(currentRole), content })
    }
    contentLines = []
  }

  for (const line of lines) {
    const match = CLAUDE_HEADER.exec(line)
    if (match) {
      flushTurn()
      currentRole = match[1]
    } else {
      contentLines.push(line)
    }
  }
  flushTurn()

  // Require at least 2 turns to be confident this is the right format
  return turns.length >= 2 ? { turns, format: 'claude' } : null
}

// ─── Tier 3: ChatGPT "X said:" pattern ───────────────────────────────────────
// Pattern: "ChatGPT said:" or "You said:" on its own line

const CHATGPT_SAID = /^(.+?)\s+said:\s*$/i

function tryChatGPT(raw) {
  const lines = raw.split('\n')
  if (!lines.some(l => CHATGPT_SAID.test(l.trim()))) return null

  const turns = []
  let currentRole = null
  let contentLines = []

  function flushTurn() {
    if (currentRole !== null) {
      const content = cleanContent(contentLines.join('\n'))
      if (content) turns.push({ role: normaliseRole(currentRole), content })
    }
    contentLines = []
  }

  for (const line of lines) {
    const match = CHATGPT_SAID.exec(line.trim())
    if (match) {
      flushTurn()
      currentRole = match[1]
    } else {
      contentLines.push(line)
    }
  }
  flushTurn()

  return turns.length >= 2 ? { turns, format: 'chatgpt' } : null
}

// ─── Tier 4: Cursor underline format ─────────────────────────────────────────
// Pattern: role name on one line, followed by a line of ─── (em-dash or hyphen)

const CURSOR_UNDERLINE = /^[─\-─═]{3,}\s*$/

function tryCursor(raw) {
  const lines = raw.split('\n')

  // Must have at least one underline line
  if (!lines.some(l => CURSOR_UNDERLINE.test(l))) return null

  const turns = []
  let currentRole = null
  let contentLines = []
  let i = 0

  function flushTurn() {
    if (currentRole !== null) {
      const content = cleanContent(contentLines.join('\n'))
      if (content) turns.push({ role: normaliseRole(currentRole), content })
    }
    contentLines = []
  }

  while (i < lines.length) {
    const line = lines[i]
    const nextLine = lines[i + 1] ?? ''

    if (nextLine && CURSOR_UNDERLINE.test(nextLine)) {
      // This line is a role header
      flushTurn()
      currentRole = line.trim()
      i += 2 // skip role line + underline line
    } else {
      contentLines.push(line)
      i++
    }
  }
  flushTurn()

  return turns.length >= 2 ? { turns, format: 'cursor' } : null
}

// ─── Tier 5: Generic labeled ──────────────────────────────────────────────────
// Pattern: "User:" / "Human:" / "AI:" / "Assistant:" at the start of a line

const GENERIC_LABEL = /^(User|Human|AI|Assistant|Bot|GPT|Claude|System)\s*:\s*/i

function tryGenericLabeled(raw) {
  const lines = raw.split('\n')
  if (!lines.some(l => GENERIC_LABEL.test(l))) return null

  const turns = []
  let currentRole = null
  let contentLines = []

  function flushTurn() {
    if (currentRole !== null) {
      const content = cleanContent(contentLines.join('\n'))
      if (content) turns.push({ role: normaliseRole(currentRole), content })
    }
    contentLines = []
  }

  for (const line of lines) {
    const match = GENERIC_LABEL.exec(line)
    if (match) {
      flushTurn()
      currentRole = match[1]
      // Content may start on the same line after the label
      const rest = line.slice(match[0].length)
      if (rest.trim()) contentLines.push(rest)
    } else {
      contentLines.push(line)
    }
  }
  flushTurn()

  return turns.length >= 2 ? { turns, format: 'generic' } : null
}

// ─── Tier 6: Alternating block (fallback) ─────────────────────────────────────
// Split on double newlines; assume user-first, alternating

function tryAlternating(raw) {
  const blocks = raw
    .split(/\n{2,}/)
    .map(b => b.trim())
    .filter(b => b.length > 0)

  if (blocks.length < 2) return null

  const turns = blocks.map((content, i) => ({
    role: i % 2 === 0 ? 'user' : 'assistant',
    content: cleanContent(content),
  }))

  return {
    turns,
    format: 'alternating',
    warning: 'Role assignment is approximate — format not recognized. Roles were inferred by alternating order (user-first).',
  }
}

// ─── Truncation ───────────────────────────────────────────────────────────────

const TRUNCATION_LIMIT = 12000
const TRUNCATION_MARKER = '[...transcript truncated...]'

function applyTruncation(raw) {
  if (raw.length <= TRUNCATION_LIMIT) return raw
  return TRUNCATION_MARKER + '\n\n' + raw.slice(-TRUNCATION_LIMIT)
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * parseTranscript(raw: string): { turns, format, warning, wasTruncated }
 */
export function parseTranscript(raw) {
  if (!raw || typeof raw !== 'string') {
    throw new Error('parseTranscript requires a non-empty string')
  }

  const wasTruncated = raw.length > TRUNCATION_LIMIT
  const input = applyTruncation(raw)

  const result =
    tryJSON(input) ??
    tryClaude(input) ??
    tryChatGPT(input) ??
    tryCursor(input) ??
    tryGenericLabeled(input) ??
    tryAlternating(input)

  if (!result) {
    throw new Error('Could not parse transcript — no format matched and alternating fallback found fewer than 2 blocks.')
  }

  return {
    turns: result.turns,
    format: result.format,
    warning: result.warning ?? null,
    wasTruncated,
  }
}

/**
 * getTranscriptStats(turns): basic stats used by the dashboard
 */
export function getTranscriptStats(turns) {
  const userTurns = turns.filter(t => t.role === 'user')
  const assistantTurns = turns.filter(t => t.role === 'assistant')

  const wordCount = turns.reduce((n, t) => n + t.content.split(/\s+/).filter(Boolean).length, 0)

  const codeBlockCount = turns.reduce((n, t) => {
    const matches = t.content.match(/```[\s\S]*?```/g)
    return n + (matches ? matches.length : 0)
  }, 0)

  const userPromptLengths = userTurns.map(t => t.content.length)
  const avgPromptLength = userPromptLengths.length
    ? Math.round(userPromptLengths.reduce((a, b) => a + b, 0) / userPromptLengths.length)
    : 0

  // Bucket prompt lengths: short < 80, medium 80-300, long > 300
  const promptLengthDistribution = {
    short:  userPromptLengths.filter(l => l < 80).length,
    medium: userPromptLengths.filter(l => l >= 80 && l <= 300).length,
    long:   userPromptLengths.filter(l => l > 300).length,
  }

  return {
    totalTurns: turns.length,
    userTurns: userTurns.length,
    assistantTurns: assistantTurns.length,
    wordCount,
    codeBlockCount,
    avgPromptLength,
    promptLengthDistribution,
  }
}
