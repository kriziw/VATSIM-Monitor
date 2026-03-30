<script lang="ts">
	import {
		getDefaultDiscordNotificationConfig,
		getDefaultDiscordNotificationTemplate,
		type DiscordNotificationTemplateType,
		type NotificationChannel
	} from "@vatsim-monitor/domain";

	export let data;
	export let form;

	type FieldKey = "color" | "contentTemplate" | "descriptionTemplate" | "titleTemplate";
	type EditorFieldKey = Exclude<FieldKey, "color">;
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

	type TemplateBlock =
		| {
				id: string;
				kind: "text";
				value: string;
		  }
		| {
				id: string;
				kind: "variable";
				value: TemplateVariableKey;
		  };

	type TemplateEditorState = {
		color: string;
		contentTemplate: TemplateBlock[];
		descriptionTemplate: TemplateBlock[];
		titleTemplate: TemplateBlock[];
	};

	type DragPayload =
		| {
				field?: EditorFieldKey;
				index?: number;
				kind: "existing";
		  }
		| {
				kind: "palette-text";
		  }
		| {
				kind: "palette-variable";
				value: TemplateVariableKey;
		  };

	const editorFieldLabels: Record<EditorFieldKey, string> = {
		titleTemplate: "Title",
		descriptionTemplate: "Description",
		contentTemplate: "Content"
	};

	const fieldPlaceholders: Record<EditorFieldKey, string> = {
		titleTemplate: "Drag blocks here to build the notification title.",
		descriptionTemplate: "Build the main embed description here.",
		contentTemplate: "Optional plain-text content above the embed."
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

	const fieldOrder: EditorFieldKey[] = ["titleTemplate", "descriptionTemplate", "contentTemplate"];
	const tokenRegex = new RegExp(
		`(${Object.keys(variableDescriptions)
			.map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
			.join("|")})`,
		"g"
	);

	function createBlock(kind: TemplateBlock["kind"], value: string): TemplateBlock {
		return {
			id: `${kind}-${Math.random().toString(36).slice(2, 10)}`,
			kind,
			value: value as any
		};
	}

	function parseBlocks(template: string | null | undefined): TemplateBlock[] {
		const raw = template ?? "";
		if (!raw) {
			return [];
		}

		return raw
			.split(tokenRegex)
			.filter((part) => part.length > 0)
			.map((part) => {
				if (part in variableDescriptions) {
					return createBlock("variable", part);
				}

				return createBlock("text", part);
			});
	}

	function serializeBlocks(blocks: TemplateBlock[]): string {
		return blocks.map((block) => block.value).join("");
	}

	function buildTemplateState(channel: NotificationChannel): Record<DiscordNotificationTemplateType, TemplateEditorState> {
		const config = channel.config ?? getDefaultDiscordNotificationConfig();
		return {
			controllerOnline: {
				titleTemplate: parseBlocks(config.controllerOnline.titleTemplate),
				descriptionTemplate: parseBlocks(config.controllerOnline.descriptionTemplate),
				contentTemplate: parseBlocks(config.controllerOnline.contentTemplate),
				color: config.controllerOnline.color ?? getDefaultDiscordNotificationTemplate("controllerOnline").color ?? "#1C7F58"
			},
			controllerOffline: {
				titleTemplate: parseBlocks(config.controllerOffline.titleTemplate),
				descriptionTemplate: parseBlocks(config.controllerOffline.descriptionTemplate),
				contentTemplate: parseBlocks(config.controllerOffline.contentTemplate),
				color:
					config.controllerOffline.color ??
					getDefaultDiscordNotificationTemplate("controllerOffline").color ??
					"#AA4D24"
			},
			controllerChange: {
				titleTemplate: parseBlocks(config.controllerChange.titleTemplate),
				descriptionTemplate: parseBlocks(config.controllerChange.descriptionTemplate),
				contentTemplate: parseBlocks(config.controllerChange.contentTemplate),
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

	$: selectedChannel =
		data.notificationChannels.find((channel: NotificationChannel) => channel.id === selectedChannelId) ??
		data.notificationChannels[0] ??
		null;

	$: activeTemplateSection =
		templateSections.find((section) => section.key === selectedTemplate) ?? templateSections[0];

	$: activeTemplateState = selectedChannel ? editorState[selectedChannel.id]?.[selectedTemplate] : null;

	function getTemplateState(
		channelId: string,
		templateType: DiscordNotificationTemplateType
	): TemplateEditorState {
		return editorState[channelId][templateType];
	}

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

	function setFieldBlocks(
		channelId: string,
		templateType: DiscordNotificationTemplateType,
		field: EditorFieldKey,
		blocks: TemplateBlock[]
	) {
		const current = getTemplateState(channelId, templateType);
		setTemplateState(channelId, templateType, {
			...current,
			[field]: blocks
		});
	}

	function setFieldColor(channelId: string, templateType: DiscordNotificationTemplateType, color: string) {
		const current = getTemplateState(channelId, templateType);
		setTemplateState(channelId, templateType, {
			...current,
			color
		});
	}

	function updateTextBlock(
		channelId: string,
		templateType: DiscordNotificationTemplateType,
		field: EditorFieldKey,
		index: number,
		value: string
	) {
		const blocks = [...getTemplateState(channelId, templateType)[field]];
		const block = blocks[index];
		if (!block || block.kind !== "text") {
			return;
		}

		blocks[index] = {
			...block,
			value
		};
		setFieldBlocks(channelId, templateType, field, blocks);
	}

	function removeBlock(
		channelId: string,
		templateType: DiscordNotificationTemplateType,
		field: EditorFieldKey,
		index: number
	) {
		const blocks = [...getTemplateState(channelId, templateType)[field]];
		blocks.splice(index, 1);
		setFieldBlocks(channelId, templateType, field, blocks);
	}

	function beginDrag(event: DragEvent, payload: DragPayload) {
		event.dataTransfer?.setData("application/json", JSON.stringify(payload));
		event.dataTransfer?.setData("text/plain", JSON.stringify(payload));
		event.dataTransfer?.setData("text/x-vatsim-monitor-block", JSON.stringify(payload));
		event.dataTransfer!.effectAllowed = payload.kind === "existing" ? "move" : "copy";
	}

	function readDragPayload(event: DragEvent): DragPayload | null {
		const raw =
			event.dataTransfer?.getData("application/json") ||
			event.dataTransfer?.getData("text/x-vatsim-monitor-block") ||
			event.dataTransfer?.getData("text/plain");

		if (!raw) {
			return null;
		}

		try {
			return JSON.parse(raw) as DragPayload;
		} catch {
			return null;
		}
	}

	function handleDrop(event: DragEvent, field: EditorFieldKey, targetIndex: number) {
		event.preventDefault();

		if (!selectedChannel) {
			return;
		}

		const payload = readDragPayload(event);
		if (!payload) {
			return;
		}

		const currentState = getTemplateState(selectedChannel.id, selectedTemplate);
		let nextTargetIndex = targetIndex;
		let targetBlocks = [...currentState[field]];

		if (payload.kind === "existing" && payload.field) {
			const sourceBlocks = [...currentState[payload.field]];
			const [moved] = sourceBlocks.splice(payload.index ?? -1, 1);
			if (!moved) {
				return;
			}

			if (payload.field === field && (payload.index ?? 0) < nextTargetIndex) {
				nextTargetIndex -= 1;
			}

			if (payload.field === field) {
				targetBlocks = sourceBlocks;
				targetBlocks.splice(nextTargetIndex, 0, moved);
				setFieldBlocks(selectedChannel.id, selectedTemplate, field, targetBlocks);
				return;
			}

			targetBlocks.splice(nextTargetIndex, 0, moved);
			setTemplateState(selectedChannel.id, selectedTemplate, {
				...currentState,
				[payload.field]: sourceBlocks,
				[field]: targetBlocks
			});
			return;
		}

		const newBlock =
			payload.kind === "palette-variable"
				? createBlock("variable", payload.value)
				: createBlock("text", "Type here");

		targetBlocks.splice(nextTargetIndex, 0, newBlock);
		setFieldBlocks(selectedChannel.id, selectedTemplate, field, targetBlocks);
	}

	function renderPreview(templateType: DiscordNotificationTemplateType, field: EditorFieldKey): string {
		if (!selectedChannel) {
			return "";
		}

		const rendered = serializeBlocks(getTemplateState(selectedChannel.id, templateType)[field]);
		if (!rendered) {
			return field === "contentTemplate" ? "No plain-text content for this alert." : "Preview unavailable.";
		}

		return Object.entries(previewValues[templateType]).reduce((value, [token, replacement]) => {
			return value.split(token).join(replacement);
		}, rendered);
	}

	function serializedTemplate(
		channelId: string,
		templateType: DiscordNotificationTemplateType,
		field: FieldKey
	): string {
		const state = getTemplateState(channelId, templateType);
		if (field === "color") {
			return state.color;
		}

		return serializeBlocks(state[field]);
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
		<h1>Build Discord notifications visually.</h1>
		<p>Select a channel, pick the alert type, then drag variables and free-text blocks into the title, description, and content areas. The preview updates as you build.</p>
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
					<h2>Step 3: Build the selected alert</h2>
					<p class="muted alert-editor__subtitle">{activeTemplateSection.description}</p>
				</div>
			</div>

			<form class="alerts-workspace" method="post">
				<div class="alerts-workspace__main">
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

					<div class="block-palette">
						<div class="block-palette__header">
							<strong>Palette</strong>
							<span>Drag free text or variables into the editor below.</span>
						</div>
						<div class="block-palette__items">
							<div
								class="block-palette__item block-palette__item--text"
								draggable="true"
								role="button"
								tabindex="0"
								on:dragstart={(event) => beginDrag(event, { kind: "palette-text" })}
							>
								<strong>Text block</strong>
								<span>Add custom wording anywhere in the template.</span>
							</div>
							{#each activeTemplateSection.variables as variable}
								<div
									class="block-palette__item"
									draggable="true"
									role="button"
									tabindex="0"
									on:dragstart={(event) => beginDrag(event, { kind: "palette-variable", value: variable })}
								>
									<code>{variable}</code>
									<span>{variableDescriptions[variable]}</span>
								</div>
							{/each}
						</div>
					</div>

					{#each fieldOrder as field}
						<section class="block-editor">
							<div class="block-editor__header">
								<h3>{editorFieldLabels[field]}</h3>
								<p>{fieldPlaceholders[field]}</p>
							</div>

							<div class="block-canvas">
								{#each activeTemplateState[field] as block, index}
									<div
										class="block-dropzone"
										role="button"
										tabindex="0"
										on:dragover|preventDefault
										on:drop={(event) => handleDrop(event, field, index)}
									>
										Drop here
									</div>
									<div
										class={`block-item ${block.kind === "variable" ? "block-item--variable" : "block-item--text"}`}
										draggable="true"
										role="group"
										on:dragstart={(event) => beginDrag(event, { kind: "existing", field, index })}
									>
										<div class="block-item__body">
											{#if block.kind === "text"}
												<textarea
													rows={field === "titleTemplate" ? 2 : 3}
													value={block.value}
													on:input={(event) =>
														updateTextBlock(selectedChannel.id, selectedTemplate, field, index, event.currentTarget.value)}
												></textarea>
											{:else}
												<code>{block.value}</code>
												<span>{variableDescriptions[block.value]}</span>
											{/if}
										</div>
										<button
											class="button button--secondary block-item__remove"
											type="button"
											on:click={() => removeBlock(selectedChannel.id, selectedTemplate, field, index)}
										>
											Remove
										</button>
									</div>
								{/each}

								<div
									class="block-dropzone block-dropzone--end"
									role="button"
									tabindex="0"
									on:dragover|preventDefault
									on:drop={(event) => handleDrop(event, field, activeTemplateState[field].length)}
								>
									{activeTemplateState[field].length === 0 ? "Drop your first block here" : "Drop here to append"}
								</div>
							</div>
						</section>
					{/each}

					<label>
						<span>Embed colour</span>
						<input
							placeholder={getDefaultDiscordNotificationTemplate(selectedTemplate).color ?? "#1C7F58"}
							value={activeTemplateState.color}
							on:input={(event) => setFieldColor(selectedChannel.id, selectedTemplate, event.currentTarget.value)}
						/>
					</label>

					{#each templateSections as section}
						<input
							type="hidden"
							name={`${section.key}TitleTemplate`}
							value={serializedTemplate(selectedChannel.id, section.key, "titleTemplate")}
						/>
						<input
							type="hidden"
							name={`${section.key}DescriptionTemplate`}
							value={serializedTemplate(selectedChannel.id, section.key, "descriptionTemplate")}
						/>
						<input
							type="hidden"
							name={`${section.key}ContentTemplate`}
							value={serializedTemplate(selectedChannel.id, section.key, "contentTemplate")}
						/>
						<input
							type="hidden"
							name={`${section.key}Color`}
							value={serializedTemplate(selectedChannel.id, section.key, "color")}
						/>
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
						<strong>Available variables</strong>
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
								<strong>{renderPreview(selectedTemplate, "titleTemplate")}</strong>
							</div>
							<p>{renderPreview(selectedTemplate, "descriptionTemplate")}</p>
							{#if renderPreview(selectedTemplate, "contentTemplate") !== "No plain-text content for this alert."}
								<div class="preview-card__content">{renderPreview(selectedTemplate, "contentTemplate")}</div>
							{/if}
						</div>
					</div>
				</aside>
			</form>
		</article>
	{/if}
</section>
