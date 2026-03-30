<script lang="ts">
	export let data;
	export let form;
</script>

<svelte:head>
	<title>Settings | VATSIM Monitor</title>
</svelte:head>

<section class="dashboard-hero">
	<div class="panel dashboard-hero__main">
		<div class="eyebrow">Settings</div>
		<h1>Configure what this account watches and where alerts go.</h1>
		<p>Use the settings page to define watch rules, keep Discord channels in sync, and prepare future notification customization in one place.</p>
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
		<p>Send controller alerts to Discord webhooks when watched ATC positions come online or drop offline.</p>

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
						<p class="mono">{channel.destination}</p>
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

	<article class="dashboard-card" id="notification-customisation">
		<div class="section-heading">
			<h2>Notification customisation</h2>
		</div>
		<p>Discord message templates and per-channel formatting will live here once that feature is ready.</p>
		<div class="empty-state">For now, alerts use the standard message format so the monitoring and delivery flow stays predictable.</div>
	</article>
</section>
