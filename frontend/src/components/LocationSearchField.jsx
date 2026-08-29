import { useEffect, useRef, useState } from 'react';

const NOMINATIM_DEBOUNCE_MS = 600;

function t(bn, en, lang) {
	return lang === 'en' ? en : bn;
}

// Same station-first / Nominatim-fallback search used by FurutMap.jsx,
// pulled out standalone so Live and Belt can each pick a real point too
// instead of hardcoding one. When restrictToStations is set (Live's
// destination — POST /journey/evaluate needs a real destinationNodeId, not
// arbitrary coordinates) Nominatim is never queried, only the 16 real MRT-6
// stations passed in via `stations`.
export function LocationSearchField({ label, placeholder, stations = [], restrictToStations = false, value, onSelect, onFocus, lang }) {
	const [query, setQuery] = useState(value?.label || '');
	const [open, setOpen] = useState(false);
	const [results, setResults] = useState([]);
	const [loading, setLoading] = useState(false);
	const debounceRef = useRef(null);

	useEffect(() => {
		if (!open) {
			setQuery(value?.label || '');
		}
	}, [value, open]);

	useEffect(() => {
		window.clearTimeout(debounceRef.current);

		const trimmed = query.trim();
		if (!open || trimmed.length < 2) {
			setResults([]);
			setLoading(false);
			return undefined;
		}

		const localMatches = stations.filter(
			(station) => station.nameBn.includes(trimmed) || station.nameEn.toLowerCase().includes(trimmed.toLowerCase())
		);

		if (localMatches.length > 0 || restrictToStations) {
			setResults(localMatches.map((station) => ({ source: 'local', ...station })));
			setLoading(false);
			return undefined;
		}

		setLoading(true);
		debounceRef.current = window.setTimeout(async () => {
			try {
				const url = new URL('https://nominatim.openstreetmap.org/search');
				url.searchParams.set('q', trimmed);
				url.searchParams.set('format', 'jsonv2');
				url.searchParams.set('viewbox', '90.30,23.92,90.50,23.66');
				url.searchParams.set('bounded', '1');
				url.searchParams.set('limit', '5');

				const response = await fetch(url.toString());
				const data = response.ok ? await response.json() : [];
				setResults(
					(Array.isArray(data) ? data : []).map((result) => ({
						source: 'nominatim',
						id: `nom_${result.place_id}`,
						nameBn: result.display_name,
						nameEn: result.display_name,
						lat: Number(result.lat),
						lng: Number(result.lon)
					}))
				);
			} catch {
				setResults([]);
			} finally {
				setLoading(false);
			}
		}, NOMINATIM_DEBOUNCE_MS);

		return () => window.clearTimeout(debounceRef.current);
	}, [query, open, stations, restrictToStations]);

	function handlePick(result) {
		const pickedLabel = t(result.nameBn, result.nameEn, lang);
		onSelect({
			lat: result.lat,
			lng: result.lng,
			label: pickedLabel,
			nodeId: result.source === 'local' ? result.id : undefined
		});
		setQuery(pickedLabel);
		setOpen(false);
	}

	return (
		<div style={{ position: 'relative' }}>
			{label ? <span className="t-label" style={{ display: 'block', marginBottom: 6, color: 'var(--cream)', fontSize: 12 }}>{label}</span> : null}
			<input
				type="text"
				value={query}
				onFocus={() => {
					setOpen(true);
					setQuery('');
					onFocus?.();
				}}
				onChange={(event) => setQuery(event.target.value)}
				placeholder={placeholder}
				style={{
					width: '100%',
					background: 'var(--ground2)',
					border: '1px solid var(--line)',
					borderRadius: 6,
					padding: '10px 14px',
					font: 'inherit',
					fontSize: 14,
					color: 'var(--cream)',
					boxShadow: 'var(--card-shadow)',
					outline: 'none'
				}}
			/>

			{open ? (
				<div
					className="panel"
					style={{
						position: 'absolute',
						zIndex: 30,
						top: '100%',
						left: 0,
						right: 0,
						marginTop: 6,
						maxHeight: 240,
						overflowY: 'auto',
						padding: '8px 12px',
						boxShadow: 'var(--card-shadow-hover)'
					}}
				>
					{loading ? <p className="t-body">…</p> : null}
					{!loading && query.trim().length >= 2 && results.length === 0 ? (
						<p className="t-body" style={{ color: 'var(--c70)' }}>{t('কিছু পাওয়া যায়নি', 'No matches', lang)}</p>
					) : null}
					{results.map((result) => (
						<button
							key={result.id}
							type="button"
							onClick={() => handlePick(result)}
							className="rule-hair"
							style={{
								display: 'block',
								width: '100%',
								textAlign: 'left',
								background: 'transparent',
								border: 'none',
								padding: '8px 0',
								cursor: 'pointer',
								color: 'var(--cream)'
							}}
						>
							<span className="t-body">{t(result.nameBn, result.nameEn, lang)}</span>
						</button>
					))}
					<button
						type="button"
						onClick={() => setOpen(false)}
						className="t-label"
						style={{ display: 'block', width: '100%', textAlign: 'right', background: 'transparent', border: 'none', padding: '6px 0 2px', cursor: 'pointer', color: 'var(--c70)' }}
					>
						{t('বন্ধ করুন', 'Close', lang)}
					</button>
				</div>
			) : null}
		</div>
	);
}
