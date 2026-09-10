/**
 * copy-assets.js
 *
 * Copia todos los archivos que dist/BotWSP.exe necesita en runtime
 * pero que no pueden ir dentro del blob SEA:
 *
 *   dist/node_modules/@duckdb/node-bindings-win32-x64/  ← .node + .dll de DuckDB
 *   dist/node_modules/@duckdb/node-bindings/            ← dispatcher JS de DuckDB
 *   dist/node_modules/whatsapp-web.js/                  ← assets de whatsapp-web.js
 *   dist/chrome-win64/                                  ← Chromium
 *
 * El bundle usa require() para resolver estos módulos, y Node los buscará
 * en node_modules/ relativo a dist/, por eso van dentro de dist/node_modules/.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const NM = path.join(ROOT, "node_modules");
const DIST = path.join(ROOT, "dist");
const DIST_NM = path.join(DIST, "node_modules");

// ─────────────────────────────────────────────────────────
// Utilidades
// ─────────────────────────────────────────────────────────

function log(msg) {
	process.stdout.write(`  ${msg}\n`);
}

/**
 * Copia recursivamente src → dest.
 * Crea dest si no existe. Sobreescribe archivos existentes.
 */
function copyDir(src, dest) {
	if (!fs.existsSync(src)) {
		throw new Error(`Origen no encontrado: ${src}`);
	}
	fs.mkdirSync(dest, { recursive: true });

	for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
		const srcPath = path.join(src, entry.name);
		const destPath = path.join(dest, entry.name);
		if (entry.isDirectory()) {
			copyDir(srcPath, destPath);
		} else {
			fs.copyFileSync(srcPath, destPath);
		}
	}
}

// ─────────────────────────────────────────────────────────
// 1. Binarios nativos de DuckDB
// ─────────────────────────────────────────────────────────

function copyDuckDB() {
	log("Copiando binarios nativos de DuckDB...");

	// node-bindings-win32-x64: contiene duckdb.node + duckdb.dll
	const bindingsSrc = path.join(NM, "@duckdb", "node-bindings-win32-x64");
	const bindingsDest = path.join(DIST_NM, "@duckdb", "node-bindings-win32-x64");
	copyDir(bindingsSrc, bindingsDest);
	log(`  ✓ @duckdb/node-bindings-win32-x64 → dist/node_modules/`);

	// node-bindings: dispatcher JS que elige el .node correcto según plataforma
	const dispatcherSrc = path.join(NM, "@duckdb", "node-bindings");
	const dispatcherDest = path.join(DIST_NM, "@duckdb", "node-bindings");
	copyDir(dispatcherSrc, dispatcherDest);
	log(`  ✓ @duckdb/node-bindings → dist/node_modules/`);

	// node-api: la API de alto nivel que usa el código de la app
	const apiSrc = path.join(NM, "@duckdb", "node-api");
	const apiDest = path.join(DIST_NM, "@duckdb", "node-api");
	copyDir(apiSrc, apiDest);
	log(`  ✓ @duckdb/node-api → dist/node_modules/`);
}

// ─────────────────────────────────────────────────────────
// 2. Assets de whatsapp-web.js
// ─────────────────────────────────────────────────────────

function copyWhatsAppAssets() {
	log("Copiando whatsapp-web.js...");

	const waSrc = path.join(NM, "whatsapp-web.js");
	const waDest = path.join(DIST_NM, "whatsapp-web.js");
	copyDir(waSrc, waDest);
	log(`  ✓ whatsapp-web.js → dist/node_modules/`);
}

// ─────────────────────────────────────────────────────────
// 3. Chromium
// ─────────────────────────────────────────────────────────

function findChromiumPath() {
	// Puppeteer guarda Chrome en el cache del usuario
	const userCache = process.env.USERPROFILE || process.env.HOME || "";
	const candidates = [
		path.join(userCache, ".cache", "puppeteer", "chrome"),
		path.join(ROOT, "node_modules", "puppeteer", ".local-chromium"),
		path.join(ROOT, "node_modules", "puppeteer-core", ".local-chromium"),
	];

	for (const base of candidates) {
		if (!fs.existsSync(base)) continue;

		// Busca la subcarpeta win64-* que contenga chrome.exe
		for (const version of fs.readdirSync(base)) {
			const chromePath = path.join(base, version, "chrome-win64", "chrome.exe");
			if (fs.existsSync(chromePath)) {
				return path.join(base, version, "chrome-win64");
			}
			// Fallback: chrome.exe directamente en la subcarpeta
			const chromePath2 = path.join(base, version, "chrome.exe");
			if (fs.existsSync(chromePath2)) {
				return path.join(base, version);
			}
		}
	}
	return null;
}

function copyChromium() {
	log("Copiando Chromium (~400MB, puede tardar unos minutos)...");

	const chromeSrc = findChromiumPath();
	if (!chromeSrc) {
		throw new Error(
			"No se encontró Chromium. Asegúrate de que Puppeteer lo haya descargado con: npm install",
		);
	}

	log(`  Origen: ${chromeSrc}`);
	const chromeDest = path.join(DIST, "chrome-win64");

	// Si ya existe y tiene chrome.exe, saltamos para no re-copiar 400MB
	if (fs.existsSync(path.join(chromeDest, "chrome.exe"))) {
		log(`  ✓ chrome-win64/ ya existe, omitiendo copia`);
		return;
	}

	copyDir(chromeSrc, chromeDest);
	log(`  ✓ chrome-win64/ → dist/`);
}

// ─────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────

async function main() {
	console.log("\n=== Copiando assets externos a dist/ ===\n");

	try {
		copyDuckDB();
		copyWhatsAppAssets();
		copyChromium();
		console.log("\n✓ Todos los assets copiados correctamente.\n");
	} catch (err) {
		if (err.code === "EPERM" || err.code === "EACCES") {
			console.error(`\n⚠️  ERROR DE PERMISOS: ${err.message}`);
			console.error(`   Ruta afectada: ${err.path || "(ver mensaje)"}`);
			console.error(
				"   Soluciones:\n" +
					"   1. Cierra cualquier explorador de archivos o IDE que tenga abierta la carpeta dist/\n" +
					"   2. Ejecuta la terminal como Administrador\n" +
					"   3. Desactiva temporalmente el antivirus para la carpeta del proyecto",
			);
			process.exit(1);
		}
		throw err;
	}
}

main();
