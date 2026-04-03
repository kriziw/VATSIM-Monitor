<script lang="ts">
	export let data;
	export let form;

	$: effectiveLogMaxFileSizeMb = Math.round(data.appSettings.logMaxFileSizeBytes / (1024 * 1024));
	$: submittedLogMaxFileSizeMb =
		form?.section === "appSettings" ? form?.logMaxFileSizeMb ?? effectiveLogMaxFileSizeMb : effectiveLogMaxFileSizeMb;
</script>

<svelte:head>
	<title>Settings | VATSIM Monitor</title>
</svelte:head>

<section class="dashboard-hero dashboard-hero--single">
	<div class="panel dashboard-hero__main">
		<div class="eyebrow">Settings</div>
		<h1>Configure what this account watches and where alerts go.</h1>
		<p>Use the settings page to define what this account watches. Discord channels and alert message design now live on their own Alerts page so they are easier to manage.</p>
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
		<div class="settings-toolbar">
			<div class="account-chip">
				<div>
					<span>Signed in as</span>
					<strong>{data.session.user.username}</strong>
				</div>
				<div>
					<span>Email</span>
					<strong>{data.session.user.email ?? "Not set"}</strong>
				</div>
			</div>
			<div class="button-row settings-toolbar__actions">
				<a class="button button--secondary" href="/alerts">Open Alerts</a>
				{#if data.preferences.logsEnabled}
					<a class="button button--secondary" href="/logs">Open Logs</a>
				{/if}
				<a class="button button--secondary" href="/logout">Sign out</a>
			</div>
		</div>
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

	<article class="dashboard-card" id="alerts">
		<div class="section-heading">
			<h2>Alerts</h2>
			<a class="button button--secondary" href="/alerts">Open Alerts</a>
		</div>
		<p>Discord webhooks, online/offline/change message formats, template variables, and examples are now managed on a dedicated page.</p>

		<div class="card-list">
			<div class="stack-card">
				<div class="stack-card__head">
					<strong>Discord channels</strong>
					<span class="status-chip {data.notificationChannels.length > 0 ? 'status-chip--ok' : 'status-chip--muted'}">
						{data.notificationChannels.length}
					</span>
				</div>
				<div class="meta-row">
					<span>{data.notificationChannels.filter((channel) => channel.isActive).length} active</span>
					<span>{data.notificationChannels.filter((channel) => !channel.isActive).length} disabled</span>
				</div>
			</div>
			<div class="stack-card">
				<div class="stack-card__head">
					<strong>Alert types</strong>
				</div>
				<div class="meta-row">
					<span>Controller online</span>
					<span>Controller offline</span>
					<span>Controller change</span>
				</div>
			</div>
		</div>
	</article>

	<article class="dashboard-card" id="preferences">
		<div class="section-heading">
			<h2>Troubleshooting</h2>
		</div>
		<p>Enable the in-app Logs page only when you want recent rotating server logs available from the navigation.</p>

		{#if form?.section === "preferences"}
			<div class="form-error">{form.message}</div>
		{/if}

		<div class="card-list">
			<div class="stack-card">
				<div class="stack-card__head">
					<strong>Logs page</strong>
					<span class="status-chip {data.preferences.logsEnabled ? 'status-chip--ok' : 'status-chip--muted'}">
						{data.preferences.logsEnabled ? "Enabled" : "Disabled"}
					</span>
				</div>
				<div class="meta-row">
					<span>Hidden from navigation by default</span>
					<span>Auto-refresh starts paused</span>
				</div>
				<div class="button-row compact-row">
					<form method="post">
						<input type="hidden" name="logsEnabled" value={data.preferences.logsEnabled ? "false" : "true"} />
						<button class="button button--secondary" type="submit" formaction="?/updatePreferences">
							{data.preferences.logsEnabled ? "Disable Logs page" : "Enable Logs page"}
						</button>
					</form>
				</div>
			</div>
			<div class="stack-card">
				<div class="stack-card__head">
					<strong>Log rotation</strong>
					<span class="status-chip status-chip--muted">Max 500 MB</span>
				</div>
				<div class="meta-row">
					<span>Current cap {effectiveLogMaxFileSizeMb} MB</span>
					<span>Applied globally</span>
				</div>
				{#if form?.section === "appSettings"}
					<div class="form-error">{form.message}</div>
				{/if}
				<form class="form-grid form-grid--compact compact-row" method="post">
					<input
						max="100"
						min="1"
						name="logMaxFileSizeMb"
						step="1"
						type="number"
						value={submittedLogMaxFileSizeMb}
					/>
					<div class="muted compact-lead">
						Set the maximum size of each rotating log file. The default is 100 MB, and values above 500 MB are capped automatically.
					</div>
					<button class="button button--secondary" type="submit" formaction="?/updateAppSettings">
						Save log rotation
					</button>
				</form>
			</div>
		</div>
	</article>
</section>
