<script>
	import { onMount } from 'svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import ResultCard from '$lib/components/ResultCard.svelte';
	import ContextPanel from '$lib/components/ContextPanel.svelte';
	import logo from '$lib/assets/logo.svg';
	import { classifySpecialty, extractTerms, extractYear } from '$lib/utils/clinical.js';

	const EXAMPLES = [
		'60-year-old female, ARDS from COVID-19, desaturation during physical therapy',
		'72-year-old male, crushing chest pain radiating to the jaw, elevated troponin',
		'8-year-old with fever, petechial rash and tachycardia',
		'45-year-old, sudden unilateral weakness and slurred speech'
	];

	let query = $state('');
	let activeQuery = $state('');
	let limit = $state(3);
	let searched = $state(false);
	let loading = $state(false);
	let results = $state([]);
	let timings = $state(null);
	let error = $state(null);
	let expanded = $state(new Set());
	let responseJson = $state('');
	let specialty = $state('all');
	let year = $state('all');
	let searchBar = $state(null);

	const totalMs = $derived(
		timings ? (timings.totalMs ?? (timings.embedMs ?? 0) + (timings.searchMs ?? 0)) : null
	);

	const enriched = $derived(
		results.map((r) => ({ ...r, specialty: classifySpecialty(r), year: extractYear(r) }))
	);
	const specialties = $derived(
		[...new Set(enriched.map((r) => r.specialty).filter(Boolean))].sort()
	);
	const years = $derived(
		[...new Set(enriched.map((r) => r.year).filter(Boolean))].sort((a, b) => b - a)
	);
	const filteredResults = $derived(
		enriched.filter(
			(r) =>
				(specialty === 'all' || r.specialty === specialty) && (year === 'all' || r.year === year)
		)
	);
	const terms = $derived(extractTerms(activeQuery));
	const hasActiveFilters = $derived(specialty !== 'all' || year !== 'all');
	const requestBody = $derived(
		JSON.stringify(
			{
				query: activeQuery.length > 72 ? `${activeQuery.slice(0, 72)}…` : activeQuery,
				limit
			},
			null,
			2
		)
	);

	function cardKey(r, i) {
		return r.pmid || r.patientId || `${r.title}-${i}`;
	}

	function toggleExpand(key) {
		const next = new Set(expanded);
		if (next.has(key)) next.delete(key);
		else next.add(key);
		expanded = next;
	}

	function syncUrl() {
		const url = new URL(window.location.href);
		url.searchParams.set('q', activeQuery);
		url.searchParams.set('limit', String(limit));
		history.replaceState(null, '', url);
	}

	async function search(q = query, l = limit) {
		const trimmed = String(q ?? '').trim();
		if (!trimmed || loading) return;
		query = trimmed;
		activeQuery = trimmed;
		limit = l;
		expanded = new Set();
		specialty = 'all';
		year = 'all';
		error = null;
		results = [];
		timings = null;
		responseJson = '';
		loading = true;
		searched = true;

		syncUrl();
		searchBar?.focus();

		try {
			const res = await fetch('/api/search', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ query: trimmed, limit })
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data?.error || `Request failed with ${res.status}.`);
			results = data.results ?? [];
			timings = data.timings ?? null;
			responseJson = JSON.stringify(
				{
					query: data.query ?? trimmed,
					limit: data.limit ?? limit,
					timings: data.timings ?? null,
					results: data.results ?? []
				},
				null,
				2
			);
		} catch (e) {
			error = e?.message || 'Something went wrong.';
		} finally {
			loading = false;
		}
	}

	function clearFilters() {
		specialty = 'all';
		year = 'all';
	}

	onMount(() => {
		const params = new URLSearchParams(window.location.search);
		const q = params.get('q');
		const l = Number.parseInt(params.get('limit') ?? '', 10);
		if ([3, 5, 10].includes(l)) limit = l;
		if (q) search(q, limit);

		function onKeydown(e) {
			if (
				e.key === '/' &&
				document.activeElement?.tagName !== 'INPUT' &&
				document.activeElement?.tagName !== 'TEXTAREA' &&
				!e.metaKey &&
				!e.ctrlKey
			) {
				e.preventDefault();
				searchBar?.focus();
			}
		}
		window.addEventListener('keydown', onKeydown);
		return () => window.removeEventListener('keydown', onKeydown);
	});
</script>

<svelte:head>
	<title>Asclevor — Clinical Case Similarity Search</title>
	<meta
		name="description"
		content="Describe a patient presentation in plain language. Asclevor returns the most similar published case records, ranked by semantic similarity."
	/>
</svelte:head>

<div class="flex min-h-dvh flex-col bg-white text-slate-900">
	<!-- Persistent top banner -->
	<header
		class="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85"
	>
		<div class="relative mx-auto w-full max-w-[1440px] px-4 sm:px-6">
			<div class="flex h-[52px] items-center justify-between gap-4">
				<a href="/" class="flex min-w-0 items-center gap-2" aria-label="Asclevor home">
					<img src={logo} alt="" class="h-[22px] w-[22px] shrink-0" />
					<span class="text-[15px] font-bold tracking-[-0.02em] text-slate-900">Asclevor</span>
					<span
						class="hidden border-l border-slate-200 pl-2.5 text-xs font-medium text-slate-400 sm:block"
						>Clinical Case Search</span
					>
				</a>
				<nav class="flex items-center gap-1" aria-label="Primary">
					<a
						href="https://docs.asclevor.com/"
						target="_blank"
						rel="noopener noreferrer"
						class="rounded-md px-2.5 py-1.5 text-[13px] font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-600"
					>
						Documentation
					</a>
					<a
						href="https://docs.asclevor.com/api/quickstart"
						target="_blank"
						rel="noopener noreferrer"
						class="hidden rounded-md px-2.5 py-1.5 text-[13px] font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-600 sm:block"
					>
						API
					</a>
				</nav>
			</div>
			<div class="flex items-center gap-3 pb-3">
				<div class="min-w-0 flex-1">
					<SearchBar bind:this={searchBar} bind:value={query} {loading} onsubmit={() => search()} />
				</div>
			</div>
			{#if loading}
				<div class="absolute inset-x-0 -bottom-px h-0.5 overflow-hidden" aria-hidden="true">
					<div class="progress-bar h-full w-1/4 bg-blue-600"></div>
				</div>
			{/if}
		</div>
	</header>

	<main class="mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-4 sm:px-6">
		{#if !searched}
			<!-- Empty state: utility-first, search lives in the top banner -->
			<section class="flex flex-1 flex-col items-center justify-center py-20 text-center">
				<h1
					class="max-w-md text-[22px] leading-tight font-bold tracking-[-0.02em] text-balance text-slate-900 sm:text-2xl"
				>
					Find clinically similar cases in seconds
				</h1>
				<p class="mt-2.5 max-w-md text-sm leading-relaxed text-slate-500">
					Describe a patient presentation in plain language. Asclevor matches it against indexed
					case records and ranks the nearest cases by semantic similarity.
				</p>
				<div class="mt-8 w-full max-w-2xl">
					<p class="mb-2.5 text-[11px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
						Try a clinical presentation
					</p>
					<div class="flex flex-wrap items-center justify-center gap-2">
						{#each EXAMPLES as example (example)}
							<button
								type="button"
								onclick={() => search(example)}
								class="max-w-[19rem] truncate rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-[12px] text-slate-600 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-blue-500 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
							>
								{example}
							</button>
						{/each}
					</div>
				</div>
				<p class="mt-8 text-[11px] text-slate-400">
					Press <kbd
						class="rounded border border-slate-200 bg-slate-50 px-1 py-px font-mono text-[10px] text-slate-500"
						>/</kbd
					> to focus search · Indexed PubMed case records
				</p>
			</section>
		{:else}
			<!-- Results -->
			<section class="py-6" aria-live="polite">
				<div
					class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3"
				>
					<div class="flex items-baseline gap-2.5">
						<h1 class="text-sm font-bold text-slate-900">Case results</h1>
						<p class="text-xs text-slate-500 tabular-nums">
							{#if loading}
								Searching the index…
							{:else if error}
								Request failed
							{:else}
								{filteredResults.length}
								{filteredResults.length === 1 ? 'case' : 'cases'}
								{#if filteredResults.length !== results.length}of {results.length} retrieved{/if}
							{/if}
						</p>
					</div>
					<div class="flex flex-wrap items-center gap-2">
						{#if specialty !== 'all'}
							<button
								type="button"
								onclick={() => (specialty = 'all')}
								class="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 py-0.5 pr-1.5 pl-2.5 text-[11px] font-medium text-blue-700 transition hover:border-blue-300"
							>
								{specialty}
								<svg
									class="size-3"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg
								>
							</button>
						{/if}
						{#if year !== 'all'}
							<button
								type="button"
								onclick={() => (year = 'all')}
								class="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 py-0.5 pr-1.5 pl-2.5 text-[11px] font-medium text-blue-700 transition hover:border-blue-300"
							>
								{year}
								<svg
									class="size-3"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg
								>
							</button>
						{/if}
						{#if !loading && !error && results.length}
							<span class="text-[11px] text-slate-400"
								>Ranked by semantic similarity{totalMs != null ? ` · ${totalMs} ms` : ''}</span
							>
						{/if}
					</div>
				</div>

				<div class="mt-5 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
					<div class="min-w-0 space-y-2.5">
						{#if loading}
							{#each Array(4) as _, i (i)}
								<div
									class="animate-pulse rounded-lg border border-slate-200 bg-white px-4 py-3"
									aria-hidden="true"
								>
									<div class="flex items-start justify-between gap-3">
										<div class="w-full space-y-1.5">
											<div class="h-3 w-44 rounded bg-slate-100"></div>
											<div class="h-3.5 w-3/4 rounded bg-slate-100"></div>
										</div>
										<div class="size-9 shrink-0 rounded-full bg-slate-100"></div>
									</div>
									<div class="mt-2 space-y-1.5 border-t border-slate-100 pt-2">
										<div class="h-2.5 w-full rounded bg-slate-100"></div>
										<div class="h-2.5 w-4/5 rounded bg-slate-100"></div>
									</div>
								</div>
							{/each}
						{:else if error}
							<div class="rounded-xl border border-rose-200 bg-rose-50/60 p-6">
								<div class="flex items-center gap-2 text-rose-800">
									<svg
										class="size-4 shrink-0"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
										aria-hidden="true"
										><path
											d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 20h16a2 2 0 0 0 1.73-2Z"
										/><path d="M12 9v4M12 17h.01" /></svg
									>
									<h2 class="text-sm font-semibold">Search request failed</h2>
								</div>
								<p class="mt-2 text-[13px] leading-relaxed text-rose-700">{error}</p>
								<button
									type="button"
									onclick={() => search(activeQuery)}
									class="mt-4 inline-flex h-8 items-center gap-1.5 rounded-md bg-rose-600 px-3 text-xs font-semibold text-white transition hover:bg-rose-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
								>
									Retry search
								</button>
							</div>
						{:else if results.length === 0}
							<div class="rounded-xl border border-slate-200 bg-white p-8 text-center">
								<svg
									class="mx-auto size-6 text-slate-300"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="1.75"
									stroke-linecap="round"
									aria-hidden="true"
								>
									<circle cx="11" cy="11" r="7" />
									<path d="m20.5 20.5-4.6-4.6" />
								</svg>
								<h2 class="mt-3 text-sm font-semibold text-slate-900">No matching cases</h2>
								<p class="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-slate-500">
									Try rewording the description — age, sex, primary condition, and key findings work
									best.
								</p>
							</div>
						{:else if filteredResults.length === 0}
							<div class="rounded-xl border border-slate-200 bg-white p-8 text-center">
								<h2 class="text-sm font-semibold text-slate-900">
									No cases match the active filters
								</h2>
								<p class="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-slate-500">
									Widen the specialty or year filter to see the retrieved cases.
								</p>
								<button
									type="button"
									onclick={clearFilters}
									class="mt-4 inline-flex h-8 items-center rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
								>
									Clear filters
								</button>
							</div>
						{:else}
							{#each filteredResults as r, i (cardKey(r, i))}
								<ResultCard
									{r}
									expanded={expanded.has(cardKey(r, i))}
									ontoggleexpand={() => toggleExpand(cardKey(r, i))}
								/>
							{/each}
						{/if}
					</div>

					<ContextPanel
						{activeQuery}
						{limit}
						onlimit={(l) => search(activeQuery, l)}
						{timings}
						{terms}
						{specialties}
						{years}
						{specialty}
						{year}
						onspecialty={(v) => (specialty = v)}
						onyear={(v) => (year = v)}
						{responseJson}
						{requestBody}
						latencyMs={totalMs}
					/>
				</div>
			</section>
		{/if}
	</main>

	<footer class="border-t border-slate-200 bg-white">
		<div
			class="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-3 px-4 py-4 sm:flex-row sm:px-6"
		>
			<p class="text-[11px] text-slate-400">© 2025 Asclevor. All rights reserved.</p>
			<div
				class="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] font-medium sm:gap-x-5"
			>
				<a href="https://docs.asclevor.com/" class="text-slate-500 transition hover:text-slate-900"
					>Documentation</a
				>
				<a href="https://asclevor.com/terms" class="text-slate-500 transition hover:text-slate-900"
					>Terms</a
				>
				<a
					href="https://asclevor.com/privacy"
					class="text-slate-500 transition hover:text-slate-900">Privacy</a
				>
			</div>
		</div>
	</footer>
</div>
