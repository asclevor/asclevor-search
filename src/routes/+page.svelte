<script>
	import { onMount, tick } from 'svelte';

	const EXAMPLES = [
		'60-year-old female, ARDS from COVID-19, desaturation during physical therapy',
		'72-year-old male, crushing chest pain radiating to the jaw, elevated troponin',
		'8-year-old with fever, petechial rash and tachycardia',
		'45-year-old, sudden unilateral weakness and slurred speech'
	];

	const LIMITS = [3, 5, 10];

	let query = $state('');
	let activeQuery = $state('');
	let limit = $state(3);
	let searched = $state(false);
	let loading = $state(false);
	let results = $state([]);
	let timings = $state(null);
	let error = $state(null);
	let expanded = $state(new Set());
	let inputEl = $state(null);

	async function search(q = query, l = limit) {
		const trimmed = String(q ?? '').trim();
		if (!trimmed || loading) return;
		query = trimmed;
		activeQuery = trimmed;
		limit = l;
		expanded = new Set();
		error = null;
		results = [];
		timings = null;
		loading = true;
		searched = true;

		syncUrl();
		await tick();
		inputEl?.focus();

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
		} catch (e) {
			error = e?.message || 'Something went wrong.';
		} finally {
			loading = false;
		}
	}

	function submit(e) {
		e.preventDefault();
		search();
	}

	async function reset() {
		loading = false;
		searched = false;
		query = '';
		activeQuery = '';
		results = [];
		timings = null;
		error = null;
		expanded = new Set();
		history.replaceState(null, '', window.location.pathname);
		await tick();
		inputEl?.focus();
	}

	function setLimit(l) {
		limit = l;
		if (searched) search(activeQuery, l);
	}

	function toggle(i) {
		const next = new Set(expanded);
		if (next.has(i)) next.delete(i);
		else next.add(i);
		expanded = next;
	}

	function scorePct(score) {
		if (typeof score !== 'number' || Number.isNaN(score)) return null;
		const s = score <= 1 ? score : score / 100;
		return Math.max(0, Math.min(100, Math.round(s * 100)));
	}

	function syncUrl() {
		const url = new URL(window.location.href);
		url.searchParams.set('q', activeQuery);
		url.searchParams.set('limit', String(limit));
		history.replaceState(null, '', url);
	}

	const totalMs = $derived(
		timings ? (timings.totalMs ?? (timings.embedMs ?? 0) + (timings.searchMs ?? 0)) : null
	);

	const requestPreview = $derived.by(() => {
		const q = activeQuery || 'describe a case…';
		const trimmed = q.length > 80 ? q.slice(0, 80) + '…' : q;
		return `POST api.asclevor.com/search\n${JSON.stringify({ query: trimmed, limit }, null, 2)}`;
	});

	onMount(() => {
		const params = new URLSearchParams(window.location.search);
		const q = params.get('q');
		const l = Number.parseInt(params.get('limit') ?? '', 10);
		if (LIMITS.includes(l)) limit = l;
		if (q) search(q, limit);

		function onKeydown(e) {
			if (e.key === '/' && document.activeElement !== inputEl && !e.metaKey && !e.ctrlKey) {
				e.preventDefault();
				inputEl?.focus();
			}
		}
		window.addEventListener('keydown', onKeydown);
		return () => window.removeEventListener('keydown', onKeydown);
	});
</script>

{#snippet searchbar(compact)}
	<form
		onsubmit={submit}
		class="flex items-stretch border border-neutral-300 bg-white transition-colors focus-within:border-neutral-950"
	>
		<svg
			class="ml-4 size-4 shrink-0 self-center text-neutral-400"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			aria-hidden="true"
		>
			<circle cx="11" cy="11" r="7" />
			<path d="m20.5 20.5-4.6-4.6" stroke-linecap="round" />
		</svg>
		<input
			bind:this={inputEl}
			bind:value={query}
			type="text"
			aria-label="Describe a patient case"
			placeholder={compact ? 'Describe another case…' : 'Describe a patient case…'}
			class="min-w-0 flex-1 bg-transparent px-3.5 text-neutral-950 outline-none placeholder:text-neutral-400 {compact
				? 'py-3 text-sm'
				: 'py-4 text-base'}"
		/>
		<button
			type="submit"
			disabled={loading || !query.trim()}
			class="flex items-center gap-2 bg-neutral-950 px-5 text-white transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40 {compact
				? 'text-xs'
				: 'text-sm'} font-medium"
		>
			{loading ? 'Searching' : 'Search'}
			<span aria-hidden="true">→</span>
		</button>
	</form>
{/snippet}

<svelte:head>
	<title>Asclevor Case Search — find the nearest case</title>
	<meta
		name="description"
		content="Describe a patient case in plain language. Asclevor returns the nearest cases on record, ranked by similarity."
	/>
</svelte:head>

<div class="flex min-h-dvh flex-col bg-white text-neutral-950">
	<main class="flex flex-1 flex-col">
		{#if !searched}
			<section class="flex flex-1 flex-col items-center justify-center px-5 py-20 text-center">
				<p class="text-[11px] tracking-[0.24em] text-neutral-500 uppercase">Asclevor Case Index</p>
				<h1
					class="mt-6 text-5xl leading-[1.02] font-bold tracking-[-0.035em] text-balance md:text-7xl"
				>
					Find the nearest case.
				</h1>
				<p class="mt-6 max-w-xl text-sm leading-relaxed text-neutral-500 md:text-base">
					Describe a patient in plain language. Asclevor searches cross-linked case records and
					returns the most similar cases on file — ranked by similarity, in milliseconds.
				</p>
				<div class="mt-10 w-full max-w-2xl">
					{@render searchbar(false)}
				</div>
				<div class="mt-6 flex max-w-2xl flex-wrap items-center justify-center gap-2">
					<span class="text-[11px] tracking-[0.2em] text-neutral-400 uppercase">Try</span>
					{#each EXAMPLES as example (example)}
						<button
							onclick={() => search(example)}
							class="max-w-[19rem] truncate border border-neutral-300 px-3 py-1.5 text-[11px] text-neutral-500 transition-colors hover:border-neutral-950 hover:text-neutral-950"
						>
							{example}
						</button>
					{/each}
				</div>
				<p class="mt-8 text-[11px] text-neutral-400">
					Powered by <span class="font-mono">api.asclevor.com/search</span>
				</p>
			</section>
		{:else}
			<section class="mx-auto w-full max-w-6xl flex-1 px-5 pt-6 pb-16 md:px-8" aria-live="polite">
				<div class="max-w-2xl">
					{@render searchbar(true)}
				</div>

				<div
					class="mt-5 flex items-baseline justify-between gap-4 border-b border-neutral-200 pb-3"
				>
					<p class="text-[11px] tracking-[0.24em] text-neutral-500 uppercase">Case search</p>
					<p
						class="text-right text-[11px] tracking-[0.14em] text-neutral-400 uppercase tabular-nums"
					>
						{#if loading}
							Searching…
						{:else}
							{results.length}
							nearest {results.length === 1 ? 'case' : 'cases'}{totalMs != null
								? ` · ${totalMs} ms`
								: ''}
						{/if}
					</p>
				</div>

				<div class="grid grid-cols-1 gap-12 pt-8 lg:grid-cols-[minmax(0,1fr)_19rem]">
					<div class="min-w-0">
						{#if loading}
							<div class="border border-neutral-200 p-6">
								<p class="text-[11px] tracking-[0.24em] text-neutral-500 uppercase">
									Searching the index
								</p>
								<p class="mt-2 text-sm leading-relaxed text-neutral-600">
									Finding cases nearest to “{activeQuery}”…
								</p>
								<div class="mt-5 h-0.5 w-full overflow-hidden bg-neutral-200">
									<div class="progress-bar h-full w-1/4 bg-neutral-950"></div>
								</div>
							</div>
						{:else if error}
							<div class="border border-neutral-950 p-6">
								<p class="text-[11px] tracking-[0.24em] text-neutral-500 uppercase">Error</p>
								<p class="mt-2 text-sm leading-relaxed text-neutral-700">{error}</p>
								<button
									onclick={() => search(activeQuery)}
									class="mt-5 bg-neutral-950 px-5 py-2.5 text-xs font-medium text-white transition-colors hover:bg-neutral-700"
								>
									Retry →
								</button>
							</div>
						{:else if results.length === 0}
							<p class="text-sm leading-relaxed text-neutral-500">
								No matching cases. Try rewording — age, sex, primary condition, and key findings
								work best.
							</p>
						{:else}
							<ol>
								{#each results as r, i (r.patientId || `${r.title}-${i}`)}
									{@const pct = scorePct(r.similarity)}
									<li
										class="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-3 border-b border-neutral-200 py-7 first:pt-0 last:border-b-0"
									>
										<span
											class="pt-1.5 text-[11px] tracking-[0.18em] text-neutral-400 tabular-nums"
										>
											{String(i + 1).padStart(2, '0')}
										</span>
										<div class="min-w-0">
											<div class="flex items-start justify-between gap-6">
												<div class="min-w-0">
													<p class="text-[11px] tracking-[0.18em] text-neutral-400 uppercase">
														{r.source}{r.pmid ? ` · PMID ${r.pmid}` : ''}{r.patientId
															? ` · Patient #${r.patientId}`
															: ''}
													</p>
													<h2 class="mt-1.5 text-xl leading-snug font-semibold tracking-tight">
														{#if r.url}
															<a
																href={r.url}
																target="_blank"
																rel="noopener noreferrer"
																class="decoration-1 underline-offset-4 hover:underline"
															>
																{r.title}
															</a>
														{:else}
															{r.title}
														{/if}
													</h2>
												</div>
												{#if pct != null}
													<div class="w-24 shrink-0 text-right">
														<p class="text-[10px] tracking-[0.18em] text-neutral-400 uppercase">
															Similarity
														</p>
														<p class="text-2xl font-bold tracking-tight tabular-nums">
															{r.similarity.toFixed(2)}
														</p>
														<div class="mt-1.5 h-0.5 w-full bg-neutral-200">
															<div class="h-full bg-neutral-950" style="width: {pct}%"></div>
														</div>
													</div>
												{/if}
											</div>
											{#if r.abstract}
												<p
													class="mt-2.5 text-sm leading-relaxed whitespace-pre-line text-neutral-600 {expanded.has(
														i
													)
														? ''
														: 'line-clamp-4'}"
												>
													{r.abstract}
												</p>
												<button
													onclick={() => toggle(i)}
													class="mt-2 text-[11px] font-medium tracking-[0.06em] text-neutral-500 underline decoration-1 underline-offset-4 transition-colors hover:text-neutral-950"
												>
													{expanded.has(i) ? 'Show less' : 'Read full case'}
												</button>
											{/if}
											{#if r.meta?.length}
												<div class="mt-3 flex flex-wrap gap-1.5">
													{#each r.meta as m (`${m.k}-${m.v}`)}
														<span
															class="border border-neutral-200 px-2 py-0.5 text-[10px] tracking-[0.14em] text-neutral-500 uppercase"
														>
															{m.k}
															{m.v}
														</span>
													{/each}
												</div>
											{/if}
										</div>
									</li>
								{/each}
							</ol>
						{/if}
					</div>

					<aside class="space-y-8 self-start lg:sticky lg:top-6">
						<div>
							<p class="text-[11px] tracking-[0.24em] text-neutral-500 uppercase">Your case</p>
							<p
								class="mt-2 border-l-2 border-neutral-950 pl-3 text-sm leading-relaxed text-neutral-700"
							>
								{activeQuery}
							</p>
						</div>

						<div>
							<p class="text-[11px] tracking-[0.24em] text-neutral-500 uppercase">Results</p>
							<div class="mt-2 flex border border-neutral-300">
								{#each LIMITS as l (l)}
									<button
										onclick={() => setLimit(l)}
										disabled={loading}
										class="flex-1 py-2 text-xs tabular-nums transition-colors disabled:opacity-40 {limit ===
										l
											? 'bg-neutral-950 text-white'
											: 'text-neutral-500 hover:text-neutral-950'}"
									>
										{l}
									</button>
								{/each}
							</div>
						</div>

						<div>
							<p class="text-[11px] tracking-[0.24em] text-neutral-500 uppercase">Request</p>
							<pre
								class="mt-2 border border-neutral-200 p-3 font-mono text-[11px] leading-relaxed break-words whitespace-pre-wrap text-neutral-600">{requestPreview}</pre>
						</div>

						<p class="text-xs leading-relaxed text-neutral-400">
							Every case on file is cross-linked by condition, symptom, and ICD-10.
							<a
								href="https://asclevor.com"
								class="text-neutral-950 underline decoration-1 underline-offset-4 hover:no-underline"
							>
								Explore the platform →
							</a>
						</p>
					</aside>
				</div>
			</section>
		{/if}
	</main>

	<footer class="border-t border-neutral-200">
		<div class="mx-auto max-w-6xl px-5 md:px-8">
			<div class="grid grid-cols-1 gap-10 py-14 sm:grid-cols-[1fr_auto_auto] sm:gap-20">
				<div>
					<button
						onclick={reset}
						class="text-lg font-bold tracking-tight"
						aria-label="Asclevor case search — home"
					>
						A.
					</button>
					<p class="mt-4 max-w-xs text-sm leading-relaxed text-neutral-500">
						The clean, structured, cross-linked Medical Knowledge API. Open at the core.
					</p>
					<a
						href="https://www.producthunt.com/products/asclevor-case-search/reviews/new?utm_source=badge-product_review&utm_medium=badge&utm_source=badge-asclevor&#0045;case&#0045;search"
						target="_blank"
						rel="noopener noreferrer"
						class="mt-6 inline-block"
					>
						<img
							src="https://api.producthunt.com/widgets/embed-image/v1/product_review.svg?product_id=1304046&theme=dark"
							alt="Asclevor&#0032;Case&#0032;Search - Semantic&#0032;search&#0032;for&#0032;clinical&#0032;case&#0032;records | Product Hunt"
							style="width: 250px; height: 54px"
							width="250"
							height="54"
							loading="lazy"
						/>
					</a>
				</div>
				<div>
					<p class="text-[11px] tracking-[0.24em] text-neutral-500 uppercase">Product</p>
					<ul class="mt-4 space-y-2.5 text-sm text-neutral-600">
						<li><a href="/" class="transition-colors hover:text-neutral-950">Case Search</a></li>
						<li>
							<a href="https://api.asclevor.com" class="transition-colors hover:text-neutral-950"
								>API</a
							>
						</li>
						<li>
							<a href="https://asclevor.com/docs" class="transition-colors hover:text-neutral-950"
								>Documentation</a
							>
						</li>
					</ul>
				</div>
				<div>
					<p class="text-[11px] tracking-[0.24em] text-neutral-500 uppercase">Company</p>
					<ul class="mt-4 space-y-2.5 text-sm text-neutral-600">
						<li>
							<a href="https://asclevor.com/about" class="transition-colors hover:text-neutral-950"
								>About</a
							>
						</li>
						<li>
							<a href="mailto:hello@asclevor.com" class="transition-colors hover:text-neutral-950"
								>Contact</a
							>
						</li>
					</ul>
				</div>
			</div>
			<p
				class="text-center text-[16.5vw] leading-[0.8] font-bold tracking-[-0.05em] select-none"
				aria-hidden="true"
			>
				asclevor
			</p>
			<div
				class="flex items-center justify-between border-t border-neutral-200 py-4 text-[11px] text-neutral-500"
			>
				<p>© 2025 Asclevor. All rights reserved.</p>
				<div class="flex gap-5">
					<a href="https://asclevor.com/terms" class="transition-colors hover:text-neutral-950"
						>Terms</a
					>
					<a href="https://asclevor.com/privacy" class="transition-colors hover:text-neutral-950"
						>Privacy</a
					>
				</div>
			</div>
		</div>
	</footer>
</div>
