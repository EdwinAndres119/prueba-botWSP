# Arquitectura

## Vision general

`app.js` conecta los servicios y engancha los eventos del cliente de WhatsApp. Toda la logica vive en `src/`, organizada en dos areas:

- `src/db/` — acceso a la base de datos (DuckLake, sobre DuckDB).
- `src/wa/` — todo lo relacionado con WhatsApp: cliente, resolucion de contactos, descarga de multimedia, extraccion de historial y el pipeline que arma cada fila.

```
BOT_WSP/
├── app.js                      # entry point: wiring de servicios y eventos
├── src/
│   ├── config.js                # variables de entorno y constantes
│   ├── db/
│   │   ├── DuckLake.js          # conexion e inicializacion de la base DuckLake
│   │   └── MessageRepository.js # guarda filas en la tabla mensajes
│   └── wa/
│       ├── client.js            # crea el Client de whatsapp-web.js
│       ├── identifiers.js       # limpieza y armado de ids
│       ├── ContactResolver.js   # numero real, nombre, si esta registrado
│       ├── MediaStorage.js      # descarga y guarda imagenes/documentos
│       ├── MessagePipeline.js   # arma y guarda una fila a partir de un mensaje
│       ├── HistoryExtractor.js  # recorre todos los chats y trae su historial
│       └── commands.js          # comandos de texto (!ping, !hola, !info)
├── media/                       # archivos descargados, por fecha (no versionado)
└── docs/
    └── arquitectura.md
```

## Esquema de la tabla `whatsapp.mensajes` (DuckLake)

| Columna | Tipo | Descripcion |
|---|---|---|
| `id` | VARCHAR | id del mensaje |
| `chat_id` | VARCHAR | id del chat, sin sufijo de dominio |
| `chat_name` | VARCHAR | nombre del chat (grupo o contacto) |
| `is_group` | BOOLEAN | si el chat es un grupo |
| `remitente_numero` | VARCHAR | numero de quien mando el mensaje |
| `remitente_nombre` | VARCHAR | nombre del contacto si esta registrado; si no, el numero |
| `esta_registrado` | BOOLEAN | si el numero tiene un contacto real asociado |
| `body` | VARCHAR | texto del mensaje (o caption si es multimedia) |
| `message_type` | VARCHAR | tipo de mensaje |
| `from_me` | BOOLEAN | si lo mando el dueno de la cuenta |
| `has_media` | BOOLEAN | si tiene imagen/documento/audio adjunto |
| `media_mimetype` | VARCHAR | tipo de archivo descargado |
| `media_filename` | VARCHAR | nombre original del archivo |
| `media_path` | VARCHAR | ruta local donde quedo guardado |
| `timestamp` | TIMESTAMP | fecha del mensaje |

La tabla se crea automaticamente al iniciar el bot (ver `DuckLake.js`), sin necesidad de correr SQL a mano.

## Decisiones tecnicas

WhatsApp introdujo un sistema de identificadores privados (`@lid`) que rompe varias funciones internas de `whatsapp-web.js` sobre la version actual de WhatsApp Web. Esto obligo a varios workarounds documentados aca para que quien mantenga el proyecto no pierda tiempo re-investigandolos:

1. **`client.getChats()` falla** con la mayoria de las cuentas reales. `HistoryExtractor.listChats()` enumera los chats directamente contra `WAWebCollections.Chat.getModelsArray()`, sin pasar por el serializador que falla.
2. **`client.getChatById()` tambien falla** para la mayoria de los chats, por la misma razon (intenta resolver participantes de grupo con id `@lid`). `HistoryExtractor.fetchMessages()` replica la logica interna de `Chat.fetchMessages()` pero usando el chat sin serializar (`getAsModel: false`), que si funciona.
3. **`msg.id.participant`** puede ser un string o un objeto `Wid`; `identifiers.serializeIdPart()` lo normaliza antes de usarlo en el id compuesto.
4. **`msg.id._serialized`** no siempre esta disponible, incluyendo dentro de metodos internos de la libreria como `downloadMedia()`. `identifiers.buildMessageId()` lo reconstruye, y `MessagePipeline` lo reasigna sobre el objeto `msg` para que los metodos internos tambien lo encuentren.
5. Un chat puede quedar colgado al pedir sus mensajes (por ejemplo canales). `HistoryExtractor` usa un timeout de 15s por chat para no bloquear el resto.
6. El navegador debe ser el Chromium propio que Puppeteer descarga con `npm install` — usar Chrome o Edge del sistema puede causar errores de protocolo por diferencias de version.
7. Los numeros con sufijo `@lid` no son el numero de telefono real. `ContactResolver` los resuelve via `client.getContactLidAndPhone()`.

## Multimedia

`msg.hasMedia` indica si el mensaje trae un archivo adjunto. Cuando es asi, `msg.body` viene vacio (solo el caption, si tiene). El archivo se descarga con `msg.downloadMedia()` y se guarda en `media/<fecha>/<id>.<extension>`; en la base solo queda la ruta.

## Consideraciones de uso

`whatsapp-web.js` automatiza un navegador para simular un cliente de WhatsApp Web, algo no soportado oficialmente por WhatsApp. Pedir el historial completo de cientos de chats de forma automatica es un patron de uso inusual que puede ser detectado como actividad sospechosa. Mitigaciones aplicadas:

- User-agent de navegador de escritorio real y consistente con el sistema operativo.
- Pausa aleatoria (1.5-3s) entre cada chat durante la extraccion de historial.
- Limite de tiempo por chat para no insistir sobre uno que no responde.

Para un uso recurrente o de mayor volumen, evaluar la API oficial de WhatsApp Business.

## Pendiente

- Validacion con Zod antes de insertar en DuckLake.
