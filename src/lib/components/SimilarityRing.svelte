<script>
	let { pct = 0, raw = null, size = 36 } = $props();

	const R = $derived(size / 2 - 3);
	const C = $derived(2 * Math.PI * R);
	const clamped = $derived(Math.max(0, Math.min(100, pct)));
	const band = $derived(clamped >= 75 ? '#059669' : clamped >= 55 ? '#2563EB' : '#D97706');
	const dash = $derived(C * (1 - clamped / 100));
	const fontSize = $derived(size <= 38 ? 10.5 : 12.5);
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 {size} {size}"
	role="img"
	aria-label="Similarity {clamped}%{raw != null ? ` (${Number(raw).toFixed(2)})` : ''}"
>
	<circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="#E2E8F0" stroke-width="3.5" />
	<circle
		cx={size / 2}
		cy={size / 2}
		r={R}
		fill="none"
		stroke={band}
		stroke-width="3.5"
		stroke-linecap="round"
		stroke-dasharray={C}
		stroke-dashoffset={dash}
		transform="rotate(-90 {size / 2} {size / 2})"
	/>
	<text
		x={size / 2}
		y={size / 2 + 0.5}
		text-anchor="middle"
		dominant-baseline="central"
		font-size={fontSize}
		font-weight="700"
		fill="#0F172A"
		style="font-family: var(--font-sans); font-variant-numeric: tabular-nums; letter-spacing: -0.02em;"
	>
		{clamped}<tspan font-size={fontSize * 0.66} font-weight="600" fill="#64748B">%</tspan>
	</text>
</svg>
