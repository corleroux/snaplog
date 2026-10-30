// graphify OpenCode plugin (V2 plugin API)
// Injects a knowledge graph reminder before the first bash tool call when the graph exists.
//
// IMPORTANT: keep the reminder string free of backticks and $(...) constructs.
// The hook prepends `echo "<reminder>" && <cmd>` to the user's bash command;
// backticks inside the double-quoted echo trigger bash command substitution,
// which both corrupts tool output and silently executes the very graphify
// command we are only suggesting. Plain words render fine in opencode's TUI.
import { Plugin } from "@opencode/plugin"
import { existsSync } from "fs"
import { join } from "path"

export default Plugin.define({
  id: "graphify",
  async setup(ctx) {
    if (!existsSync(join(ctx.location.directory, "graphify-out", "graph.json"))) return
    let reminded = false
    await ctx.tool.hook("execute.before", (event) => {
      if (reminded) return
      if (event.tool !== "bash" && event.tool !== "shell") return
      const cmd = (event.input as { command?: string })?.command
      if (typeof cmd !== "string") return
      // ';' not '&&' — Windows PowerShell 5.1 rejects '&&' as a statement
      // separator, breaking the first bash command of the session (#1646).
      event.input.command =
        'echo "[graphify] knowledge graph at graphify-out/. For focused questions, run graphify query with your question (scoped subgraph, usually much smaller than GRAPH_REPORT.md) instead of grepping raw files. Read GRAPH_REPORT.md only for broad architecture context." ; ' +
        event.input.command
      reminded = true
    })
  },
})
