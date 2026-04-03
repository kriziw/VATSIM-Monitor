<script lang="ts">
	import { onMount } from "svelte";
	import "$lib/styles/app.css";

	export let data;

	let releaseBannerDismissed = false;

	$: releaseBannerDismissKey = data.releaseBanner
		? `vm-release-banner-dismissed:${data.releaseBanner.latestVersion}`
		: "";

	$: showReleaseBanner = Boolean(data.releaseBanner) && !releaseBannerDismissed;

	onMount(() => {
		if (!releaseBannerDismissKey) {
			releaseBannerDismissed = false;
			return;
		}

		releaseBannerDismissed = window.localStorage.getItem(releaseBannerDismissKey) === "true";
	});

	function dismissReleaseBanner() {
		if (!releaseBannerDismissKey) {
			return;
		}

		releaseBannerDismissed = true;
		window.localStorage.setItem(releaseBannerDismissKey, "true");
	}
</script>

<div class="page-shell">
	{#if showReleaseBanner && data.releaseBanner}
		<div class="release-banner" role="status" aria-live="polite">
			<div class="release-banner__copy">
				<strong>Update available</strong>
				<span>
					Version {data.releaseBanner.latestVersion} is available. You are currently running {data.releaseBanner.currentVersion}.
				</span>
			</div>
			<div class="release-banner__actions">
				<a class="button button--secondary" href={data.releaseBanner.url} rel="noreferrer" target="_blank">
					View release
				</a>
				<button class="button button--secondary" type="button" on:click={dismissReleaseBanner}>
					Dismiss
				</button>
			</div>
		</div>
	{/if}

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
				{#if data.preferences?.logsEnabled}
					<a href="/logs">Logs</a>
				{/if}
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
