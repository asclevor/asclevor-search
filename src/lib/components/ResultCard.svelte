<script>
	import SimilarityRing from './SimilarityRing.svelte';
	import {
		copyText,
		extractDemographics,
		extractLeftoverMeta,
		extractYear,
		friendlySource,
		formatCitation,
		sectionAbstract
	} from '$lib/utils/clinical.js';

	let { r, expanded = false, ontoggleexpand } = $props();

	const pct = $derived(
		typeof r.similarity === 'number' && !Number.isNaN(r.similarity)
			? Math.round((r.similarity <= 1 ? r.similarity : r.similarity / 100) * 100)
			: null
	);
	const sections = $derived(sectionAbstract(r.abstract));
	const demo = $derived(extractDemographics(r));
	const year = $derived(extractYear(r));
	const extra = $derived(extractLeftoverMeta(r).slice(0, 4));
	const sourceName = $derived(friendlySource(r.source));
	const pmidUrl = $derived(
		r.pubmedUrl || (r.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${r.pmid}/` : null)
	);

	// Dense view: two rows only. Interventions joins only when expanded.
	const outcomeText = $derived(sections?.outcome || sections?.interventions || '');
	const outcomeLabel = $derived(sections?.outcome ? 'Key Finding / Outcome' : 'Interventions');
	const PRES_BUDGET = 200;
	const OUT_BUDGET = 180;
	const trunc = (t, n) => (t.length > n ? `${t.slice(0, n).replace(/\s+\S*$/, '')}…` : t);
	const needsMore = $derived(
		sections
			? sections.presentation.length + sections.interventions.length + sections.outcome.length >
					PRES_BUDGET + OUT_BUDGET
			: (r.abstract?.length ?? 0) > PRES_BUDGET + OUT_BUDGET
	);

	let pmidState = $state('idle');
	let citeState = $state('idle');
	let pmidTimer;
	let citeTimer;

	$effect(() => {
		return () => {
			clearTimeout(pmidTimer);
			clearTimeout(citeTimer);
		};
	});

	async function copyPmid() {
		const ok = await copyText(r.pmid);
		pmidState = ok ? 'copied' : 'failed';
		clearTimeout(pmidTimer);
		pmidTimer = setTimeout(() => (pmidState = 'idle'), 1800);
	}

	async function exportCitation() {
		const ok = await copyText(formatCitation(r, year));
		citeState = ok ? 'copied' : 'failed';
		clearTimeout(citeTimer);
		citeTimer = setTimeout(() => (citeState = 'idle'), 1800);
	}
</script>

<article
	class="group rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition hover:border-slate-300 hover:shadow-[0_2px_10px_rgba(15,23,42,0.06)]"
>
	<!-- Header: inline metadata bar + title · actions + match ring -->
	<div class="flex items-start justify-between gap-3">
		<div class="min-w-0 flex-1">
			<div
				class="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] leading-4 text-slate-500"
			>
				{#if r.pmid}
					<a
						href={pmidUrl}
						target="_blank"
						rel="noopener noreferrer"
						class="font-medium text-slate-600 transition hover:text-blue-700 hover:underline hover:decoration-blue-300 hover:underline-offset-2"
					>
						PMID <span class="tabular-nums">{r.pmid}</span>
					</a>
					<span aria-hidden="true">·</span>
				{/if}
				<span>{sourceName}</span>
				{#if year}
					<span aria-hidden="true">·</span>
					<span class="tabular-nums">{year}</span>
				{/if}
				{#if demo.age || demo.sex}
					<span aria-hidden="true">·</span>
					<span class="font-medium text-blue-700">
						{#if demo.age}<span class="tabular-nums">{demo.age}</span>{/if}
						{#if demo.age && demo.sex}<span aria-hidden="true"> </span>{/if}
						{#if demo.sex}{demo.sex}{/if}
					</span>
				{/if}
				{#if r.patientId}
					<span aria-hidden="true">·</span>
					<span class="font-mono text-slate-400">#{r.patientId}</span>
				{/if}
			</div>
			<h3
				class="mt-1 line-clamp-2 text-[13.5px] leading-snug font-semibold tracking-[-0.005em] text-slate-900"
			>
				{#if r.url}
					<a
						href={r.url}
						target="_blank"
						rel="noopener noreferrer"
						class="transition-colors hover:text-blue-700 hover:underline hover:decoration-blue-300 hover:underline-offset-[3px]"
					>
						{r.title}
					</a>
				{:else}
					{r.title}
				{/if}
			</h3>
		</div>

		<div class="flex shrink-0 items-center gap-2 pt-0.5">
			<div
				class="flex items-center gap-0.5 rounded-md border border-slate-200 bg-slate-50/70 p-0.5 opacity-80 transition group-hover:opacity-100"
			>
				{#if r.url}
					<a
						href={r.url}
						target="_blank"
						rel="noopener noreferrer"
						title="View full case"
						aria-label="View full case"
						class="grid size-6 place-items-center rounded text-blue-600 transition hover:bg-blue-100/70 focus-visible:outline-2 focus-visible:outline-blue-600"
					>
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
							<path d="M15 3h6v6" /><path d="M10 14 21 3" /><path
								d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
							/>
						</svg>
					</a>
				{/if}
				{#if r.pmid}
					<button
						type="button"
						onclick={copyPmid}
						title="Copy PMID"
						aria-label="Copy PMID"
						class="grid size-6 place-items-center rounded transition focus-visible:outline-2 focus-visible:outline-blue-600 {pmidState ===
						'copied'
							? 'text-emerald-600'
							: 'text-slate-400 hover:bg-slate-200/70 hover:text-slate-700'}"
					>
						{#if pmidState === 'copied'}
							<svg
								class="size-3.5"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2.5"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"><path d="m5 13 4 4L19 7" /></svg
							>
						{:else}
							<svg
								class="size-3.5"
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
						{/if}
					</button>
				{/if}
				<button
					type="button"
					onclick={exportCitation}
					title="Export citation"
					aria-label="Export citation"
					class="grid size-6 place-items-center rounded transition focus-visible:outline-2 focus-visible:outline-blue-600 {citeState ===
					'copied'
						? 'text-emerald-600'
						: 'text-slate-400 hover:bg-slate-200/70 hover:text-slate-700'}"
				>
					{#if citeState === 'copied'}
						<svg
							class="size-3.5"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2.5"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"><path d="m5 13 4 4L19 7" /></svg
						>
					{:else}
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
							<path
								d="M4 19.5V6a2 2 0 0 1 2-2h11a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6.5A2.5 2.5 0 0 1 4 19.5Z"
							/><path d="M8 8h7M8 12h7M8 16h4" />
						</svg>
					{/if}
				</button>
			</div>
			{#if pct != null}
				<SimilarityRing {pct} raw={r.similarity} size={36} />
			{/if}
		</div>
	</div>

	<!-- Dense key-value summary -->
	{#if sections}
		<dl
			class="mt-2 grid grid-cols-[7.5rem_minmax(0,1fr)] gap-x-3 gap-y-1 border-t border-slate-100 pt-2 text-[12px] leading-[1.45]"
		>
			{#if sections.presentation}
				<dt class="pt-px text-[11px] font-semibold text-slate-500">Presentation</dt>
				<dd class="text-slate-600 {expanded ? '' : 'line-clamp-2'}">
					{expanded ? sections.presentation : trunc(sections.presentation, PRES_BUDGET)}
				</dd>
			{/if}
			{#if expanded && sections.interventions && sections.outcome}
				<dt class="pt-px text-[11px] font-semibold text-slate-500">Interventions</dt>
				<dd class="text-slate-600">{sections.interventions}</dd>
			{/if}
			{#if outcomeText}
				<dt class="pt-px text-[11px] font-semibold text-slate-500">{outcomeLabel}</dt>
				<dd class="relative text-slate-600 {expanded ? '' : 'line-clamp-2'}">
					{expanded ? outcomeText : trunc(outcomeText, OUT_BUDGET)}
					{#if expanded && needsMore}
						<button
							type="button"
							onclick={() => ontoggleexpand?.()}
							class="ml-1 inline text-[11px] font-medium text-blue-700 transition hover:text-blue-900 hover:underline hover:underline-offset-2 focus-visible:outline-2 focus-visible:outline-blue-600"
						>
							Show less
						</button>
					{:else if needsMore}
						<button
							type="button"
							onclick={() => ontoggleexpand?.()}
							class="absolute right-0 bottom-0 bg-white pl-1.5 text-[11px] font-medium text-blue-700 transition hover:text-blue-900 hover:underline hover:underline-offset-2 focus-visible:outline-2 focus-visible:outline-blue-600"
						>
							… See more
						</button>
					{/if}
				</dd>
			{/if}
		</dl>
	{:else if r.abstract}
		<dl
			class="mt-2 grid grid-cols-[7.5rem_minmax(0,1fr)] gap-x-3 border-t border-slate-100 pt-2 text-[12px] leading-[1.45]"
		>
			<dt class="pt-px text-[11px] font-semibold text-slate-500">Abstract</dt>
			<dd class="relative text-slate-600 {expanded ? '' : 'line-clamp-2'}">
				{expanded ? r.abstract : trunc(r.abstract, PRES_BUDGET)}
				{#if expanded && needsMore}
					<button
						type="button"
						onclick={() => ontoggleexpand?.()}
						class="ml-1 inline text-[11px] font-medium text-blue-700 transition hover:text-blue-900 hover:underline hover:underline-offset-2 focus-visible:outline-2 focus-visible:outline-blue-600"
					>
						Show less
					</button>
				{:else if needsMore}
					<button
						type="button"
						onclick={() => ontoggleexpand?.()}
						class="absolute right-0 bottom-0 bg-white pl-1.5 text-[11px] font-medium text-blue-700 transition hover:text-blue-900 hover:underline hover:underline-offset-2 focus-visible:outline-2 focus-visible:outline-blue-600"
					>
						… See more
					</button>
				{/if}
			</dd>
		</dl>
	{/if}

	{#if extra.length}
		<div class="mt-1.5 flex flex-wrap gap-1.5">
			{#each extra as m, mi (`${m.k}-${m.v}-${mi}`)}
				<span
					class="rounded border border-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-500"
				>
					<span class="text-slate-400">{m.k}:</span>
					{m.v}
				</span>
			{/each}
		</div>
	{/if}
</article>
