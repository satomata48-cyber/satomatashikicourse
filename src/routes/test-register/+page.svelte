<script lang="ts">
	let email = 'test@example.com';
	let password = 'password123';
	let username = 'testuser';
	let message = '';
	let isLoading = false;

	async function register() {
		isLoading = true;
		message = '';

		try {
			const response = await fetch('/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email,
					password,
					username,
					role: 'instructor'
				})
			});

			const data = await response.json();

			if (response.ok) {
				message = `✅ Success! User ID: ${data.userId}`;
			} else {
				message = `❌ Error: ${data.error}`;
			}
		} catch (error) {
			message = `❌ Error: ${error}`;
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="min-h-screen bg-gray-100 py-12 px-4">
	<div class="max-w-md mx-auto bg-white rounded-lg shadow-md p-8">
		<h1 class="text-2xl font-bold mb-6">Test Registration (D1)</h1>

		<div class="space-y-4 mb-6">
			<div>
				<label class="block text-sm font-medium mb-1">Email</label>
				<input
					type="email"
					bind:value={email}
					class="w-full px-4 py-2 border rounded-lg"
				/>
			</div>

			<div>
				<label class="block text-sm font-medium mb-1">Password</label>
				<input
					type="password"
					bind:value={password}
					class="w-full px-4 py-2 border rounded-lg"
				/>
			</div>

			<div>
				<label class="block text-sm font-medium mb-1">Username</label>
				<input
					type="text"
					bind:value={username}
					class="w-full px-4 py-2 border rounded-lg"
				/>
			</div>
		</div>

		<button
			on:click={register}
			disabled={isLoading}
			class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
		>
			{isLoading ? 'Registering...' : 'Register'}
		</button>

		{#if message}
			<div class="mt-4 p-4 bg-gray-50 rounded-lg">
				<pre class="text-sm whitespace-pre-wrap">{message}</pre>
			</div>
		{/if}

		<div class="mt-6 text-sm text-gray-600">
			<p class="mb-2">After registration, you can test login at:</p>
			<a href="/login" class="text-blue-600 hover:underline">/login</a>
		</div>
	</div>
</div>
