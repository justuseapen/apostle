//#region node_modules/.nitro/vite/services/ssr/assets/_tanstack-start-manifest_v-BVfNmahB.js
var tsrStartManifest = () => ({ routes: {
	__root__: {
		filePath: "/workspace/src/routes/__root.tsx",
		children: [
			"/",
			"/admin",
			"/login",
			"/api/auth/$"
		],
		preloads: ["/assets/index-CJXhj-ys.js"],
		scripts: [{ attrs: {
			type: "module",
			async: !0,
			src: "/assets/index-CJXhj-ys.js"
		} }]
	},
	"/": {
		filePath: "/workspace/src/routes/index.tsx",
		children: void 0,
		preloads: ["/assets/routes-tljv9bgA.js", "/assets/server-G98cbTYG.js"]
	},
	"/admin": {
		filePath: "/workspace/src/routes/admin.tsx",
		children: void 0,
		preloads: ["/assets/admin-DDmb5sas.js", "/assets/server-G98cbTYG.js"]
	},
	"/login": {
		filePath: "/workspace/src/routes/login.tsx",
		children: void 0,
		preloads: ["/assets/login-JQmcGB2K.js", "/assets/client-CONwiuxm.js"]
	}
} });
//#endregion
export { tsrStartManifest };
