import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Devuelve el directorio raíz donde la app debe leer/escribir datos en runtime.
 *
 * - Cuando corre como Node SEA (.exe):  junto al ejecutable (process.execPath)
 * - Cuando corre con `node app.js`:     raíz del proyecto
 *
 * Nota: en el bundle CJS generado por esbuild, import.meta.url no existe.
 * Usamos __dirname si está disponible (CJS/bundle), import.meta.url si no (ESM puro).
 */
function getRuntimeDir() {
	if (process.sea) {
		// Node SEA: process.sea existe cuando el proceso es un Single Executable
		return path.dirname(process.execPath);
	}

	// Desarrollo ESM puro (node app.js): subir un nivel desde src/
	// En bundle CJS esbuild inyecta __dirname, así que import.meta queda vacío
	// pero __dirname apunta a la raíz del bundle (dist/), por lo que subimos 0 niveles.
	// Usamos una detección segura: si __dirname está definido (CJS/bundle) lo usamos,
	// si no (ESM puro) recurrimos a import.meta.url.
	try {
		// En ESM puro __dirname no existe y lanzará ReferenceError
		// eslint-disable-next-line no-undef
		if (typeof __dirname !== "undefined") {
			// Bundle CJS: __dirname es el directorio del bundle (dist/)
			// El exe va a estar en dist/ también, así que es el directorio correcto.
			return __dirname;
		}
	} catch {
		// ignorar
	}

	// ESM puro (desarrollo): sube dos niveles desde src/runtimeDir.js → raíz del proyecto
	return path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
}

export default getRuntimeDir;
