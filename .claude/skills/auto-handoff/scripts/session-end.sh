#!/usr/bin/env bash
# auto-handoff session-end hook.
# Fires when the user closes the session (or it terminates).
# We cannot make Claude write text after SessionEnd, so we record a marker
# file. The next SessionStart will see the marker and the loader will signal
# that the prior session ended without a final handoff — prompting the new
# session to acknowledge that the latest periodic checkpoint is the most
# recent state.
#
# This is a best-effort safety net. The primary durability mechanism is the
# every-20-turns checkpoint produced by counter.sh.

set -euo pipefail

STATE_DIR="${CLAUDE_PROJECT_DIR:-$PWD}/.claude/auto-handoff"
mkdir -p "$STATE_DIR"

# Record session end timestamp for diagnostic purposes.
date -u +"%Y-%m-%dT%H:%M:%SZ" > "$STATE_DIR/last-session-end"

# Best-effort cleanup: drop per-session counters older than 7 days.
find "$STATE_DIR" -maxdepth 1 -name 'counter-*' -mtime +7 -delete 2>/dev/null || true

echo '{}'
