<script lang="ts">
	import {
		getDefaultDiscordNotificationConfig,
		getDefaultDiscordNotificationTemplate,
		type DiscordNotificationTemplateType,
		type NotificationChannel
	} from "@vatsim-monitor/domain";

	export let data;
	export let form;

	type EditorFieldKey = "contentTemplate" | "descriptionTemplate" | "titleTemplate";
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

	type TemplateEditorState = {
		enabled: boolean;
		color: string;
		contentTemplate: string;
		descriptionTemplate: string;
		titleTemplate: string;
	};

	const templateSections: Array<{
		key: DiscordNotificationTemplateType;
		tabLabel: string;
		title: string;
		description: string;
		exampleLabel: string;
		variables: TemplateVariableKey[];
	}> = [
		{
			key: "controllerOnline",
			tabLabel: "Online",
			title: "Controller coming online",
			description: "Sent when a selected watched position was previously empty and is now staffed.",
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
			tabLabel: "Offline",
			title: "Controller going offline",
			description: "Sent when a selected watched position was previously staffed and is now empty.",
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
			tabLabel: "Change",
			title: "Controller change",
			description: "Sent when the same selected watched position changes to a different controller within roughly 30 seconds.",
			exampleLabel: "Example: EGLL_TWR changes from one controller to another.",
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
		"{{eventType}}": "The internal event key, such as controller_online.",
		"{{eventLabel}}": "A readable label such as Controller Online.",
		"{{statusLabel}}": "A short status word like Online, Offline, or Changed."
	};

	const previewValues: Record<DiscordNotificationTemplateType, Record<TemplateVariableKey, string>> = {
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

	function buildTemplateState(channel: NotificationChannel): Record<DiscordNotificationTemplateType, TemplateEditorState> {
		const config = channel.config ?? getDefaultDiscordNotificationConfig();
		return {
			controllerOnline: {
				enabled: config.controllerOnline.enabled,
				titleTemplate: config.controllerOnline.titleTemplate,
				descriptionTemplate: config.controllerOnline.descriptionTemplate,
				contentTemplate: config.controllerOnline.contentTemplate ?? "",
				color: config.controllerOnline.color ?? getDefaultDiscordNotificationTemplate("controllerOnline").color ?? "#1C7F58"
			},
			controllerOffline: {
				enabled: config.controllerOffline.enabled,
				titleTemplate: config.controllerOffline.titleTemplate,
				descriptionTemplate: config.controllerOffline.descriptionTemplate,
				contentTemplate: config.controllerOffline.contentTemplate ?? "",
				color:
					config.controllerOffline.color ??
					getDefaultDiscordNotificationTemplate("controllerOffline").color ??
					"#AA4D24"
			},
			controllerChange: {
				enabled: config.controllerChange.enabled,
				titleTemplate: config.controllerChange.titleTemplate,
				descriptionTemplate: config.controllerChange.descriptionTemplate,
				contentTemplate: config.controllerChange.contentTemplate ?? "",
				color:
					config.controllerChange.color ??
					getDefaultDiscordNotificationTemplate("controllerChange").color ??
					"#0E7C86"
			}
		};
	}

	function buildEditorState(channels: NotificationChannel[]) {
		return Object.fromEntries(channels.map((channel) => [channel.id, buildTemplateState(channel)])) as Record<
			string,
			Record<DiscordNotificationTemplateType, TemplateEditorState>
		>;
	}

	function buildWatchRuleSelections(channels: NotificationChannel[]) {
		return Object.fromEntries(channels.map((channel) => [channel.id, [...channel.watchRuleIds]])) as Record<
			string,
			string[]
		>;
	}

	function findInitialChannelId(): string {
		if (form?.channelId && data.notificationChannels.some((channel: NotificationChannel) => channel.id === form.channelId)) {
			return form.channelId;
		}

		return data.notificationChannels[0]?.id ?? "";
	}

	function findInitialTemplate(): DiscordNotificationTemplateType {
		if (form?.selectedTemplate === "controllerOffline" || form?.selectedTemplate === "controllerChange") {
			return form.selectedTemplate;
		}

		return "controllerOnline";
	}

	function channelFieldValue(channel: NotificationChannel, field: "displayName" | "destination"): string {
		if (form?.section === "notificationChannels" && form?.channelId === channel.id) {
			return form?.[field] ?? "";
		}

		if (field === "destination") {
			return "";
		}

		return channel.displayName ?? "";
	}

	function isRuleSelected(channelId: string, watchRuleId: string): boolean {
		return (watchRuleSelections[channelId] ?? []).includes(watchRuleId);
	}

	let selectedChannelId = findInitialChannelId();
	let selectedTemplate = findInitialTemplate();
	let editorState = buildEditorState(data.notificationChannels);
	let watchRuleSelections = buildWatchRuleSelections(data.notificationChannels);
	let activeField: EditorFieldKey = "descriptionTemplate";

	let titleInput: HTMLInputElement | null = null;
	let descriptionInput: HTMLTextAreaElement | null = null;
	let contentInput: HTMLTextAreaElement | null = null;
	let colorInput: HTMLInputElement | null = null;

	$: selectedChannel =
		data.notificationChannels.find((channel: NotificationChannel) => channel.id === selectedChannelId) ??
		data.notificationChannels[0] ??
		null;

	$: activeTemplateSection =
		templateSections.find((section) => section.key === selectedTemplate) ?? templateSections[0];

	$: activeTemplateState = selectedChannel ? editorState[selectedChannel.id]?.[selectedTemplate] : null;

	function setTemplateState(
		channelId: string,
		templateType: DiscordNotificationTemplateType,
		nextState: TemplateEditorState
	) {
		editorState = {
			...editorState,
			[channelId]: {
				...editorState[channelId],
				[templateType]: nextState
			}
		};
	}

	function updateField(field: EditorFieldKey, value: string) {
		if (!selectedChannel || !activeTemplateState) {
			return;
		}

		setTemplateState(selectedChannel.id, selectedTemplate, {
			...activeTemplateState,
			[field]: value
		});
	}

	function updateColor(value: string) {
		if (!selectedChannel || !activeTemplateState) {
			return;
		}

		setTemplateState(selectedChannel.id, selectedTemplate, {
			...activeTemplateState,
			color: value
		});
	}

	function updateEnabled(templateType: DiscordNotificationTemplateType, enabled: boolean) {
		if (!selectedChannel) {
			return;
		}

		const templateState = editorState[selectedChannel.id]?.[templateType];
		if (!templateState) {
			return;
		}

		setTemplateState(selectedChannel.id, templateType, {
			...templateState,
			enabled
		});
	}

	function toggleWatchRule(channelId: string, watchRuleId: string, checked: boolean) {
		const current = watchRuleSelections[channelId] ?? [];
		const next = checked
			? [...current, watchRuleId]
			: current.filter((candidate) => candidate !== watchRuleId);
		watchRuleSelections = {
			...watchRuleSelections,
			[channelId]: [...new Set(next)]
		};
	}

	function colorValue(): string {
		const raw = activeTemplateState?.color?.trim();
		if (!raw) {
			return getDefaultDiscordNotificationTemplate(selectedTemplate).color ?? "#1C7F58";
		}

		return raw.startsWith("#") ? raw : `#${raw}`;
	}

	function inputForField(field: EditorFieldKey): HTMLInputElement | HTMLTextAreaElement | null {
		if (field === "titleTemplate") {
			return titleInput;
		}

		if (field === "descriptionTemplate") {
			return descriptionInput;
		}

		return contentInput;
	}

	function insertVariable(field: EditorFieldKey, variable: TemplateVariableKey) {
		if (!selectedChannel || !activeTemplateState) {
			return;
		}

		const input = inputForField(field);
		const currentValue = activeTemplateState[field];

		if (!input) {
			updateField(field, `${currentValue}${variable}`);
			return;
		}

		const start = input.selectionStart ?? currentValue.length;
		const end = input.selectionEnd ?? currentValue.length;
		const nextValue = `${currentValue.slice(0, start)}${variable}${currentValue.slice(end)}`;
		updateField(field, nextValue);

		requestAnimationFrame(() => {
			input.focus();
			const nextCaret = start + variable.length;
			input.setSelectionRange(nextCaret, nextCaret);
		});
	}

	function handleVariableDragStart(event: DragEvent, variable: TemplateVariableKey) {
		event.dataTransfer?.setData("text/plain", variable);
		event.dataTransfer!.effectAllowed = "copy";
	}

	function handleVariableDrop(event: DragEvent, field: EditorFieldKey) {
		event.preventDefault();
		const variable = event.dataTransfer?.getData("text/plain") as TemplateVariableKey;
		if (!variable || !(variable in variableDescriptions)) {
			return;
		}

		insertVariable(field, variable);
	}

	function renderedPreview(field: EditorFieldKey): string {
		if (!activeTemplateState) {
			return "";
		}

		const raw = activeTemplateState[field];
		if (!raw) {
			return field === "contentTemplate" ? "No plain-text content for this alert." : "Preview unavailable.";
		}

		return Object.entries(previewValues[selectedTemplate]).reduce((value, [token, replacement]) => {
			return value.split(token).join(replacement);
		}, raw);
	}

	function saveButtonLabel(type: DiscordNotificationTemplateType): string {
		if (type === "controllerOffline") {
			return "Save offline alert";
		}

		if (type === "controllerChange") {
			return "Save change alert";
		}

		return "Save online alert";
	}
</script>

<svelte:head>
	<title>Alerts | VATSIM Monitor</title>
</svelte:head>

<section class="dashboard-hero dashboard-hero--single">
	<div class="panel dashboard-hero__main">
		<div class="eyebrow">Alerts</div>
		<h1>Manage where Discord alerts go and what they send.</h1>
		<p>Create a Discord destination once, then choose which watch rules it should follow and which alert types it should send.</p>
		<div class="monitor-strip">
			<div class="monitor-strip__item">
				<span>Destinations</span>
				<strong>{data.notificationChannels.length}</strong>
			</div>
			<div class="monitor-strip__item">
				<span>Rules</span>
				<strong>{data.watchRules.length}</strong>
			</div>
			<div class="monitor-strip__item">
				<span>Active</span>
				<strong>{data.notificationChannels.filter((channel) => channel.isActive).length}</strong>
			</div>
			<div class="monitor-strip__item">
				<span>Editing</span>
				<strong>{selectedChannel?.displayName ?? "None"}</strong>
			</div>
		</div>
	</div>
</section>

<section class="section dashboard-stack">
	<article class="dashboard-card dashboard-card--wide">
		<div class="section-heading">
			<h2>1. Create or delete alert destinations</h2>
		</div>
		<p>Create one destination per Discord webhook. Each destination can then be linked to one or more watch rules and configured for online, offline, and change alerts.</p>

		{#if form?.section === "notificationChannels"}
			<div class="form-error">{form.message}</div>
		{/if}

		{#if data.notificationChannels.length === 0}
			<p class="empty-state">No alert destinations yet. Add a Discord webhook below to start sending staffing notifications.</p>
		{:else}
			<div class="channel-selector">
				{#each data.notificationChannels as channel}
					<button
						class={`channel-selector__item ${selectedChannelId === channel.id ? "channel-selector__item--active" : ""}`}
						type="button"
						on:click={() => {
							selectedChannelId = channel.id;
							selectedTemplate = "controllerOnline";
						}}
					>
						<strong>{channel.displayName ?? "Discord destination"}</strong>
						<span>{channel.destinationMasked}</span>
						<em>{channel.watchRuleIds.length} rule{channel.watchRuleIds.length === 1 ? "" : "s"} linked</em>
					</button>
				{/each}
			</div>
		{/if}

		<form class="form-grid alert-add-form" method="post">
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
			<button class="button button--primary" type="submit" formaction="?/addNotificationChannel">Add destination</button>
		</form>

		{#if selectedChannel}
			<form class="button-row compact-row" method="post">
				<input type="hidden" name="id" value={selectedChannel.id} />
				<input type="hidden" name="selectedTemplate" value={selectedTemplate} />
				<button class="button button--secondary" type="submit" formaction="?/deleteNotificationChannel">
					Delete selected destination
				</button>
			</form>
		{/if}
	</article>

	{#if selectedChannel && activeTemplateState}
		<article class="dashboard-card dashboard-card--wide">
			<div class="section-heading">
				<div>
					<h2>2. Configure the selected destination</h2>
					<p class="muted alert-editor__subtitle">
						Editing <strong>{selectedChannel.displayName ?? "Discord destination"}</strong> for <span class="mono">{selectedChannel.destinationMasked}</span>
					</p>
				</div>
				<span class="status-chip {selectedChannel.isActive ? 'status-chip--ok' : 'status-chip--muted'}">
					{selectedChannel.isActive ? "Destination active" : "Destination disabled"}
				</span>
			</div>

			<form class="alerts-workspace" method="post">
				<div class="alerts-workspace__main alerts-workspace__main--compact">
					<input type="hidden" name="id" value={selectedChannel.id} />
					<input type="hidden" name="selectedTemplate" value={selectedTemplate} />
					<input type="hidden" name="isActive" value={selectedChannel.isActive ? "false" : "true"} />

					<div class="alert-config-grid">
						<label>
							<span>Destination name</span>
							<input
								name="displayName"
								placeholder="Tower alerts"
								value={channelFieldValue(selectedChannel, "displayName")}
							/>
						</label>

						<label>
							<span>Replace webhook URL</span>
							<input
								name="destination"
								placeholder="Leave blank to keep the current webhook"
								value={channelFieldValue(selectedChannel, "destination")}
							/>
						</label>
					</div>

					<div class="template-detail">
						<strong>Rule selection</strong>
						<p class="muted">Choose which watch rules should trigger this destination. If a watch rule is deleted later, it will be removed from this destination automatically.</p>
						{#if data.watchRules.length === 0}
							<p class="empty-state">No watch rules exist yet. Add watch rules on Settings before configuring Discord alerts.</p>
						{:else}
							<div class="rule-picker">
								{#each data.watchRules as watchRule}
									<label class="rule-picker__item">
										<input
											type="checkbox"
											name="watchRuleIds"
											value={watchRule.id}
											checked={isRuleSelected(selectedChannel.id, watchRule.id)}
											on:change={(event) => toggleWatchRule(selectedChannel.id, watchRule.id, event.currentTarget.checked)}
										/>
										<div>
											<strong>{watchRule.pattern}</strong>
											<span>{watchRule.topdown ? "Top-down enabled" : "Direct matching"}</span>
										</div>
									</label>
								{/each}
							</div>
						{/if}
						{#if (watchRuleSelections[selectedChannel.id] ?? []).length === 0}
							<p class="muted">This destination is currently unassigned and will not send alerts until at least one watch rule is selected.</p>
						{/if}
					</div>

					<div class="template-detail">
						<strong>Alert types</strong>
						<p class="muted">Enable or disable each subtype for this destination, then choose one subtype below to edit its message.</p>
						<div class="subtype-toggle-grid">
							{#each templateSections as section}
								<label class="rule-picker__item">
									<input
										type="checkbox"
										checked={editorState[selectedChannel.id][section.key].enabled}
										on:change={(event) => updateEnabled(section.key, event.currentTarget.checked)}
									/>
									<div>
										<strong>{section.title}</strong>
										<span>{editorState[selectedChannel.id][section.key].enabled ? "Enabled" : "Disabled"}</span>
									</div>
								</label>
							{/each}
						</div>
					</div>

					<div class="template-selector">
						{#each templateSections as section}
							<button
								class={`template-selector__item ${selectedTemplate === section.key ? "template-selector__item--active" : ""}`}
								type="button"
								on:click={() => {
									selectedTemplate = section.key;
								}}
							>
								<strong>{section.tabLabel}</strong>
							</button>
						{/each}
					</div>
					<p class="muted alert-template-note">
						<strong>{activeTemplateSection.title}.</strong> {activeTemplateSection.description}
					</p>

					<div class="compact-editor-grid">
						<label class={`compact-editor-field ${activeField === "titleTemplate" ? "compact-editor-field--active" : ""}`}>
							<span>Title</span>
							<input
								bind:this={titleInput}
								value={activeTemplateState.titleTemplate}
								on:focus={() => {
									activeField = "titleTemplate";
								}}
								on:input={(event) => updateField("titleTemplate", event.currentTarget.value)}
								on:dragover|preventDefault
								on:drop={(event) => handleVariableDrop(event, "titleTemplate")}
							/>
						</label>

						<label class={`compact-editor-field compact-editor-field--large ${activeField === "descriptionTemplate" ? "compact-editor-field--active" : ""}`}>
							<span>Description</span>
							<textarea
								bind:this={descriptionInput}
								rows="8"
								value={activeTemplateState.descriptionTemplate}
								on:focus={() => {
									activeField = "descriptionTemplate";
								}}
								on:input={(event) => updateField("descriptionTemplate", event.currentTarget.value)}
								on:dragover|preventDefault
								on:drop={(event) => handleVariableDrop(event, "descriptionTemplate")}
							></textarea>
						</label>

						<label class={`compact-editor-field ${activeField === "contentTemplate" ? "compact-editor-field--active" : ""}`}>
							<span>Additional content</span>
							<textarea
								bind:this={contentInput}
								rows="3"
								value={activeTemplateState.contentTemplate}
								on:focus={() => {
									activeField = "contentTemplate";
								}}
								on:input={(event) => updateField("contentTemplate", event.currentTarget.value)}
								on:dragover|preventDefault
								on:drop={(event) => handleVariableDrop(event, "contentTemplate")}
							></textarea>
						</label>

						<label class="compact-editor-field">
							<span>Embed colour</span>
							<div class="color-picker-row">
								<label class="color-picker-row__swatch" style={`--swatch-color: ${colorValue()}`}>
									<input
										bind:this={colorInput}
										class="color-picker-row__native"
										type="color"
										value={colorValue()}
										aria-label="Choose embed colour"
										on:input={(event) => updateColor(event.currentTarget.value.toUpperCase())}
									/>
									<span aria-hidden="true"></span>
								</label>
								<input
									class="color-picker-row__hex"
									placeholder={getDefaultDiscordNotificationTemplate(selectedTemplate).color ?? "#1C7F58"}
									value={activeTemplateState.color}
									on:input={(event) => updateColor(event.currentTarget.value)}
								/>
							</div>
						</label>
					</div>

					<input
						type="hidden"
						name="configJson"
						value={JSON.stringify(editorState[selectedChannel.id])}
					/>

					<div class="button-row compact-row">
						<button class="button button--primary" type="submit" formaction="?/saveNotificationChannel">
							{saveButtonLabel(selectedTemplate)}
						</button>
						<button class="button button--secondary" type="submit" formaction="?/toggleNotificationChannel">
							{selectedChannel.isActive ? "Disable destination" : "Enable destination"}
						</button>
					</div>
				</div>

				<aside class="alerts-workspace__sidebar">
					<div class="template-detail">
						<strong>Variables</strong>
						<p class="muted">Drag a variable into the field you are editing, or click it to insert it into the active field.</p>
						<div class="token-board">
							{#each activeTemplateSection.variables as variable}
								<button
									class="token-chip"
									type="button"
									draggable="true"
									on:click={() => insertVariable(activeField, variable)}
									on:dragstart={(event) => handleVariableDragStart(event, variable)}
								>
									<code>{variable}</code>
								</button>
							{/each}
						</div>
						<div class="template-variable-list">
							{#each activeTemplateSection.variables as variable}
								<div class="template-variable-row">
									<code>{variable}</code>
									<span>{variableDescriptions[variable]}</span>
								</div>
							{/each}
						</div>
					</div>

					<div class="template-detail">
						<strong>Live preview</strong>
						<p class="muted">{activeTemplateSection.exampleLabel}</p>
						<div class="preview-card" style={`--preview-color: ${activeTemplateState.color || "#0C2746"}`}>
							<div class="preview-card__header">
								<span class="preview-card__label">{activeTemplateSection.title}</span>
								<strong>{renderedPreview("titleTemplate")}</strong>
							</div>
							<p>{renderedPreview("descriptionTemplate")}</p>
							{#if renderedPreview("contentTemplate") !== "No plain-text content for this alert."}
								<div class="preview-card__content">{renderedPreview("contentTemplate")}</div>
							{/if}
						</div>
					</div>
				</aside>
			</form>
		</article>
	{/if}
</section>
