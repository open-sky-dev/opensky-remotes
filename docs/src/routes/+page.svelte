<script lang="ts">
	import CodeBlock from '$lib/components/CodeBlock.svelte'
	import Disclosure from '$lib/components/Disclosure.svelte'
	import InstallBlock from '$lib/components/InstallBlock.svelte'
	import InstallPill from '$lib/components/InstallPill.svelte'
	import SkyHero from '$lib/components/SkyHero.svelte'

	let { data } = $props()
	const s = $derived(data.snippets)
</script>

<div class="doc rise-in">
	<SkyHero />

	<section id="overview" style="margin-top: 0">
		<h1>Overview <span class="h1-pkg">@opensky/remotes</span></h1>
		<p>
			<code>enhancedForm</code> wraps a
			<a href="https://svelte.dev/docs/kit/remote-functions#form">remote form function</a> and takes
			care of the behaviors every real form ends up needing — one object, wired up with a few spreads.
		</p>
		<div class="block">
			<InstallPill />
		</div>
		<ul class="block">
			<li>
				<strong>Submission state</strong> — an exclusive state machine (<code>idle</code>,
				<code>pending</code>, <code>issues</code>, <code>error</code>, <code>result</code>, plus
				opt-in <code>delayed</code>/<code>timeout</code>) with semantic lifecycle callbacks
			</li>
			<li>
				<strong>Inline validation UX</strong> — issues appear when a dirty field loses focus and
				clear as soon as the value is valid again, with custom sync/async validators per field
			</li>
			<li>
				<strong>Draft persistence</strong> — opted-in fields save to web storage as the user types
				and restore after a reload
			</li>
			<li>
				<strong>Auto-submit</strong> — the form submits itself once input settles, for
				save-button-less forms
			</li>
		</ul>
		<p class="note">Zero runtime dependencies. SvelteKit 2.68.0+ and Svelte 5.29+ required.</p>
	</section>

	<section id="installation">
		<h2><a href="#installation">Installation</a></h2>
		<div class="block">
			<InstallBlock
				snippets={{ npm: s.install_npm, bun: s.install_bun, pnpm: s.install_pnpm }}
			/>
		</div>
		<div class="block">
			<Disclosure title="Setting up SvelteKit remotes">
				<p>
					Remote functions are still experimental, so they need to be turned on in your project
					config. You can learn more about remote functions on
					<a href="https://svelte.dev/docs/kit/remote-functions">the official docs</a>.
				</p>
				<div class="block">
					<CodeBlock title="vite.config.ts" html={s.viteConfig.html} code={s.viteConfig.code} />
				</div>
			</Disclosure>
		</div>
	</section>

	<section id="quick-start">
		<h2><a href="#quick-start">Quick start</a></h2>
		<p>
			Create the enhanced form next to your remote form, then wire both into the markup. Three
			kinds of spreads do all the work:
		</p>
		<ul>
			<li>
				<code>{'{...form.handlers}'}</code> on the <code>&lt;form&gt;</code> element — shows
				preflight issues on submit attempts (even when SvelteKit blocks the submission before the
				enhance callback runs), clears validation state on reset, and hosts the auto-submit
				listener
			</li>
			<li>
				<code>{'{...form.fields.some.path.validate}'}</code> on an input — opts the field into
				validation
			</li>
			<li>
				<code>{'{...form.fields.some.path.persist}'}</code> on an input — opts the field into draft
				persistence
			</li>
		</ul>
		<div class="block">
			<CodeBlock title="+page.svelte" html={s.quickStart.html} code={s.quickStart.code} />
		</div>
		<p>
			The validation field shape mirrors the remote form field shape, so TypeScript catches renamed
			or misspelled fields.
		</p>
	</section>

	<section id="options">
		<h2><a href="#options">Options</a></h2>
		<p>
			All options are optional. <code>delayed</code>/<code>timeout</code> state and the
			<code>onDelay</code>/<code>onTimeout</code> callbacks only exist when
			<code>delayMs</code>/<code>timeoutMs</code> were passed — enforced at the type level.
		</p>
		<div class="block">
			<CodeBlock title="options" html={s.options.html} code={s.options.code} />
		</div>
		<div class="block doc-table-scroll">
			<table class="doc-table">
				<colgroup>
					<col style="width: 24%" />
					<col style="width: 26%" />
					<col style="width: 12%" />
					<col style="width: 38%" />
				</colgroup>
				<thead>
					<tr>
						<th>Option</th>
						<th>Type</th>
						<th>Default</th>
						<th>Description</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td><span class="cell-name">delayMs</span></td>
						<td><span class="cell-type">number</span></td>
						<td><span class="cell-type">—</span></td>
						<td>
							<span class="cell-desc"
								>Unlocks the <code>delayed</code> state and <code>onDelay</code> callback</span
							>
						</td>
					</tr>
					<tr>
						<td><span class="cell-name">timeoutMs</span></td>
						<td><span class="cell-type">number</span></td>
						<td><span class="cell-type">—</span></td>
						<td>
							<span class="cell-desc"
								>Unlocks the <code>timeout</code> state and <code>onTimeout</code> callback</span
							>
						</td>
					</tr>
					<tr>
						<td><span class="cell-name">preventResetOnSuccess</span></td>
						<td><span class="cell-type">boolean</span></td>
						<td><span class="cell-type">false</span></td>
						<td>
							<span class="cell-desc">Keep values visible after a successful submission</span>
						</td>
					</tr>
					<tr>
						<td><span class="cell-name">autoSubmit</span></td>
						<td><span class="cell-type">boolean | {'{ debounceMs }'}</span></td>
						<td><span class="cell-type">false</span></td>
						<td>
							<span class="cell-desc"
								>Submit automatically once input settles (default debounce 600ms)</span
							>
						</td>
					</tr>
					<tr>
						<td><span class="cell-name">persist.key</span></td>
						<td><span class="cell-type">string</span></td>
						<td><span class="cell-type">action id</span></td>
						<td>
							<span class="cell-desc">Storage key — set it to control invalidation yourself</span>
						</td>
					</tr>
					<tr>
						<td><span class="cell-name">persist.storage</span></td>
						<td><span class="cell-type">'local' | 'session'</span></td>
						<td><span class="cell-type">'local'</span></td>
						<td>
							<span class="cell-desc"
								>Local persists across restarts; session is per-tab and self-cleans</span
							>
						</td>
					</tr>
					<tr>
						<td><span class="cell-name">persist.maxAgeMs</span></td>
						<td><span class="cell-type">number</span></td>
						<td><span class="cell-type">no expiry</span></td>
						<td>
							<span class="cell-desc">Drafts older than this are discarded at restore time</span>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
		<p>
			After a successful submission the form element is reset, matching SvelteKit's default enhance
			behavior. Pass <code>preventResetOnSuccess: true</code> for edit/settings forms that should keep
			their values visible after a save. When <code>autoSubmit</code> is enabled the form never resets
			(clearing a field the user just auto-saved would be jarring), so
			<code>preventResetOnSuccess</code> is not accepted alongside it.
		</p>
	</section>

	<section id="validation">
		<h2><a href="#validation">Validation</a></h2>
		<p>
			Fields become dirty when the user changes their value. Issues appear when a dirty field loses
			focus, and existing issues clear on input as soon as the value is valid again — so focus
			alone never shows an issue, and new issues never appear mid-keystroke. This is the same
			approach superforms takes, informed by the classic
			<a href="https://alistapart.com/article/inline-validation-in-web-forms/"
				>inline validation research</a
			>.
		</p>
		<p class="block lead">Per field, via <code>form.fields.some.path</code>:</p>
		<ul>
			<li><code>.validate</code> — spread onto the input to opt it into validation</li>
			<li>
				<code>.issues</code> — the field's currently displayed issues
				(<code>string[] | null</code>), handy for styling like
				<code>class:invalid={'{form.fields.email.issues}'}</code>
			</li>
			<li><code>.pending</code> — whether validation is currently running for the field</li>
			<li>
				<code>.addIssues(issues)</code> — adds one or more custom validation errors, ignoring
				duplicate messages
			</li>
			<li><code>.removeIssue(issue)</code> — removes a custom validation error by message</li>
			<li>
				<code>.clearIssues()</code> — clears issues for the field and any fields nested under it
			</li>
			<li><code>.addValidator(validator)</code> — adds a validator, returns a cleanup function</li>
		</ul>
		<div class="block">
			<CodeBlock title="validators.ts" html={s.validators.html} code={s.validators.code} />
		</div>
		<p class="block lead">Form-wide:</p>
		<ul>
			<li>
				<code>allIssues</code> — all currently displayed issues as a nested tree (form-level issues
				under the <code>''</code> key)
			</li>
			<li>
				<code>allKnownIssues</code> — debugging view: every issue currently known, displayed or not
			</li>
			<li>
				<code>formIssues</code> — issues without a field path, e.g. from
				<code>invalid('message')</code> on the server
			</li>
			<li><code>clearAllIssues()</code> — clears all validation issues and dirty tracking</li>
			<li>
				<code>validateAll()</code> — validates all registered fields with the server, then updates
				issues
			</li>
		</ul>
	</section>

	<section id="persistence">
		<h2><a href="#persistence">Draft persistence</a></h2>
		<p>
			Spread <code>.persist</code> onto a field and its value survives reloads: it saves to web
			storage as the user types (debounced, flushed when the value commits) and restores when the
			input mounts. Restored fields are marked dirty, since a restored draft is user input, not
			pristine state.
		</p>
		<div class="block">
			<CodeBlock title="+page.svelte" html={s.persist.html} code={s.persist.code} />
		</div>
		<p>
			The draft is discarded on successful submission, on form reset, or when it expires. Call
			<code>form.discardPersisted()</code> to drop it programmatically (e.g. a "discard changes"
			button). The default storage key is the remote form's action id — stable across reloads and
			builds, and it self-invalidates when the remote function moves or is renamed
			(<code>.for(key)</code> instances get distinct keys automatically). File inputs cannot be
			persisted and are skipped.
		</p>
	</section>

	<section id="auto-submit">
		<h2><a href="#auto-submit">Auto-submit</a></h2>
		<p>
			For forms that shouldn't need a save button — a profile field that saves once you stop
			typing:
		</p>
		<div class="block">
			<CodeBlock title="auto-submit" html={s.autoSubmit.html} code={s.autoSubmit.code} />
		</div>
		<p>
			Once input settles for <code>debounceMs</code> (default 600ms), the form submits itself via
			<code>requestSubmit()</code> — a real submit event, so preflight validation, the
			submit-attempt issue display, and your enhance callbacks all run exactly as they would for a
			button press. Behaviors that are built in rather than configurable:
		</p>
		<ul>
			<li>
				<strong>Dirty check</strong> — data identical to the last submission is never re-submitted,
				so a settled debounce after a save is a no-op
			</li>
			<li>
				<strong>In-flight coalescing</strong> — a debounce that fires mid-submission waits for it
				to settle, then submits once more only if the data changed since
			</li>
			<li>
				<strong>Commit flush</strong> — a <code>change</code> event (text field blur,
				select/checkbox pick) submits immediately instead of waiting out the debounce
			</li>
		</ul>
		<p>
			Auto-submitting forms never reset after success, and a debounce still pending when the form
			unmounts is dropped — pair with <code>.persist</code> if that draft matters.
		</p>
	</section>

	<section id="state">
		<h2><a href="#state">State & callbacks</a></h2>
		<p>
			The form is always in exactly one state, and the state type is derived from your options —
			<code>delayed</code> and <code>timeout</code> only exist when you asked for them.
		</p>
		<ul>
			<li>
				<code>state</code> — current form state (exclusive; type-safe based on creation options)
			</li>
			<li>
				<code>idle</code>, <code>pending</code>, <code>issues</code>, <code>error</code>,
				<code>result</code> — boolean getters, always available. <code>pending</code> stays true
				through <code>delayed</code> and <code>timeout</code>, so
				<code>disabled={'{form.pending}'}</code> is sufficient on its own
			</li>
			<li>
				<code>delayed</code> — only when <code>delayMs</code> was provided; stays true through
				timeout
			</li>
			<li><code>timeout</code> — only when <code>timeoutMs</code> was provided</li>
			<li>
				<code>reset()</code> — resets the form element and the submission state (also clears
				validation state and discards the persisted draft)
			</li>
			<li>
				<code>resetState()</code> — resets only the submission state back to idle, leaving values
				alone
			</li>
		</ul>
		<p class="block lead">Callbacks (all optional):</p>
		<ul>
			<li>
				<code>onSubmit</code> — submission begins; also receives <code>cancel(state?)</code> and
				<code>updates(...queries)</code> for optimistic updates
			</li>
			<li><code>onDelay</code> — delayed state reached (requires <code>delayMs</code>)</li>
			<li><code>onTimeout</code> — timeout state reached (requires <code>timeoutMs</code>)</li>
			<li><code>onReturn</code> — submission returned successfully; receives <code>result</code></li>
			<li><code>onIssues</code> — submission returned validation issues</li>
			<li><code>onError</code> — submission hit an error; receives <code>error</code></li>
		</ul>
		<p>
			Every callback receives the remote form instance as <code>form</code> — the same object
			SvelteKit passes to the enhance callback. If you named your enhanced form <code>form</code>,
			destructuring the instance as <code>form</code> inside a callback shadows it — destructure
			only what you need instead.
		</p>
		<div class="block">
			<CodeBlock title="+page.svelte" html={s.callbacks.html} code={s.callbacks.code} />
		</div>
	</section>

	<section id="notes">
		<h2><a href="#notes">Notes</a></h2>
		<p>
			Remote functions and their validation story are still <a
				href="https://github.com/sveltejs/kit/discussions/14288">moving quickly</a
			>. This library uses the newly added <code>preflightOnly</code> flag so validation never hits
			the server on every keystroke, but there are known rough edges in the current Kit
			implementation:
		</p>
		<ul>
			<li>
				Server-side issues don't come back until the form is submitted — they should also arrive on
				blur
			</li>
			<li>
				When the server returns validation issues, mutating any field currently clears all of them
				— only the mutated field's issues should clear
			</li>
		</ul>
	</section>
</div>
