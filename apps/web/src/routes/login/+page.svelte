<script lang="ts">
	export let form;
</script>

<svelte:head>
	<title>Sign In | VATSIM Monitor</title>
</svelte:head>

<section class="hero">
	<div class="panel auth-card">
		<div class="eyebrow">Local auth</div>
		<h1>Start with a local account.</h1>
		<p>
			This login flow will become the default entrypoint for the new platform. VATSIM OAuth, when available, will be an optional linked account
			flow from inside the app.
		</p>

		{#if form?.message}
			<div class="form-error">{form.message}</div>
		{/if}

		<form method="post">
			<label>
				<span>Username or email</span>
				<input
					name="identifier"
					autocomplete="username"
					placeholder="captain@example.com"
					value={form?.identifier ?? ""}
				/>
			</label>

			<label>
				<span>Password</span>
				<input name="password" type="password" autocomplete="current-password" placeholder="Enter your password" />
			</label>

			<div class="auth-actions">
				<button class="button button--primary" type="submit" formaction="?/login">Sign in</button>
			</div>
		</form>

		<form method="post">
			<label>
				<span>New username</span>
				<input name="username" autocomplete="username" placeholder="controller.fan" value={form?.username ?? ""} />
			</label>

			<label>
				<span>Email</span>
				<input name="email" autocomplete="email" placeholder="captain@example.com" value={form?.email ?? ""} />
			</label>

			<label>
				<span>Password</span>
				<input name="password" type="password" autocomplete="new-password" placeholder="At least 8 characters" />
			</label>

			<button class="button button--secondary" type="submit" formaction="?/register">Create account</button>
		</form>
	</div>

	<div class="panel">
		<strong>Why local auth first?</strong>
		<p>
			VATSIM OAuth requires approval, so product access can no longer depend on it. A local account model lets us support multiple users, local
			admin features, and controlled external linking without blocking the app.
		</p>
		<div class="auth-note">This page now posts to the new backend auth endpoints and stores a local session cookie in SvelteKit.</div>
	</div>
</section>
