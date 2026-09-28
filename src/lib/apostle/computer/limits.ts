/**
 * Computer capabilities blurb — shown in tool info + Artifacts UX.
 * Honest about browser sandbox limits; CLI/desktop deferred.
 */
export const COMPUTER_LIMITS = `Apostle Computer (browser sandbox)

What works now:
• Virtual workspace per chat thread (list / read / write files)
• Constrained shell builtins (ls, cat, echo, mkdir, rm, cp, mv, grep, head, wc, find) — not a host terminal
• Artifacts drawer lists workspace files (preview, grant folder, OPFS mirror)
• Optional: grant a local folder via the File System Access API (Chrome) to import into the VFS; optional OPFS mirror in this browser

What does NOT work (needs native / Firecracker later):
• Real bash / Node / package installs on your Mac
• Unjailed host filesystem or Electron/CLI companion
• Network from the shell (default deny — law)
• Persistent VM / Firecracker-class isolation (enterprise Spike — not OSS default)

Next honest deepen: Better VM (clearer sandbox + richer runtime inside the browser cage). cp/mv/grep are small Better-VM steps — still VFS-only.
At your own risk of any data you grant or import into the workspace.
OSS spike — not an enterprise sandbox proof. Not “done.”`;

export const COMPUTER_BLURB =
  "Browser workspace: list/read/write files + constrained shell. Not host FS.";
