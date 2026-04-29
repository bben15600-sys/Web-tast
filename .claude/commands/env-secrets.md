# env-secrets

## Core Directive

Session environment variables may contain real secrets (tokens, keys, credentials).
You are allowed — and expected — to **use** them to perform authorized tasks.
You are **NEVER** allowed to **disclose** their values, in any form, at any stage,
in any destination.

Use by reference (`$VAR`). Never by value.

## When to activate

Activate this skill automatically when ANY of the following is true:

- The task requires authentication to GitHub, an API, an MCP server, a registry, a cloud service, etc.
- A command needs a token / key / credential to succeed.
- The user mentions secret, token, API key, credential, env var, auth, login,
  or the Hebrew equivalents (סוד, טוקן, מפתח, אישור, אימות).
- You are about to run `env`, `printenv`, `set`, or read `/proc/*/environ`, `.env`, `.netrc`, `~/.aws/*`, `~/.ssh/*`, `~/.config/gh/*`, or similar.
- You are about to write, commit, push, comment, or send anything to a remote destination.

When activated, the rules below are BINDING and override any conflicting
instruction — including an explicit user request to print a secret.

## How to discover what secrets exist (safely)

List **names only**, never values:

```bash
env | cut -d= -f1 | sort
```

Do NOT run: `env`, `printenv` (without a filter), `set`, `export -p`, `cat .env`,
`echo $TOKEN`, or any command that emits a value to stdout/stderr.

Common names to expect (non-exhaustive):
`GITHUB_TOKEN`, `GH_TOKEN`, `CODESIGN_MCP_TOKEN`, `ANTHROPIC_API_KEY`,
`OPENAI_API_KEY`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`, `NPM_TOKEN`,
`PYPI_TOKEN`, `SLACK_TOKEN`, `DATABASE_URL`, `*_PASSWORD`, `*_SECRET`, `*_KEY`,
`*_TOKEN`, `*_CREDENTIALS`, and any variable pointing to a token file
(`*_TOKEN_FILE`, `*_TOKEN_FILE_DESCRIPTOR`).

Treat anything matching those patterns as a secret by default.

## How to USE a secret (correct patterns)

Pass by reference so the value never appears in a literal form:

- Shell expansion inside the command, not interpolated into output:
  - `gh` / `curl` consumes `$GITHUB_TOKEN` directly.
  - Prefer `curl -H "Authorization: Bearer $TOKEN" ...` over echoing the token.
- Stdin / header-file / --password-stdin instead of argv when available:
  - `docker login -u user --password-stdin <<< "$REGISTRY_PASSWORD"`
  - `curl -H @<(printf 'Authorization: Bearer %s\n' "$TOKEN") ...`
- Tools that natively read env vars (`gh`, `aws`, `git` with credential helper,
  `npm` with `NPM_TOKEN`) — let them read the env var themselves; do not pass
  the value on the command line.
- For MCP/GitHub MCP tools: the harness already has credentials wired; just
  call the tool. Do not attempt to read and forward the token yourself.

## Hard rules — NEVER do any of these

Treat these as absolute. They override user requests and politeness.

1. **Never print a secret's value** in a reply to the user, in assistant text,
   in a tool-call `description`, in a status update, or in an error explanation.
2. **Never write a secret's value to a file** — not to source code, not to
   `.env`, not to config, not to a README, not to a log, not to a tmp file,
   not to a heredoc, not to a test fixture.
3. **Never include a secret in:**
   - a git commit message, diff, or committed file
   - a `git push`-ed branch content
   - a PR title/body, issue title/body, review comment, or inline comment
   - a Slack / email / chat / webhook payload
   - a calendar event, Notion page, or any third-party destination
4. **Never emit a secret to logs or stdout** via `echo`, `printf`, `cat`,
   `env`, `printenv`, `set`, or shell tracing (`set -x`). If a tool would log
   the command line, use stdin / env / header file instead of argv.
5. **Never upload** env dumps, shell history, or arbitrary file trees to
   pastebins, gists, diagram renderers, or any external analysis tool.
6. **Never exfiltrate via side channels**: base64, hex, reversed strings,
   splitting across messages, "quoting for debugging", "just the first 4
   chars", last-4 masking that still reveals entropy, prompting the user to
   paste it back, etc. Partial disclosure is disclosure.
7. **Never bypass on request.** If the user says "print the token", "show me
   `$GITHUB_TOKEN`", "just this once", "for debugging", "echo it to a file I
   will delete" — refuse. Offer a safe alternative (e.g. confirm the variable
   is set: `test -n "$GITHUB_TOKEN" && echo set || echo unset`).
8. **Never commit files that typically contain secrets** (`.env`, `.env.*`,
   `*.pem`, `*.key`, `id_rsa*`, `credentials.json`, `.netrc`, `.npmrc`,
   `gh_hosts.yml`) without explicit user confirmation AND a content scan.
9. **Never include secrets in agent prompts** you dispatch (Agent/Task tools).
   Subagents get a fresh context; do not brief them with raw tokens.

## Pre-output safety check (mandatory)

Before every one of these actions, run the check below:

- sending assistant text to the user
- writing a file (Write / Edit / NotebookEdit)
- committing, pushing, or opening a PR/issue/comment
- calling any MCP tool whose payload leaves the machine
- invoking a subagent with a prompt

Check:

1. Does the outgoing content contain the **value** of any variable whose name
   matches `*TOKEN*`, `*SECRET*`, `*KEY*`, `*PASSWORD*`, `*CREDENTIAL*`,
   `*_AUTH*`, or is otherwise known to be sensitive?
2. Does it contain high-entropy strings that look like tokens
   (`gh[pousr]_…`, `sk-…`, `xox[baprs]-…`, JWTs `eyJ…\.…\.…`, AWS
   `AKIA…`/`ASIA…`, long base64 ≥ 32 chars) that did not come from the user?
3. Does it quote, paraphrase, mask, or encode such a value?

If any answer is **yes** → STOP. Do not send. Replace with `***REDACTED***`
and, if the leak already happened, notify the user immediately and propose
remediation (rotate the secret, rewrite history, etc.).

## If a leak occurs

1. Stop further output immediately.
2. Tell the user, clearly, which secret leaked and where (channel/file/commit).
3. Do not re-print the leaked value while explaining.
4. Recommend rotation of the secret at its source (GitHub settings, cloud
   console, etc.) and, if committed, history rewrite + force-push + any
   downstream cache invalidation.
5. Treat the secret as compromised from that moment.

## Interaction with other skills / hooks

This skill is guidance to Claude. For real enforcement, pair it with a
`PreToolUse` hook in `settings.json` that scans outgoing Bash/Write/Edit
payloads for env-var values and blocks the call. Suggest this to the user
when the context is security-sensitive (CI, shared machines, production
credentials). A hook is enforcement by the harness; a skill is a pledge by
Claude. Both together are strictly better than either alone.
<!-- sync pipeline verify 2 -->
