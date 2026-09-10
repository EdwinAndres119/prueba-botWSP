import qrcode from "qrcode-terminal";

class WhatsAppApp {
	constructor({
		client,
		ducklake,
		messagePipeline,
		historyExtractor,
		readyDelay = 5000,
		initMaxAttempts = 3,
		initRetryDelay = 3000,
	}) {
		this.client = client;
		this.ducklake = ducklake;
		this.messagePipeline = messagePipeline;
		this.historyExtractor = historyExtractor;

		this.readyDelay = readyDelay;
		this.initMaxAttempts = initMaxAttempts;
		this.initRetryDelay = initRetryDelay;

		this.readyFired = false;
		this.historyStarted = false;

		this.registerEvents();
	}

	registerEvents() {
		this.client.on("qr", (qr) => {
			this.handleQr(qr);
		});

		this.client.on("authenticated", () => {
			this.handleAuthenticated();
		});

		this.client.on("authfailure", (msg) => {
			this.handleAuthFailure(msg);
		});

		this.client.on("disconnected", (reason) => {
			this.handleDisconnected(reason);
		});

		this.client.on("ready", () => {
			this.handleReady().catch((err) => {
				console.error("Error durante la carga del historial:", err.message);
			});
		});

		this.client.on("message", (msg) => {
			this.handleMessage(msg);
		});
	}

	handleQr(qr) {
		console.log("Escanea el codigo QR con tu WhatsApp:");
		qrcode.generate(qr, { small: true });
	}

	handleAuthenticated() {
		console.log("Autenticacion exitosa");
	}

	handleAuthFailure(msg) {
		console.error("Error de autenticacion:", msg);
	}

	handleDisconnected(reason) {
		console.log("Cliente desconectado:", reason);
	}

	async handleReady() {
		this.readyFired = true;

		if (this.historyStarted) return;

		this.historyStarted = true;

		console.log("Cliente de WhatsApp conectado");

		// Da tiempo a que WhatsApp Web termine de inicializar sus modulos
		// internos antes de leer el historial de chats.
		await this.delay(this.readyDelay);

		await this.historyExtractor.run((msg, chatInfo) =>
			this.messagePipeline.add(msg, chatInfo),
		);

		await this.messagePipeline.onIdle();

		console.log("Consolidando cambios en DuckLake...");
		await this.ducklake.checkpoint();
		console.log("Checkpoint de DuckLake completado.");
	}

	handleMessage(msg) {
		console.log(`Mensaje de ${msg.from}: ${msg.body}`);

		this.messagePipeline.addMessage(msg).catch((err) => {
			console.error("Error procesando mensaje:", err);
		});
	}

	async initializeWithRetry() {
		for (let attempt = 1; attempt <= this.initMaxAttempts; attempt++) {
			try {
				await this.client.initialize();
				return;
			} catch (err) {
				if (this.readyFired) {
					console.log(
						"El cliente ya habia quedado listo antes de este error; no se reintenta.",
					);
					return;
				}

				const isContextRace = err.message?.includes(
					"Execution context was destroyed",
				);

				if (!isContextRace || attempt === this.initMaxAttempts) {
					throw err;
				}

				console.log(
					`Fallo al inicializar (intento ${attempt}/${this.initMaxAttempts}), reintentando...`,
				);

				try {
					await this.client.destroy();
				} catch (destroyErr) {
					console.error(
						"No se pudo cerrar el navegador tras el fallo:",
						destroyErr.message,
					);
				}

				await this.delay(this.initRetryDelay);
			}
		}
	}

	async start() {
		console.log("Iniciando cliente de WhatsApp...");

		try {
			await this.initializeWithRetry();
		} catch (err) {
			console.error(
				"No se pudo inicializar el cliente de WhatsApp:",
				err.message,
			);
			process.exit(1);
		}
	}

	delay(ms) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}

export default WhatsAppApp;
