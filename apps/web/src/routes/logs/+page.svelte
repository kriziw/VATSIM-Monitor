<script lang="ts">
	import { browser } from "$app/environment";
	import { invalidate } from "$app/navigation";
	import { onDestroy } from "svelte";
	import type { AppLogEntry } from "$lib/server/backend";

	export let data;

	let refreshTimer: ReturnType<typeof setInterval> | null = null;
	let autoRefreshEnabled = false;
	let selectedLevel = "all";
	let exportMode = "lines";
	let exportLines = 250;
	let exportSpanValue = 24;
	let exportSpanUnit = "hours";
	const levelLabels: Record<string, string> = {
		all: "All levels",
		debug: "Debug",
		info: "Info",
		warn: "Warning",
		error: "Error"
	};
	const levelOrder: Record<AppLogEntry["level"], number> = {
		debug: 10,
		info: 20,
		warn: 30,
		error: 40
	};

	function buildExportUrl() {
		const params = new URLSearchParams();
		params.set("mode", exportMode);

		if (selectedLevel !== "all") {
			params.set("level", selectedLevel);
		}

		if (exportMode === "lines") {
			params.set("lines", String(Math.max(1, Math.floor(exportLines || 1))));
		} else {
			params.set("spanValue", String(Math.max(1, Math.floor(exportSpanValue || 1))));
			params.set("spanUnit", exportSpanUnit);
		}

		return `/logs/export?${params.toString()}`;
	}

	function clearRefreshTimer() {
		if (refreshTimer) {
			clearInterval(refreshTimer);
			refreshTimer = null;
		}
	}

	function refreshLogs() {
		void invalidate("app:logs");
	}

	function matchesSelectedLevel(entry: AppLogEntry): boolean {
		if (selectedLevel === "all") {
			return true;
		}

		return levelOrder[entry.level] >= levelOrder[selectedLevel as AppLogEntry["level"]];
	}

	$: if (browser && autoRefreshEnabled && !refreshTimer) {
		refreshTimer = setInterval(refreshLogs, 10000);
	}

	$: if (!autoRefreshEnabled) {
		clearRefreshTimer();
	}

	$: filteredLogs = data.logs.filter(matchesSelectedLevel);

	onDestroy(() => {
		clearRefreshTimer();
	});
</script>

<svelte:head>
	<title>Logs | VATSIM Monitor</title>
</svelte:head>

<section class="dashboard-hero dashboard-hero--single">
	<div class="panel dashboard-hero__main dashboard-hero__main--compact">
		<div class="alerts-hero__topline">
			<div class="eyebrow">Logs</div>
			<div class="button-row logs-toolbar">
				<label class="logs-filter">
					<span>Log level</span>
					<select bind:value={selectedLevel}>
						<option value="all">All levels</option>
						<option value="debug">Debug and above</option>
						<option value="info">Info and above</option>
						<option value="warn">Warning and above</option>
						<option value="error">Error only</option>
					</select>
				</label>
				<label class="toggle-chip">
					<input bind:checked={autoRefreshEnabled} type="checkbox" />
					<span>Auto-refresh</span>
				</label>
				<button class="button button--secondary" on:click={refreshLogs} type="button">Refresh now</button>
			</div>
		</div>
		<h1>Review recent application activity without leaving the app.</h1>
		<div class="monitor-strip monitor-strip--compact">
			<div class="monitor-strip__item">
				<span>Visible</span>
				<strong>{filteredLogs.length}</strong>
			</div>
			<div class="monitor-strip__item">
				<span>Level</span>
				<strong>{levelLabels[selectedLevel]}</strong>
			</div>
			<div class="monitor-strip__item">
				<span>Refresh</span>
				<strong>{autoRefreshEnabled ? "10s" : "Paused"}</strong>
			</div>
		</div>
	</div>
</section>

<section class="section dashboard-stack">
	<article class="dashboard-card dashboard-card--wide">
		<div class="section-heading">
			<h2>Export logs</h2>
			<span class="status-chip status-chip--muted">Download</span>
		</div>
		<div class="logs-export-grid">
			<label class="logs-filter">
				<span>Scope</span>
				<select bind:value={exportMode}>
					<option value="lines">Last X lines</option>
					<option value="timespan">Time span</option>
				</select>
			</label>

			{#if exportMode === "lines"}
				<label class="logs-filter">
					<span>Lines</span>
					<input bind:value={exportLines} min="1" step="1" type="number" />
				</label>
			{:else}
				<label class="logs-filter">
					<span>Span</span>
					<input bind:value={exportSpanValue} min="1" step="1" type="number" />
				</label>
				<label class="logs-filter">
					<span>Unit</span>
					<select bind:value={exportSpanUnit}>
						<option value="minutes">Minutes</option>
						<option value="hours">Hours</option>
						<option value="days">Days</option>
					</select>
				</label>
			{/if}

			<a class="button button--secondary" href={buildExportUrl()}>Download .log</a>
		</div>
	</article>

	<article class="dashboard-card dashboard-card--wide">
		<div class="section-heading">
			<h2>Recent logs</h2>
			<span class="status-chip status-chip--muted">Rotating files</span>
		</div>

		{#if data.logs.length === 0}
			<p class="empty-state">No application logs are available yet.</p>
		{:else if filteredLogs.length === 0}
			<p class="empty-state">No log entries match the current level filter.</p>
		{:else}
			<div class="log-list">
				{#each filteredLogs as entry}
					<div class="log-row">
						<div class="log-row__summary">
							<div class="log-row__meta">
								<span class="status-chip {entry.level === 'error'
									? 'status-chip--warn'
									: entry.level === 'warn'
										? 'status-chip--muted'
										: entry.level === 'debug'
											? 'status-chip--muted'
											: 'status-chip--ok'}">{entry.level === "warn" ? "warning" : entry.level}</span>
								<strong>{entry.source}</strong>
								<span>{entry.timestamp}</span>
							</div>
							<p>{entry.message}</p>
						</div>
						{#if entry.meta}
							<pre class="log-row__details">{JSON.stringify(entry.meta, null, 2)}</pre>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</article>
</section>
