import path from "node:path";

import "dotenv/config";

import getRuntimeDir from "./runtimeDir.js";

const PROJECT_ROOT = getRuntimeDir();
const HISTORY_LIMIT = parseInt(process.env.HISTORY_LIMIT || "0", 10);
const CHAT_TIMEOUT_MS = parseInt(process.env.CHAT_TIMEOUT_MS || "300000", 10);
const MEDIA_DIR = path.join(PROJECT_ROOT, "media");

export default {
	PROJECT_ROOT,
	HISTORY_LIMIT,
	CHAT_TIMEOUT_MS,
	MEDIA_DIR,
};
