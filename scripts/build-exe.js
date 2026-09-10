/**
 * build-exe.js
 *
 * Genera dist/BotWSP.exe usando Node SEA (Single Executable Application):
 *
 *  1. Genera el blob SEA a partir de sea-config.json
 *  2. Copia node.exe → dist/BotWSP.exe
 *  3. Inyecta el blob en el exe con postject
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const EXE_PATH = path.join(DIST, "BotWSP.exe");
const BLOB_PATH = path.join(DIST, "sea-prep.blob");
const SEA_CONFIG = path.join(ROOT, "sea-config.json");

function run(cmd, label) {
	console.log(`\n→ ${label}`);
	console.log(`  ${cmd}`);
	try {
		execSync(cmd, { stdio: "inherit", cwd: ROOT });
	} catch (err) {
		if (err.status === 5 || (err.message && err.message.includes("EPERM")) || (err.message && err.message.includes("EACCES"))) {
			console.error(`\n⚠️  ERROR DE PERMISOS al ejecutar: ${label}`);
			console.error(
				"   Soluciones:\n" +
					"   1. Cierra cualquier proceso que tenga abierto dist/BotWSP.exe\n" +
					"   2. Desactiva temporalmente el antivirus/Windows Defender para la carpeta dist/\n" +
					"   3. Ejecuta la terminal como Administrador",
			);
			process.exit(1);
		}
		console.error(`\n✗ Falló: ${label}`);
		console.error(err.message);
		process.exit(1);
	}
}

async function main() {
	console.log("\n=== Generando dist/BotWSP.exe con Node SEA ===");

	// Asegurarse que dist/ existe
	fs.mkdirSync(DIST, { recursive: true });

	// Eliminar exe anterior si existe (postject no puede sobreescribir)
	if (fs.existsSync(EXE_PATH)) {
		console.log("\n→ Eliminando BotWSP.exe anterior...");
		try {
			fs.unlinkSync(EXE_PATH);
		} catch (err) {
			if (err.code === "EPERM" || err.code === "EACCES") {
				console.error(`\n⚠️  ERROR DE PERMISOS: No se puede eliminar ${EXE_PATH}`);
				console.error("   Asegúrate de que el exe no está corriendo y que el antivirus no lo está bloqueando.");
				process.exit(1);
			}
			throw err;
		}
	}

	// Paso 1: Generar el blob SEA
	run(
		`node --experimental-sea-config "${SEA_CONFIG}"`,
		"Generando blob SEA (sea-prep.blob)...",
	);

	if (!fs.existsSync(BLOB_PATH)) {
		console.error("✗ No se generó el blob. Verifica sea-config.json.");
		process.exit(1);
	}
	const blobSize = (fs.statSync(BLOB_PATH).size / 1024).toFixed(1);
	console.log(`  ✓ Blob generado: ${blobSize} KB`);

	// Paso 2: Copiar node.exe como base del ejecutable
	console.log(`\n→ Copiando node.exe → dist/BotWSP.exe...`);
	try {
		fs.copyFileSync(process.execPath, EXE_PATH);
	} catch (err) {
		if (err.code === "EPERM" || err.code === "EACCES") {
			console.error(`\n⚠️  ERROR DE PERMISOS al copiar node.exe → BotWSP.exe`);
			console.error("   Ejecuta la terminal como Administrador.");
			process.exit(1);
		}
		throw err;
	}
	const exeSize = (fs.statSync(EXE_PATH).size / 1024 / 1024).toFixed(1);
	console.log(`  ✓ BotWSP.exe creado (${exeSize} MB)`);

	// Paso 3: Inyectar el blob con postject
	const postjectBin = path.join(ROOT, "node_modules", ".bin", "postject");
	const fuse = "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2";
	run(
		`"${postjectBin}" "${EXE_PATH}" NODE_SEA_BLOB "${BLOB_PATH}" --sentinel-fuse ${fuse}`,
		"Inyectando blob en BotWSP.exe con postject...",
	);

	const finalSize = (fs.statSync(EXE_PATH).size / 1024 / 1024).toFixed(1);
	console.log(`\n✓ dist/BotWSP.exe listo (${finalSize} MB)`);
	console.log("  Ejecuta desde la carpeta dist/ para que encuentre sus dependencias.\n");
}

main();
