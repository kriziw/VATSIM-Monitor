<script lang="ts">
	export let data;
	export let form;
</script>

<svelte:head>
	<title>Dashboard | VATSIM Monitor</title>
</svelte:head>

<section class="dashboard-hero">
	<div class="panel dashboard-hero__main">
		<div class="eyebrow">Dashboard</div>
		<h1>Monitor ATC availability and route the alerts that matter.</h1>
		<p>
			Track controller callsigns, check the live network state, and push staffing changes to your Discord channels from one focused workspace.
		</p>
		<div class="summary-grid">
			<div class="snapshot-card">
				<span>Controllers online</span>
				<strong>{data.monitoringStatus.currentOnlineCount}</strong>
			</div>
			<div class="snapshot-card">
				<span>Watch rules</span>
				<strong>{data.watchRules.length}</strong>
			</div>
			<div class="snapshot-card">
				<span>Alert channels</span>
				<strong>{data.notificationChannels.length}</strong>
			</div>
			<div class="snapshot-card">
				<span>Recent events</span>
				<strong>{data.recentEvents.length}</strong>
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
	<article class="dashboard-card dashboard-card--wide">
		<div class="section-heading">
			<h2>Live monitoring</h2>
			<span class="status-chip {data.monitoringStatus.lastError ? 'status-chip--warn' : 'status-chip--ok'}">
				{data.monitoringStatus.state}
			</span>
		</div>

		<div class="summary-grid">
			<div class="metric">
				<strong>Poll interval</strong>
				<span>{Math.round(data.monitoringStatus.pollIntervalMs / 1000)} seconds</span>
			</div>
			<div class="metric">
				<strong>Last success</strong>
				<span>{data.monitoringStatus.lastSuccessAt ?? "No successful poll yet"}</span>
			</div>
			<div class="metric">
				<strong>Last error</strong>
				<span>{data.monitoringStatus.lastError ?? "None"}</span>
			</div>
			<div class="metric">
				<strong>Last cycle</strong>
				<span>
					{#if data.monitoringStatus.lastCycle}
						{data.monitoringStatus.lastCycle.newEvents} online, {data.monitoringStatus.lastCycle.offlineEvents} offline,
						{data.monitoringStatus.lastCycle.sentNotifications} sent
					{:else}
						No cycle summary yet
					{/if}
				</span>
			</div>
		</div>
	</article>

	<article class="dashboard-card">
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

	<article class="dashboard-card">
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

	<article class="dashboard-card dashboard-card--wide">
		<div class="section-heading">
			<h2>Recent controller activity</h2>
		</div>
		<div class="card-list">
			{#if data.recentEvents.length === 0}
				<p class="empty-state">No controller events persisted yet.</p>
			{:else}
				{#each data.recentEvents as event}
					<div class="stack-card">
						<div class="stack-card__head">
							<strong>{event.callsign}</strong>
							<span class="status-chip {event.type === 'controller_online' ? 'status-chip--ok' : 'status-chip--muted'}">
								{event.type === "controller_online" ? "Online" : "Offline"}
							</span>
						</div>
						<div class="meta-row">
							<span>CID {event.controllerCid}</span>
							<span>{event.frequency || "Frequency pending"}</span>
							<span>{event.occurredAt}</span>
						</div>
					</div>
				{/each}
			{/if}
		</div>
	</article>
</section>
