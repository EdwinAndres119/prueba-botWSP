# Runbook — Generar BotWSP.exe

Guía paso a paso para empaquetar el bot de WhatsApp como ejecutable `.exe` autónomo para Windows usando Node SEA.

---

## Requisitos previos

- Node.js v20 o superior instalado (`node --version`)
- npm instalado (`npm --version`)
- Conexión a internet (primera vez, para descargar Chrome vía Puppeteer)

---

## Pasos

### 1. Instalar dependencias

```bash
npm install
```

Esto descarga todas las dependencias incluyendo Chromium (~400 MB). Puede tardar varios minutos.

> Si falla con error de Chrome corrupto, elimina la carpeta de caché y vuelve a intentar:
> ```bash
> # Buscar y eliminar la carpeta problemática en:
> # C:\Users\<tu-usuario>\.cache\puppeteer\chrome\
> ```

---

### 2. Generar el ejecutable

```bash
npm run build
```

Este comando ejecuta tres pasos en secuencia:

| Paso | Script | Qué hace |
|------|--------|----------|
| 1 | `build:bundle` | Bundlea todo el JS en `dist/bundle.cjs` con esbuild |
| 2 | `build:assets` | Copia DuckDB, whatsapp assets y Chrome a `dist/` |
| 3 | `build:exe` | Genera `dist/BotWSP.exe` con Node SEA + postject |

Al finalizar verás:
```
✓ dist/BotWSP.exe listo (96.4 MB)
```

---

### 3. Preparar la carpeta de distribución

```bash
node scripts/copy-assets.js
```

Luego copia manualmente a una carpeta limpia (ej: `ejecutable/`):

```
ejecutable/
  BotWSP.exe
  chrome-win64/
  node_modules/
```

O bien ejecuta los tres comandos de copia:

```powershell
New-Item -ItemType Directory -Path "ejecutable" -Force
Copy-Item "dist\BotWSP.exe" "ejecutable\BotWSP.exe"
Copy-Item -Recurse "dist\chrome-win64" "ejecutable\chrome-win64"
Copy-Item -Recurse "dist\node_modules" "ejecutable\node_modules"
```

---

## Estructura final de distribución

```
ejecutable/
  BotWSP.exe          ←  96 MB  el bot
  chrome-win64/       ← 408 MB  Chromium (obligatorio)
  node_modules/       ←  75 MB  DuckDB + assets de whatsapp-web.js (obligatorio)
```

> Total: ~580 MB. No se puede reducir porque Chrome es inherente a WhatsApp Web.

---

## Ejecutar

Desde dentro de la carpeta `ejecutable/`:

```bash
# Doble clic en BotWSP.exe
# o desde terminal:
.\BotWSP.exe
```

La primera vez mostrará un QR en consola. Escanéalo con WhatsApp en tu teléfono.

La sesión queda guardada en `.wwebjs_auth/` — las siguientes ejecuciones no piden QR.

---

## Archivos generados en runtime

Estos se crean solos junto al `.exe`, no necesitan distribuirse:

| Carpeta | Contenido |
|---------|-----------|
| `.wwebjs_auth/` | Sesión de WhatsApp (se crea al escanear el QR) |
| `whatsapp-data/` | Mensajes almacenados en DuckLake (parquet) |
| `media/` | Archivos multimedia recibidos |
| `logs/` | Logs de la aplicación |

---

## Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run build` | Build completo (bundle + assets + exe) |
| `npm run build:bundle` | Solo regenerar `dist/bundle.cjs` |
| `npm run build:assets` | Solo copiar DuckDB/Chrome/whatsapp a `dist/` |
| `npm run build:exe` | Solo regenerar `dist/BotWSP.exe` |
| `npm start` | Correr el bot en modo desarrollo (requiere Node) |

---

## Solución de problemas

**El exe cierra inmediatamente sin mostrar nada**
Ejecuta desde terminal para ver el error completo.

**Error al iniciar Chrome / "no se encontró chrome.exe"**
Verifica que `chrome-win64/chrome.exe` existe junto al `.exe`. Si falta, re-ejecuta `npm run build:assets`.

**Error de permisos (EPERM) al hacer build**
- Cierra el explorador de archivos y cualquier proceso que tenga abierta la carpeta `dist/`
- Desactiva temporalmente el antivirus para la carpeta del proyecto
- O ejecuta la terminal como Administrador

**El QR no aparece / WhatsApp dice sesión inválida**
Elimina la carpeta `.wwebjs_auth/` junto al `.exe` y vuelve a ejecutar para escanear el QR de nuevo.

**"No such built-in module: @duckdb/..."**
La carpeta `node_modules/` falta o está incompleta junto al `.exe`. Re-ejecuta `npm run build:assets` y vuelve a copiar `dist/node_modules/`.
