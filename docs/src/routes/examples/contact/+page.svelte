<script lang="ts">
	import ExampleShell from '$lib/components/ExampleShell.svelte'
	import Demo from './Demo.svelte'

	let { data } = $props()
</script>

<svelte:head>
	<title>Contact form — @opensky/remotes</title>
</svelte:head>

<ExampleShell title="Contact form" files={data.files}>
	{#snippet blurb()}
		Inline validation with custom validators, plus tracked submission state. Try
		<code>test@test.com</code> (async validator), <code>taken@test.com</code> (server-only issue),
		or the word <code>spam</code> in the message.
	{/snippet}

	{#snippet explanation()}
		<p>
			The form opts each field into validation with a <code>.validate</code> spread, so issues only
			appear after a dirty field loses focus — and clear again the moment the value is valid. The
			email field carries an async validator (watch its <code>pending</code> flag show "Checking..."),
			the message field a sync one, and <code>taken@test.com</code> demonstrates a server-only issue
			raised with <code>invalid()</code> inside the remote function: it can't be caught on blur, so
			it arrives through the <code>issues</code> state after a real submit.
		</p>
		<p>
			Every field also spreads <code>.persist</code>, so a half-written message survives a reload.
			The submit button watches <code>form.pending</code> and <code>form.delayed</code> — the remote
			function sleeps for a second so you can see the delayed state kick in at 300ms.
		</p>
	{/snippet}

	<Demo />
</ExampleShell>
