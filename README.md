# BOT_WSP - Bot de WhatsApp (Soportina)

Bot de WhatsApp automatizado construido con Node.js y whatsapp-web.js que usa Puppeteer para automatizar WhatsApp Web.

## Stack tecnológico

| Tecnología | Uso |
|------------|-----|
| Node.js 18+ | Runtime |
| whatsapp-web.js | Cliente WhatsApp Web vía Puppeteer |
| Puppeteer + Chrome | Automatización del navegador |
| mysql2 / mysql2-promise | Base de datos MySQL (pendiente de implementar) |
| node-cron | Tareas programadas (pendiente de implementar) |
| express | API web (pendiente de implementar) |
| axios | Cliente HTTP |
| dotenv | Variables de entorno |
| csv-writer | Exportación de datos a CSV |
| pm2 | Gestor de procesos para producción |

## Prerrequisitos

- Node.js v18 o superior
- Google Chrome instalado en: `C:\Program Files\Google\Chrome\Application\chrome.exe`
- Cuenta activa de WhatsApp con teléfono disponible para escanear QR

## Instalación

```bash
npm install
```

## Ejecución

```bash
node app.js
```

**Flujo al iniciar:**
1. Se abre Chrome (modo visible) con WhatsApp Web
2. Se muestra un código QR en la terminal
3. Escanear el QR con la app de WhatsApp en el teléfono
4. El bot queda activo y escuchando mensajes

## Comandos del bot

| Comando | Respuesta |
|---------|-----------|
| `!ping` | `pong 🏓` |
| `!hola` | `¡Hola! 👋 Soy un bot de WhatsApp` |
| `!info` | Nombre e información del chat actual |

## Estructura del proyecto

```
BOT_WSP/
├── app.js                          # Entrada principal del bot
├── package.json                    # Dependencias del proyecto
├── 2.3000.1031490220-alpha.html    # Cache local de versión de WhatsApp Web
├── .wwebjs_auth/                   # Sesión de autenticación persistida (auto-generado)
└── node_modules/                   # Dependencias instaladas
```

## Producción con PM2

```bash
# Iniciar
pm2 start app.js --name "whatsapp-bot"
pm2 save
pm2 startup

# Monitorear
pm2 status
pm2 logs whatsapp-bot

# Detener
pm2 stop whatsapp-bot
pm2 delete whatsapp-bot
```

## Notas técnicas

- **Autenticación:** Usa `LocalAuth` — la sesión se persiste en `.wwebjs_auth/`. No es necesario escanear el QR en cada reinicio.
- **Versión de WhatsApp Web:** Se obtiene remotamente desde `wppconnect-team/wa-version`. Hay un fallback local comentado en el código.
- **Fork personalizado:** Se usa `timothydillan/whatsapp-web.js#fix/duplicate-events-and-bindings` para corregir un bug de eventos duplicados.

## Advertencias

> **WhatsApp no avala el uso de bots.** El uso de automatización puede resultar en el bloqueo temporal o permanente de la cuenta. Usar bajo propio riesgo y solo con cuentas de prueba o empresariales habilitadas para ello.
