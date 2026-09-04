# CLAUDE.md — BOT_WSP

## Proyecto
Bot de WhatsApp llamado "extractor" que automatiza WhatsApp Web usando Node.js + whatsapp-web.js + Puppeteer.

## Cómo correr el proyecto

```bash
node app.js
```

Abre Chrome (headless: false), muestra un QR en terminal, y al escanearlo el bot queda activo.

## Archivos críticos

- `app.js` — único archivo fuente. Contiene toda la lógica del bot.
- `package.json` — nombre del proyecto: "extractor", dependencias.

## Dependencias clave

| Paquete | Propósito |
|---------|-----------|
| whatsapp-web.js | Cliente WhatsApp Web (fork: timothydillan/#fix/duplicate-events-and-bindings) |
| qrcode-terminal | Muestra QR en consola |
| LocalAuth (built-in) | Persiste sesión en `.wwebjs_auth/` |

## Infraestructura instalada pero SIN usar aún

Estas dependencias están en package.json pero no están implementadas en app.js:
- **mysql2 / mysql2-promise** — base de datos MySQL
- **node-cron** — tareas programadas
- **express** — servidor HTTP / API REST
- **axios** — llamadas HTTP externas
- **csv-writer** — exportar datos a CSV
- **dotenv** — variables de entorno

Al agregar funcionalidad, usar estas librerías ya instaladas en lugar de agregar nuevas.

## Convenciones del proyecto

- Los mensajes del bot están en **español**
- Los logs de consola usan emojis: 🚀 inicio, ✅ listo, 🔐 auth, ❌ error, ⚠️ warning, 📩 mensaje
- Los comandos del bot usan prefijo `!`
- El código usa `async/await` para operaciones de WhatsApp

## Variables de entorno

No existe `.env` aún. Al implementar DB o APIs externas, crear `.env` con variables como:
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- Credenciales de APIs externas

## Configuración importante en app.js

- `headless: false` — Chrome se abre visualmente (cambiar a `true` en producción)
- `executablePath` apunta a Chrome de Windows: `C:\Program Files\Google\Chrome\Application\chrome.exe`
- `webVersionCache.type: 'remote'` — descarga versión de WhatsApp Web desde GitHub de wppconnect-team
