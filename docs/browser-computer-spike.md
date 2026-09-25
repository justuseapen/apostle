# Browser Computer spike

**Status:** shipped as an OSS plugin spike (honest limits) · CLI/desktop deferred · Firecracker still enterprise Spike · billing still out for OSS  
**Theme:** Phosphor (public) + Super Intelligence (`?theme=si`) stay chrome-only — Computer is a plugin, not a theme.

## What it is

A **Computer** plugin in the frozen registry (`id: computer`, tool `computer`) that gives chat a **browser-sandbox workspace**:

| Action | What it does |
|--------|----------------|
| `list` | List files in the per-thread VFS |
| `read` | Read a workspace file |
| `write` | Write / overwrite a workspace file |
| `run` | Constrained shell builtins against the VFS only |
| `info` | Print capabilities + limits |

Slash: `/computer` (aliases `shell`, `fs`, `workspace`, `vfs`).

Artifacts (Context → Artifacts) lists the thread’s workspace files, with:

- **Refresh**
- **Grant folder** — File System Access API (Chrome/Edge) imports shallow text files into the VFS
- **OPFS** — optional Origin Private File System mirror status
- Collapsible **Capabilities + limits** copy
- File count + `/computer` run hint in the drawer
- Shell deepen (Better VM steps): `cp`, `mv`, `grep` (literal) — still VFS-only, not host

## How to try

```bash
# from repo root, with apostle-dev on :8080
npm run dev   # if not already up
```

1. Open `http://localhost:8080` (Phosphor) or `http://localhost:8080/?theme=si`.
2. Sign in → Desk → confirm **Computer** is `[on]` under Plugins → Save if needed.
3. Point the gateway at Ollama if you want tool calls: base `http://localhost:11434/v1`, models `qwen3:0.6b`.
4. In chat, try:
   - `/computer` then ask to write `README.md` and list the workspace
   - Explicit: *Call the computer tool with action write, path /hello.txt, content hi — then list.*
5. Open **Artifacts** (xl viewport) — files should appear after the tool turn.
6. Optional: **Grant folder** to import local text files (at your own risk of data you grant).

Without a model that emits tool calls, you can still demo FS via Artifacts **Grant folder**, or seed with a scripted tool turn.

## Capabilities (honest)

- Per-thread **virtual filesystem** persisted in Postgres/PGLite (`computer_files`) — not the Mac disk by default
- Constrained shell: `ls`, `cat`, `echo` (+ `>` / `>>`), `mkdir`, `rm`, `cp`, `mv`, `grep`, `touch`, `head`, `wc`, `find`, `pwd`, `clear`, `help`
- Browser APIs: **OPFS** mirror, **File System Access** directory grant (when available)
- Network: **none** (plugin `needs.network: []` — default deny)

## Limits (at your own risk)

- **Not a host terminal** — no real bash, Node, npm, or process spawn
- **Not your Mac filesystem** unless you explicitly grant a folder (import only; still copied into the VFS)
- No pipes / redirects beyond simple `echo … > file`
- No WebContainer / wasm Linux in this spike (see internal notes)
- **CLI / Electron / desktop companion: deferred** (Justus decision)
- **Firecracker-class isolation: enterprise Spike**, not this OSS path
- Data you import is at your own risk — treat the workspace as untrusted sandbox storage

## Related

- Roadmap: README **Next → Computer (browser-first)**; enterprise matrix in `docs/enterprise-buyin-roadmap.md`
- Browser: `docs/browser-use.md`
- Demo: `docs/demo-script.md`
- Repo screenshots: `screenshots/oss-launch-*.png` (Phosphor only)
