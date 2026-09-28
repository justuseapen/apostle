# Plugins — add one in an afternoon

**Audience:** someone who can clone Apostle and wants a third-party-style tool without forking the chat harness.  
**Law:** themes never register tools. Plugins declare `needs`; core refuses the rest. Default is deny.

## Ritual (checklist)

1. **Copy the scaffold** — start from `src/lib/apostle/plugins/hash.ts` (Hash is the shipping example beyond clock / fetch / calc).
2. **Implement `ApostlePlugin`** — `id`, `name`, `blurb`, `needs`, `tool` (OpenAI function schema), `run(args, ctx?)`.
3. **Register** — import and append in `src/lib/apostle/plugins/index.ts` (`PLUGINS` array). Do **not** edit `server.ts` for tool wiring.
4. **Slash skill** — add the plugin to `INSTALLED` + `PLUGIN_PROMPTS` in `src/lib/apostle/slash-skills.ts` (keep lists aligned with the registry).
5. **Desk enable** — toggle the plugin under `/admin` → Plugins → Save. New operators get defaults from settings; Hash is catalogued but not auto-enabled until you turn it on (or soft-enable in local seed if you choose).
6. **Test** — add `*.test.ts` next to the plugin; include it in `package.json` `"test"` / `"test:ci"` scripts if it is Apostle-critical.
7. **Try** — `npm run dev` → sign in → Desk → enable → chat `/hash` (or your command) → confirm tool card.

## Contract (frozen)

```ts
type ApostlePlugin = {
  id: string;
  name: string;
  blurb: string;
  needs: { network: string[]; secrets: string[]; approval: boolean };
  tool: ToolDefinition; // OpenAI-compatible function tool
  run: (args: Record<string, string>, ctx?: PluginRunContext) => Promise<string>;
};
```

- `needs.network`: host patterns the tool may call. Empty = none.
- `needs.secrets`: env keys the tool may read. Empty = none.
- `needs.approval`: when true, a human must approve (HITL protocol still partial — declare honestly).
- `ctx.userId` / `ctx.threadId`: available for durable per-operator / per-thread state (Computer, Browser, Missing).

## Afternoon demo: Hash

Hash digests text with SHA-256 / SHA-1 / MD5. No network. No harness edits.

```bash
npm install && npm run dev
# sign in as test@apostle.local / password123
# Desk → Plugins → Hash [on] → Save
# Chat: /hash then finish the prompt, or ask “SHA-256 of hello with the hash tool”
```

## What not to do

- Do not hard-code tools inside `server.ts` or the chat route.
- Do not put tool logic in a theme (`data-theme` / CSS tokens only — see [`themes.md`](./themes.md)).
- Do not claim host shell / arbitrary web / Firecracker unless the plugin’s honesty copy matches.

## Related

- Types: `src/lib/apostle/plugins/types.ts`
- Registry: `src/lib/apostle/plugins/index.ts`
- CONTRIBUTING: [`../CONTRIBUTING.md`](../CONTRIBUTING.md)
- Computer / Browser honesty: [`browser-computer-spike.md`](./browser-computer-spike.md), [`browser-use.md`](./browser-use.md)
