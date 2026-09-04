# BOT_WSP - Extractor de mensajes de WhatsApp

Bot que se conecta a una cuenta de WhatsApp real (vía WhatsApp Web, usando `whatsapp-web.js` + Puppeteer), extrae los mensajes de todos los chats — históricos y en vivo, incluyendo imágenes y documentos — y los guarda clasificados por remitente en una base de datos Supabase (PostgreSQL).

Es una **prueba de concepto** para validar que la extracción es viable antes de construir una versión definitiva del proyecto.

## Stack tecnológico

| Tecnología | Uso |
|------------|-----|
| Node.js 18+ | Runtime |
| whatsapp-web.js (oficial) | Cliente WhatsApp Web vía Puppeteer |
| Puppeteer | Automatización del navegador (usa su propio Chromium, no Chrome/Edge del sistema) |
| Supabase (PostgreSQL) | Base de datos donde se guardan los mensajes |
| dotenv | Variables de entorno |
| pm2 | Gestor de procesos para producción |

## Prerrequisitos

- Node.js v18 o superior
- Cuenta activa de WhatsApp con teléfono disponible para escanear QR
- Un proyecto creado en [supabase.com](https://supabase.com) (gratis)

## Instalación

```bash
npm install
```

`npm install` ya descarga automáticamente el Chromium que usa Puppeteer — no hace falta instalar Chrome ni ningún navegador aparte.

### Configurar Supabase

1. Crear un proyecto en supabase.com.
2. En el **SQL Editor** del proyecto, correr:

```sql
create table if not exists public.mensajes (
    id text primary key,
    chat_id text not null,
    chat_name text,
    is_group boolean default false,
    remitente_numero text,
    remitente_nombre text,
    esta_registrado boolean default false,
    body text,
    message_type text,
    from_me boolean default false,
    has_media boolean default false,
    media_mimetype text,
    media_filename text,
    media_path text,
    "timestamp" timestamptz,
    fetched_at timestamptz default now()
);

create index if not exists mensajes_chat_id_idx on public.mensajes (chat_id);
create index if not exists mensajes_timestamp_idx on public.mensajes ("timestamp");
```

3. En **Project Settings > API**, copiar la "Project URL" y la key "anon public" (o "publishable").
4. Copiar `.env.example` a `.env` y completar:

```
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_KEY=tu-key
HISTORY_LIMIT=50
```

5. Si Supabase bloquea las inserciones con un error de "row-level security policy", desactivar RLS en la tabla `mensajes` desde el Table Editor (o crear una policy que permita `insert`/`upsert` al rol `anon`).

## Ejecución

```bash
node app.js
```

**Flujo al iniciar:**
1. Se abre el navegador (modo visible) con WhatsApp Web.
2. Se muestra un código QR en la terminal (solo la primera vez; después queda la sesión guardada).
3. Escanear el QR con la app de WhatsApp en el teléfono (Dispositivos vinculados).
4. El bot recorre todos los chats existentes y guarda su historial de mensajes en Supabase (muestra el progreso cada 10 chats).
5. Queda activo escuchando y guardando los mensajes nuevos que lleguen.

## Comandos del bot

| Comando | Respuesta |
|---------|-----------|
| `!ping` | `pong` |
| `!hola` | Saludo |
| `!info` | Nombre e información del chat actual |

## Qué datos guarda

Por cada mensaje: número y nombre de quien lo mandó (si está registrado en la agenda; si no, usa el número como nombre), el chat al que pertenece, si es grupo, el texto, la fecha, y si tiene imagen/documento adjunto lo descarga a la carpeta `media/` y guarda la ruta. El detalle completo de columnas y de la arquitectura del código está en `docs/arquitectura.md`.

## Estructura del proyecto

```
BOT_WSP/
├── app.js                          # Entry point: conecta los servicios y escucha eventos
├── src/
│   ├── config.js                   # Variables de entorno y constantes
│   ├── db/                         # Acceso a Supabase
│   └── wa/                         # Cliente de WhatsApp, extracción y guardado de mensajes
├── docs/
│   └── arquitectura.md             # Detalle técnico completo
├── package.json                    # Dependencias del proyecto
├── .env.example                    # Plantilla de variables de entorno (copiar a .env)
├── media/                          # Imágenes/documentos descargados, por fecha (auto-generado, no se sube al repo)
├── .wwebjs_auth/                   # Sesión de autenticación persistida (auto-generado, no se sube al repo)
└── node_modules/                   # Dependencias instaladas
```

## Notas técnicas

- **Autenticación:** usa `LocalAuth` — la sesión se persiste en `.wwebjs_auth/`. No hace falta escanear el QR en cada reinicio.
- **whatsapp-web.js es una librería no oficial** que simula un usuario de WhatsApp Web mediante automatización de navegador. WhatsApp actualiza su plataforma seguido y eso rompe partes de la librería sin previo aviso — el detalle técnico completo de cada workaround está en `docs/arquitectura.md`.
- Para un uso formal de empresa, evaluar migrar a la **API oficial de WhatsApp Business** (Meta Cloud API, Twilio, 360dialog, etc.), que sí está soportada oficialmente.

## Advertencias

> **WhatsApp no avala el uso de bots ni de automatización de este tipo.** Su uso puede resultar en el bloqueo temporal o permanente de la cuenta. Usar bajo propio riesgo y solo con cuentas de prueba.

> Este bot descarga y guarda en disco imágenes/documentos privados de tus chats de WhatsApp. Tratar la carpeta `media/` y la base de datos con el mismo cuidado que le darías a los chats originales.
