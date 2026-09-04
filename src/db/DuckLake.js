class DuckLake {
    constructor() {
        this.connection = this.initializeDatabase();
    }

    async initializeDatabase() {
        const db = await this.createDuckDbConnection();
        await this.initializeDataLake(db);

        return db;
    }

    async dbRun(db, sql) {
        await db.run(sql);
    }

    async initializeDataLake(db) {
        await this.dbRun(db, `
            INSTALL ducklake;
            LOAD ducklake;
        `);

        await this.dbRun(db, `
            ATTACH
                'ducklake:./whatsapp.ducklake'
            AS whatsapp
                (DATA_PATH './whatsapp-data/');
        `);

        await this.dbRun(db, `
            CREATE TABLE IF NOT EXISTS whatsapp.mensajes (
                id VARCHAR,
                chat_id VARCHAR,
                chat_name VARCHAR,
                is_group BOOLEAN,
                remitente_numero VARCHAR,
                remitente_nombre VARCHAR,
                esta_registrado BOOLEAN,
                body VARCHAR,
                message_type VARCHAR,
                from_me BOOLEAN,
                has_media BOOLEAN,
                media_mimetype VARCHAR,
                media_filename VARCHAR,
                media_path VARCHAR,
                timestamp TIMESTAMP
            );
        `);
    }

    async createDuckDbConnection() {
        const { DuckDBInstance } = await import('@duckdb/node-api');

        const instance = await DuckDBInstance.create(':memory:');

        return instance.connect();
    }

    async run(sql, params) {
        const db = await this.connection;
        return db.run(sql, params);
    }

    async checkpoint() {
        const db = await this.connection;
        await db.run('CHECKPOINT;');
    }
}

module.exports = DuckLake;