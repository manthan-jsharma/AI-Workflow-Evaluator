# WorkflowIQ — Architecture & Design Document

## Problem Statement

The question I'm trying to answer: _"How effectively is an engineer using AI during software development?"_

Most people evaluate AI-assisted work by looking at the output — the code quality, the speed. But that misses the real signal. Two engineers can produce identical code; one used AI as a thought partner with rich context and deliberate iteration, the other just asked "fix this" fifteen times. The second engineer is fragile — they can't apply the same skill to a new problem.

This tool evaluates the **process**, not the product.

---

## Core Design Decisions

### 1. Client-side only, no backend

**Decision**: Run everything in the browser. Call the Anthropic API directly from the frontend.

**Rationale**:

- No server to deploy or maintain for an assessment project
- Transcript data stays on the user's machine — privacy is trivially solved
- The API key risk is acceptable for a personal tool; for production I'd add a backend proxy

**Tradeoff accepted**: API key exposed in browser. Mitigated by: storing in memory only (not localStorage), no server logs, user owns the key.

### 2. Evaluation via LLM, not heuristics

**Decision**: Use Claude to evaluate transcripts rather than writing scoring heuristics.

**Rationale**: Heuristics are brittle. "Count the number of words in user prompts" is a shallow proxy for prompt quality. A 20-word prompt can be excellent ("Here's my Express middleware that throws 500 on DB failure. Trace the error path and suggest proper error boundaries") or terrible ("fix the bug in my code"). Claude understands intent, context quality, and iteration depth in a way regex can't.

**Tradeoff accepted**: Evaluation costs ~$0.01 per transcript. Acceptable for this use case.

### 3. Multi-format parser with graceful fallback

**Decision**: Build a 6-tier parser that tries increasingly permissive formats.

**Rationale**: Real transcript exports from Claude.ai, ChatGPT, Cursor, and Copilot all look different. A single regex won't work. Priority order: JSON → Claude markdown → ChatGPT format → Cursor underline format → generic labeled → alternating block fallback.

**Tradeoff accepted**: Alternating-block fallback can misassign roles. Mitigated by surfacing a warning badge in the UI.

---

## Evaluation Rubric Design

Six dimensions, each 0–10, each with a confidence score:

```
prompt_clarity      — context richness, specificity, error detail included
iteration_quality   — follow-up depth, refinement vs repetition
phase_awareness     — planning → impl → debug → review structure
autonomy_balance    — critical thinking vs blind delegation
error_recovery      — catching and correcting AI mistakes
scope_management    — problem decomposition, focus
```

**Why these six?** Based on patterns I've observed in good vs. poor AI-assisted engineering:

- Engineers who give rich context get better first answers → fewer wasted turns
- Engineers who treat AI as autocomplete rather than a thought partner miss architectural problems
- The best sessions have visible phase-switching — they don't jump straight from "I have a problem" to "give me code"
- Error recovery is underrated — AI makes mistakes, catching them is a skill

**Confidence scores** matter because short transcripts give the evaluator less signal. A 3-turn session and a 40-turn session should produce different confidence levels, not just different scores.

---

## Component Architecture

```
App.jsx
├── Header.jsx              — session tabs, compare button, new session
├── UploadZone.jsx          — file drop, paste, sample transcripts
├── LoadingAnalysis.jsx     — animated loading with step progression
├── EvaluationDashboard.jsx — full session report
│   ├── Score circle (SVG arc)
│   ├── Phase detection chips
│   ├── Stat strip (turns, words, code blocks)
│   ├── Prompt length distribution
│   ├── 6 metric cards (score + bar + confidence dots + reasoning)
│   ├── Skill radar (pure SVG, no chart library)
│   ├── Strengths / Improvements (2-col)
│   ├── Highlight moment + Anti-pattern
│   └── Transcript preview (role-colored turns)
└── ComparisonView.jsx      — multi-session bar chart + radar overlay + table

utils/
├── parser.js    — 6-tier transcript parser
└── evaluator.js — Claude API call + structured prompt
```

---

## Evaluator Prompt Strategy

The prompt engineering here is the core intellectual work of this project. Key decisions:

**System prompt defines rubric explicitly**: Each metric has a description of what a 10 looks like vs a 1. Without this, the model produces inconsistent scores across transcripts.

**Confidence scores per metric**: Asking the model to rate its own certainty produces better-calibrated output. A transcript with 3 turns should score lower confidence than one with 40.

**Structured JSON output with reasoning**: Each metric includes a `reasoning` field — 1-2 sentences explaining the score. This makes the output useful (you can act on it) vs just a number.

**Anti-pattern extraction**: Asking for one specific anti-pattern forces the model to identify the single most impactful negative behavior rather than listing generic advice.

**AI leverage score**: Separate from the overall score — measures "how much value did the engineer extract from AI relative to what was available?" A session can score 70/100 overall but only 40% leverage if the AI consistently tried to help with more and the engineer didn't engage.

---

## UI/UX Decisions

**Dark theme only**: This is a developer tool. Developers have dark mode on. Light mode would look out of place in a terminal-adjacent context.

**No chart libraries for radar**: Pure SVG. Libraries add 50-200KB for something achievable in 40 lines of trigonometry. The constraint is performance and bundle size.

**Session tabs in header**: Multi-session comparison is a first-class feature, not an afterthought. Users should be able to flip between analyzed sessions without re-uploading.

**Prompt length distribution**: The most immediately actionable metric in the dashboard. If 80% of your prompts are "short (<80 chars)", you know the problem before even reading the scores.

---

## What I'm Not Building (and Why)

- **Real-time monitoring**: Would require browser extensions or IDE plugins. Scope creep for this assessment. The value is in the reflection, not the surveillance.
- **Persistent storage**: LocalStorage for transcripts would require encryption or we're storing sensitive code snippets. Out of scope; sessionStorage isn't meaningful either.
- **User accounts / auth**: No backend = no auth needed. Personal tool model.
- **Export to PDF**: Nice to have, but the submission deadline matters more than polish features.

---

## Session Plan

### Session 1 — Project scaffold + parser

- Init Vite + React
- Build the 6-tier transcript parser with full test cases
- Wire up basic component structure

### Session 2 — Evaluator + API integration

- Design and refine the evaluation prompt
- Build the Gemini API integration layer
- Handle error states, truncation for long transcripts

### Session 3 — Dashboard UI

- Build EvaluationDashboard with all metric cards
- SVG radar chart
- Score circle animation

### Session 4 — Comparison + polish

- ComparisonView with bar chart and radar overlay
- Header session tabs
- CSS polish, dark theme, responsive layout
