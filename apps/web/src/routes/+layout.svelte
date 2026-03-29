<script lang="ts">
	import "$lib/styles/app.css";

	export let data;
</script>

<div class="page-shell">
	<header class="topbar">
		<a class="brand" href="/">
			<span class="brand__name">VATSIM Monitor</span>
			<span class="brand__tag">Local-first controller monitoring</span>
		</a>

		<nav class="nav-links" aria-label="Primary">
			<a href="/">Overview</a>
			<a href="/dashboard">Dashboard</a>
			{#if data.session}
				<span>Signed in as {data.session.user.username}</span>
				<a href="/logout">Sign out</a>
			{:else}
				<a href="/login">Sign in</a>
			{/if}
		</nav>
	</header>

	<slot />
</div>
