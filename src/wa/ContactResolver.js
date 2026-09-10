import { cleanNumber } from "./identifiers.js";

class ContactResolver {
	constructor(client) {
		this.client = client;
	}

	async resolve(msg) {
		const rawId = msg.author || msg.from;
		let number = cleanNumber(rawId);

		if (rawId?.endsWith("@lid")) {
			number = await this._resolvePhoneFromLid(rawId, number);
		}

		try {
			const contact = await msg.getContact();
			const name = contact.name || contact.pushname || number;
			return { number, name, isRegistered: Boolean(contact.isMyContact) };
		} catch (_err) {
			return { number, name: number, isRegistered: false };
		}
	}

	async _resolvePhoneFromLid(lid, fallbackNumber) {
		try {
			const [result] = await this.client.getContactLidAndPhone([lid]);
			if (result?.pn) {
				return cleanNumber(result.pn);
			}
		} catch (_err) {
			// Si la resolucion falla, se mantiene el numero basado en el lid.
		}
		return fallbackNumber;
	}
}

export default ContactResolver;
