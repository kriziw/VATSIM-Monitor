<script lang="ts">
	import {
		DISCORD_TEMPLATE_VARIABLES,
		getDefaultDiscordNotificationTemplate,
		getDefaultDiscordNotificationConfig,
		type DiscordNotificationTemplate,
		type DiscordNotificationTemplateType,
		type NotificationChannel
	} from "@vatsim-monitor/domain";

	export let data;
	export let form;

	type TemplateField = keyof DiscordNotificationTemplate;

	const templateSections: Array<{
		key: DiscordNotificationTemplateType;
		title: string;
		description: string;
	}> = [
		{
			key: "controllerOnline",
			title: "Controller online",
			description: "Used when a watched position was previously empty and is now staffed."
		},
		{
			key: "controllerOffline",
			title: "Controller offline",
			description: "Used when a watched position was staffed and is now empty."
		},
		{
			key: "controllerChange",
			title: "Controller change",
			description:
				"Used when the same watched position changes to a different controller within roughly 30 seconds."
		}
	];

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
</script>

<svelte:head>
	<title>Settings | VATSIM Monitor</title>
</svelte:head>

<section class="dashboard-hero">
	<div class="panel dashboard-hero__main">
		<div class="eyebrow">Settings</div>
		<h1>Configure what this account watches and where alerts go.</h1>
		<p>Use the settings page to define watch rules and tune how Discord alerts should look for controllers coming online, going offline, or changing over on a watched position.</p>
		<div class="summary-grid">
			<div class="snapshot-card">
				<span>Watch rules</span>
				<strong>{data.watchRules.length}</strong>
			</div>
			<div class="snapshot-card">
				<span>Active rules</span>
				<strong>{data.watchRules.filter((watchRule) => watchRule.isActive).length}</strong>
			</div>
			<div class="snapshot-card">
				<span>Alert channels</span>
				<strong>{data.notificationChannels.length}</strong>
			</div>
			<div class="snapshot-card">
				<span>Active channels</span>
				<strong>{data.notificationChannels.filter((channel) => channel.isActive).length}</strong>
			</div>
		</div>
	</div>

	<div class="panel account-panel">
		<div class="section-heading">
			<h2>Account</h2>
		</div>
		<div class="account-list">
			<div>
				<span>Signed in as</span>
				<strong>{data.session.user.username}</strong>
			</div>
			<div>
				<span>Email</span>
				<strong>{data.session.user.email ?? "Not set"}</strong>
			</div>
		</div>
		<a class="button button--secondary" href="/logout">Sign out</a>
	</div>
</section>

<section class="section dashboard-stack">
	<article class="dashboard-card" id="watch-rules">
		<div class="section-heading">
			<h2>Watch rules</h2>
		</div>
		<p>Choose the controller callsigns or wildcard patterns you want this account to watch.</p>

		{#if form?.section === "watchRules"}
			<div class="form-error">{form.message}</div>
		{/if}

		<div class="card-list">
			{#if data.watchRules.length === 0}
				<p class="empty-state">No watch rules yet. Add one to start watching ATC availability.</p>
			{:else}
				{#each data.watchRules as watchRule}
					<div class="stack-card">
						<div class="stack-card__head">
							<strong>{watchRule.pattern}</strong>
							<span class="status-chip {watchRule.isActive ? 'status-chip--ok' : 'status-chip--muted'}">
								{watchRule.isActive ? "Active" : "Disabled"}
							</span>
						</div>
						<div class="meta-row">
							<span>Top-down {watchRule.topdown ? "enabled" : "off"}</span>
						</div>
						<div class="button-row compact-row">
							<form method="post">
								<input type="hidden" name="id" value={watchRule.id} />
								<input type="hidden" name="topdown" value={watchRule.topdown ? "false" : "true"} />
								<input type="hidden" name="isActive" value={watchRule.isActive ? "true" : "false"} />
								<button class="button button--secondary" type="submit" formaction="?/toggleWatchRule">Toggle top-down</button>
							</form>
							<form method="post">
								<input type="hidden" name="id" value={watchRule.id} />
								<input type="hidden" name="topdown" value={watchRule.topdown ? "true" : "false"} />
								<input type="hidden" name="isActive" value={watchRule.isActive ? "false" : "true"} />
								<button class="button button--secondary" type="submit" formaction="?/toggleWatchRule">
									{watchRule.isActive ? "Disable" : "Enable"}
								</button>
							</form>
							<form method="post">
								<input type="hidden" name="id" value={watchRule.id} />
								<button class="button button--secondary" type="submit" formaction="?/deleteWatchRule">Delete</button>
							</form>
						</div>
					</div>
				{/each}
			{/if}
		</div>

		<form class="form-grid" method="post">
			<input
				name="pattern"
				placeholder="EGLL_TWR or EGNX_%"
				value={form?.section === "watchRules" ? form?.pattern ?? "" : ""}
			/>
			<label class="toggle-line">
				<input name="topdown" type="checkbox" />
				<span>Enable top-down matching</span>
			</label>
			<button class="button button--primary" type="submit" formaction="?/addWatchRule">Add watch rule</button>
		</form>
	</article>

	<article class="dashboard-card" id="alert-channels">
		<div class="section-heading">
			<h2>Alert channels</h2>
		</div>
		<p>Send controller alerts to Discord webhooks and tailor each message type so users know whether a position came online, went offline, or changed to a different controller.</p>

		{#if form?.section === "notificationChannels"}
			<div class="form-error">{form.message}</div>
		{/if}

		<div class="template-guide">
			<div class="empty-state template-note">
				<strong>How Discord templates work</strong>
				<p>Each channel has three independent message templates. Use them to make online, offline, and handover events look different so recipients can tell what happened at a glance.</p>
			</div>
			<div class="empty-state template-note">
				<strong>Template variables</strong>
				<p>The values below are replaced automatically when an alert is sent. Change templates can also use previous controller details.</p>
				<div class="tag-row">
					{#each DISCORD_TEMPLATE_VARIABLES as variable}
						<span class="rule-tag">{variable}</span>
					{/each}
				</div>
			</div>
		</div>

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
									<div class="template-card">
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
									</div>
								{/each}
							</div>
							<button class="button button--secondary" type="submit" formaction="?/saveNotificationChannel">
								Save notification format
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
