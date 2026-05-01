#!/usr/bin/env bash
# auto-handoff loader — runs on SessionStart hook.
# Reads .claude/handoffs/latest.md (if present) and emits it as
# additionalContext so the new session resumes with full context.

set -euo pipefail

LATEST="${CLAUDE_PROJECT_DIR:-$PWD}/.claude/handoffs/latest.md"

if [ ! -f "$LATEST" ]; then
  echo '{}'
  exit 0
fi

CONTENT="$(cat "$LATEST")"

# Build JSON payload safely with python (handles all escape cases).
python3 - "$CONTENT" <<'PY'
import json, sys
content = sys.argv[1]
header = (
    "PRIOR-SESSION HANDOFF (auto-loaded). The previous session ended or "
    "checkpointed. Below is the full transfer document. Read it carefully — "
    "it contains the goal, history, decisions, plan state, and the literal "
    "first sentence you should output to resume seamlessly.\n\n"
)
out = {
    "hookSpecificOutput": {
        "hookEventName": "SessionStart",
        "additionalContext": header + content,
    }
}
print(json.dumps(out))
PY
