<script lang="ts">
	export let data;
</script>

<svelte:head>
	<title>Monitor | VATSIM Monitor</title>
</svelte:head>

<section class="dashboard-hero">
	<div class="panel dashboard-hero__main">
		<div class="eyebrow">Monitor</div>
		<h1>See what ATC is online and what changed recently.</h1>
		<p>Use the monitor page for live network status, current controller activity, and the latest staffing changes that matter to your watchlist.</p>

		{#if data.statusError}
			<div class="form-error">{data.statusError}</div>
		{:else if data.monitoringStatus}
			<div class="summary-grid">
				<div class="snapshot-card">
					<span>Controllers online</span>
					<strong>{data.monitoringStatus.currentOnlineCount}</strong>
				</div>
				<div class="snapshot-card">
					<span>Poll interval</span>
					<strong>{Math.round(data.monitoringStatus.pollIntervalMs / 1000)}s</strong>
				</div>
				<div class="snapshot-card">
					<span>Monitoring</span>
					<strong>{data.monitoringStatus.lastError ? "Attention" : "Healthy"}</strong>
				</div>
				<div class="snapshot-card">
					<span>Last success</span>
					<strong>{data.monitoringStatus.lastSuccessAt ? "Live" : "Waiting"}</strong>
				</div>
			</div>
		{/if}
	</div>

	<div class="panel account-panel">
		<div class="section-heading">
			<h2>Quick links</h2>
		</div>
		<div class="account-list">
			<div>
				<span>Signed in as</span>
				<strong>{data.session.user.username}</strong>
			</div>
			<div>
				<span>Watch rules</span>
				<strong>{data.dashboardData?.watchRules.length ?? 0}</strong>
			</div>
			<div>
				<span>Alert channels</span>
				<strong>{data.dashboardData?.notificationChannels.length ?? 0}</strong>
			</div>
		</div>
		<div class="button-row compact-row">
			<a class="button button--primary" href="/dashboard">Open settings</a>
			<a class="button button--secondary" href="/dashboard#watch-rules">Edit watch rules</a>
		</div>
	</div>
</section>

<section class="section dashboard-stack">
	<article class="dashboard-card dashboard-card--wide" id="monitor-status">
		<div class="section-heading">
			<h2>Monitoring status</h2>
			{#if data.monitoringStatus}
				<span class="status-chip {data.monitoringStatus.lastError ? 'status-chip--warn' : 'status-chip--ok'}">
					{data.monitoringStatus.state}
				</span>
			{/if}
		</div>

		{#if data.monitoringStatus}
			<div class="summary-grid">
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
				<div class="metric">
					<strong>Focus</strong>
					<span>Use settings to change watch rules and alert routing.</span>
				</div>
			</div>
		{:else}
			<p class="muted">Monitoring data is temporarily unavailable.</p>
		{/if}
	</article>

	<article class="dashboard-card dashboard-card--wide" id="recent-activity">
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
