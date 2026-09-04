# Asclevor — Product Context

## What this is

Asclevor is a clinical case similarity search. A physician or researcher
describes a patient presentation in plain language; the engine returns the
nearest published case records (PubMed-indexed case reports), ranked by
semantic similarity (0–1), served by `POST api.asclevor.com/search`.

## Audience & scene

Physicians and clinical researchers at desks in hospitals and labs, plus
developers integrating the medical knowledge API. High trust, high density,
zero tolerance for decoration. Used to find precedent cases during diagnostic
reasoning and literature review.

## Surfaces

- `/` — case search UI (this surface): query input, structured clinical result
  cards, dual clinical-context / developer-JSON side panel.
- `api.asclevor.com` — public search API v2 (`{query, k, mode, gender?,
  age_min?, age_max?, include_text, text_max_chars}` → results with
  `similarity`, `pmid`, `title`, `text`, `age_years`, `gender`, `pmc_url`,
  `pubmed_url`, `patient_uid`, plus `mode_used` and `n_total`).
- `asclevor.com/docs` — documentation.

## Core function (truth, not aspiration)

- Query is free-text case description; k 3/5/10 (default 5); optional cohort
  filters — sex (F/M) and age range (`age_min`/`age_max`, 0–120) — applied
  server-side on the next search; results carry title, case text, similarity
  0–1, PMC/PubMed URLs, PMID, patient UID, structured age/gender.
- The browser calls `api.asclevor.com/search` directly from
  `src/lib/utils/search.js` (open CORS, no server proxy); validation,
  request building, and response normalization live in that module.
- URL params `?q=&k=&gender=&amin=&amax=` restore a search (legacy `limit=`
  still accepted); `/` focuses the search field.
- Latency timings: `embed_ms`/`search_ms` when the upstream provides them;
  otherwise a measured round-trip total.
- Demographics arrive structured (`age_years`, `gender`); publication year
  and specialty are _extracted_ from record text when present — never
  invented.

## Brand commitments

- Clinical utility over consumer styling: calm slate/white palette
  (#0F172A/#1E293B structure, #E2E8F0 borders, #2563EB interactive accent,
  #059669 similarity scores), Inter/system sans, no display typography.
- Enterprise-grade restraint: no hero marketing, no oversized footer type,
  low-profile footer with Terms/Privacy/API status/Docs.
- Similarity is semantic distance, not a clinical recommendation.
