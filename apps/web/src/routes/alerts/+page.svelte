<script lang="ts">
	import {
		getDefaultDiscordNotificationConfig,
		getDefaultDiscordNotificationTemplate,
		type DiscordNotificationTemplate,
		type DiscordNotificationTemplateType,
		type NotificationChannel
	} from "@vatsim-monitor/domain";

	export let data;
	export let form;

	type TemplateField = keyof DiscordNotificationTemplate;
	type TemplateVariableKey =
		| "{{callsign}}"
		| "{{frequency}}"
		| "{{controllerName}}"
		| "{{controllerCid}}"
		| "{{previousControllerName}}"
		| "{{previousControllerCid}}"
		| "{{previousFrequency}}"
		| "{{eventType}}"
		| "{{eventLabel}}"
		| "{{statusLabel}}";

	const templateSections: Array<{
		key: DiscordNotificationTemplateType;
		title: string;
		description: string;
		exampleLabel: string;
		variables: TemplateVariableKey[];
	}> = [
		{
			key: "controllerOnline",
			title: "Controller coming online",
			description: "Used when a watched position was previously empty and is now staffed.",
			exampleLabel: "Example: EGLL_TWR has just come online.",
			variables: [
				"{{callsign}}",
				"{{frequency}}",
				"{{controllerName}}",
				"{{controllerCid}}",
				"{{eventType}}",
				"{{eventLabel}}",
				"{{statusLabel}}"
			]
		},
		{
			key: "controllerOffline",
			title: "Controller going offline",
			description: "Used when a watched position was previously staffed and is now empty.",
			exampleLabel: "Example: EGLL_TWR has just gone offline.",
			variables: [
				"{{callsign}}",
				"{{frequency}}",
				"{{controllerName}}",
				"{{controllerCid}}",
				"{{eventType}}",
				"{{eventLabel}}",
				"{{statusLabel}}"
			]
		},
		{
			key: "controllerChange",
			title: "Controller change",
			description:
				"Used when the same watched position changes to a different controller within roughly 30 seconds.",
			exampleLabel: "Example: EGLL_TWR changed from one controller to another.",
			variables: [
				"{{callsign}}",
				"{{frequency}}",
				"{{controllerName}}",
				"{{controllerCid}}",
				"{{previousControllerName}}",
				"{{previousControllerCid}}",
				"{{previousFrequency}}",
				"{{eventType}}",
				"{{eventLabel}}",
				"{{statusLabel}}"
			]
		}
	];

	const variableDescriptions: Record<TemplateVariableKey, string> = {
		"{{callsign}}": "The watched controller position, such as EGLL_TWR.",
		"{{frequency}}": "The current published frequency for the controller.",
		"{{controllerName}}": "The controller currently occupying the watched position.",
		"{{controllerCid}}": "The VATSIM CID of the current controller.",
		"{{previousControllerName}}": "The controller who was on the position before the change event.",
		"{{previousControllerCid}}": "The VATSIM CID of the previous controller.",
		"{{previousFrequency}}": "The previous frequency recorded before the handover.",
		"{{eventType}}": "The raw internal event key, such as controller_online.",
		"{{eventLabel}}": "A human-friendly event label, such as Controller Online.",
		"{{statusLabel}}": "A short status word like Online, Offline, or Changed."
	};

	const previewValues: Record<DiscordNotificationTemplateType, Record<string, string>> = {
		controllerOnline: {
			"{{callsign}}": "EGLL_TWR",
			"{{frequency}}": "118.700",
			"{{controllerName}}": "Alex Tower",
			"{{controllerCid}}": "1234567",
			"{{previousControllerName}}": "Unstaffed",
			"{{previousControllerCid}}": "N/A",
			"{{previousFrequency}}": "118.700",
			"{{eventType}}": "controller_online",
			"{{eventLabel}}": "Controller Online",
			"{{statusLabel}}": "Online"
		},
		controllerOffline: {
			"{{callsign}}": "EGLL_TWR",
			"{{frequency}}": "118.700",
			"{{controllerName}}": "Alex Tower",
			"{{controllerCid}}": "1234567",
			"{{previousControllerName}}": "Alex Tower",
			"{{previousControllerCid}}": "1234567",
			"{{previousFrequency}}": "118.700",
			"{{eventType}}": "controller_offline",
			"{{eventLabel}}": "Controller Offline",
			"{{statusLabel}}": "Offline"
		},
		controllerChange: {
			"{{callsign}}": "EGLL_TWR",
			"{{frequency}}": "118.700",
			"{{controllerName}}": "Jamie Tower",
			"{{controllerCid}}": "2345678",
			"{{previousControllerName}}": "Alex Tower",
			"{{previousControllerCid}}": "1234567",
			"{{previousFrequency}}": "118.700",
			"{{eventType}}": "controller_change",
			"{{eventLabel}}": "Controller Change",
			"{{statusLabel}}": "Changed"
		}
	};

	function channelFieldValue(channel: NotificationChannel, field: "displayName" | "destination"): string {
		if (form?.section === "notificationChannels" && form?.channelId === channel.id) {
			return form?.[field] ?? "";
		}

		if (field === "destination") {
			return "";
		}

		return channel.displayName ?? "";
	}

	function templateFieldValue(
		channel: NotificationChannel,
		type: DiscordNotificationTemplateType,
		field: TemplateField
	): string {
		if (form?.section === "notificationChannels" && form?.channelId === channel.id) {
			return form?.config?.[type]?.[field] ?? "";
		}

		const config = channel.config ?? getDefaultDiscordNotificationConfig();
		return config[type]?.[field] ?? "";
	}

	function templateFieldName(type: DiscordNotificationTemplateType, field: TemplateField): string {
		return `${type}${field.charAt(0).toUpperCase()}${field.slice(1)}`;
	}

	function renderPreview(
		channel: NotificationChannel,
		type: DiscordNotificationTemplateType,
		field: TemplateField
	): string {
		const raw = templateFieldValue(channel, type, field) || "";
		if (!raw) {
			return field === "contentTemplate" ? "No plain-text content for this alert." : "Preview unavailable.";
		}

		return Object.entries(previewValues[type]).reduce((value, [token, replacement]) => {
			return value.split(token).join(replacement);
		}, raw);
	}

	function previewColor(channel: NotificationChannel, type: DiscordNotificationTemplateType): string {
		return templateFieldValue(channel, type, "color") || getDefaultDiscordNotificationTemplate(type).color || "#0C2746";
	}
</script>

<svelte:head>
	<title>Alerts | VATSIM Monitor</title>
</svelte:head>

<section class="dashboard-hero dashboard-hero--single">
	<div class="panel dashboard-hero__main">
		<div class="eyebrow">Alerts</div>
		<h1>Design the Discord alerts your watchlist sends.</h1>
		<p>Keep webhook delivery on this page and design each alert type separately. Each event box explains when it is used, what variables are available, and what a sample alert looks like.</p>
		<div class="monitor-strip">
			<div class="monitor-strip__item">
				<span>Channels</span>
				<strong>{data.notificationChannels.length}</strong>
			</div>
			<div class="monitor-strip__item">
				<span>Active</span>
				<strong>{data.notificationChannels.filter((channel) => channel.isActive).length}</strong>
			</div>
			<div class="monitor-strip__item">
				<span>Event types</span>
				<strong>3</strong>
			</div>
			<div class="monitor-strip__item">
				<span>Flow</span>
				<strong>Online / Offline / Change</strong>
			</div>
		</div>
	</div>
</section>

<section class="section dashboard-stack">
	<article class="dashboard-card dashboard-card--wide" id="alert-help">
		<div class="section-heading">
			<h2>How alert templates work</h2>
		</div>
		<p>Each Discord channel stores three independent templates. Use the event-specific boxes below to control what recipients see when a watched position comes online, goes offline, or hands over to a different controller.</p>
		<div class="feature-grid">
			{#each templateSections as section}
				<div class="feature-card">
					<h2>{section.title}</h2>
					<p>{section.description}</p>
					<p class="muted">{section.exampleLabel}</p>
				</div>
			{/each}
		</div>
	</article>

	<article class="dashboard-card dashboard-card--wide" id="alert-channels">
		<div class="section-heading">
			<h2>Discord channels</h2>
		</div>
		<p>Add a Discord webhook here, then tailor the three alert types for that channel.</p>

		{#if form?.section === "notificationChannels"}
			<div class="form-error">{form.message}</div>
		{/if}

		<div class="card-list">
			{#if data.notificationChannels.length === 0}
				<p class="empty-state">No alert channels yet. Add a Discord webhook to receive staffing notifications.</p>
			{:else}
				{#each data.notificationChannels as channel}
					<div class="stack-card">
						<div class="stack-card__head">
							<strong>{channel.displayName ?? "Discord webhook"}</strong>
							<span class="status-chip {channel.isActive ? 'status-chip--ok' : 'status-chip--muted'}">
								{channel.isActive ? "Active" : "Disabled"}
							</span>
						</div>
						<p class="mono">Saved webhook: {channel.destinationMasked}</p>
						<form class="form-grid settings-form" method="post">
							<input type="hidden" name="id" value={channel.id} />
							<label>
								<span>Channel name</span>
								<input name="displayName" placeholder="Tower alerts" value={channelFieldValue(channel, "displayName")} />
							</label>
							<label>
								<span>Replace webhook URL</span>
								<input
									name="destination"
									placeholder="Leave blank to keep the current webhook"
									value={channelFieldValue(channel, "destination")}
								/>
							</label>
							<div class="template-section-grid">
								{#each templateSections as templateSection}
									<div class="template-card template-card--expanded">
										<div class="template-card__head">
											<h3>{templateSection.title}</h3>
											<p>{templateSection.description}</p>
										</div>
										<label>
											<span>Title template</span>
											<input
												name={templateFieldName(templateSection.key, "titleTemplate")}
												placeholder={getDefaultDiscordNotificationTemplate(templateSection.key).titleTemplate}
												value={templateFieldValue(channel, templateSection.key, "titleTemplate")}
											/>
										</label>
										<label>
											<span>Description template</span>
											<textarea
												name={templateFieldName(templateSection.key, "descriptionTemplate")}
												rows="4"
												placeholder={getDefaultDiscordNotificationTemplate(templateSection.key).descriptionTemplate}
											>{templateFieldValue(channel, templateSection.key, "descriptionTemplate")}</textarea>
										</label>
										<label>
											<span>Content template</span>
											<textarea
												name={templateFieldName(templateSection.key, "contentTemplate")}
												rows="3"
												placeholder={getDefaultDiscordNotificationTemplate(templateSection.key).contentTemplate ?? "Optional plain-text content above the embed."}
											>{templateFieldValue(channel, templateSection.key, "contentTemplate")}</textarea>
										</label>
										<label>
											<span>Embed colour</span>
											<input
												name={templateFieldName(templateSection.key, "color")}
												placeholder={getDefaultDiscordNotificationTemplate(templateSection.key).color ?? "#1C7F58"}
												value={templateFieldValue(channel, templateSection.key, "color")}
											/>
										</label>

										<div class="template-detail">
											<strong>Available variables</strong>
											<div class="template-variable-list">
												{#each templateSection.variables as variable}
													<div class="template-variable-row">
														<code>{variable}</code>
														<span>{variableDescriptions[variable]}</span>
													</div>
												{/each}
											</div>
										</div>

										<div class="template-detail">
											<strong>Example preview</strong>
											<p class="muted">{templateSection.exampleLabel}</p>
											<div class="preview-card" style={`--preview-color: ${previewColor(channel, templateSection.key)}`}>
												<div class="preview-card__header">
													<span class="preview-card__label">{templateSection.title}</span>
													<strong>{renderPreview(channel, templateSection.key, "titleTemplate")}</strong>
												</div>
												<p>{renderPreview(channel, templateSection.key, "descriptionTemplate")}</p>
												{#if renderPreview(channel, templateSection.key, "contentTemplate") !== "No plain-text content for this alert."}
													<div class="preview-card__content">{renderPreview(channel, templateSection.key, "contentTemplate")}</div>
												{/if}
											</div>
										</div>
									</div>
								{/each}
							</div>
							<button class="button button--secondary" type="submit" formaction="?/saveNotificationChannel">
								Save alert templates
							</button>
						</form>
						<div class="button-row compact-row">
							<form method="post">
								<input type="hidden" name="id" value={channel.id} />
								<input type="hidden" name="isActive" value={channel.isActive ? "false" : "true"} />
								<button class="button button--secondary" type="submit" formaction="?/toggleNotificationChannel">
									{channel.isActive ? "Disable" : "Enable"}
								</button>
							</form>
							<form method="post">
								<input type="hidden" name="id" value={channel.id} />
								<button class="button button--secondary" type="submit" formaction="?/deleteNotificationChannel">Delete</button>
							</form>
						</div>
					</div>
				{/each}
			{/if}
		</div>

		<form class="form-grid" method="post">
			<input
				name="displayName"
				placeholder="Tower alerts"
				value={form?.section === "notificationChannels" ? form?.displayName ?? "" : ""}
			/>
			<input
				name="destination"
				placeholder="https://discord.com/api/webhooks/..."
				value={form?.section === "notificationChannels" ? form?.destination ?? "" : ""}
			/>
			<button class="button button--primary" type="submit" formaction="?/addNotificationChannel">Add channel</button>
		</form>
	</article>
</section>
