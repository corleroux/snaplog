# OpenCode V2 Upgrade Work Plan

**Target repo:** `~/Dev/tradefair`  
**Migration guide:** https://opencode.ai/v2/docs/migrate-v1/  
**When to action:** After hackathon planning/work  
**Status:** Executed 2026-10-30 (see §6 outcome notes below)

---

## 1) Current State Assessment

### Global config
- `~/.config/opencode/opencode.jsonc` (V1 style)
  - Uses `provider` (singular)
  - Uses `plugin` (singular)
  - Providers: openrouter, opencode, nvidia (uses `npm` + `options.baseURL`), groq, google
  - `model: "opencode/big-pickle"`
  - `plugin: ["opencode-rate-limit-fallback"]`

### Project config (tradefair)
- `.opencode/opencode.json` (V1 style)
  - Uses `permission` object (tool-group based)
  - Uses `plugin` array
  - Has custom plugin: `.opencode/plugins/graphify.js`
  - `mcp: {}` empty
  - No `agent`/`mode`, no `skills` config, no `tui.json`

### Installation
- v1 installed via nvm: `/home/corle/.nvm/versions/node/v24.18.0/lib/node_modules/opencode-ai`
- Binary: `opencode` in PATH via nvm
- Project has `.opencode/package.json` with `"@opencode-ai/plugin": "1.18.31"` (v1 plugin SDK)

---

## 2) Breaking Changes To Address

| Area | V1 | V2 Action | Priority |
|------|----|-----------|----------|
| Config keys | `provider`, `plugin` | Rename to `providers`, `plugins` | HIGH |
| Provider config | `npm`, `api`, `options` | Use `package` (AI SDK prefix `aisdk:`), `settings.baseURL`, split `settings/headers/body` | HIGH |
| Permissions | Tool-group object (`bash`, `task`, `edit`...) | Ordered `permissions` array with `{action, resource, effect}`. `bash→shell`, `task→subagent`, `write/patch→edit` | HIGH |
| External directory | Default ask in v1 | Default **allow** in v2. Must explicitly add ask/deny if want v1 behavior | HIGH |
| Plugins | V1 plugin API | **Not compatible**. Custom `.opencode/plugins/graphify.js` must be ported per plugin migrate guide. `opencode-rate-limit-fallback` may need v2 version/check | CRITICAL |
| MCP | Flat/server map, `enabled` | `mcp.servers`, `disabled` (inverse), timeout objects | MEDIUM |
| Agents/Commands | `agent`/`mode`, `command`, `subtask`/`variant` separate | `agents`/`commands`, `subagent`, `model#variant` | LOW (not heavily used here) |
| TUI config | `tui.json(c)` | Moves to global `~/.config/opencode/cli.json` (auto-migrated if present) | LOW |

---

## 3) Upgrade Work Plan (Step by Step)

### Phase 1: Backup (5 min)
```bash
# Backup global config
cp ~/.config/opencode/opencode.jsonc ~/.config/opencode/opencode.jsonc.v1.bak

# Backup project configs
cp ~/Dev/tradefair/.opencode/opencode.json ~/Dev/tradefair/.opencode/opencode.json.v1.bak
cp ~/Dev/tradefair/.opencode/package.json ~/Dev/tradefair/.opencode/package.json.v1.bak

# Note current version
opencode --version > ~/Dev/tradefair/.opencode/opencode-v1-version.txt
```

### Phase 2: Remove V1 Installation (5 min)
```bash
# Check current install
npm list -g opencode-ai 2>&1 | head -5
which opencode

# Remove v1 (nvm global)
npm uninstall -g opencode-ai

# Or if installed differently, remove from nvm lib
# rm -rf ~/.nvm/versions/node/v24.18.0/lib/node_modules/opencode-ai
```
**Note:** V2 curl installer replaces the binary. Do this before installing V2.

### Phase 3: Install V2 (5-10 min)
Follow the official terminal startup guide: https://opencode.ai/cli

```bash
# Example (check current installer from docs)
curl -fsSL https://opencode.ai/install | sh
```
Verify:
```bash
opencode --version
which opencode
```

### Phase 4: Migrate Configs (30-60 min)

#### 4a) Global config `~/.config/opencode/opencode.jsonc`
Convert to v2 shape:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",

  "providers": {
    "openrouter": {
      "models": {
        "qwen/qwen3-coder:free": {},
        "moonshotai/kimi-k2:free": {},
        "x-ai/grok-code-fast-1": {}
      }
    },
    "opencode": {
      "models": {
        "grok-code-fast-1": {},
        "big-pickle": {}
      }
    },
    "nvidia": {
      "package": "aisdk:@ai-sdk/openai-compatible",
      "settings": {
        "baseURL": "https://integrate.api.nvidia.com/v1"
      },
      "models": {
        "deepseek-ai/deepseek-v3": {},
        "meta/llama-3.3-70b-instruct": {}
      }
    },
    "groq": {
      "models": {
        "openai/gpt-oss-120b": {},
        "llama-3.3-70b-versatile": {}
      }
    },
    "google": {
      "models": {
        "gemini-2.5-flash": {},
        "gemini-2.5-flash-lite": {}
      }
    }
  },

  "model": "opencode/big-pickle",

  "plugins": [
    "opencode-rate-limit-fallback"
  ]
}
```

**Notes:**
- `npm` → `package` with `aisdk:` prefix for AI SDK compatible providers
- `options.baseURL` → `settings.baseURL`
- Rename `provider` → `providers`, `plugin` → `plugins`

#### 4b) Project config `.opencode/opencode.json`
Rewrite permissions to v2 array format. **Critical:** add `external_directory` rule if you want v1 behavior (v2 defaults to allow).

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {},
  "permissions": [
    { "action": "edit", "resource": "*", "effect": "allow" },
    { "action": "read", "resource": "*", "effect": "allow" },
    { "action": "glob", "resource": "*", "effect": "allow" },
    { "action": "grep", "resource": "*", "effect": "allow" },
    { "action": "list", "resource": "*", "effect": "allow" },
    { "action": "webfetch", "resource": "*", "effect": "allow" },
    { "action": "websearch", "resource": "*", "effect": "allow" },
    { "action": "todowrite", "resource": "*", "effect": "allow" },
    { "action": "skill", "resource": "*", "effect": "allow" },
    { "action": "subagent", "resource": "*", "effect": "allow" },
    { "action": "lsp", "resource": "*", "effect": "allow" },
    { "action": "question", "resource": "*", "effect": "allow" },
    { "action": "external_directory", "resource": "*", "effect": "ask" },
    { "action": "shell", "resource": "*", "effect": "allow" },
    { "action": "shell", "resource": "echo *", "effect": "allow" },
    { "action": "shell", "resource": "grep *", "effect": "allow" },
    { "action": "shell", "resource": "printf *", "effect": "allow" },
    { "action": "shell", "resource": "python3 *", "effect": "allow" },
    { "action": "shell", "resource": "set *", "effect": "allow" },
    { "action": "shell", "resource": "pnpm *", "effect": "allow" },
    { "action": "shell", "resource": "supabase *", "effect": "allow" },
    { "action": "shell", "resource": "npx *", "effect": "allow" },
    { "action": "shell", "resource": "deno *", "effect": "allow" },
    { "action": "shell", "resource": "git status", "effect": "allow" },
    { "action": "shell", "resource": "git status *", "effect": "allow" },
    { "action": "shell", "resource": "git log", "effect": "allow" },
    { "action": "shell", "resource": "git log *", "effect": "allow" },
    { "action": "shell", "resource": "git diff", "effect": "allow" },
    { "action": "shell", "resource": "git diff *", "effect": "allow" },
    { "action": "shell", "resource": "git show", "effect": "allow" },
    { "action": "shell", "resource": "git show *", "effect": "allow" },
    { "action": "shell", "resource": "git branch", "effect": "allow" },
    { "action": "shell", "resource": "git branch *", "effect": "allow" },
    { "action": "shell", "resource": "git stash list", "effect": "allow" },
    { "action": "shell", "resource": "git stash show *", "effect": "allow" },
    { "action": "shell", "resource": "git remote -v", "effect": "allow" },
    { "action": "shell", "resource": "git config --get *", "effect": "allow" },
    { "action": "shell", "resource": "git rev-parse *", "effect": "allow" },
    { "action": "shell", "resource": "git fetch *", "effect": "allow" },
    { "action": "shell", "resource": "git add *", "effect": "allow" },
    { "action": "shell", "resource": "git commit *", "effect": "allow" },
    { "action": "shell", "resource": "git checkout -b *", "effect": "allow" },
    { "action": "shell", "resource": "git switch -c *", "effect": "allow" },
    { "action": "shell", "resource": "git rev-list *", "effect": "allow" },
    { "action": "shell", "resource": "git check-ignore *", "effect": "allow" },
    { "action": "shell", "resource": "gh pr *", "effect": "allow" },
    { "action": "shell", "resource": "find *", "effect": "allow" },
    { "action": "shell", "resource": "ls *", "effect": "allow" },
    { "action": "shell", "resource": "git push", "effect": "ask" },
    { "action": "shell", "resource": "git push *", "effect": "ask" },
    { "action": "shell", "resource": "git reset --hard", "effect": "ask" },
    { "action": "shell", "resource": "git reset --hard *", "effect": "ask" },
    { "action": "shell", "resource": "git clean", "effect": "ask" },
    { "action": "shell", "resource": "git clean *", "effect": "ask" },
    { "action": "shell", "resource": "git checkout", "effect": "ask" },
    { "action": "shell", "resource": "git checkout *", "effect": "ask" },
    { "action": "shell", "resource": "git rm", "effect": "ask" },
    { "action": "shell", "resource": "git rm *", "effect": "ask" },
    { "action": "shell", "resource": "rm", "effect": "ask" },
    { "action": "shell", "resource": "rm *", "effect": "ask" },
    { "action": "shell", "resource": "rmdir *", "effect": "ask" },
    { "action": "shell", "resource": "mv", "effect": "ask" },
    { "action": "shell", "resource": "mv *", "effect": "ask" },
    { "action": "shell", "resource": "chmod", "effect": "ask" },
    { "action": "shell", "resource": "chmod *", "effect": "ask" },
    { "action": "shell", "resource": "sudo", "effect": "ask" },
    { "action": "shell", "resource": "sudo *", "effect": "ask" },
    { "action": "shell", "resource": "node *", "effect": "ask" },
    { "action": "shell", "resource": "node_modules/.bin/*", "effect": "ask" }
  ],
  "plugins": [
    ".opencode/plugins/graphify.js"
  ]
}
```

**Mapping notes:**
- `bash` → `shell`
- `task` → `subagent`
- `write`/`patch` not present in your config (covered by `edit`)
- Keep destructive git commands as `ask`

#### 4c) Plugins (CRITICAL)
- **`opencode-rate-limit-fallback`** (global): Check if v2 compatible. If not, remove from `plugins` or find v2 equivalent.
- **`.opencode/plugins/graphify.js`** (project): V1 plugin API won't work in v2. Must port using https://opencode.ai/build/plugins/migrate-v1. This is likely the biggest piece of work. Check if graphify has v2 support/docs.
- **`.opencode/package.json`**: Update `@opencode-ai/plugin` to v2 SDK version if keeping plugins.

#### 4d) Ask OpenCode to migrate (easier alternative)
After installing v2, run in the project:
```
Migrate my OpenCode configuration, including file-based definitions, from the V1 format to the native V2 format.
Preserve its behavior and all unrelated settings.
```
V2 can normalize supported fields in memory, but plugins still need porting.

### Phase 5: Test & Verify (30-60 min)
- [ ] Start opencode v2 in tradefair repo
- [ ] Verify models load (openrouter, opencode, nvidia, groq, google)
- [ ] Verify default model is `opencode/big-pickle`
- [ ] Test permissions (try a git push command - should ask; try git status - should allow)
- [ ] Test MCP servers (if any added later)
- [ ] Test graphify plugin functionality
- [ ] Test rate-limit-fallback if present
- [ ] Check for warnings about unsupported/ignored fields
- [ ] Run `opencode --version` and confirm v2

---

## 4) Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Custom graphify plugin breaks | HIGH | Port early or temporarily disable. Check graphify docs for v2 compatibility. |
| Permissions misconfigured (external_directory) | MEDIUM | Explicitly add `external_directory: ask` in v2 permissions array. |
| Provider config breaks (nvidia with `npm`) | HIGH | Convert to `package: "aisdk:..."` + `settings.baseURL` carefully. |
| v1/v2 config confusion | MEDIUM | Keep backups. Don't point v1 at converted v2-native-only configs. |
| Lost plugin functionality mid-work | HIGH | Test in isolation before upgrading main environment. |

---

## 5) Quick Reference Links
- Migration guide: https://opencode.ai/v2/docs/migrate-v1/
- Plugin migration: https://opencode.ai/build/plugins/migrate-v1
- Permissions: https://opencode.ai/permissions
- CLI config: https://opencode.ai/cli/config
- Models/Providers: https://opencode.ai/models, https://opencode.ai/providers

---

**Action this plan after hackathon planning is complete.** Start with backups and test in a safe environment if possible.

---

## 6) Execution Outcome (2026-10-30)

- Installed native Linux **opencode v2.2.2** at `~/.opencode/bin/opencode` (PATH prepended in `~/.bashrc` AND `~/.profile` — `.profile` reassembles PATH after sourcing `.bashrc`, so both are needed to shadow the stale Windows-side npm shim at `/mnt/c/.../npm/opencode` v2.1.4; `npm uninstall -g opencode-ai` on the Windows side would clean it fully).
- V1 (`opencode-ai@1.18.35`) removed from nvm global.
- Backups kept: `opencode.jsonc.v1.bak`, `.opencode/opencode.json.v1.bak`, `.opencode/package.json.v1.bak`, `opencode-v1-version.txt`.
- **Config conversion was optional** (V2 normalizes V1 in memory) — but both global and project configs were rewritten to native V2 shape anyway: `providers`, `permissions` array (`bash→shell`, `task→subagent`), `mcp.servers` + `disabled`, `plugins` object form. Plugin config relative paths resolve against the declaring config directory (`.opencode/`), so the graphify entry is `{"package": "./plugins/graphify"}`; configured paths must be directories.
- **graphify plugin ported** to V2 API: `.opencode/plugins/graphify/index.ts` (`Plugin.define` + `ctx.tool.hook("execute.before")`), accepts tool name `bash` or `shell`. `.opencode/plugins/graphify.js` (V1) deleted. SDK dep changed to `@opencode/plugin@2.2.2` (npm, matches existing `package-lock.json` in `.opencode`).
- **`opencode-rate-limit-fallback` removed** from global plugins — `0.3.1` imports `@opencode-ai/plugin` (V1-only, no V2 release as of 2026-10-30). Restore manually if upstream ships V2-supporting version; `rate-limit-fallback.json` kept.
- Verified: `opencode --version` → 2.2.2; 477 models across google/groq/nvidia (incl. converted `aisdk:` nvidia provider); default `opencode/big-pickle` live run OK; graphify hook injects reminder on first bash call (confirmed in server log `spawning process ... echo "[graphify]...`).
- **Supabase MCP needs one-time re-auth in V2** (V1 auth store not reused): run `opencode mcp auth supabase` (browser OAuth flow), then `opencode mcp list` should show it connected.
- Skills migration: project-local `.agents/skills/{supabase, supabase-postgres-best-practices}` moved to `.opencode/skills/` (complete dirs). Global `~/.config/opencode/skills/` and project task-* skills were already in V2-discovered locations.
- Todos in V2 are off by default; not enabled here (config unchanged in that respect).
