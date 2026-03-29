<svelte:head>
	<title>VATSIM Monitor</title>
</svelte:head>

<section class="hero">
	<div class="panel">
		<div class="eyebrow">Merged platform scaffold</div>
		<h1>Monitor controllers without requiring VATSIM OAuth.</h1>
		<p>
			This new application starts from local user accounts, then layers VATSIM data, top-down expansion, and notification delivery on top. OAuth
			linking can be added later when available, but it is no longer the product gate.
		</p>
		<div class="button-row">
			<a class="button button--primary" href="/login">Create a local session</a>
			<a class="button button--secondary" href="/dashboard">Open dashboard shell</a>
		</div>
	</div>

	<div class="panel">
		<strong>Current scaffold focus</strong>
		<div class="status-grid">
			<div class="metric">
				<strong>Identity</strong>
				<span>Local users first, optional VATSIM account linking later.</span>
			</div>
			<div class="metric">
				<strong>Monitoring</strong>
				<span>Dedicated backend service boundary for polling, matching, and delivery.</span>
			</div>
			<div class="metric">
				<strong>Storage</strong>
				<span>Fresh schema built around users, sessions, watch rules, and controller events.</span>
			</div>
		</div>
	</div>
</section>

<section class="section feature-grid">
	<article class="feature-card">
		<h2>One product model</h2>
		<p>The old split between a UI that wrote to MySQL and an API that also owned business logic is being replaced with one backend boundary.</p>
	</article>

	<article class="feature-card">
		<h2>Optional identity linking</h2>
		<p>Users can manage watches and channels locally. VATSIM linking becomes an enhancement, not a requirement.</p>
	</article>

	<article class="feature-card">
		<h2>Observable notifications</h2>
		<p>Controller events and notification deliveries are first-class records, which gives us better retries, history, and diagnostics.</p>
	</article>
</section>

<section class="section panel">
	<strong>Planned stack</strong>
	<ul class="stack-list">
		<li>SvelteKit for the web experience.</li>
		<li>Node and Express for the unified backend API and background services.</li>
		<li>Shared domain packages for matching, controller events, and provider interfaces.</li>
		<li>MySQL migrations centered on local users and watch rules.</li>
	</ul>
</section>

