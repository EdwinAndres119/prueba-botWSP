const { cleanNumber } = require('./identifiers');

class ContactResolver {
    constructor(client) {
        this.client = client;
    }

    async resolve(msg) {
        const rawId = msg.author || msg.from;
        let number = cleanNumber(rawId);

        if (rawId && rawId.endsWith('@lid')) {
            number = await this._resolvePhoneFromLid(rawId, number);
        }

        try {
            const contact = await msg.getContact();
            const name = contact.name || contact.pushname || number;
            return { number, name, isRegistered: Boolean(contact.isMyContact) };
        } catch (err) {
            return { number, name: number, isRegistered: false };
        }
    }

    async _resolvePhoneFromLid(lid, fallbackNumber) {
        try {
            const [result] = await this.client.getContactLidAndPhone([lid]);
            if (result && result.pn) {
                return cleanNumber(result.pn);
            }
        } catch (err) {
            // Keep the lid-based number if resolution fails.
        }
        return fallbackNumber;
    }
}

module.exports = ContactResolver;
