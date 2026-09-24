import { o as __toESM } from "../_runtime.mjs";
import { y as require_jsx_runtime, z as require_react } from "../_libs/@tanstack/react-router+[...].mjs";
import { i as listThreads, o as sendMessage, r as listMessages, t as Shell } from "./server-D05Disaz.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-BMeYa7iB.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function readMeta(raw) {
	if (!raw) return {};
	try {
		return JSON.parse(raw);
	} catch {
		return {};
	}
}
function Chat() {
	const [threads, setThreads] = (0, import_react.useState)([]);
	const [active, setActive] = (0, import_react.useState)(null);
	const [messages, setMessages] = (0, import_react.useState)([]);
	const [draft, setDraft] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)("");
	const [openList, setOpenList] = (0, import_react.useState)(false);
	const scroller = (0, import_react.useRef)(null);
	async function refreshThreads() {
		const rows = await listThreads();
		setThreads(rows);
		return rows;
	}
	(0, import_react.useEffect)(() => {
		refreshThreads().then((rows) => {
			if (rows[0]) {
				setActive(rows[0].id);
				return listMessages({ data: rows[0].id }).then(setMessages);
			}
		}).catch(() => setError("Could not load your threads."));
	}, []);
	(0, import_react.useEffect)(() => {
		scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
	}, [messages, busy]);
	async function openThread(id) {
		setActive(id);
		setOpenList(false);
		setMessages(await listMessages({ data: id }));
	}
	function fresh() {
		setActive(null);
		setMessages([]);
		setOpenList(false);
		setError("");
	}
	async function onSend() {
		const text = draft.trim();
		if (!text || busy) return;
		setDraft("");
		setBusy(true);
		setError("");
		const optimistic = {
			id: "pending-user",
			role: "user",
			content: text,
			meta: null,
			created_at: (/* @__PURE__ */ new Date()).toISOString()
		};
		setMessages((m) => [...m, optimistic]);
		try {
			const result = await sendMessage({ data: {
				threadId: active,
				text
			} });
			if (!result.ok) {
				setError(result.error);
				setMessages((m) => m.filter((x) => x.id !== "pending-user"));
				return;
			}
			setActive(result.threadId);
			setMessages(await listMessages({ data: result.threadId }));
			await refreshThreads();
		} catch {
			setError("The reply failed. Try again.");
			setMessages((m) => m.filter((x) => x.id !== "pending-user"));
		} finally {
			setBusy(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid h-[calc(100dvh-3.5rem)] lg:grid-cols-[16rem_1fr]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
			className: `${openList ? "flex" : "hidden"} absolute inset-x-0 top-14 z-10 max-h-[70dvh] flex-col border-b border-line bg-paper lg:static lg:flex lg:max-h-none lg:border-b-0 lg:border-r`,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "p-3",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: fresh,
					className: "h-11 w-full rounded-full bg-ink text-paper",
					children: "New thread"
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
				className: "flex-1 overflow-y-auto px-2 pb-4",
				children: [threads.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
					className: "px-2 py-3 text-sm text-mute",
					children: "No threads yet."
				}), threads.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => openThread(t.id),
					className: `w-full truncate rounded-xl px-3 py-3 text-left text-sm ${t.id === active ? "bg-bone" : ""}`,
					children: t.title
				}) }, t.id))]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "flex min-h-0 flex-col",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex items-center justify-between border-b border-line px-4 py-2 lg:hidden",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "h-11 px-2 text-sm",
						onClick: () => setOpenList((v) => !v),
						children: "Threads"
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					ref: scroller,
					className: "min-h-0 flex-1 overflow-y-auto px-4 py-6",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mx-auto flex max-w-2xl flex-col gap-5",
						children: [
							messages.length === 0 && !busy && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "pt-10",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "font-display text-4xl leading-tight",
									children: "What should this assistant do?"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-3 max-w-md text-mute",
									children: "Apostle is the install. The desk is where you change the voice and turn plugins on. Try “what time is it in Aberdeen?” or paste a public https link."
								})]
							}),
							messages.map((m) => {
								const meta = readMeta(m.meta);
								const mine = m.role === "user";
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
									className: mine ? "self-end max-w-[85%]" : "max-w-full",
									children: [
										!mine && meta.label && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
											className: "mb-1 text-xs uppercase tracking-wide text-mute",
											children: [
												meta.label,
												" · ",
												meta.model
											]
										}),
										meta.tools?.map((tool, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("pre", {
											className: "mb-2 overflow-x-auto rounded-xl border border-line bg-bone p-3 text-xs whitespace-pre-wrap",
											children: [
												tool.name,
												"\n",
												tool.result.slice(0, 500)
											]
										}, `${m.id}-t-${i}`)),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: mine ? "rounded-2xl bg-ink px-4 py-3 text-paper" : "text-ink leading-relaxed",
											children: m.content
										})
									]
								}, m.id);
							}),
							busy && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm text-mute",
								children: "Working…"
							}),
							error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm text-signal",
								children: error
							})
						]
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("form", {
					className: "border-t border-line p-3",
					onSubmit: (e) => {
						e.preventDefault();
						onSend();
					},
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mx-auto flex max-w-2xl gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: draft,
							onChange: (e) => setDraft(e.target.value),
							placeholder: "Message Apostle",
							className: "h-12 min-w-0 flex-1 rounded-full border border-line bg-bone px-4 outline-none"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "submit",
							disabled: busy || !draft.trim(),
							className: "h-12 rounded-full bg-signal px-5 text-signal-ink disabled:opacity-40",
							children: "Send"
						})]
					})
				})
			]
		})]
	}) });
}
//#endregion
export { Chat as component };
