// Pure helpers for the clinical UI — demographics, terminology, abstract
// sectioning, citations, and JSON pretty-printing. No Svelte imports.

/* ---------------------------------- meta ---------------------------------- */

const SOURCE_NAMES = [
	[/pubmed\.ncbi\.nlm\.nih\.gov/i, 'PubMed'],
	[/pmc\.ncbi\.nlm\.nih\.gov/i, 'PubMed Central'],
	[/ncbi\.nlm\.nih\.gov/i, 'NCBI'],
	[/who\.int/i, 'WHO'],
	[/cdc\.gov/i, 'CDC'],
	[/bmj\.com/i, 'BMJ'],
	[/nejm\.org/i, 'NEJM'],
	[/thelancet\.com/i, 'The Lancet'],
	[/jamanetwork\.com/i, 'JAMA Network'],
	[/nature\.com/i, 'Nature'],
	[/sciencedirect\.com/i, 'ScienceDirect'],
	[/link\.springer\.com|springer/i, 'Springer'],
	[/onlinelibrary\.wiley\.com|wiley/i, 'Wiley'],
	[/oup\.com/i, 'Oxford Academic'],
	[/ahajournals\.org/i, 'AHA Journals']
];

export function friendlySource(source) {
	const s = String(source ?? '').trim();
	if (!s) return 'Indexed record';
	for (const [re, name] of SOURCE_NAMES) if (re.test(s)) return name;
	return s.replace(/^www\./, '');
}

export function extractYear(r) {
	if (Array.isArray(r?.meta)) {
		for (const m of r.meta) {
			if (/(?:^|[_\s])(?:pub|publication|publish|journal|release|date|year)/i.test(m.k)) {
				const y = String(m.v).match(/\b(19|20)\d{2}\b/);
				if (y) return y[0];
			}
		}
	}
	const t = `${r?.title ?? ''}`.match(/\b(19|20)\d{2}\b/);
	return t ? t[0] : null;
}

export function extractDemographics(r) {
	const out = {};
	// Structured fields first (v2 API returns age_years / gender per case).
	const structuredAge = Number(r?.ageYears ?? r?.age_years);
	if (Number.isFinite(structuredAge) && structuredAge >= 0 && structuredAge < 130)
		out.age = `${Math.round(structuredAge)} y`;
	const g = String(r?.gender ?? '')
		.trim()
		.toLowerCase();
	if (g)
		out.sex =
			g === 'f' || g === 'female' || g === 'woman'
				? 'Female'
				: g === 'm' || g === 'male' || g === 'man'
					? 'Male'
					: String(r.gender).slice(0, 12);
	if (Array.isArray(r?.meta)) {
		for (const m of r.meta) {
			const k = m.k.toLowerCase();
			if (!out.age && (k === 'age' || k.includes('age'))) out.age = String(m.v).slice(0, 12);
			if (!out.sex && (k === 'sex' || k === 'gender')) out.sex = String(m.v).slice(0, 12);
		}
	}
	const text = `${r?.title ?? ''} ${r?.abstract ?? ''}`.slice(0, 700);
	if (!out.age) {
		const y =
			text.match(/(\d{1,3})[\s-]*(?:year|yr|y)[\s-]*old/i) ??
			text.match(/\baged?\s+(\d{1,3})\b/i) ??
			text.match(/(\d{1,3})\s*(?:yo|y\/o|y\.o\.)/i);
		if (y) {
			const n = parseInt(y[1], 10);
			if (n > 0 && n < 130) out.age = `${n} y`;
		} else {
			const mo = text.match(/(\d{1,2})[\s-]*(?:month|mo)[\s-]*old/i);
			if (mo) out.age = `${mo[1]} mo`;
		}
	}
	if (!out.sex) {
		const s = text.match(/\b(female|male|woman|man|girl|boy)\b/i);
		if (s)
			out.sex = {
				female: 'Female',
				male: 'Male',
				woman: 'Female',
				man: 'Male',
				girl: 'Female',
				boy: 'Male'
			}[s[1].toLowerCase()];
	}
	return out;
}

export function extractLeftoverMeta(r) {
	if (!Array.isArray(r?.meta)) return [];
	return r.meta.filter((m) => {
		const k = m.k.toLowerCase();
		if (/age|sex|gender|date|year|pub/.test(k)) return false;
		return true;
	});
}

/* -------------------------------- specialty ------------------------------- */

const SPECIALTY_KEYWORDS = {
	Cardiology: [
		'chest pain',
		'troponin',
		'myocardial',
		'infarct',
		'cardiac',
		'arrhythmia',
		'atrial fibrillat',
		'heart failure',
		'st elevation',
		'angina',
		'ecg',
		'echocardiograph',
		'coronary',
		'tachycardi',
		'bradycardi'
	],
	Pulmonology: [
		'ards',
		'covid',
		'respiratory',
		'desaturation',
		'pneumonia',
		'pulmonary',
		'oxygen',
		'ventilat',
		'hypox',
		'copd',
		'asthma',
		'lung',
		'bronch',
		'ecmo',
		'prone position',
		'dyspnea',
		'shortness of breath'
	],
	Neurology: [
		'stroke',
		'seizure',
		'neurolog',
		'weakness',
		'aphasia',
		'speech',
		'hemiplegia',
		'hemiparesis',
		'encephalitis',
		'epilep',
		'coma',
		'confusion',
		'demyelinating',
		'parkinson',
		'migraine',
		'headache',
		'meningit',
		'numbness',
		'paresthesia'
	],
	'Infectious Disease': [
		'fever',
		'sepsis',
		'infection',
		'bacter',
		'meningit',
		'rash',
		'petechi',
		'antibiotic',
		'abscess',
		'fungal',
		'parasit',
		'viral',
		'septic'
	],
	Pediatrics: [
		'pediatric',
		'infant',
		'neonat',
		'child',
		'congenital',
		'adolescent',
		'month-old',
		'month old',
		'week-old',
		'week old'
	],
	Hematology: [
		'anemia',
		'anaemia',
		'thrombocytopen',
		'leukemia',
		'lymphoma',
		'coagul',
		'hemorrhag',
		'haemorrhag',
		'platelet',
		'transfusion',
		'petechi'
	],
	Nephrology: ['renal', 'kidney', 'dialysis', 'nephro', 'creatinine', 'hematuria', 'haematuria'],
	Endocrinology: [
		'diabet',
		'thyroid',
		'adrenal',
		'glucose',
		'ketoacidosis',
		'cushing',
		'addison',
		'hypoglyc',
		'hypercalc'
	],
	Gastroenterology: [
		'abdominal',
		'liver',
		'hepat',
		'gastric',
		'bowel',
		'pancreat',
		'cholecyst',
		'diarrhea',
		'diarrhoea',
		'vomit',
		'gastrointestin',
		'melena'
	],
	Oncology: [
		'carcinoma',
		'tumor',
		'tumour',
		'malignan',
		'metastas',
		'leukemia',
		'lymphoma',
		'chemotherap',
		'radiation therapy',
		'biopsy'
	]
};

export function classifySpecialty(r) {
	const text = `${r?.title ?? ''} ${r?.abstract ?? ''}`.slice(0, 800).toLowerCase();
	let best = null;
	let bestScore = 0;
	for (const [name, kws] of Object.entries(SPECIALTY_KEYWORDS)) {
		let score = 0;
		for (const kw of kws) {
			let i = text.indexOf(kw);
			while (i !== -1) {
				score++;
				i = text.indexOf(kw, i + kw.length);
			}
		}
		if (score > bestScore) {
			bestScore = score;
			best = name;
		}
	}
	return bestScore > 0 ? best : null;
}

/* ------------------------------- terminology ------------------------------ */

const TERM_LEXICON = [
	['ARDS', /\bards\b|\bacute respiratory distress\b/i],
	['COVID-19', /\bcovid[\s-]?19\b|\bsars[\s-]?cov[\s-]?2\b/i],
	['Hypoxemia', /\bhypox(?:em|a)/i],
	['Desaturation', /\bdesaturat/i],
	['Tachycardia', /\btachycardi/i],
	['Bradycardia', /\bbradycardi/i],
	['Fever', /\bfever\b|\bfebrile\b|\bpyrexia\b/i],
	['Petechiae', /\bpetechi/i],
	['Purpura', /\bpurpura/i],
	['Chest pain', /\bchest pain\b|\bretrosternal\b/i],
	['Troponin', /\btroponin/i],
	['Myocardial infarction', /\bmyocardial infarct|\bheart attack\b|\bstemi\b|\bnstemi\b/i],
	['Radiating pain', /\bradiat(?:ing|ed|es)\b/i],
	['Dyspnea', /\bdyspnea\b|\bshortness of breath\b|\bbreathless\b/i],
	['Cough', /\bcough/i],
	['Unilateral weakness', /\bunilateral weakness\b|\bhemiparesis\b|\bhemiplegia\b/i],
	['Slurred speech', /\bslurred speech\b|\bdysarthria\b/i],
	['Aphasia', /\baphasia/i],
	['Stroke', /\bstroke\b|\bcerebrovascular\b|\bcva\b/i],
	['Seizure', /\bseizure\b|\bconvuls/i],
	['Syncope', /\bsyncope\b|\bfaint(?:ed|ing)\b/i],
	['Meningitis', /\bmeningit/i],
	['Sepsis', /\bsepsis\b|\bseptic\b/i],
	['Pneumonia', /\bpneumon/i],
	['Mechanical ventilation', /\bmechanical ventilation\b|\bintubat/i],
	['ECMO', /\becmo\b|\bextracorporeal membrane\b/i],
	['Prone positioning', /\bprone position|\bproning\b/i],
	['Acute kidney injury', /\bacute kidney\b|\baki\b|\brenal failure\b/i],
	['Dialysis', /\bdialys|\bhemodialysis\b|\bhaemodialysis\b/i],
	['Anemia', /\banemia\b|\banaemia\b/i],
	['Thrombocytopenia', /\bthrombocytopen/i],
	['Leukocytosis', /\bleukocytosis\b|\bleucocytosis\b|\bleukopenia\b/i],
	['Diabetes mellitus', /\bdiabet/i],
	['Hypertension', /\bhypertension\b|\bhigh blood pressure\b/i],
	['Atrial fibrillation', /\batrial fibrillat/i],
	['Heart failure', /\bheart failure\b|\bcardiac failure\b/i],
	['COPD', /\bcopd\b|\bchronic obstructive pulmonary\b/i],
	['Asthma', /\basthma/i],
	['Corticosteroids', /\bcorticosteroid|\bprednisone\b|\bdexamethasone\b|\bmethylprednisolone\b/i],
	['Antibiotics', /\bantibiotic\b|\bantibiotics\b|cillin\b|mycin\b|floxacin\b|azole\b/i],
	['Anticoagulation', /\banticoagul|\bheparin\b|\bwarfarin\b|\bdabigatran\b|\brivaroxaban\b/i],
	['ICU admission', /\bicu\b|\bintensive care\b/i],
	['Physical therapy', /\bphysical therapy\b|\bphysiotherapy\b|\brehabilitat/i],
	['Abdominal pain', /\babdominal pain\b|\bepigastric\b/i],
	['Vomiting', /\bvomit|\bemesis\b/i],
	['Diarrhea', /\bdiarrh/i],
	['Rash', /\brash\b|\burticaria\b|\bmaculopapular\b/i],
	['Edema', /\bedema\b|\bswelling\b/i],
	['Confusion', /\bconfus|\baltered mental status\b|\bencephalopath/i],
	['Headache', /\bheadache\b|\bcephalalgia\b/i],
	['Nausea', /\bnausea\b/i],
	['Fatigue', /\bfatigue\b|\bmalaise\b|\blethargy\b/i],
	['Weight loss', /\bweight loss\b/i],
	['Pregnancy', /\bpregnan|\bpostpartum\b/i],
	['Neonate', /\bneonat|\bnewborn\b/i],
	['Trauma', /\btrauma\b|\bfracture\b|\bblunt\b/i],
	['Malignancy', /\bcarcinoma\b|\btumor\b|\btumour\b|\bmalignan|\bmetastas/i]
];

export function extractTerms(query) {
	const q = String(query ?? '');
	const found = [];
	if (!q.trim()) return found;
	const y = q.match(/(\d{1,3})[\s-]*(?:year|yr|y)[\s-]*old/i) ?? q.match(/\baged?\s+(\d{1,3})\b/i);
	if (y) found.push({ label: `${y[1]} y`, kind: 'demo' });
	const s = q.match(/\b(female|male|woman|man|girl|boy)\b/i);
	if (s)
		found.push({
			label: {
				female: 'Female',
				male: 'Male',
				woman: 'Female',
				man: 'Male',
				girl: 'Female',
				boy: 'Male'
			}[s[1].toLowerCase()],
			kind: 'demo'
		});
	const seen = new Set(found.map((t) => t.label.toLowerCase()));
	for (const [label, re] of TERM_LEXICON) {
		const key = label.toLowerCase();
		if (seen.has(key)) continue;
		if (re.test(q)) {
			found.push({ label, kind: 'term' });
			seen.add(key);
		}
		if (found.length >= 14) break;
	}
	return found;
}

/* --------------------------- abstract sectioning -------------------------- */

const LABEL_MAP = [
	[
		/introduction|background|case presentation|presentation|observations?|history|patient history|importance|methods?/i,
		'presentation'
	],
	[
		/clinical course|hospital course|treatment|management|interventions?|therapy|therapies|procedures?/i,
		'interventions'
	],
	[/outcomes?|follow[\s-]?up|conclusions?|results?|prognosis|summary|take[\s-]?aways?/i, 'outcome']
];

function mapLabel(label) {
	for (const [re, bucket] of LABEL_MAP) if (re.test(label)) return bucket;
	return null;
}

const PRES_KW = [
	'present',
	'complain',
	'admit',
	'history',
	'symptom',
	'diagnos',
	'onset',
	'referred',
	'transfer',
	'examination',
	'exam',
	'found',
	'reveal',
	'report',
	'denied',
	'fever',
	'pain',
	'rash',
	'weakness',
	'dyspnea',
	'cough',
	'vomit',
	'diarrhea',
	'confusion',
	'syncope',
	'numbness',
	'swelling',
	'fatigue',
	'malaise',
	'suspect',
	'evaluate',
	'workup',
	'work-up',
	'laborator',
	'imaging',
	'radiograph',
	'serum',
	'level',
	'acute',
	'chronic',
	'year-old',
	'year old',
	'aged',
	'woman',
	'female',
	'male',
	'girl',
	'boy'
];
const INTV_KW = [
	'treat',
	'therapy',
	'therapeut',
	'administer',
	'infus',
	'transfus',
	'dialy',
	'catheter',
	'stent',
	'surger',
	'surgical',
	'resection',
	'biops',
	'intubat',
	'ventilat',
	'oxygen',
	'supplement',
	'corticosteroid',
	'prednisone',
	'steroid',
	'heparin',
	'warfarin',
	'aspirin',
	'antibiot',
	'anticoagul',
	'antihypertens',
	'antivir',
	'analgesi',
	'opioid',
	'intravenous',
	'subcutane',
	'initiat',
	'started',
	'received',
	'underwent',
	'performed',
	'procedur',
	'operat',
	'ecmo',
	'prone',
	'physiotherap',
	'physical therapy',
	'rehabilitat',
	'monitor',
	'supportive',
	'dose',
	'daily'
];
const OUT_KW = [
	'outcome',
	'recover',
	'improv',
	'resolv',
	'discharg',
	'follow-up',
	'follow up',
	'followup',
	'conclusion',
	'died',
	'death',
	'expired',
	'mortal',
	'surviv',
	'remission',
	'stable',
	'normaliz',
	'return',
	'regain',
	'prognosis',
	'subsequent',
	'thereafter',
	'later',
	'at discharge',
	'on follow'
];
const SHORT_RE = {
	presentation: /\b(?:ct|mri|ecg|eeg|cxr)\b/gi,
	interventions: /\b(?:mg|iv|icu|po|ng|bid|tid)\b/gi,
	outcome: /\b(?:died|well)\b/gi
};

function splitSentences(text) {
	const guarded = text.replace(
		/\b(e\.g|i\.e|etc|vs|approx|Dr|Mr|Mrs|Ms|Prof|Fig|No|Vol|St)\.\s/g,
		(m) => m.replace(/\s/g, '\u0001')
	);
	const rough = guarded.split(/(?<=[.!?])\s+/);
	const sentences = [];
	for (const s of rough) {
		const t = s.replace(/\u0001/g, ' ').trim();
		if (!t) continue;
		if (sentences.length && (t.length < 15 || /^[a-z(]/.test(t)))
			sentences[sentences.length - 1] += ' ' + t;
		else sentences.push(t);
	}
	return sentences;
}

function countMatches(text, kws, re) {
	let n = 0;
	const low = text.toLowerCase();
	for (const kw of kws) {
		let i = low.indexOf(kw);
		while (i !== -1) {
			n++;
			i = low.indexOf(kw, i + kw.length);
		}
	}
	if (re) n += (text.match(re) ?? []).length;
	return n;
}

export function sectionAbstract(abstract) {
	const text = String(abstract ?? '').trim();
	if (!text) return null;

	// 1. Labeled sections (e.g. "INTRODUCTION: ... OUTCOME: ...").
	const labelRe =
		/\b(introduction|background|case presentation|presentation|observations?|history|patient history|importance|methods?|clinical course|hospital course|treatment|management|interventions?|therapy|therapies|procedures?|outcomes?|follow[\s-]?up|conclusions?|results?|prognosis|summary|take[\s-]?aways?)\s*:/gi;
	const buckets = { presentation: [], interventions: [], outcome: [] };
	const marks = [];
	let m;
	while ((m = labelRe.exec(text)))
		marks.push({ index: m.index, label: m[1], end: labelRe.lastIndex });
	if (marks.length >= 2) {
		for (let i = 0; i < marks.length; i++) {
			const bucket = mapLabel(marks[i].label);
			const chunk = text
				.slice(marks[i].end, i + 1 < marks.length ? marks[i + 1].index : undefined)
				.trim();
			if (bucket && chunk) buckets[bucket].push(chunk.replace(/\s+/g, ' '));
		}
		const filled = Object.values(buckets).filter((a) => a.length).length;
		if (filled >= 2) {
			return {
				presentation: buckets.presentation.join(' '),
				interventions: buckets.interventions.join(' '),
				outcome: buckets.outcome.join(' ')
			};
		}
	}

	// 2. Keyword-scored sentence assignment with positional fallback.
	const sentences = splitSentences(text);
	const out = { presentation: [], interventions: [], outcome: [] };
	sentences.forEach((s, i) => {
		const pos = i / Math.max(1, sentences.length - 1);
		const pres = countMatches(s, PRES_KW, SHORT_RE.presentation);
		const intv = countMatches(s, INTV_KW, SHORT_RE.interventions);
		const outc = countMatches(s, OUT_KW, SHORT_RE.outcome);
		const max = Math.max(pres, intv, outc);
		let bucket;
		if (max === 0) bucket = pos < 0.35 ? 'presentation' : pos < 0.72 ? 'interventions' : 'outcome';
		else if (pres === max) bucket = 'presentation';
		else if (intv === max) bucket = 'interventions';
		else bucket = 'outcome';
		out[bucket].push(s);
	});

	if (sentences.length === 1) {
		return { presentation: sentences[0], interventions: '', outcome: '' };
	}
	if (sentences.length === 2) {
		return {
			presentation: out.presentation.join(' ') || sentences[0],
			interventions: out.interventions.join(' '),
			outcome: out.outcome.join(' ') || sentences[sentences.length - 1]
		};
	}
	const joined = {
		presentation: out.presentation.join(' '),
		interventions: out.interventions.join(' '),
		outcome: out.outcome.join(' ')
	};
	// Fall back to positional thirds if keyword scoring starved a bucket.
	if (!joined.presentation || !joined.interventions || !joined.outcome) {
		const third = Math.max(1, Math.floor(sentences.length / 3));
		return {
			presentation: sentences.slice(0, third).join(' '),
			interventions:
				sentences.slice(third, third * 2).join(' ') || sentences.slice(third).join(' '),
			outcome: sentences.slice(third * 2).join(' ') || sentences[sentences.length - 1]
		};
	}
	return joined;
}

/* --------------------------------- citations ------------------------------ */

export function formatCitation(r, year) {
	const parts = [`${r.title}.`];
	parts.push(`${friendlySource(r.source)}${year ? ` ${year}` : ''}.`);
	if (r.pmid) parts.push(`PMID: ${r.pmid}.`);
	if (r.url) parts.push(`Available at: ${r.url}`);
	return parts.join(' ');
}

/* ------------------------------ JSON rendering ---------------------------- */

export function jsonToLines(json) {
	const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	return String(json)
		.split('\n')
		.map((line) => {
			let html = '';
			const re =
				/("(?:\\.|[^"\\])*")(\s*:)?|(-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b|\b(true|false|null)\b/g;
			let last = 0;
			let m;
			while ((m = re.exec(line))) {
				html += esc(line.slice(last, m.index));
				if (m[1] !== undefined) {
					html += m[2]
						? `<span class="json-key">${esc(m[1])}</span><span class="json-punc">${esc(m[2])}</span>`
						: `<span class="json-str">${esc(m[1])}</span>`;
				} else if (m[3] !== undefined) {
					html += `<span class="json-num">${esc(m[3])}</span>`;
				} else {
					html += `<span class="json-lit">${esc(m[0])}</span>`;
				}
				last = re.lastIndex;
			}
			html += esc(line.slice(last));
			return html || '&nbsp;';
		});
}

/* --------------------------------- clipboard ------------------------------ */

export async function copyText(text) {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		try {
			const ta = document.createElement('textarea');
			ta.value = text;
			ta.style.position = 'fixed';
			ta.style.opacity = '0';
			document.body.appendChild(ta);
			ta.select();
			const ok = document.execCommand('copy');
			ta.remove();
			return ok;
		} catch {
			return false;
		}
	}
}
