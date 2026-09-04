<script>
	// Cohort filters for the v2 search API: gender + age range.
	// Applied server-side on the next search (sex change re-runs immediately
	// when results are on screen; age applies on Enter / Search).
	let {
		gender = $bindable('any'),
		ageMin = $bindable(''),
		ageMax = $bindable(''),
		onsubmit,
		ongenderchange
	} = $props();

	const digits = (v) =>
		String(v ?? '')
			.replace(/\D/g, '')
			.slice(0, 3);

	function onGenderChange(e) {
		gender = e.currentTarget.value;
		ongenderchange?.();
	}

	function onKeydown(e) {
		if (e.key === 'Enter') {
			e.preventDefault();
			onsubmit?.();
		}
	}

	const inputClass =
		'h-9 w-12 rounded-md border border-slate-300 bg-white text-center text-xs text-slate-700 tabular-nums transition placeholder:font-sans placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none';
</script>

<div class="flex items-center gap-2.5">
	<div class="flex items-center gap-1.5">
		<label for="cohort-sex" class="text-[11px] font-medium text-slate-500">Sex</label>
		<div class="relative">
			<select
				id="cohort-sex"
				value={gender}
				onchange={onGenderChange}
				class="h-9 appearance-none rounded-md border border-slate-300 bg-white pr-7 pl-2.5 text-xs text-slate-700 transition hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none"
			>
				<option value="any">Any</option>
				<option value="F">Female</option>
				<option value="M">Male</option>
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
	<div class="flex items-center gap-1.5" role="group" aria-label="Age range">
		<span class="text-[11px] font-medium text-slate-500">Age</span>
		<div class="flex items-center gap-1">
			<input
				type="text"
				inputmode="numeric"
				value={ageMin}
				oninput={(e) => (ageMin = digits(e.currentTarget.value))}
				{onKeydown}
				placeholder="min"
				aria-label="Minimum age in years"
				class={inputClass}
			/>
			<span class="text-xs text-slate-400" aria-hidden="true">–</span>
			<input
				type="text"
				inputmode="numeric"
				value={ageMax}
				oninput={(e) => (ageMax = digits(e.currentTarget.value))}
				{onKeydown}
				placeholder="max"
				aria-label="Maximum age in years"
				class={inputClass}
			/>
		</div>
	</div>
</div>
