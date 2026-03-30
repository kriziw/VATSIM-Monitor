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
		color: string;
		contentTemplate: string;
		descriptionTemplate: string;
		titleTemplate: string;
	};

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
			description: "Use this when a watched position was previously empty and is now staffed.",
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
			description: "Use this when a watched position was staffed and is now empty.",
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
				"Use this when the same watched position changes to a different controller within roughly 30 seconds.",
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
				titleTemplate: config.controllerOnline.titleTemplate,
				descriptionTemplate: config.controllerOnline.descriptionTemplate,
				contentTemplate: config.controllerOnline.contentTemplate ?? "",
				color: config.controllerOnline.color ?? getDefaultDiscordNotificationTemplate("controllerOnline").color ?? "#1C7F58"
			},
			controllerOffline: {
				titleTemplate: config.controllerOffline.titleTemplate,
				descriptionTemplate: config.controllerOffline.descriptionTemplate,
				contentTemplate: config.controllerOffline.contentTemplate ?? "",
				color:
					config.controllerOffline.color ??
					getDefaultDiscordNotificationTemplate("controllerOffline").color ??
					"#AA4D24"
			},
			controllerChange: {
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

	let selectedChannelId = findInitialChannelId();
	let selectedTemplate = findInitialTemplate();
	let editorState = buildEditorState(data.notificationChannels);
	let activeField: EditorFieldKey = "descriptionTemplate";

	let titleInput: HTMLInputElement | null = null;
	let descriptionInput: HTMLTextAreaElement | null = null;
	let contentInput: HTMLTextAreaElement | null = null;

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
		<h1>Build Discord notifications quickly.</h1>
		<p>Select a channel, choose an alert type, then edit the preloaded title and description. Drag variables from the side panel into the field you are working on and watch the preview update immediately.</p>
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
				<span>Templates</span>
				<strong>3 types</strong>
			</div>
			<div class="monitor-strip__item">
				<span>Editing</span>
				<strong>{activeTemplateSection.title}</strong>
			</div>
		</div>
	</div>
</section>

<section class="section dashboard-stack">
	<article class="dashboard-card dashboard-card--wide">
		<div class="section-heading">
			<h2>Step 1: Choose a Discord channel</h2>
		</div>
		<p>The editor below always applies to the currently selected webhook.</p>

		{#if form?.section === "notificationChannels"}
			<div class="form-error">{form.message}</div>
		{/if}

		{#if data.notificationChannels.length === 0}
			<p class="empty-state">No alert channels yet. Add a Discord webhook below to start sending staffing notifications.</p>
		{:else}
			<div class="channel-selector">
				{#each data.notificationChannels as channel}
					<button
						class={`channel-selector__item ${selectedChannelId === channel.id ? "channel-selector__item--active" : ""}`}
						type="button"
						on:click={() => {
							selectedChannelId = channel.id;
						}}
					>
						<strong>{channel.displayName ?? "Discord webhook"}</strong>
						<span>{channel.destinationMasked}</span>
						<em>{channel.isActive ? "Active" : "Disabled"}</em>
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
			<button class="button button--primary" type="submit" formaction="?/addNotificationChannel">Add channel</button>
		</form>
	</article>

	{#if selectedChannel && activeTemplateState}
		<article class="dashboard-card dashboard-card--wide">
			<div class="section-heading">
				<div>
					<h2>Step 2: Choose an alert template</h2>
					<p class="muted alert-editor__subtitle">
						Editing <strong>{selectedChannel.displayName ?? "Discord webhook"}</strong> for <span class="mono">{selectedChannel.destinationMasked}</span>
					</p>
				</div>
				<span class="status-chip {selectedChannel.isActive ? 'status-chip--ok' : 'status-chip--muted'}">
					{selectedChannel.isActive ? "Channel active" : "Channel disabled"}
				</span>
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
						<strong>{section.title}</strong>
						<span>{section.description}</span>
					</button>
				{/each}
			</div>
		</article>

		<article class="dashboard-card dashboard-card--wide">
			<div class="section-heading">
				<div>
					<h2>Step 3: Edit the selected alert</h2>
					<p class="muted alert-editor__subtitle">{activeTemplateSection.description}</p>
				</div>
			</div>

			<form class="alerts-workspace" method="post">
				<div class="alerts-workspace__main alerts-workspace__main--compact">
					<input type="hidden" name="id" value={selectedChannel.id} />
					<input type="hidden" name="selectedTemplate" value={selectedTemplate} />
					<input type="hidden" name="isActive" value={selectedChannel.isActive ? "false" : "true"} />

					<label>
						<span>Channel name</span>
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
								<input
									class="color-picker-row__native"
									type="color"
									value={colorValue()}
									on:input={(event) => updateColor(event.currentTarget.value.toUpperCase())}
								/>
								<input
									class="color-picker-row__hex"
									placeholder={getDefaultDiscordNotificationTemplate(selectedTemplate).color ?? "#1C7F58"}
									value={activeTemplateState.color}
									on:input={(event) => updateColor(event.currentTarget.value)}
								/>
							</div>
						</label>
					</div>

					{#each templateSections as section}
						<input type="hidden" name={`${section.key}TitleTemplate`} value={editorState[selectedChannel.id][section.key].titleTemplate} />
						<input
							type="hidden"
							name={`${section.key}DescriptionTemplate`}
							value={editorState[selectedChannel.id][section.key].descriptionTemplate}
						/>
						<input
							type="hidden"
							name={`${section.key}ContentTemplate`}
							value={editorState[selectedChannel.id][section.key].contentTemplate}
						/>
						<input type="hidden" name={`${section.key}Color`} value={editorState[selectedChannel.id][section.key].color} />
					{/each}

					<div class="button-row compact-row">
						<button class="button button--primary" type="submit" formaction="?/saveNotificationChannel">
							{saveButtonLabel(selectedTemplate)}
						</button>
						<button class="button button--secondary" type="submit" formaction="?/toggleNotificationChannel">
							{selectedChannel.isActive ? "Disable channel" : "Enable channel"}
						</button>
						<button class="button button--secondary" type="submit" formaction="?/deleteNotificationChannel">
							Delete channel
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
