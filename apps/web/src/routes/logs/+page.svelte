<script lang="ts">
	import { browser } from "$app/environment";
	import { invalidate } from "$app/navigation";
	import { onDestroy } from "svelte";
	import type { AppLogEntry } from "$lib/server/backend";

	export let data;

	let eventSource: EventSource | null = null;
	let liveUpdatesEnabled = false;
	let logs: AppLogEntry[] = data.logs;
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
	const timestampFormatter = browser
		? new Intl.DateTimeFormat(undefined, {
				year: "numeric",
				month: "2-digit",
				day: "2-digit",
				hour: "2-digit",
				minute: "2-digit",
				second: "2-digit",
				timeZoneName: "short"
			})
		: null;

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

	function closeEventSource() {
		if (eventSource) {
			eventSource.close();
			eventSource = null;
		}
	}

	async function refreshLogs() {
		await invalidate("app:logs");
		logs = data.logs;
	}

	function matchesSelectedLevel(entry: AppLogEntry): boolean {
		if (selectedLevel === "all") {
			return true;
		}

		return levelOrder[entry.level] >= levelOrder[selectedLevel as AppLogEntry["level"]];
	}

	function formatTimestamp(timestamp: string): string {
		if (!timestampFormatter) {
			return timestamp;
		}

		const parsed = new Date(timestamp);
		if (Number.isNaN(parsed.getTime())) {
			return timestamp;
		}

		return timestampFormatter.format(parsed);
	}

	function openLiveStream() {
		if (!browser || eventSource) {
			return;
		}

		eventSource = new EventSource("/logs/stream");
		eventSource.addEventListener("logs", (event) => {
			const payload = JSON.parse((event as MessageEvent<string>).data) as AppLogEntry[];
			logs = payload;
		});
		eventSource.addEventListener("error", () => {
			closeEventSource();
		});
	}

	$: if (browser && liveUpdatesEnabled) {
		openLiveStream();
	}

	$: if (!liveUpdatesEnabled) {
		closeEventSource();
		logs = data.logs;
	}

	$: filteredLogs = logs.filter(matchesSelectedLevel);

	onDestroy(() => {
		closeEventSource();
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
					<input bind:checked={liveUpdatesEnabled} type="checkbox" />
					<span>Live updates</span>
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
				<span>Updates</span>
				<strong>{liveUpdatesEnabled ? "Live" : "Paused"}</strong>
			</div>
		</div>
	</div>
</section>

<section class="section dashboard-stack">
	<article class="dashboard-card dashboard-card--wide">
		<div class="section-heading">
			<h2>Recent logs</h2>
			<span class="status-chip {liveUpdatesEnabled ? 'status-chip--ok' : 'status-chip--muted'}">
				{liveUpdatesEnabled ? "Streaming" : "Static"}
			</span>
		</div>
		<p class="compact-lead">Stored in UTC, shown here in your local browser time.</p>
		<div class="logs-export-grid logs-export-grid--compact">
			<label class="logs-filter">
				<span>Export</span>
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

		{#if logs.length === 0}
			<p class="empty-state">No application logs are available yet.</p>
		{:else if filteredLogs.length === 0}
			<p class="empty-state">No log entries match the current level filter.</p>
		{:else}
			<div class="log-console">
				{#each filteredLogs as entry}
					<div class="log-console__row">
						<div class="log-console__line">
							<span class="log-console__timestamp">{formatTimestamp(entry.timestamp)}</span>
							<span
								class="log-console__level {entry.level === 'error'
									? 'log-console__level--error'
									: entry.level === 'warn'
										? 'log-console__level--warn'
										: entry.level === 'debug'
											? 'log-console__level--debug'
											: 'log-console__level--info'}"
							>
								{entry.level === "warn" ? "warning" : entry.level}
							</span>
							<span class="log-console__source">{entry.source}</span>
							<span class="log-console__message">{entry.message}</span>
						</div>
						{#if entry.meta}
							<details class="log-console__details">
								<summary>Show details</summary>
								<pre class="log-console__meta">{JSON.stringify(entry.meta, null, 2)}</pre>
							</details>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</article>
</section>
