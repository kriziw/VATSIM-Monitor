export interface VatsimControllerRecord {
	cid: number;
	callsign: string;
	frequency: string;
	name: string;
}

export interface VatsimDataClient {
	fetchControllers(): Promise<VatsimControllerRecord[]>;
}

export interface TopdownResolver {
	resolveCoveredCallsigns(callsign: string): Promise<string[]>;
}

export interface DiscordWebhookEmbed {
	title?: string;
	description?: string;
	color?: number;
	timestamp?: string;
}

export interface DiscordWebhookPayload {
	content: string | null;
	embeds?: DiscordWebhookEmbed[];
}

export interface DiscordNotifier {
	sendWebhook(destination: string, payload: DiscordWebhookPayload): Promise<void>;
}

export interface TopdownController {
	id: number;
	callsign: string;
	frequency: string;
}

interface RawVatsimController {
	cid?: number | string;
	callsign?: string;
	frequency?: string;
	name?: string;
}

interface RawUkController {
	id: number | string;
	callsign: string;
	frequency?: string;
}

interface RawUkAirfield {
	code: string;
	controllers: Array<number | string>;
}

export class HttpVatsimDataClient implements VatsimDataClient {
	constructor(private readonly url = "https://data.vatsim.net/v3/vatsim-data.json") {}

	public async fetchControllers(): Promise<VatsimControllerRecord[]> {
		const response = await fetch(this.url);
		if (!response.ok) {
			throw new Error(`VATSIM data request failed with status ${response.status}.`);
		}

		const payload = (await response.json()) as { controllers?: RawVatsimController[] };
		return (payload.controllers || [])
			.filter((controller) => controller.frequency !== "199.998")
			.map((controller) => ({
				cid: Number(controller.cid),
				callsign: String(controller.callsign || "").toUpperCase(),
				frequency: String(controller.frequency || ""),
				name: String(controller.name || "")
			}));
	}
}

export class NoopTopdownResolver implements TopdownResolver {
	public async resolveCoveredCallsigns(_callsign: string): Promise<string[]> {
		return [];
	}
}

export class UkTopdownResolver implements TopdownResolver {
	private airfieldControllers = new Map<string, TopdownController[]>();
	private controllerTopdown = new Map<string, TopdownController[]>();
	private lastLoadedAt = 0;
	private loading: Promise<void> | null = null;

	constructor(
		private readonly controllersUrl = "https://ukcp.vatsim.uk/api/controller",
		private readonly airfieldsUrl = "https://ukcp.vatsim.uk/api/airfield",
		private readonly cacheMs = 15 * 60 * 1000
	) {}

	public async resolveCoveredCallsigns(callsign: string): Promise<string[]> {
		await this.ensureLoaded();
		return (this.controllerTopdown.get(callsign.toUpperCase()) || []).map((controller) =>
			controller.callsign.toUpperCase()
		);
	}

	public async getControllersForAirfield(icao: string): Promise<TopdownController[] | null> {
		await this.ensureLoaded();
		return this.airfieldControllers.get(icao.toUpperCase()) || null;
	}

	public async getControllersForCallsign(callsign: string): Promise<TopdownController[] | null> {
		await this.ensureLoaded();
		return this.controllerTopdown.get(callsign.toUpperCase()) || null;
	}

	private async ensureLoaded(): Promise<void> {
		if (this.loading) {
			return this.loading;
		}

		if (Date.now() - this.lastLoadedAt < this.cacheMs && this.airfieldControllers.size > 0) {
			return;
		}

		this.loading = this.load();
		try {
			await this.loading;
		} finally {
			this.loading = null;
		}
	}

	private async load(): Promise<void> {
		const [controllersResponse, airfieldsResponse] = await Promise.all([
			fetch(this.controllersUrl),
			fetch(this.airfieldsUrl)
		]);

		if (!controllersResponse.ok || !airfieldsResponse.ok) {
			throw new Error("UK top-down data request failed.");
		}

		const rawControllers = (await controllersResponse.json()) as RawUkController[];
		const rawAirfields = (await airfieldsResponse.json()) as RawUkAirfield[];
		const controllersById = new Map<number, TopdownController>();
		const nextAirfieldControllers = new Map<string, TopdownController[]>();
		const nextControllerTopdown = new Map<string, TopdownController[]>();

		for (const rawController of rawControllers) {
			controllersById.set(Number(rawController.id), {
				id: Number(rawController.id),
				callsign: String(rawController.callsign).toUpperCase(),
				frequency: String(rawController.frequency || "")
			});
		}

		for (const rawAirfield of rawAirfields) {
			const code = String(rawAirfield.code || "").toUpperCase();
			const controllers = (rawAirfield.controllers || [])
				.map((controllerId) => controllersById.get(Number(controllerId)))
				.filter(Boolean) as TopdownController[];

			nextAirfieldControllers.set(code, controllers);

			const reversedControllers = [...controllers].reverse();
			for (let index = 0; index < reversedControllers.length; index += 1) {
				const controller = reversedControllers[index];
				const controllersBelow = reversedControllers.slice(index + 1);
				if (!controller || controllersBelow.length === 0) {
					continue;
				}

				const existing = nextControllerTopdown.get(controller.callsign) || [];
				nextControllerTopdown.set(controller.callsign, existing.concat(controllersBelow));
			}
		}

		this.airfieldControllers = nextAirfieldControllers;
		this.controllerTopdown = nextControllerTopdown;
		this.lastLoadedAt = Date.now();
	}
}

export class DiscordWebhookNotifier implements DiscordNotifier {
	public async sendWebhook(destination: string, payload: DiscordWebhookPayload): Promise<void> {
		const response = await fetch(destination, {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify(payload)
		});

		if (!response.ok) {
			throw new Error(`Discord webhook request failed with status ${response.status}.`);
		}
	}
}
