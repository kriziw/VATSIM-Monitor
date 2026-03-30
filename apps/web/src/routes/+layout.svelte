<script lang="ts">
	import "$lib/styles/app.css";

	export let data;
</script>

<div class="page-shell">
	<header class="topbar">
		<a class="brand" href="/">
			<span class="brand__name">VATSIM Monitor</span>
			<span class="brand__tag">ATC availability, watchlists, and alerts</span>
		</a>

		<nav class="nav-links" aria-label="Primary">
			<a href="/">Home</a>
			{#if data.session}
				<a href="/dashboard">Dashboard</a>
			{/if}
			{#if data.session}
				<span class="nav-user">{data.session.user.username}</span>
				<a class="nav-cta" href="/logout">Sign out</a>
			{:else}
				<a href="/login#signin">Sign in</a>
				<a class="nav-cta" href="/login#register">Register</a>
			{/if}
		</nav>
	</header>

	<slot />
</div>
