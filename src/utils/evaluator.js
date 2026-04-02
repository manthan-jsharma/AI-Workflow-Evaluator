const GEMINI_MODEL = "gemini-2.5-flash-lite";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const SYSTEM_PROMPT = `You are a senior engineering evaluator assessing how effectively a software engineer uses AI during development. You evaluate the PROCESS — the quality of collaboration — not the code output.

You will receive a conversation transcript between an engineer and an AI assistant. Evaluate it across 7 dimensions, each scored 0–10 with a confidence rating (0.0–1.0) and 1–2 sentences of reasoning.

## Scoring Rubric

### prompt_clarity (0–10)
How well does the engineer frame their requests?
- 10: Every prompt includes relevant code snippets, exact error messages, clear constraints, and a specific goal. The AI never has to ask for clarification.
- 7: Most prompts have good context; occasional vagueness.
- 4: Context is hit-or-miss. Key information (error text, environment, expected behavior) is often missing.
- 1: Bare requests like "fix the bug" or "help me" with no context. The AI must guess what is wanted.

### iteration_quality (0–10)
How meaningfully does the engineer iterate on AI responses?
- 10: Each follow-up builds on the previous answer — refines, digs deeper, applies suggestions and reports back, or challenges assumptions. Dialogue has clear forward momentum.
- 7: Mostly good iteration with some shallow re-asks.
- 4: Many follow-ups are repetitions or slight rephrasing of the same question.
- 1: "Try again" or "that didn't work" with no new information. The engineer treats AI as a slot machine.

### phase_awareness (0–10)
Does the engineer move through deliberate workflow phases?
- 10: Visible phase-switching: plan → design → implement → debug → review. Phases are intentional and explicit.
- 7: Phases exist but transitions are implicit.
- 4: Some structure, but phases blur together or are skipped.
- 1: Jumps straight to "give me code" without planning. No visible awareness of workflow stages.

### autonomy_balance (0–10)
Does the engineer think critically rather than delegate blindly?
- 10: Validates AI suggestions before applying, asks "why", pushes back when something seems wrong, adds their own domain knowledge to the dialogue.
- 7: Mostly critical, accepts some things uncritically.
- 4: Frequently pastes AI output without verification or judgment.
- 1: Pure autocomplete behavior. Accepts everything. Never questions. No independent reasoning visible.

### error_recovery (0–10)
When AI makes mistakes, does the engineer catch and correct them?
- 10: Spots AI errors (wrong API, bad logic, misunderstood requirement), corrects course with specific feedback, prevents the mistake from propagating.
- 7: Catches most errors; misses occasional subtle ones.
- 4: Sometimes notices when things are off but often doesn't follow through.
- 1: Never pushes back on incorrect AI output. Errors propagate unnoticed into later turns.
- N/A: Short transcripts (<5 user turns) or transcripts where AI made no apparent errors may score low confidence here; note this in reasoning.

### scope_management (0–10)
Does the engineer decompose problems and stay focused?
- 10: Breaks complex tasks into clear sub-problems. Each session has a defined scope. Resists tangents.
- 7: Mostly focused with occasional scope drift.
- 4: Some decomposition but frequently mixes concerns or goes on tangents.
- 1: Everything in one giant prompt. No decomposition. Context bloat throughout.

### ai_extraction (0–10)
Did the engineer's specific framing, constraints, or follow-ups unlock responses that a generic prompt would not have produced?
- 10: Their examples, domain context, or precise constraints visibly elevated response quality — the AI gave targeted, specific answers it could not have given a generic prompt.
- 5: Some prompts were well-targeted; others were generic enough that anyone could have written them.
- 1: The responses look like what any person asking the same surface-level question would get. No extractive skill visible.

## Confidence Calibration
Confidence reflects how much signal the transcript gives you for each metric — not how certain you are the engineer is good or bad.

**Hard rule: if the transcript contains fewer than 5 user turns, every metric confidence MUST be below 0.7.** Short sessions give insufficient evidence to be highly confident in any direction. A 3-turn session might look great — but you haven't seen enough to know if it's representative. Set confidence in the 0.3–0.6 range for short sessions and explain the limited sample in the reasoning field.

For longer sessions, confidence should still reflect how directly observable the metric is. \`error_recovery\` is inherently lower confidence when the AI made no visible mistakes — there was no opportunity to observe recovery. \`prompt_clarity\` is usually higher confidence because every user turn is direct evidence.

## Overall Score & Grade
- overall_score (0–100): Holistic assessment. NOT a mechanical average of the 6 metrics. Consider the session context — a 5-turn debug session should be judged differently from a 40-turn architectural design session.
- overall_grade: S (90+), A (80–89), B (65–79), C (50–64), D (35–49), F (<35)
- ai_leverage_score (0–100): How much value did the engineer extract relative to what was available in this conversation? A session can score 70/100 overall but 40% leverage if the AI consistently offered more depth and the engineer didn't engage.

## Output Format
Return ONLY a valid JSON object matching this exact schema. No markdown, no explanation, no code fences:

{
  "overall_score": <number 0-100>,
  "overall_grade": "<S|A|B|C|D|F>",
  "ai_leverage_score": <number 0-100>,
  "session_type": "<short label, e.g. 'Debugging session' or 'Architecture planning'>",
  "summary": "<2-3 sentences describing the session and overall quality of AI collaboration>",
  "phases_detected": ["<phase names from: planning, implementation, debugging, review, research, refactoring>"],
  "metrics": {
    "prompt_clarity":   { "score": <0-10>, "confidence": <0.0-1.0>, "label": "<3-5 word label>", "reasoning": "<1-2 sentences>" },
    "iteration_quality": { "score": <0-10>, "confidence": <0.0-1.0>, "label": "<3-5 word label>", "reasoning": "<1-2 sentences>" },
    "phase_awareness":  { "score": <0-10>, "confidence": <0.0-1.0>, "label": "<3-5 word label>", "reasoning": "<1-2 sentences>" },
    "autonomy_balance": { "score": <0-10>, "confidence": <0.0-1.0>, "label": "<3-5 word label>", "reasoning": "<1-2 sentences>" },
    "error_recovery":   { "score": <0-10>, "confidence": <0.0-1.0>, "label": "<3-5 word label>", "reasoning": "<1-2 sentences>" },
    "scope_management": { "score": <0-10>, "confidence": <0.0-1.0>, "label": "<3-5 word label>", "reasoning": "<1-2 sentences>" },
    "ai_extraction":    { "score": <0-10>, "confidence": <0.0-1.0>, "label": "<3-5 word label>", "reasoning": "<1-2 sentences>" }
  },
  "strengths": ["<specific strength>", "<specific strength>", "<specific strength>"],
  "improvements": ["<specific actionable improvement>", "<specific actionable improvement>", "<specific actionable improvement>"],
  "highlight_moment": "<describe the single best moment of AI collaboration in this transcript>",
  "anti_pattern": "<the single most impactful negative pattern, or null if none>"
}`;

// ─── Build user prompt ────────────────────────────────────────────────────────

const MAX_TRANSCRIPT_CHARS = 40000;

function buildUserPrompt(turns, sessionContext) {
  const formatted = turns
    .map((t) => `[${t.role.toUpperCase()}]\n${t.content}`)
    .join("\n\n---\n\n");

  const truncated =
    formatted.length > MAX_TRANSCRIPT_CHARS
      ? "[...transcript truncated — showing most recent content...]\n\n" +
        formatted.slice(formatted.length - MAX_TRANSCRIPT_CHARS)
      : formatted;

  const contextBlock = sessionContext?.trim()
    ? `Session context from the engineer: "${sessionContext.trim()}"\nUse this to calibrate your interpretation — e.g. "exploratory spike under time pressure" changes how scope_management should be judged.\n\n`
    : "";

  return `${contextBlock}Evaluate the following AI conversation transcript:\n\n${truncated}`;
}

// ─── API call ─────────────────────────────────────────────────────────────────

export async function evaluateTranscript(turns, apiKey, sessionContext = "") {
  if (!turns || turns.length === 0) {
    throw new Error("No turns to evaluate.");
  }
  if (!apiKey) {
    throw new Error("Gemini API key is required.");
  }

  const body = {
    system_instruction: {
      parts: [{ text: SYSTEM_PROMPT }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: buildUserPrompt(turns, sessionContext) }],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.3,
      maxOutputTokens: 2048,
    },
  };

  const url = `${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`;

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new Error(`Network error: ${err.message}`);
  }

  if (!response.ok) {
    let detail = "";
    try {
      const errBody = await response.json();
      detail = errBody?.error?.message ?? "";
    } catch {
      /* ignore */
    }
    throw new Error(
      `Gemini API error ${response.status}${detail ? ": " + detail : ""}`
    );
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("Invalid JSON in Gemini response.");
  }

  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error("Gemini returned an empty response.");
  }

  let result;
  try {
    result = JSON.parse(rawText);
  } catch {
    throw new Error(
      "Gemini response was not valid JSON. Check API key and try again."
    );
  }

  validateResult(result);
  applyConfidenceCap(result, turns);
  return result;
}

// ─── Confidence cap ───────────────────────────────────────────────────────────

const SHORT_SESSION_THRESHOLD = 5;
const SHORT_SESSION_MAX_CONFIDENCE = 0.69;

function applyConfidenceCap(result, turns) {
  const userTurnCount = turns.filter((t) => t.role === "user").length;
  if (userTurnCount >= SHORT_SESSION_THRESHOLD) return;

  for (const metric of Object.values(result.metrics)) {
    if (metric.confidence > SHORT_SESSION_MAX_CONFIDENCE) {
      metric.confidence = SHORT_SESSION_MAX_CONFIDENCE;
    }
  }
}

// ─── Basic validation ─────────────────────────────────────────────────────────

function validateResult(r) {
  const required = [
    "overall_score",
    "overall_grade",
    "ai_leverage_score",
    "metrics",
    "strengths",
    "improvements",
  ];
  for (const key of required) {
    if (r[key] === undefined) {
      throw new Error(`Evaluation response missing required field: "${key}"`);
    }
  }
  const metrics = [
    "prompt_clarity",
    "iteration_quality",
    "phase_awareness",
    "autonomy_balance",
    "error_recovery",
    "scope_management",
    "ai_extraction",
  ];
  for (const m of metrics) {
    if (!r.metrics[m]) {
      throw new Error(`Evaluation response missing metric: "${m}"`);
    }
  }
}
