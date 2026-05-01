#!/usr/bin/env bash
# auto-handoff counter — runs on Stop hook.
# Increments per-session turn counter. When it reaches 20, emits a JSON
# blocking decision that instructs Claude to run the auto-handoff skill,
# then resets the counter.
#
# Inputs (stdin, JSON from Claude Code):
#   { "session_id": "...", "transcript_path": "...", ... }
#
# Output (stdout, JSON to Claude Code):
#   When threshold not reached: {} (no-op, lets Stop proceed)
#   When threshold reached:
#     { "decision": "block", "reason": "<instruction to run auto-handoff>" }

set -euo pipefail

THRESHOLD="${AUTO_HANDOFF_THRESHOLD:-20}"
STATE_DIR="${CLAUDE_PROJECT_DIR:-$PWD}/.claude/auto-handoff"
mkdir -p "$STATE_DIR"

# Read session_id from stdin payload (best-effort; fall back to "default").
PAYLOAD="$(cat || true)"
SESSION_ID="$(printf '%s' "$PAYLOAD" \
  | grep -o '"session_id"[[:space:]]*:[[:space:]]*"[^"]*"' \
  | head -1 \
  | sed 's/.*"\([^"]*\)"$/\1/')"
SESSION_ID="${SESSION_ID:-default}"

COUNTER_FILE="$STATE_DIR/counter-$SESSION_ID"

# Increment counter (start at 0 if missing).
COUNT="$(cat "$COUNTER_FILE" 2>/dev/null || echo 0)"
COUNT=$((COUNT + 1))
echo "$COUNT" > "$COUNTER_FILE"

if [ "$COUNT" -ge "$THRESHOLD" ]; then
  # Reset counter.
  echo 0 > "$COUNTER_FILE"

  # Emit blocking decision so Claude is forced to run the skill before stopping.
  cat <<'JSON'
{
  "decision": "block",
  "reason": "AUTO-HANDOFF CHECKPOINT (every 20 turns): Before stopping, please invoke the auto-handoff skill now. Set AUTO_HANDOFF_TRIGGER=periodic-checkpoint for this run. Write a comprehensive 10-section handoff to .claude/handoffs/<timestamp>.md and copy to .claude/handoffs/latest.md. After the handoff is written, you may stop normally."
}
JSON
  exit 0
fi

# Below threshold: no-op.
echo '{}'
