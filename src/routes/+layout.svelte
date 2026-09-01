<script>
	import { dev } from '$app/environment';
	import { injectAnalytics } from '@vercel/analytics/sveltekit';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	injectAnalytics({ mode: dev ? 'development' : 'production' });

	let { children } = $props();
</script>

{@html `<!--
	ASCLEVOR — CLINICAL CASE SEARCH · DIRECTION CONTRACT

	THESIS: A clinical decision-support utility, not a search landing page. The
	refuses the brutalist hero-and-teaser arrangement: one persistent top banner
	owns retrieval, and the page below is a dense two-column workspace of
	structured case summaries plus query context.

	OWN-WORLD: Crisp white ground, slate structure (#0F172A/#1E293B ink,
	#E2E8F0 rules), clinical blue #2563EB for every interactive element, muted
	emerald #059669 for similarity evidence. Inter at utility sizes — nothing
	above 24px. Cards are bordered instruments: metadata badge bar, radial
	similarity ring, three labeled clinical sections, quiet action bar.

	STORY: A physician types a presentation, gets ranked case cards whose
	similarity, provenance (PMID/source/date/demographics) and clinical course
	are scannable in seconds; a developer flips one tab to the live JSON.

	FIRST VIEWPORT: Sticky banner (brand row + search field with clear/submit)
	over a 70/30 grid — case result cards left, sticky tabbed context panel
	(Clinical Summary / Developer API) right. Empty state is a short utility
	intro with pill example queries; no hero typography anywhere.

	FORM: Brief-pinned clinical-utility direction (user-specified palette,
	type, and component anatomy; no concept roll — seed key: none, brief-locked).

	FINISH: unreviewed and undocumented is unfinished; this build ends with
	the finish review, the verdict, DESIGN.md, and every shipping raster
	carrying its provenance.
--->`}
<svelte:head><link rel="icon" href={favicon} /></svelte:head>

{@render children()}
