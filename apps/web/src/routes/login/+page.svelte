<script lang="ts">
	export let form;
</script>

<svelte:head>
	<title>Sign In | VATSIM Monitor</title>
</svelte:head>

<section class="auth-shell">
	<div class="auth-intro">
		<div class="eyebrow">Access</div>
		<h1>Sign in to monitor where VATSIM ATC is available.</h1>
		<p>
			Local accounts keep access simple: sign in, add the callsigns you care about, and send alerts to your own channels without waiting for
			external OAuth approval.
		</p>
	</div>

	<div class="auth-grid">
		<div class="panel auth-card" id="signin">
			<div class="section-heading">
				<h2>Sign in</h2>
			</div>

			{#if form?.message && form?.mode === "login"}
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

				<button class="button button--primary" type="submit" formaction="?/login">Sign in</button>
			</form>
		</div>

		<div class="panel auth-card" id="register">
			<div class="section-heading">
				<h2>Create account</h2>
			</div>

			{#if form?.message && form?.mode === "register"}
				<div class="form-error">{form.message}</div>
			{/if}

			<form method="post">
				<label>
					<span>Username</span>
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

				<button class="button button--secondary button--secondary-strong" type="submit" formaction="?/register">Create account</button>
			</form>
		</div>
	</div>
</section>
