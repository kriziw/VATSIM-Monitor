<script lang="ts">
	import { browser } from "$app/environment";
	import { invalidate } from "$app/navigation";
	import { onDestroy } from "svelte";

	export let data;

	let refreshTimer: ReturnType<typeof setInterval> | null = null;
	let refreshIntervalMs = 0;

	$: watchedControllers = data.monitorSnapshot.watchedControllers;
	$: otherControllers = data.monitorSnapshot.otherControllers;
	$: pollIntervalMs = data.monitoringStatus?.pollIntervalMs ?? 15000;
	$: activeWatchRuleCount = data.dashboardData?.watchRules.filter((watchRule) => watchRule.isActive).length ?? 0;

	function clearRefreshTimer() {
		if (refreshTimer) {
			clearInterval(refreshTimer);
			refreshTimer = null;
		}
	}

	$: if (browser && pollIntervalMs > 0 && pollIntervalMs !== refreshIntervalMs) {
		clearRefreshTimer();
		refreshIntervalMs = pollIntervalMs;
		refreshTimer = setInterval(() => {
			void invalidate("app:monitor");
		}, pollIntervalMs);
	}

	onDestroy(() => {
		clearRefreshTimer();
	});
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
					<span>Watched online</span>
					<strong>{watchedControllers.length}</strong>
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
				<span>Active watch rules</span>
				<strong>{activeWatchRuleCount}</strong>
			</div>
			<div>
				<span>Auto refresh</span>
				<strong>{Math.round(pollIntervalMs / 1000)}s</strong>
			</div>
		</div>
		<div class="button-row compact-row">
			<a class="button button--primary" href="/settings">Open settings</a>
			<a class="button button--secondary" href="/settings#watch-rules">Edit watch rules</a>
		</div>
	</div>
</section>

<section class="section dashboard-stack">
	<article class="dashboard-card dashboard-card--wide" id="watched-controllers">
		<div class="section-heading">
			<h2>Watched controllers online</h2>
			<span class="status-chip {watchedControllers.length > 0 ? 'status-chip--ok' : 'status-chip--muted'}">
				{watchedControllers.length > 0 ? `${watchedControllers.length} matched` : "No matches"}
			</span>
		</div>
		<div class="card-list">
			{#if activeWatchRuleCount === 0}
				<p class="empty-state">You do not have any active watch rules yet. Add one in Settings and the monitor will start prioritising matching controllers automatically.</p>
			{:else if watchedControllers.length === 0}
				<p class="empty-state">No currently online controllers match your active watch rules yet. Keep this page open and it will refresh automatically as the network changes.</p>
			{:else}
				{#each watchedControllers as controller}
					<div class="stack-card">
						<div class="stack-card__head">
							<strong>{controller.callsign}</strong>
							<span class="status-chip status-chip--ok">Watched</span>
						</div>
						<div class="meta-row">
							<span>CID {controller.cid}</span>
							<span>{controller.frequency || "Frequency pending"}</span>
							<span>{controller.name || "Name unavailable"}</span>
						</div>
						<div class="tag-row">
							{#each controller.matchedRules as match}
								<span class="rule-tag">
									{match.pattern}
									{match.matchType === "topdown" ? " via top-down" : ""}
								</span>
							{/each}
						</div>
					</div>
				{/each}
			{/if}
		</div>
	</article>

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
					<span>This page refreshes automatically so watched positions stay current.</span>
				</div>
			</div>
		{:else}
			<p class="muted">Monitoring data is temporarily unavailable.</p>
		{/if}
	</article>

	<article class="dashboard-card dashboard-card--wide" id="other-controllers">
		<div class="section-heading">
			<h2>Other controllers online</h2>
		</div>
		<div class="card-list">
			{#if otherControllers.length === 0}
				<p class="empty-state">No additional controllers are currently online.</p>
			{:else}
				{#each otherControllers.slice(0, 12) as controller}
					<div class="stack-card">
						<div class="stack-card__head">
							<strong>{controller.callsign}</strong>
							<span class="status-chip status-chip--muted">Network</span>
						</div>
						<div class="meta-row">
							<span>CID {controller.cid}</span>
							<span>{controller.frequency || "Frequency pending"}</span>
							<span>{controller.name || "Name unavailable"}</span>
						</div>
					</div>
				{/each}
			{/if}
		</div>
	</article>

	<article class="dashboard-card dashboard-card--wide" id="recent-activity">
		<div class="section-heading">
			<h2>Recent controller activity</h2>
			<span class="status-chip status-chip--muted">Auto-refreshing</span>
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
