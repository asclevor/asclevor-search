import { json } from '@sveltejs/kit';

const ENDPOINT = 'https://api.asclevor.com/search';
const TIMEOUT_MS = 15_000;

// Known response shape: { query, count, embed_ms, search_ms,
//   results: [{ patient_id, pmid, title, abstract, similarity }] }
// The normalizer below handles that shape plus common variations, so the UI
// keeps working if the upstream contract shifts slightly.

const LIST_KEYS = [
	'results',
	'cases',
	'matches',
	'hits',
	'data',
	'items',
	'neighbors',
	'documents',
	'rows'
];
const TITLE_KEYS = [
	'title',
	'case_title',
	'caseTitle',
	'name',
	'case_name',
	'heading',
	'condition',
	'diagnosis',
	'case_id',
	'caseId',
	'id'
];
const TEXT_KEYS = [
	'abstract',
	'text',
	'snippet',
	'summary',
	'description',
	'case_summary',
	'caseSummary',
	'excerpt',
	'content',
	'note',
	'notes',
	'body',
	'details'
];
const SCORE_KEYS = [
	'similarity',
	'similarity_score',
	'similarityScore',
	'score',
	'relevance',
	'match_score',
	'matchScore',
	'confidence',
	'_score'
];
const DISTANCE_KEYS = ['distance', 'dist'];
const URL_KEYS = ['url', 'link', 'href', 'source_url', 'sourceUrl'];
const SOURCE_KEYS = ['source', 'ref', 'reference', 'citation', 'collection', 'dataset', 'record'];
const PMID_KEYS = ['pmid', 'pubmed_id', 'pubmedId'];
const PATIENT_KEYS = ['patient_id', 'patientId', 'case_id', 'caseId'];

const CONSUMED = new Set([
	...TITLE_KEYS,
	...TEXT_KEYS,
	...SCORE_KEYS,
	...DISTANCE_KEYS,
	...URL_KEYS,
	...SOURCE_KEYS,
	...PMID_KEYS,
	...PATIENT_KEYS
]);

function first(obj, keys) {
	for (const k of keys) {
		if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
	}
	return undefined;
}

function asNumber(v) {
	const n = typeof v === 'string' ? Number(v) : v;
	return typeof n === 'number' && Number.isFinite(n) ? n : undefined;
}

function normalizeItem(item, index) {
	if (item == null) {
		return {
			title: `Case ${index + 1}`,
			abstract: '',
			similarity: undefined,
			source: 'Asclevor case record',
			url: '',
			pmid: '',
			patientId: '',
			meta: []
		};
	}
	if (typeof item !== 'object') {
		const s = String(item);
		return {
			title: s.slice(0, 90),
			abstract: s,
			similarity: undefined,
			source: 'Asclevor case record',
			url: '',
			pmid: '',
			patientId: '',
			meta: []
		};
	}

	const obj =
		item.metadata && typeof item.metadata === 'object'
			? { ...item.metadata, ...item }
			: { ...item };

	const pmidRaw = first(obj, PMID_KEYS);
	const pmid = pmidRaw != null ? String(pmidRaw).replace(/[^0-9]/g, '') || String(pmidRaw) : '';
	const patientRaw = first(obj, PATIENT_KEYS);
	const patientId = patientRaw != null ? String(patientRaw) : '';

	// Similarity 0–1; convert an inverted distance (0 = identical) if that's what we got.
	const rawScore = asNumber(first(obj, SCORE_KEYS));
	const rawDistance = asNumber(first(obj, DISTANCE_KEYS));
	const similarity =
		rawScore !== undefined
			? rawScore
			: rawDistance !== undefined && rawDistance >= 0 && rawDistance <= 1
				? 1 - rawDistance
				: undefined;

	const url =
		String(first(obj, URL_KEYS) ?? '') || (pmid ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` : '');
	const srcField = first(obj, SOURCE_KEYS);
	let source = 'Asclevor case record';
	if (url) {
		try {
			source = new URL(url).hostname.replace(/^www\./, '');
		} catch {
			if (typeof srcField === 'string' && srcField) source = srcField;
		}
	} else if (typeof srcField === 'string' && srcField) {
		source = srcField;
	}

	const title =
		String(first(obj, TITLE_KEYS) ?? '') ||
		(patientId ? `Case #${patientId}` : `Case ${index + 1}`);
	const abstract = String(first(obj, TEXT_KEYS) ?? '');

	const meta = [];
	for (const [k, v] of Object.entries(obj)) {
		if (meta.length >= 6) break;
		if (CONSUMED.has(k) || k === 'metadata' || v == null || typeof v === 'object') continue;
		const val = String(v).slice(0, 48);
		if (!val.trim()) continue;
		meta.push({ k: k.replace(/_/g, ' '), v: val });
	}

	return {
		title: title.slice(0, 160),
		abstract,
		similarity: typeof similarity === 'number' ? Number(similarity.toFixed(3)) : undefined,
		source,
		url,
		pmid,
		patientId,
		meta
	};
}

function normalizeResults(data, limit) {
	let list = null;
	if (Array.isArray(data)) {
		list = data;
	} else if (data && typeof data === 'object') {
		for (const key of LIST_KEYS) {
			if (Array.isArray(data[key])) {
				list = data[key];
				break;
			}
		}
	}
	if (!list) list = [];
	return list.slice(0, limit).map(normalizeItem);
}

export async function POST({ request, fetch }) {
	let body;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body.' }, { status: 400 });
	}

	const query = typeof body?.query === 'string' ? body.query.trim() : '';
	let limit = Number(body?.limit);
	if (!Number.isFinite(limit)) limit = 3;
	limit = Math.min(Math.max(Math.trunc(limit), 1), 25);

	if (!query) {
		return json({ error: 'A case description ("query") is required.' }, { status: 400 });
	}

	const started = performance.now();
	try {
		const res = await fetch(ENDPOINT, {
			method: 'POST',
			headers: { 'content-type': 'application/json', accept: 'application/json' },
			body: JSON.stringify({ query, limit }),
			signal: AbortSignal.timeout(TIMEOUT_MS)
		});

		const measured = Math.round(performance.now() - started);
		const raw = await res.text();
		let data = null;
		try {
			data = raw ? JSON.parse(raw) : null;
		} catch {
			// Non-JSON upstream response — handled below.
		}

		if (!res.ok) {
			const upstream = data && (data.error ?? data.message ?? data.detail);
			return json(
				{
					error:
						typeof upstream === 'string'
							? upstream
							: `api.asclevor.com responded with ${res.status}.`
				},
				{ status: 502 }
			);
		}

		if (data == null) {
			return json({ error: 'api.asclevor.com returned a non-JSON response.' }, { status: 502 });
		}

		const embedMs = asNumber(data.embed_ms);
		const searchMs = asNumber(data.search_ms);
		const timings = {
			embedMs: embedMs !== undefined ? Math.round(embedMs) : null,
			searchMs: searchMs !== undefined ? Math.round(searchMs) : null,
			totalMs:
				embedMs !== undefined && searchMs !== undefined ? Math.round(embedMs + searchMs) : measured
		};

		return json({
			query,
			limit,
			timings,
			results: normalizeResults(data, limit)
		});
	} catch (err) {
		const timedOut = err?.name === 'TimeoutError' || err?.cause?.name === 'TimeoutError';
		return json(
			{
				error: timedOut
					? 'The search timed out after 15 s.'
					: 'Could not reach api.asclevor.com. Check your connection and try again.'
			},
			{ status: 502 }
		);
	}
}
