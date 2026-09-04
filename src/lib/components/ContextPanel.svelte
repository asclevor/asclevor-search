<script>
	import JsonViewer from './JsonViewer.svelte';

	let {
		activeQuery = '',
		k = 5,
		onk,
		timings = null,
		terms = [],
		specialties = [],
		years = [],
		specialty = 'all',
		year = 'all',
		onspecialty,
		onyear,
		responseJson = '',
		requestBody = '',
		latencyMs = null,
		modeUsed = null,
		appliedFilters = null
	} = $props();

	let tab = $state('clinical');
	let pmid = $state('');

	const cohortLabel = $derived.by(() => {
		const f = appliedFilters;
		if (!f || (f.gender == null && f.ageMin == null && f.ageMax == null)) return null;
		const parts = [];
		if (f.gender) parts.push(f.gender === 'F' ? 'Female' : f.gender === 'M' ? 'Male' : f.gender);
		if (f.ageMin != null && f.ageMax != null) parts.push(`${f.ageMin}–${f.ageMax} y`);
		else if (f.ageMin != null) parts.push(`${f.ageMin}+ y`);
		else if (f.ageMax != null) parts.push(`\u2264${f.ageMax} y`);
		return parts.join(' · ');
	});

	function openPmid(e) {
		e.preventDefault();
		const p = pmid.replace(/\D/g, '');
		if (p) window.open(`https://pubmed.ncbi.nlm.nih.gov/${p}/`, '_blank', 'noopener');
	}
</script>

<aside
	class="flex flex-col self-start overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] lg:sticky lg:top-[8.25rem]"
	aria-label="Search context"
>
	<div class="border-b border-slate-100 bg-slate-50/70 p-2">
		<div
			class="grid grid-cols-2 gap-1 rounded-lg bg-slate-200/70 p-1"
			role="tablist"
			aria-label="Context view"
		>
			<button
				type="button"
				role="tab"
				id="tab-clinical"
				aria-selected={tab === 'clinical'}
				aria-controls="panel-clinical"
				onclick={() => (tab = 'clinical')}
				class="inline-flex h-7 items-center justify-center gap-1.5 rounded-md text-xs font-medium transition {tab ===
				'clinical'
					? 'bg-white text-slate-900 shadow-sm'
					: 'text-slate-500 hover:text-slate-800'} focus-visible:outline-2 focus-visible:outline-blue-600"
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
					<path
						d="M4 19.5V6a2 2 0 0 1 2-2h11a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6.5A2.5 2.5 0 0 1 4 19.5Z"
					/>
					<path d="m8.5 12.5 2 2 4-4.5" />
				</svg>
				Clinical Summary
			</button>
			<button
				type="button"
				role="tab"
				id="tab-dev"
				aria-selected={tab === 'dev'}
				aria-controls="panel-dev"
				onclick={() => (tab = 'dev')}
				class="inline-flex h-7 items-center justify-center gap-1.5 rounded-md text-xs font-medium transition {tab ===
				'dev'
					? 'bg-white text-slate-900 shadow-sm'
					: 'text-slate-500 hover:text-slate-800'} focus-visible:outline-2 focus-visible:outline-blue-600"
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
					<path d="m8 6-6 6 6 6M16 6l6 6-6 6" />
				</svg>
				Developer API
			</button>
		</div>
	</div>

	{#if tab === 'clinical'}
		<div
			id="panel-clinical"
			role="tabpanel"
			aria-labelledby="tab-clinical"
			class="divide-y divide-slate-100"
		>
			<section class="p-4">
				<h3 class="text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
					Active query
				</h3>
				<p class="mt-2 rounded-lg bg-slate-50 p-2.5 text-[12.5px] leading-relaxed text-slate-700">
					{activeQuery}
				</p>
			</section>

			<section class="space-y-3 p-4">
				<h3 class="text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
					Query parameters
				</h3>
				<div class="flex items-center justify-between gap-3">
					<span class="text-xs text-slate-600">Results (k)</span>
					<div
						class="flex overflow-hidden rounded-md border border-slate-300"
						role="group"
						aria-label="Results count"
					>
						{#each [3, 5, 10] as l (l)}
							<button
								type="button"
								onclick={() => onk?.(l)}
								class="h-6 w-8 text-xs font-medium tabular-nums transition {k === l
									? 'bg-slate-900 text-white'
									: 'bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900'} focus-visible:outline-2 focus-visible:outline-blue-600"
							>
								{l}
							</button>
						{/each}
					</div>
				</div>
				<div class="flex items-center justify-between gap-3">
					<span class="text-xs text-slate-600">Cohort filters</span>
					<span class="text-[11px] font-medium text-slate-700"> {cohortLabel ?? 'None'} </span>
				</div>
				<div class="flex items-center justify-between gap-3">
					<span class="text-xs text-slate-600">Search mode</span>
					<span class="font-mono text-[11px] text-slate-500">{modeUsed ?? 'auto'}</span>
				</div>
				{#if timings}
					<div class="grid grid-cols-3 gap-2">
						{#each [['Embedding', timings.embedMs], ['Search', timings.searchMs], ['Total', timings.totalMs]] as [label, ms] (label)}
							<div
								class="rounded-lg border border-slate-200 bg-slate-50/50 px-2 py-1.5 text-center"
							>
								<p class="text-sm font-semibold text-slate-900 tabular-nums">
									{ms != null ? `${ms}` : '—'}<span
										class="ml-0.5 text-[9px] font-medium text-slate-400">ms</span
									>
								</p>
								<p
									class="mt-0.5 text-[9px] font-semibold tracking-[0.08em] text-slate-400 uppercase"
								>
									{label}
								</p>
							</div>
						{/each}
					</div>
				{/if}
			</section>

			{#if terms.length}
				<section class="p-4">
					<h3 class="text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
						Extracted terminology
					</h3>
					<div class="mt-2 flex flex-wrap gap-1.5">
						{#each terms as t (t.label)}
							<span
								class="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium {t.kind ===
								'demo'
									? 'border-blue-100 bg-blue-50 text-blue-700'
									: 'border-slate-200 bg-white text-slate-600'}"
							>
								{t.label}
							</span>
						{/each}
					</div>
				</section>
			{/if}

			<section class="space-y-3 p-4">
				<h3
					class="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase"
				>
					<svg
						class="size-3"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
						><path d="M3 5h14l4 4v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5Z" /><path d="M8 5v4h6" /></svg
					>
					Filters
				</h3>
				{#if specialties.length}
					<div>
						<label for="filter-specialty" class="mb-1 block text-xs text-slate-600">Specialty</label
						>
						<div class="relative">
							<select
								id="filter-specialty"
								value={specialty}
								onchange={(e) => onspecialty?.(e.currentTarget.value)}
								class="h-8 w-full appearance-none rounded-md border border-slate-300 bg-white pr-7 pl-2.5 text-xs text-slate-700 transition hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none"
							>
								<option value="all">All specialties</option>
								{#each specialties as s (s)}
									<option value={s}>{s}</option>
								{/each}
							</select>
							<svg
								class="pointer-events-none absolute top-1/2 right-2 size-3 -translate-y-1/2 text-slate-400"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg
							>
						</div>
					</div>
				{/if}
				{#if years.length}
					<div>
						<label for="filter-year" class="mb-1 block text-xs text-slate-600"
							>Publication year</label
						>
						<div class="relative">
							<select
								id="filter-year"
								value={year}
								onchange={(e) => onyear?.(e.currentTarget.value)}
								class="h-8 w-full appearance-none rounded-md border border-slate-300 bg-white pr-7 pl-2.5 text-xs text-slate-700 transition hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none"
							>
								<option value="all">All years</option>
								{#each years as y (y)}
									<option value={y}>{y}</option>
								{/each}
							</select>
							<svg
								class="pointer-events-none absolute top-1/2 right-2 size-3 -translate-y-1/2 text-slate-400"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg
							>
						</div>
					</div>
				{/if}
				<div>
					<label for="pmid-lookup" class="mb-1 block text-xs text-slate-600">PMID lookup</label>
					<form onsubmit={openPmid} class="flex gap-1.5">
						<input
							id="pmid-lookup"
							bind:value={pmid}
							type="text"
							inputmode="numeric"
							placeholder="e.g. 35643214"
							class="h-8 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2.5 font-mono text-xs text-slate-700 transition placeholder:font-sans placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none"
						/>
						<button
							type="submit"
							class="inline-flex h-8 shrink-0 items-center rounded-md bg-slate-900 px-2.5 text-xs font-medium text-white transition hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
						>
							Open
						</button>
					</form>
				</div>
				<p class="text-[10px] leading-relaxed text-slate-400">
					Filters apply locally to the retrieved set. PMID lookup opens the record on PubMed.
				</p>
			</section>
		</div>
	{:else}
		<div id="panel-dev" role="tabpanel" aria-labelledby="tab-dev" class="space-y-3 p-4">
			<h3 class="text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">Request</h3>
			<div class="flex flex-wrap items-center gap-1.5">
				<span
					class="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-600"
					>POST api.asclevor.com/search</span
				>
				<span
					class="rounded-md border border-emerald-100 bg-emerald-50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-emerald-700"
					>200 OK</span
				>
				{#if latencyMs != null}
					<span
						class="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-600 tabular-nums"
						>{latencyMs} ms</span
					>
				{/if}
			</div>
			<pre
				class="overflow-x-auto rounded-lg bg-slate-50 p-2.5 font-mono text-[10.5px] leading-relaxed text-slate-600">{requestBody}</pre>
			<h3 class="pt-1 text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
				Response payload
			</h3>
			<JsonViewer json={responseJson} />
			<a
				href="https://docs.asclevor.com/api/quickstart"
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex items-center gap-1 pt-0.5 text-[11px] font-medium text-blue-700 transition hover:text-blue-900 hover:underline hover:underline-offset-2"
			>
				API documentation
				<svg
					class="size-3"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
					><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path
						d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
					/></svg
				>
			</a>
		</div>
	{/if}
</aside>
