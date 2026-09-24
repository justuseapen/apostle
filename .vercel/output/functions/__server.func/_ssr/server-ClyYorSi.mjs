import { i as TSS_SERVER_FUNCTION, r as createServerFn } from "./ssr.mjs";
import { t as authMiddleware } from "./middleware-Col0etPw.mjs";
import { r as getSql } from "./db-CuW71Kkh.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/server-ClyYorSi.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var DEFAULT_PROMPT = "You are Apostle, a chat assistant the operator installed and themed. Be concise, concrete, and useful. When a tool is available and it would make the answer true, use it.";
var PLUGINS = [{
	id: "get_time",
	name: "Clock",
	blurb: "Current time in a timezone.",
	tool: {
		type: "function",
		function: {
			name: "get_time",
			description: "Return the current time in an IANA timezone. Default America/New_York.",
			parameters: {
				type: "object",
				properties: { timezone: { type: "string" } }
			}
		}
	}
}, {
	id: "fetch_page",
	name: "Page fetch",
	blurb: "Read a public https page as text.",
	tool: {
		type: "function",
		function: {
			name: "fetch_page",
			description: "Fetch a public https URL and return readable text. No logins, no localhost.",
			parameters: {
				type: "object",
				properties: { url: { type: "string" } },
				required: ["url"]
			}
		}
	}
}];
function routeLabel(text) {
	const t = text.toLowerCase();
	if (/\b(image|photo|screenshot|picture|diagram)\b/.test(t)) return {
		label: "vision",
		reason: "Looks like a visual ask."
	};
	if (t.length > 700 || /\b(architect|compare|analyze|analyse|tradeoff|design)\b/.test(t)) return {
		label: "strong",
		reason: "Long or analytical."
	};
	if (t.length < 48 && !/\b(why|how|explain)\b/.test(t)) return {
		label: "cheap",
		reason: "Short turn."
	};
	return {
		label: "default",
		reason: "Ordinary chat."
	};
}
var BUDGET = {
	cheap: 280,
	default: 700,
	strong: 1400,
	vision: 900
};
function parseList(raw) {
	try {
		const v = JSON.parse(raw ?? "[]");
		return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
	} catch {
		return [];
	}
}
function parseMap(raw) {
	const fallback = {
		cheap: "grok-4.5",
		default: "grok-4.5",
		strong: "grok-4.5",
		vision: "grok-4.5"
	};
	try {
		const v = JSON.parse(raw ?? "{}");
		return {
			cheap: v.cheap || fallback.cheap,
			default: v.default || fallback.default,
			strong: v.strong || fallback.strong,
			vision: v.vision || fallback.vision
		};
	} catch {
		return fallback;
	}
}
async function ensureSettings(userId) {
	const sql = await getSql();
	await sql`
    insert into settings (user_id) values (${userId})
    on conflict (user_id) do nothing
  `;
	return (await sql`
    select system_prompt, plugins, model_map, enforce_quota
    from settings where user_id = ${userId}
  `)[0];
}
var listThreads_createServerFn_handler = createServerRpc({
	id: "eebb5b508840a0f22beebf9f35ec1a12cc6113983a54f8961b43a1fd9af91cd3",
	name: "listThreads",
	filename: "src/lib/apostle/server.ts"
}, (opts) => listThreads.__executeServer(opts));
var listThreads = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(listThreads_createServerFn_handler, async ({ context }) => {
	return (await getSql())`
      select id, title, created_at::text as created_at
      from threads where user_id = ${context.userId}
      order by created_at desc
    `;
});
var listMessages_createServerFn_handler = createServerRpc({
	id: "617bd1ef418ac6cea1b4384016139dceae64f1fcda71e5fd08dea5cb0fc458dd",
	name: "listMessages",
	filename: "src/lib/apostle/server.ts"
}, (opts) => listMessages.__executeServer(opts));
var listMessages = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((threadId) => threadId).handler(listMessages_createServerFn_handler, async ({ context, data: threadId }) => {
	return (await getSql())`
      select id, role, content, meta, created_at::text as created_at
      from messages
      where thread_id = ${threadId} and user_id = ${context.userId}
      order by created_at asc
    `;
});
var getDesk_createServerFn_handler = createServerRpc({
	id: "2c0ee7f5dc89f964216704d08b7fe844396306dd9528a3d7d00a4eb7c961bb90",
	name: "getDesk",
	filename: "src/lib/apostle/server.ts"
}, (opts) => getDesk.__executeServer(opts));
var getDesk = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(getDesk_createServerFn_handler, async ({ context }) => {
	const settings = await ensureSettings(context.userId);
	const sql = await getSql();
	return {
		settings,
		usage: await sql`
      select id, model, label, tokens_in, tokens_out, created_at::text as created_at
      from usage_events where user_id = ${context.userId}
      order by created_at desc limit 24
    `,
		userMessages: (await sql`
      select count(*)::int as n from messages
      where user_id = ${context.userId} and role = 'user'
    `)[0]?.n ?? 0,
		catalog: PLUGINS.map((p) => ({
			id: p.id,
			name: p.name,
			blurb: p.blurb
		})),
		gateway: process.env.XAI_API_KEY ? "grok" : "missing"
	};
});
var saveDesk_createServerFn_handler = createServerRpc({
	id: "40bcbce2fd2261c7548578f140bfc6670822a4db6eab511804540d88305189ce",
	name: "saveDesk",
	filename: "src/lib/apostle/server.ts"
}, (opts) => saveDesk.__executeServer(opts));
var saveDesk = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => input).handler(saveDesk_createServerFn_handler, async ({ context, data }) => {
	const sql = await getSql();
	const allowed = new Set(PLUGINS.map((p) => p.id));
	const plugins = data.plugins.filter((id) => allowed.has(id));
	const map = parseMap(JSON.stringify(data.model_map));
	await sql`
      insert into settings (user_id, system_prompt, plugins, model_map, enforce_quota)
      values (
        ${context.userId},
        ${data.system_prompt.slice(0, 4e3)},
        ${JSON.stringify(plugins)},
        ${JSON.stringify(map)},
        ${data.enforce_quota}
      )
      on conflict (user_id) do update set
        system_prompt = excluded.system_prompt,
        plugins = excluded.plugins,
        model_map = excluded.model_map,
        enforce_quota = excluded.enforce_quota
    `;
	return { ok: true };
});
function blockedHost(hostname) {
	const h = hostname.toLowerCase();
	return h === "localhost" || h.endsWith(".local") || h === "0.0.0.0" || h.startsWith("127.") || h.startsWith("10.") || h.startsWith("192.168.") || /^172\.(1[6-9]|2\d|3[0-1])\./.test(h);
}
async function runTool(name, rawArgs) {
	let args = {};
	try {
		args = JSON.parse(rawArgs || "{}");
	} catch {
		args = {};
	}
	if (name === "get_time") {
		const tz = args.timezone || "America/New_York";
		try {
			return new Intl.DateTimeFormat("en-US", {
				timeZone: tz,
				dateStyle: "full",
				timeStyle: "long"
			}).format(/* @__PURE__ */ new Date());
		} catch {
			return `Unknown timezone: ${tz}`;
		}
	}
	if (name === "fetch_page") {
		let url;
		try {
			url = new URL(args.url || "");
		} catch {
			return "That is not a URL.";
		}
		if (url.protocol !== "https:" || blockedHost(url.hostname)) return "Only public https pages are allowed.";
		const ctrl = new AbortController();
		const timer = setTimeout(() => ctrl.abort(), 8e3);
		try {
			const res = await fetch(url, {
				signal: ctrl.signal,
				headers: { "User-Agent": "Apostle/0.1" },
				redirect: "follow"
			});
			const stripped = (await res.text()).replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 3500);
			return `HTTP ${res.status}\n${stripped || "(empty)"}`;
		} catch {
			return "Could not fetch that page.";
		} finally {
			clearTimeout(timer);
		}
	}
	return "Unknown tool.";
}
var sendMessage_createServerFn_handler = createServerRpc({
	id: "347acb3da2232ebe1b59364bff6eb033ce203a304db172ccd20f6911b5658d11",
	name: "sendMessage",
	filename: "src/lib/apostle/server.ts"
}, (opts) => sendMessage.__executeServer(opts));
var sendMessage = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => ({
	threadId: input.threadId,
	text: input.text.trim().slice(0, 8e3)
})).handler(sendMessage_createServerFn_handler, async ({ context, data }) => {
	if (!data.text) return {
		ok: false,
		error: "Write something first."
	};
	const apiKey = process.env.XAI_API_KEY;
	if (!apiKey) return {
		ok: false,
		error: "The model gateway is not available in this environment."
	};
	const sql = await getSql();
	const settings = await ensureSettings(context.userId);
	if (settings.enforce_quota) {
		if (((await sql`
        select count(*)::int as n from messages
        where user_id = ${context.userId} and role = 'user'
      `)[0]?.n ?? 0) >= 40) return {
			ok: false,
			error: "Free plan is capped at 40 messages. Turn the cap off in the desk, or raise the plan."
		};
	}
	let threadId = data.threadId;
	if (threadId) {
		if (!(await sql`
        select id from threads where id = ${threadId} and user_id = ${context.userId}
      `)[0]) threadId = null;
	}
	if (!threadId) {
		threadId = crypto.randomUUID();
		const title = data.text.slice(0, 72);
		await sql`
        insert into threads (id, user_id, title) values (${threadId}, ${context.userId}, ${title})
      `;
	}
	const userMsgId = crypto.randomUUID();
	await sql`
      insert into messages (id, thread_id, user_id, role, content)
      values (${userMsgId}, ${threadId}, ${context.userId}, 'user', ${data.text})
    `;
	const history = await sql`
      select role, content from messages
      where thread_id = ${threadId} and user_id = ${context.userId}
      order by created_at asc
      limit 24
    `;
	const decision = routeLabel(data.text);
	const model = parseMap(settings.model_map)[decision.label] || "grok-4.5";
	const enabled = parseList(settings.plugins);
	const tools = PLUGINS.filter((p) => enabled.includes(p.id)).map((p) => p.tool);
	const messages = [{
		role: "system",
		content: settings.system_prompt?.trim() || DEFAULT_PROMPT
	}, ...history.filter((m) => m.role === "user" || m.role === "assistant").map((m) => ({
		role: m.role,
		content: m.content
	}))];
	const traces = [];
	let tokensIn = 0;
	let tokensOut = 0;
	let answer = "";
	for (let round = 0; round < 3; round++) {
		const res = await fetch("https://api.x.ai/v1/chat/completions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`
			},
			body: JSON.stringify({
				model,
				messages,
				tools: tools.length ? tools : void 0,
				max_tokens: BUDGET[decision.label],
				temperature: .4
			})
		});
		if (!res.ok) {
			const errText = await res.text();
			return {
				ok: false,
				error: `Gateway ${res.status}: ${errText.slice(0, 180)}`,
				threadId
			};
		}
		const body = await res.json();
		tokensIn += body.usage?.prompt_tokens ?? 0;
		tokensOut += body.usage?.completion_tokens ?? 0;
		const msg = body.choices?.[0]?.message;
		const calls = msg?.tool_calls ?? [];
		if (!calls.length) {
			answer = msg?.content?.trim() || "I didn't get a reply.";
			break;
		}
		messages.push({
			role: "assistant",
			content: msg?.content || "",
			tool_calls: calls
		});
		for (const call of calls) {
			const result = await runTool(call.function.name, call.function.arguments);
			traces.push({
				name: call.function.name,
				args: call.function.arguments,
				result
			});
			messages.push({
				role: "tool",
				tool_call_id: call.id,
				content: result
			});
		}
	}
	const meta = JSON.stringify({
		label: decision.label,
		reason: decision.reason,
		model,
		tools: traces
	});
	const assistantId = crypto.randomUUID();
	await sql`
      insert into messages (id, thread_id, user_id, role, content, meta)
      values (${assistantId}, ${threadId}, ${context.userId}, 'assistant', ${answer}, ${meta})
    `;
	await sql`
      insert into usage_events (id, user_id, thread_id, model, label, tokens_in, tokens_out)
      values (${crypto.randomUUID()}, ${context.userId}, ${threadId}, ${model}, ${decision.label}, ${tokensIn}, ${tokensOut})
    `;
	return {
		ok: true,
		threadId,
		message: {
			id: assistantId,
			role: "assistant",
			content: answer,
			meta
		},
		userMessageId: userMsgId
	};
});
//#endregion
export { getDesk_createServerFn_handler, listMessages_createServerFn_handler, listThreads_createServerFn_handler, saveDesk_createServerFn_handler, sendMessage_createServerFn_handler };
