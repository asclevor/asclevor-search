<script>
	import { copyText, jsonToLines } from '$lib/utils/clinical.js';

	let { json = '', filename = 'response.json' } = $props();

	const lines = $derived(jsonToLines(json));
	let copied = $state(false);
	let timer = null;

	async function copy() {
		if (await copyText(json)) {
			copied = true;
			clearTimeout(timer);
			timer = setTimeout(() => (copied = false), 1600);
		}
	}
</script>

<div class="overflow-hidden rounded-lg border border-slate-700/60 bg-slate-900">
	<div
		class="flex items-center justify-between gap-2 border-b border-slate-700/60 py-1.5 pr-2 pl-3"
	>
		<div class="flex min-w-0 items-center gap-2">
			<span class="truncate font-mono text-[11px] text-slate-400">{filename}</span>
			<span
				class="rounded bg-slate-800 px-1 py-px font-mono text-[9px] tracking-wider text-slate-500 uppercase"
				>json</span
			>
		</div>
		<button
			type="button"
			onclick={copy}
			class="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-700 px-2 py-1 text-[10px] font-medium text-slate-300 transition hover:border-slate-500 hover:text-white focus-visible:outline-2 focus-visible:outline-blue-500"
		>
			{#if copied}
				<svg
					class="size-3 text-emerald-400"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"><path d="m5 13 4 4L19 7" /></svg
				>
				Copied
			{:else}
				<svg
					class="size-3"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
					><rect x="9" y="9" width="11" height="11" rx="2" /><path
						d="M5 15V5a2 2 0 0 1 2-2h10"
					/></svg
				>
				Copy JSON
			{/if}
		</button>
	</div>
	<div
		class="json-scroll max-h-[26rem] overflow-auto"
		tabindex="0"
		role="region"
		aria-label="JSON response payload"
	>
		<table class="w-full border-collapse font-mono text-[11px] leading-[1.7]">
			<tbody>
				{#each lines as html, i (i)}
					<tr>
						<td
							class="sticky left-0 w-10 min-w-10 border-r border-slate-800 bg-slate-900 pr-2 pl-3 text-right align-top text-slate-600 select-none"
							>{i + 1}</td
						>
						<td class="pr-4 align-top whitespace-pre">{@html html}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
