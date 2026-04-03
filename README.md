# WorkflowIQ — AI Workflow Evaluator
First i would like you to read the Architecture.md file, this is where i have designed the entire Evaluation Process, what i am trying to build and what i am not trying to build, Helps a lot when using AI based Workflow.

Evaluates *how* an engineer uses AI during software development — not what the code looks like, but the quality of the collaboration process.

---

## Setup

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. You need an LLM API Key — paste it into the key field on the upload screen.


---

## How it works

1. **Drop or paste a transcript** — exported from Claude.ai, ChatGPT, Cursor, Copilot, or plain text
2. The parser detects the format automatically (6-tier detection, see below)
3. The transcript is sent to Gemini (`gemini-2.0-flash`) with a structured evaluation prompt
4. A full session report is returned: 6 scored dimensions, radar chart, strengths, improvements, highlight moment, anti-pattern

---

## Transcript formats supported

| Format | Detection signature |
|---|---|
| JSON | Starts with `{` or `[` |
| Claude.ai | `**Bold**` role header, no colon |
| ChatGPT | `You said:` / `ChatGPT said:` pattern |
| Cursor | Role name followed by `───` underline |
| Generic | `User:` / `AI:` / `Human:` / `Assistant:` labels |
| Alternating | Double-newline blocks, user-first (fallback) |

Formats are tried in priority order. Mixed formats fall through entirely — no partial recovery. The alternating fallback surfaces a warning badge in the UI since role assignment is an inference.

Long transcripts (>12,000 chars) are sliced from the **end** — the most recent context is preserved since workflow patterns are more visible in recent turns.

---

## Evaluation dimensions

Six dimensions scored 0–10, each with a confidence rating and a reasoning sentence:

| Dimension | What it measures |
|---|---|
| **Prompt Clarity** | Context richness — does the engineer include error messages, code, constraints? |
| **Iteration Quality** | Do follow-ups build meaningfully or just re-ask the same thing? |
| **Phase Awareness** | Is there a visible planning → implementation → debug → review structure? |
| **Autonomy Balance** | Does the engineer think critically or blindly delegate? |
| **Error Recovery** | Are AI mistakes caught and corrected? |
| **Scope Management** | Are problems decomposed? Is the session focused? |

The **overall score** (0–100) is a holistic judgment by the model — not a mechanical average. The **AI leverage score** measures value extracted relative to what was available in the conversation.

---

## Architecture decisions

### Client-side only
No backend. The LLM is called directly from the browser. Transcript data never leaves the user's machine (except to the Gemini API endpoint). For a personal/assessment tool, the tradeoff is acceptable.

### LLM evaluation, not heuristics
Heuristics can count prompt length. They can't distinguish a 20-word prompt that is excellent ("here's the middleware throwing 500 — trace the error path") from one that is useless ("fix my code"). LLM understands intent and context quality.

### 6-tier parser with graceful fallback
Real transcript exports look very different across tools. A single regex breaks on every tool that isn't the one you wrote it for. Falling through to alternating-block is better than failing entirely, and the warning badge makes the uncertainty visible.

### No chart libraries
The radar chart and all visualisations are pure SVG — ~50 lines of trigonometry for the radar, stroke-dasharray math for the score circle. No Recharts, no D3. Bundle stays small, render stays fast.

### Session comparison
Multi-session comparison is a first-class feature (not an afterthought) because the most useful signal comes from comparing your weak sessions against your strong ones, not reading a single score in isolation.

---

## What is intentionally not built

- **Persistent storage** — transcripts can contain sensitive code. No localStorage without encryption. Refresh clears everything; the UI warns you.
- **Mobile layout** — developer tool, min-width 768px
- **PDF export** — out of scope
- **Real-time monitoring** — would need a browser extension or IDE plugin
- **User accounts** — no backend means no auth needed
