<script lang="ts">
	import "$lib/styles/app.css";

	export let data;
</script>

<div class="page-shell">
	<header class="topbar">
		<a class="brand" href={data.session ? "/monitor" : "/"}>
			<span class="brand__lockup">
				<img alt="VATSIM Monitor logo" class="brand__mark" src="/brand/monitor-mark.svg" />
				<span class="brand__copy">
					<span class="brand__name">VATSIM Monitor</span>
					<span class="brand__tag">ATC availability, watchlists, and alerts</span>
				</span>
			</span>
		</a>

		<nav class="nav-links" aria-label="Primary">
			{#if data.session}
				<a href="/monitor">Monitor</a>
				<a href="/settings">Settings</a>
				<a href="/alerts">Alerts</a>
				<span class="nav-user">{data.session.user.username}</span>
				<a class="nav-cta" href="/logout">Sign out</a>
			{:else}
				<a href="/">Home</a>
				<a href="/login#signin">Sign in</a>
				<a class="nav-cta" href="/login#register">Register</a>
			{/if}
		</nav>
	</header>

	<slot />

	<footer class="build-footer">
		<span>Version {data.buildInfo.version}</span>
		<span>Build {data.buildInfo.buildNumber}</span>
	</footer>
</div>
