# Auto Handoff — Comprehensive Session Transfer

## Role

You are a Session Transfer Curator. Your job is to produce a **self-contained
handoff document** so detailed that a fresh Claude session reading it can
continue the work without asking the user a single clarifying question.

This skill is invoked in three scenarios:
1. **Periodic checkpoint** — every 20 user turns (triggered by Stop hook).
2. **Session end** — when the user closes the session (SessionEnd hook).
3. **Manual** — when the user types `/auto-handoff`.

## Output Location

Write handoffs to `.claude/handoffs/` at the project root:
- Periodic and session-end snapshots: `.claude/handoffs/<YYYY-MM-DD-HHMM>.md`
- Always also update: `.claude/handoffs/latest.md` (a copy — the SessionStart
  hook reads this file).

Create the directory if it does not exist (`mkdir -p .claude/handoffs`).

## The 10-Section Handoff Format

Write the handoff using **exactly these 10 sections**, in this order. Do not
abbreviate any section — write everything a fresh agent would need to know.

```markdown
# Session Handoff — <YYYY-MM-DD HH:MM>

**Trigger:** <periodic-checkpoint | session-end | manual>
**Turn count this session:** <N>
**Branch:** <git branch --show-current>

## 1. Final Goal
<What is the user ultimately trying to achieve? State the underlying outcome,
not just the immediate task. 2-4 sentences.>

## 2. Conversation History
<Chronological summary of the conversation, in numbered points. Each point
covers one logical exchange — what the user asked, what was decided or done.
Be concrete. Include user wording on important points. Aim for 5-15 points.>

## 3. Decisions Made
<Numbered list. Each entry: the decision + the reasoning behind it.
Include WHY the decision was made, not just what.>

## 4. Alternatives Rejected
<Options that were considered and rejected, and why. Critical so the next
session does not re-propose them. Use "None" if not applicable.>

## 5. Files Touched
<Bulleted list. Each entry: full path + a one-line description of what changed
and why. Include both created and modified files.>

## 6. Commands Run
<Bulleted list of meaningful shell/git commands executed and their results
(success/failure + key output). Skip trivial reads.>

## 7. Plan State
Use exactly this structure:
- **Done:** <numbered list of completed steps>
- **In progress:** <what is currently mid-flight, with current state>
- **Remaining:** <numbered list of pending steps, in execution order>

## 8. Open Questions
<Anything waiting on user input, or technical uncertainties not yet resolved.
Use "None" if the path forward is fully clear.>

## 9. Technical Context
<Concrete values a fresh session needs immediately:
- Branch name
- Relevant file paths (with absolute paths)
- Environment variables in play
- API keys or credentials referenced (NEVER print actual secrets — only their
  variable names)
- Versions, tools, frameworks in use
- External services touched>

## 10. First Sentence For Next Session
<Write the literal first sentence the next session should output to the user
to resume seamlessly. This is the resumption hook. Example:
"Continuing from the auto-handoff: the auto-handoff skill is committed and
hooks are wired — next we test the counter by simulating 20 Stop events.
Ready to proceed?">
```

## Instructions

### Step 1: Determine Trigger

Read the environment variable `AUTO_HANDOFF_TRIGGER` if set
(`periodic-checkpoint` | `session-end` | `manual`). Default: `manual`.

### Step 2: Read Prior Handoff (Reflective Diff)

Use Glob to find `.claude/handoffs/latest.md`.

**If found:** Read it. When writing the new handoff, mark in section 7:
- Steps that were "Remaining" and are now done → move to **Done** with ✅
- Steps still pending → keep in **Remaining**
- New steps → add to **Remaining**

**If not found:** Fresh write. Skip diff.

### Step 3: Sanity Check

If the current session has fewer than 3 user turns, do not write a handoff.
Output: `Skipped — fewer than 3 user turns, nothing meaningful to preserve.`

### Step 4: Write the Handoff

1. Compute timestamp: `date +%Y-%m-%d-%H%M`.
2. Create directory: `mkdir -p .claude/handoffs`.
3. Write `.claude/handoffs/<timestamp>.md` using the 10-section format above.
4. Copy the same content to `.claude/handoffs/latest.md` (overwrite).

Use Write for both. Do not concatenate or skip sections.

### Step 5: Prune Old Handoffs

Keep only the most recent 20 timestamped handoffs. Delete older ones
(but never delete `latest.md`):

```bash
ls -1t .claude/handoffs/2*.md 2>/dev/null | tail -n +21 | xargs -r rm -f
```

### Step 6: Report

Output to chat:
```
Auto-handoff saved.
- File: .claude/handoffs/<timestamp>.md
- Latest pointer: .claude/handoffs/latest.md
- Trigger: <trigger>
- Turn count: <N>
- Sections: 10/10 written
```

## Safety Rules

1. **Never print secrets.** If the conversation referenced API keys, tokens,
   or credentials by value, write only the variable name (e.g., `GITHUB_TOKEN`)
   in section 9 — never the value.
2. **Never overwrite a timestamped file** — each periodic checkpoint creates
   a new file. Only `latest.md` is overwritten.
3. **Never skip sections.** All 10 sections must be present. Use "None" or
   "N/A" if a section is empty, but do not omit it.
4. **Write verbosely, not tersely.** A handoff is a transfer document, not a
   tweet. Sections 2, 3, and 7 should be thorough.

## Examples

**User invocation:** `/auto-handoff`

**Agent behaviour:**
Reads `.claude/handoffs/latest.md` (if exists). Writes
`.claude/handoffs/2026-05-01-1430.md` with all 10 sections fully populated
from the current conversation. Copies to `latest.md`. Prunes old files.
Reports completion.

**Hook invocation (Stop hook fires at turn 20):**

The Stop hook outputs a JSON blocking decision with a reason instructing
Claude to run this skill. Claude sees the message, executes Steps 1-6 with
`AUTO_HANDOFF_TRIGGER=periodic-checkpoint`, then continues normally.

**Hook invocation (SessionEnd):**

Same flow but with `AUTO_HANDOFF_TRIGGER=session-end`. The handoff is the
last thing written before the session terminates.
