import { o as __toESM } from "../_runtime.mjs";
import { y as require_jsx_runtime, z as require_react } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as saveDesk, n as getDesk, t as Shell } from "./server-D05Disaz.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin-BS6C6Fkv.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var LABELS = [
	"cheap",
	"default",
	"strong",
	"vision"
];
function Desk() {
	const [prompt, setPrompt] = (0, import_react.useState)("");
	const [plugins, setPlugins] = (0, import_react.useState)([]);
	const [catalog, setCatalog] = (0, import_react.useState)([]);
	const [map, setMap] = (0, import_react.useState)({});
	const [quota, setQuota] = (0, import_react.useState)(false);
	const [usage, setUsage] = (0, import_react.useState)([]);
	const [count, setCount] = (0, import_react.useState)(0);
	const [gateway, setGateway] = (0, import_react.useState)("");
	const [note, setNote] = (0, import_react.useState)("");
	(0, import_react.useEffect)(() => {
		getDesk().then((desk) => {
			setPrompt(desk.settings.system_prompt);
			setPlugins(JSON.parse(desk.settings.plugins));
			setMap(JSON.parse(desk.settings.model_map));
			setQuota(desk.settings.enforce_quota);
			setCatalog(desk.catalog);
			setUsage(desk.usage);
			setCount(desk.userMessages);
			setGateway(desk.gateway);
		}).catch(() => setNote("Could not open the desk."));
	}, []);
	async function save() {
		setNote("");
		await saveDesk({ data: {
			system_prompt: prompt,
			plugins,
			model_map: map,
			enforce_quota: quota
		} });
		setNote("Saved.");
	}
	function toggle(id) {
		setPlugins((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shell, {
		desk: true,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
			className: "mx-auto flex max-w-2xl flex-col gap-8 px-4 py-8",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "font-display text-4xl",
					children: "Desk"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-2 text-mute",
					children: [
						"Gateway ",
						gateway === "grok" ? "is live on Grok." : "is unavailable.",
						" The router picks cheap, default, strong, or vision before each reply. Jev can sit in that slot later; this build uses the same four questions locally."
					]
				})] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "flex flex-col gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-sm",
						children: "Voice"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						value: prompt,
						onChange: (e) => setPrompt(e.target.value),
						rows: 5,
						placeholder: "Leave blank for the default Apostle voice.",
						className: "rounded-2xl border border-line bg-bone p-3 outline-none"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-2xl",
					children: "Plugins"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-3 flex flex-col gap-2",
					children: catalog.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => toggle(p.id),
						className: "flex min-h-14 w-full items-center justify-between rounded-2xl border border-line px-4 py-3 text-left",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "block",
							children: p.name
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-sm text-mute",
							children: p.blurb
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: plugins.includes(p.id) ? "text-ok" : "text-mute",
							children: plugins.includes(p.id) ? "On" : "Off"
						})]
					}) }, p.id))
				})] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-2xl",
					children: "Model map"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-3 grid gap-3",
					children: LABELS.map((label) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "flex flex-col gap-1 text-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "capitalize",
							children: label
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: map[label] ?? "",
							onChange: (e) => setMap({
								...map,
								[label]: e.target.value
							}),
							className: "h-12 rounded-full border border-line bg-bone px-4 outline-none"
						})]
					}, label))
				})] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => setQuota((v) => !v),
					className: "flex min-h-14 items-center justify-between rounded-2xl border border-line px-4 text-left",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "block",
						children: "Free-plan cap"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "text-sm text-mute",
						children: [count, " messages sent. Cap is 40."]
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: quota ? "text-signal" : "text-mute",
						children: quota ? "Enforced" : "Off"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => void save(),
					className: "h-12 rounded-full bg-ink text-paper",
					children: "Save desk"
				}),
				note && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-mute",
					children: note
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-2xl",
					children: "Recent runs"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
					className: "mt-3 flex flex-col gap-2 text-sm",
					children: [usage.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
						className: "text-mute",
						children: "No runs yet."
					}), usage.map((u) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "flex justify-between gap-3 border-b border-line py-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
							u.label,
							" · ",
							u.model
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-mute",
							children: [
								u.tokens_in,
								" in / ",
								u.tokens_out,
								" out"
							]
						})]
					}, u.id))]
				})] })
			]
		})
	});
}
//#endregion
export { Desk as component };
