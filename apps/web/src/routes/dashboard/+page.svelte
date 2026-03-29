<script lang="ts">
	export let data;
	export let form;
</script>

<svelte:head>
	<title>Dashboard | VATSIM Monitor</title>
</svelte:head>

<section class="section">
	<div class="panel">
		<div class="eyebrow">Dashboard</div>
		<h1>Dashboard structure for local users</h1>
		<p>
			The merged app now has local auth, user-owned watch rules and Discord channels, and a live backend poller that persists controller events.
		</p>
		<div class="status-grid">
			<div class="metric">
				<strong>Username</strong>
				<span>{data.session.user.username}</span>
			</div>
			<div class="metric">
				<strong>Email</strong>
				<span>{data.session.user.email ?? "Not set"}</span>
			</div>
			<div class="metric">
				<strong>Role</strong>
				<span>{data.session.user.role}</span>
			</div>
		</div>
	</div>
</section>

<section class="section dashboard-stack">
	<article class="dashboard-card">
		<h2>Monitoring</h2>
		<div class="status-grid">
			<div class="metric">
				<strong>State</strong>
				<span>{data.monitoringStatus.state}</span>
			</div>
			<div class="metric">
				<strong>Online controllers</strong>
				<span>{data.monitoringStatus.currentOnlineCount}</span>
			</div>
			<div class="metric">
				<strong>Poll interval</strong>
				<span>{data.monitoringStatus.pollIntervalMs} ms</span>
			</div>
		</div>

		<div class="card-list">
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
						{data.monitoringStatus.lastCycle.fetchedControllers} fetched,
						{data.monitoringStatus.lastCycle.newEvents} online,
						{data.monitoringStatus.lastCycle.offlineEvents} offline,
						{data.monitoringStatus.lastCycle.sentNotifications} sent,
						{data.monitoringStatus.lastCycle.skippedNotifications} skipped
					{:else}
						No cycle summary yet
					{/if}
				</span>
			</div>
		</div>
	</article>

	<article class="dashboard-card">
		<h2>Watch rules</h2>
		<p>Wildcard callsigns now live under the authenticated local user model and mutate through the new backend API.</p>

		{#if form?.section === "watchRules"}
			<div class="form-error">{form.message}</div>
		{/if}

		<div class="card-list">
			{#if data.watchRules.length === 0}
				<p class="muted">No watch rules yet.</p>
			{:else}
				{#each data.watchRules as watchRule}
					<div class="metric">
						<strong>{watchRule.pattern}</strong>
						<div class="toggle-line">
							<span>Top-down: {watchRule.topdown ? "on" : "off"}</span>
							<span>Active: {watchRule.isActive ? "yes" : "no"}</span>
						</div>
						<div class="button-row">
							<form method="post">
								<input type="hidden" name="id" value={watchRule.id} />
								<input type="hidden" name="topdown" value={watchRule.topdown ? "false" : "true"} />
								<input type="hidden" name="isActive" value={watchRule.isActive ? "true" : "false"} />
								<button class="button button--secondary" type="submit" formaction="?/toggleWatchRule">
									Toggle top-down
								</button>
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

		<form class="inline-form" method="post">
			<input
				name="pattern"
				placeholder="EGLL_TWR or EGNX_%"
				value={form?.section === "watchRules" ? form?.pattern ?? "" : ""}
			/>
			<label class="toggle-line">
				<input name="topdown" type="checkbox" />
				<span>Top-down</span>
			</label>
			<button class="button button--primary" type="submit" formaction="?/addWatchRule">Add watch rule</button>
		</form>
	</article>

	<article class="dashboard-card">
		<h2>Notification channels</h2>
		<p>Discord webhook channels are the first typed delivery target in the new local-user model.</p>

		{#if form?.section === "notificationChannels"}
			<div class="form-error">{form.message}</div>
		{/if}

		<div class="card-list">
			{#if data.notificationChannels.length === 0}
				<p class="muted">No notification channels yet.</p>
			{:else}
				{#each data.notificationChannels as channel}
					<div class="metric">
						<strong>{channel.displayName ?? "Discord webhook"}</strong>
						<div class="toggle-line">
							<span>{channel.type}</span>
							<span>{channel.isActive ? "active" : "disabled"}</span>
						</div>
						<p>{channel.destination}</p>
						<div class="button-row">
							<form method="post">
								<input type="hidden" name="id" value={channel.id} />
								<input type="hidden" name="isActive" value={channel.isActive ? "false" : "true"} />
								<button class="button button--secondary" type="submit" formaction="?/toggleNotificationChannel">
									{channel.isActive ? "Disable" : "Enable"}
								</button>
							</form>
							<form method="post">
								<input type="hidden" name="id" value={channel.id} />
								<button class="button button--secondary" type="submit" formaction="?/deleteNotificationChannel">
									Delete
								</button>
							</form>
						</div>
					</div>
				{/each}
			{/if}
		</div>

		<form class="inline-form" method="post">
			<input
				name="displayName"
				placeholder="Discord server alerts"
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

	<article class="dashboard-card">
		<h2>Recent controller events</h2>
		<div class="card-list">
			{#if data.recentEvents.length === 0}
				<p class="muted">No controller events persisted yet.</p>
			{:else}
				{#each data.recentEvents as event}
					<div class="metric">
						<strong>{event.type === "controller_online" ? "Online" : "Offline"}: {event.callsign}</strong>
						<span>CID {event.controllerCid} on {event.frequency || "unknown frequency"}</span>
						<span>Occurred at {event.occurredAt}</span>
					</div>
				{/each}
			{/if}
		</div>
	</article>
</section>
