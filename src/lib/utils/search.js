// Client-side integration with the public Asclevor search API (v2).
// The browser calls https://api.asclevor.com/search directly (the API allows
// cross-origin requests). This module validates cohort filters, builds the
// upstream request, and normalizes the response into the shape the UI renders.
//
// Upstream contract:
//   request : { query, k, mode, gender?, age_min?, age_max?, include_text, text_max_chars }
//   response: { query, mode_used, n_total, results: [{ rank, patient_uid, similarity,
//               title, pmid, age_years, gender, pmc_url, pubmed_url, text }] }
// The normalizer below handles that shape plus common variations, so the UI
// keeps working if the upstream contract shifts slightly.

const ENDPOINT = 'https://api.asclevor.com/search';
const TIMEOUT_MS = 15_000;

const DEFAULT_K = 5;
const MAX_K = 25;
const MODE = 'auto';
const INCLUDE_TEXT = true;
const TEXT_MAX_CHARS = 600;

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
const URL_KEYS = [
	'url',
	'pmc_url',
	'pmcUrl',
	'pubmed_url',
	'pubmedUrl',
	'link',
	'href',
	'source_url',
	'sourceUrl'
];
const PUBMED_URL_KEYS = ['pubmed_url', 'pubmedUrl', 'pubmed_link', 'pubmedLink'];
const SOURCE_KEYS = ['source', 'ref', 'reference', 'citation', 'collection', 'dataset', 'record'];
const PMID_KEYS = ['pmid', 'pubmed_id', 'pubmedId'];
const PATIENT_KEYS = [
	'patient_uid',
	'patientUid',
	'patient_id',
	'patientId',
	'case_id',
	'caseId',
	'uid'
];
const AGE_KEYS = ['age_years', 'ageYears', 'age', 'patient_age', 'patientAge'];
const GENDER_KEYS = ['gender', 'sex', 'patient_gender', 'patientGender'];

const CONSUMED = new Set([
	...TITLE_KEYS,
	...TEXT_KEYS,
	...SCORE_KEYS,
	...DISTANCE_KEYS,
	...URL_KEYS,
	...PUBMED_URL_KEYS,
	...SOURCE_KEYS,
	...PMID_KEYS,
	...PATIENT_KEYS,
	...AGE_KEYS,
	...GENDER_KEYS,
	'rank'
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

// Request-side normalization: accept F/f/female/woman → 'F', M/m/male/man → 'M'.
function normalizeGender(v) {
	if (v == null) return null;
	const s = String(v).trim().toLowerCase();
	if (s === 'f' || s === 'female' || s === 'woman') return 'F';
	if (s === 'm' || s === 'male' || s === 'man') return 'M';
	return null;
}

// Item-side normalization: keep 'F'/'M', pass through anything else for display.
function normalizeItemGender(v) {
	const g = normalizeGender(v);
	if (g) return g;
	const s = String(v ?? '').trim();
	return s ? s.slice(0, 12) : null;
}

export function parseAge(v) {
	if (v === null || v === undefined || v === '') return null;
	const n = Math.trunc(Number(v));
	if (!Number.isFinite(n) || n < 0 || n > 120) return null;
	return n;
}

function normalizeItem(item, index) {
	if (item == null) {
		return {
			title: `Case ${index + 1}`,
			abstract: '',
			similarity: undefined,
			source: 'Asclevor case record',
			url: '',
			pubmedUrl: '',
			pmid: '',
			patientId: '',
			ageYears: undefined,
			gender: null,
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
			pubmedUrl: '',
			pmid: '',
			patientId: '',
			ageYears: undefined,
			gender: null,
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

	const pubmedUrl =
		String(first(obj, PUBMED_URL_KEYS) ?? '') ||
		(pmid ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` : '');
	// Prefer the full-text record (PMC) for the primary link; fall back to PubMed.
	const url = String(first(obj, URL_KEYS) ?? '') || pubmedUrl;

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
	const ageYears = asNumber(first(obj, AGE_KEYS));
	const gender = normalizeItemGender(first(obj, GENDER_KEYS));

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
		pubmedUrl,
		pmid,
		patientId,
		ageYears: ageYears !== undefined ? Math.round(ageYears) : undefined,
		gender,
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
	// Attach the stable position from the upstream payload — used to build
	// unique keys (the same article can yield several patients sharing a PMID).
	return list.slice(0, limit).map((item, i) => ({ ...normalizeItem(item, i), index: i }));
}

function upstreamError(data, status) {
	if (typeof data?.error === 'string') return data.error;
	if (typeof data?.message === 'string') return data.message;
	if (typeof data?.detail === 'string') return data.detail;
	if (Array.isArray(data?.detail)) {
		const msgs = data.detail
			.map((d) => (typeof d?.msg === 'string' ? d.msg.replace(/^Value error,?\s*/i, '') : null))
			.filter(Boolean);
		if (msgs.length) return msgs.join(' · ');
	}
	return `api.asclevor.com responded with ${status}.`;
}

export function buildRequestBody({ query, k, gender, age_min, age_max }) {
	let n = Number(k);
	if (!Number.isFinite(n)) n = DEFAULT_K;
	n = Math.min(Math.max(Math.trunc(n), 1), MAX_K);
	const g = normalizeGender(gender);
	const ageMin = parseAge(age_min);
	const ageMax = parseAge(age_max);

	const body = {
		query: typeof query === 'string' ? query.trim() : '',
		k: n,
		mode: MODE,
		include_text: INCLUDE_TEXT,
		text_max_chars: TEXT_MAX_CHARS
	};
	if (g) body.gender = g;
	if (ageMin != null) body.age_min = ageMin;
	if (ageMax != null) body.age_max = ageMax;
	return body;
}

export async function searchCases(params) {
	const body = buildRequestBody(params);
	if (!body.query) throw new Error('A case description ("query") is required.');
	if (body.age_min != null && body.age_max != null && body.age_min > body.age_max)
		throw new Error('"age_min" must be less than or equal to "age_max".');

	const started = performance.now();
	let res;
	try {
		res = await fetch(ENDPOINT, {
			method: 'POST',
			headers: { 'content-type': 'application/json', accept: 'application/json' },
			body: JSON.stringify(body),
			signal: AbortSignal.timeout(TIMEOUT_MS)
		});
	} catch (err) {
		const timedOut = err?.name === 'TimeoutError' || err?.cause?.name === 'TimeoutError';
		throw new Error(
			timedOut
				? 'The search timed out after 15 s.'
				: 'Could not reach api.asclevor.com. Check your connection and try again.'
		);
	}

	const measured = Math.round(performance.now() - started);
	let data = null;
	try {
		data = await res.json();
	} catch {
		// Non-JSON upstream response — handled below.
	}
	if (!res.ok) throw new Error(upstreamError(data, res.status));
	if (data == null || typeof data !== 'object')
		throw new Error('api.asclevor.com returned a non-JSON response.');

	const embedMs = asNumber(data.embed_ms);
	const searchMs = asNumber(data.search_ms);

	return {
		query: body.query,
		k: body.k,
		modeUsed: typeof data.mode_used === 'string' ? data.mode_used : null,
		nTotal: asNumber(data.n_total) ?? null,
		filters: {
			gender: body.gender ?? null,
			ageMin: body.age_min ?? null,
			ageMax: body.age_max ?? null
		},
		timings: {
			embedMs: embedMs !== undefined ? Math.round(embedMs) : null,
			searchMs: searchMs !== undefined ? Math.round(searchMs) : null,
			totalMs:
				embedMs !== undefined && searchMs !== undefined ? Math.round(embedMs + searchMs) : measured
		},
		request: body,
		raw: data,
		results: normalizeResults(data, body.k)
	};
}
