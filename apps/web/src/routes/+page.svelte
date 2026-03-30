<script lang="ts">
	export let data;

	const recentOnlineEvents = data.recentEvents.filter((event) => event.type === "controller_online");
</script>

<svelte:head>
	<title>VATSIM Monitor</title>
</svelte:head>

<section class="landing-hero">
	<div class="panel landing-copy">
		<div class="eyebrow">ATC availability</div>
		<h1>See where VATSIM controllers are online and get alerted when your callsigns appear.</h1>
		<p>
			VATSIM Monitor watches the network for controller activity, tracks the callsigns you care about, and routes alerts to your local account and
			Discord webhooks without requiring VATSIM OAuth just to get started.
		</p>
		<div class="cta-row">
			<a class="button button--primary" href="/login#signin">Sign in</a>
			<a class="button button--secondary" href="/login#register">Create account</a>
		</div>
		<p class="hero-note">Use local accounts first, then add optional integrations later.</p>
	</div>

	<div class="panel snapshot-panel">
		<div class="section-heading">
			<h2>Network snapshot</h2>
			<span class="status-chip {data.monitoringStatus ? 'status-chip--ok' : 'status-chip--muted'}">
				{data.monitoringStatus ? data.monitoringStatus.state : "Unavailable"}
			</span>
		</div>

		{#if data.statusError}
			<p class="muted">{data.statusError}</p>
		{:else if data.monitoringStatus}
			<div class="snapshot-grid">
				<div class="snapshot-card">
					<span>Controllers online</span>
					<strong>{data.monitoringStatus.currentOnlineCount}</strong>
				</div>
				<div class="snapshot-card">
					<span>Poll interval</span>
					<strong>{Math.round(data.monitoringStatus.pollIntervalMs / 1000)}s</strong>
				</div>
				<div class="snapshot-card">
					<span>Last success</span>
					<strong>{data.monitoringStatus.lastSuccessAt ? "Live" : "Waiting"}</strong>
				</div>
				<div class="snapshot-card">
					<span>Monitoring</span>
					<strong>{data.monitoringStatus.lastError ? "Attention" : "Healthy"}</strong>
				</div>
			</div>

			<div class="mini-feed">
				<strong>Recent online callsigns</strong>
				{#if recentOnlineEvents.length === 0}
					<p class="muted">No recent online events available yet.</p>
				{:else}
					<ul class="feed-list">
						{#each recentOnlineEvents as event}
							<li>
								<span>{event.callsign}</span>
								<span>{event.frequency || "freq pending"}</span>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		{/if}
	</div>
</section>

<section class="section feature-grid feature-grid--landing">
	<article class="feature-card">
		<h2>Track callsigns</h2>
		<p>Add towers, approaches, centers, or wildcard patterns so you can spot when the ATC positions you care about come online.</p>
	</article>

	<article class="feature-card">
		<h2>Expand coverage</h2>
		<p>Enable top-down matching on watch rules to catch related ATC coverage instead of only a single exact callsign.</p>
	</article>

	<article class="feature-card">
		<h2>Route alerts</h2>
		<p>Send controller alerts to Discord webhooks so you can react quickly when the airspace around your operations becomes staffed.</p>
	</article>
</section>

<section class="section panel focus-panel">
	<div class="section-heading">
		<h2>Built for a simple monitoring loop</h2>
	</div>
	<div class="focus-list">
		<div>
			<strong>1. Sign in</strong>
			<p>Create a local account and open your dashboard.</p>
		</div>
		<div>
			<strong>2. Add watch rules</strong>
			<p>Tell the app which VATSIM controller callsigns should matter to you.</p>
		</div>
		<div>
			<strong>3. Watch the network</strong>
			<p>See live controller activity and recent ATC changes in one place.</p>
		</div>
		<div>
			<strong>4. Send alerts</strong>
			<p>Attach Discord webhooks so staffing changes reach you immediately.</p>
		</div>
	</div>
</section>
