import { y as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as signIn } from "./client-B40BzJxt.mjs";
import { t as GROK_PROVIDERS } from "./server-_ZfRZp04.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/login-DpKR_mbw.js
var import_jsx_runtime = require_jsx_runtime();
function Login() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		className: "grid min-h-dvh place-items-center bg-paper px-6",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "w-full max-w-sm",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-display text-4xl text-ink",
					children: "Apostle"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-mute",
					children: "A chat you install. Plugins you switch on."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-8 flex flex-col gap-3",
					children: GROK_PROVIDERS.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => signIn(p.providerId, { callbackURL: "/" }),
						className: "h-12 rounded-full border border-line bg-bone px-4 text-ink",
						children: ["Continue with ", p.label]
					}, p.providerId))
				})
			]
		})
	});
}
//#endregion
export { Login as component };
