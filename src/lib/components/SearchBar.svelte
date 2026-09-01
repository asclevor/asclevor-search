<script>
	let {
		value = $bindable(''),
		loading = false,
		compact = true,
		placeholder = 'Describe a patient case…',
		onsubmit,
		onclear
	} = $props();

	let inputEl = $state(null);

	export function focus() {
		inputEl?.focus();
	}

	function submit(e) {
		e.preventDefault();
		onsubmit?.();
	}

	function clear() {
		value = '';
		onclear?.();
		inputEl?.focus();
	}
</script>

<form
	onsubmit={submit}
	role="search"
	class="flex items-center gap-2 rounded-lg border border-slate-300 bg-white pr-1.5 pl-3 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition focus-within:border-blue-500 focus-within:ring-[3px] focus-within:ring-blue-500/10 {compact
		? 'h-10'
		: 'h-12'}"
>
	<label for="case-search" class="sr-only">Case description</label>
	<svg
		class="size-4 shrink-0 text-slate-400"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		aria-hidden="true"
	>
		<circle cx="11" cy="11" r="7" />
		<path d="m20.5 20.5-4.6-4.6" />
	</svg>
	<input
		id="case-search"
		bind:this={inputEl}
		bind:value
		type="text"
		autocomplete="off"
		{placeholder}
		class="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
	/>
	{#if value && !loading}
		<button
			type="button"
			onclick={clear}
			aria-label="Clear search"
			class="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-blue-600"
		>
			<svg
				viewBox="0 0 24 24"
				class="size-4"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				aria-hidden="true"
			>
				<path d="M18 6 6 18M6 6l12 12" />
			</svg>
		</button>
	{/if}
	{#if !compact}
		<kbd
			class="hidden rounded border border-slate-200 px-1.5 py-0.5 font-mono text-[10px] text-slate-400 sm:block"
			aria-hidden="true">/</kbd
		>
	{/if}
	<div class="h-5 w-px shrink-0 bg-slate-200" aria-hidden="true"></div>
	<button
		type="submit"
		disabled={loading || !value.trim()}
		class="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
	>
		{#if loading}
			<svg class="size-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
				<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5" opacity="0.25" />
				<path
					d="M21 12a9 9 0 0 0-9-9"
					stroke="currentColor"
					stroke-width="2.5"
					stroke-linecap="round"
				/>
			</svg>
			Searching…
		{:else}
			Search
			<svg
				class="size-3.5"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<path d="M5 12h14M13 6l6 6-6 6" />
			</svg>
		{/if}
	</button>
</form>
