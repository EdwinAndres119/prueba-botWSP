

let connection;

async function dbRun(db, sql) {
    await db.run(sql);
}

/**
 * Inicializa DuckLake y crea la tabla de mensajes si no existe.
 *
 * @param {object} db Conexión DuckDB.
 * @returns {Promise<void>}
 */
async function initializeDataLake(db) {
    await dbRun(db, `
        INSTALL ducklake;
        LOAD ducklake;
    `);

    await dbRun(db, `
        ATTACH
            'ducklake:./whatsapp.ducklake'
        AS whatsapp
            (DATA_PATH './whatsapp-data/');
    `);

    await dbRun(db, `
        CREATE TABLE IF NOT EXISTS whatsapp.mensajes (
            id VARCHAR,
            chat_id VARCHAR,
            chat_name VARCHAR,
            is_group BOOLEAN,
            from_number VARCHAR,
            author VARCHAR,
            body VARCHAR,
            message_type VARCHAR,
            from_me BOOLEAN,
            timestamp TIMESTAMP
        );
    `);
}

async function guardarMensajeEnDataLake(fila) {
    await connection.run(
        `
        INSERT INTO whatsapp.mensajes (
            id,
            chat_id,
            chat_name,
            is_group,
            from_number,
            author,
            body,
            message_type,
            from_me,
            timestamp
        )
        VALUES (
            $id,
            $chat_id,
            $chat_name,
            $is_group,
            $from_number,
            $author,
            $body,
            $message_type,
            $from_me,
            $timestamp
        )
        `,
        {
            id: fila.id,
            chat_id: fila.chat_id,
            chat_name: fila.chat_name,
            is_group: fila.is_group,
            from_number: fila.from_number,
            author: fila.author,
            body: fila.body,
            message_type: fila.message_type,
            from_me: fila.from_me,
            timestamp: fila.timestamp,
        }
    );
}
async function checkpointDataLake() {
    await connection.run('CHECKPOINT;');
}
async function createDuckDbConnection() {
    const { DuckDBInstance } = await import('@duckdb/node-api');

    const instance = await DuckDBInstance.create(':memory:');

    connection = await instance.connect();

    return connection;
}

module.exports = {
    checkpointDataLake,
    initializeDataLake,
    guardarMensajeEnDataLake,
    createDuckDbConnection,
};