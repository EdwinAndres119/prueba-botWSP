/**
 * build-bundle.js
 *
 * Genera dist/bundle.cjs listo para Node SEA.
 *
 * El problema central de Node SEA es que el require() del embedding
 * (embedderRequire) solo puede cargar builtins de Node — no puede resolver
 * módulos externos de node_modules/. Para solucionarlo:
 *
 * 1. Bundleamos todo el JS de terceros dentro del blob (sin external).
 * 2. Los únicos require() que quedan son de builtins de Node (fs, path, etc.)
 *    y de binarios nativos .node — que sí necesitan ir al filesystem.
 * 3. Para los .node nativos, un plugin esbuild los intercepta y genera un shim
 *    que usa createRequire() apuntando al filesystem junto al exe.
 */

import * as esbuild from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Plugin: reemplaza require() de binarios .node nativos por un shim
 * que usa createRequire para resolverlos desde el disco.
 * Funciona tanto en modo dev (dist/node_modules/) como en SEA (junto al exe).
 */
const nativeBindingPlugin = {
	name: "native-binding-sea",
	setup(build) {
		// Intercepta cualquier import que termine en .node
		build.onResolve({ filter: /\.node$/ }, (args) => {
			return { path: args.path, namespace: "native-binding-shim" };
		});

		// También intercepta paquetes enteros que son solo un .node
		// (como @duckdb/node-bindings-win32-x64)
		build.onResolve(
			{ filter: /^@duckdb\/node-bindings-/ },
			(args) => {
				return { path: args.path, namespace: "native-binding-shim" };
			},
		);

		build.onLoad({ filter: /.*/, namespace: "native-binding-shim" }, (args) => {
			const shimCode = `
const { createRequire } = require("module");
const path = require("path");
const baseDir = typeof process.sea !== "undefined"
  ? path.join(path.dirname(process.execPath), "node_modules")
  : path.join(__dirname, "node_modules");
const r = createRequire(path.join(baseDir, "index.js"));
module.exports = r(${JSON.stringify(args.path)});
`.trim();
			return { contents: shimCode, loader: "js" };
		});
	},
};

await esbuild.build({
	entryPoints: [path.join(ROOT, "app.js")],
	bundle: true,
	platform: "node",
	format: "cjs",
	outfile: path.join(ROOT, "dist", "bundle.cjs"),
	plugins: [nativeBindingPlugin],
	external: [
		// Dependencia opcional de unzipper — solo se usa para S3, nunca en esta app
		"@aws-sdk/client-s3",
		// Dependencia opcional de cosmiconfig (parte de pm2) — carga TS configs
		"typescript",
	],
	define: {
		"import.meta.url": '""',
	},
});

console.log("Bundle generado: dist/bundle.cjs");
