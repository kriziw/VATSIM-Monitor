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
	<div class="panel dashboard-hero__main dashboard-hero__main--compact">
		<div class="eyebrow">Settings</div>
		<h1>Manage what this account watches and how it troubleshoots.</h1>
		<p class="compact-lead">Watch rules live here. Alert templates stay on Alerts, and optional log access stays under Troubleshooting.</p>
		<div class="monitor-strip monitor-strip--tight">
			<div class="monitor-strip__item">
				<span>Rules</span>
				<strong>{data.watchRules.length}</strong>
			</div>
			<div class="monitor-strip__item">
				<span>Active</span>
				<strong>{data.watchRules.filter((watchRule) => watchRule.isActive).length}</strong>
			</div>
			<div class="monitor-strip__item">
				<span>Alerts</span>
				<strong>{data.notificationChannels.length}</strong>
			</div>
			<div class="monitor-strip__item">
				<span>Live logs</span>
				<strong>{data.preferences.logsEnabled ? "On" : "Off"}</strong>
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

<section class="section dashboard-stack settings-page">
	<article class="dashboard-card" id="watch-rules">
		<div class="section-heading">
			<h2>Watch rules</h2>
		</div>
		<p class="compact-lead">Choose the callsigns or wildcard patterns this account should watch.</p>

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
							<span>Observers {watchRule.excludeObservers ? "excluded" : "included"}</span>
						</div>
						<div class="button-row compact-row">
							<form method="post">
								<input type="hidden" name="id" value={watchRule.id} />
								<input type="hidden" name="topdown" value={watchRule.topdown ? "false" : "true"} />
								<input
									type="hidden"
									name="excludeObservers"
									value={watchRule.excludeObservers ? "true" : "false"}
								/>
								<input type="hidden" name="isActive" value={watchRule.isActive ? "true" : "false"} />
								<button class="button button--secondary" type="submit" formaction="?/toggleWatchRule">Toggle top-down</button>
							</form>
							<form method="post">
								<input type="hidden" name="id" value={watchRule.id} />
								<input type="hidden" name="topdown" value={watchRule.topdown ? "true" : "false"} />
								<input
									type="hidden"
									name="excludeObservers"
									value={watchRule.excludeObservers ? "false" : "true"}
								/>
								<input type="hidden" name="isActive" value={watchRule.isActive ? "true" : "false"} />
								<button class="button button--secondary" type="submit" formaction="?/toggleWatchRule">
									{watchRule.excludeObservers ? "Include OBS" : "Exclude OBS"}
								</button>
							</form>
							<form method="post">
								<input type="hidden" name="id" value={watchRule.id} />
								<input type="hidden" name="topdown" value={watchRule.topdown ? "true" : "false"} />
								<input
									type="hidden"
									name="excludeObservers"
									value={watchRule.excludeObservers ? "true" : "false"}
								/>
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
			<label class="toggle-line">
				<input
					name="excludeObservers"
					type="checkbox"
					checked={form?.section === "watchRules" ? Boolean(form?.excludeObservers) : false}
				/>
				<span>Exclude observer positions like `_OBS`</span>
			</label>
			<button class="button button--primary" type="submit" formaction="?/addWatchRule">Add watch rule</button>
		</form>
	</article>

	<article class="dashboard-card" id="alerts">
		<div class="section-heading">
			<h2>Alerts</h2>
			<a class="button button--secondary" href="/alerts">Open Alerts</a>
		</div>
		<p class="compact-lead">Discord destinations, rule links, and online/offline/change/move templates are managed on the dedicated Alerts page.</p>

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
					<span>Controller move</span>
				</div>
			</div>
		</div>
	</article>

	<article class="dashboard-card" id="preferences">
		<div class="section-heading">
			<h2>Troubleshooting</h2>
		</div>
		<p class="compact-lead">Enable the in-app Logs page only when you want recent rotating server logs available from the navigation.</p>

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
						max="500"
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
