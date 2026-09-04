class MessageRepository {
    constructor(supabase) {
        this.supabase = supabase;
    }

    async save(row) {
        const { error } = await this.supabase
            .from('mensajes')
            .upsert(row, { onConflict: 'id' });

        if (error) {
            console.error('Error al guardar mensaje en Supabase:', error.message);
        }
    }
}

module.exports = MessageRepository;
