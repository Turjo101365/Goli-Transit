// Mode colour/label metadata shared by every screen — CLAUDE.md "Design
// law": mode colour is fixed app-wide, independent of a screen's area
// accent. Keys match backend MODES (backend/src/core/modeMatrix.js).
export const MODE_META = {
	walk: { colorVar: '--mode-walk', dash: '1 8', bn: 'হাঁটা', en: 'Walk' },
	metro: { colorVar: '--metro', dash: null, bn: 'মেট্রো', en: 'Metro' },
	bus: { colorVar: '--mode-bus', dash: '12 5', bn: 'বাস', en: 'Bus' },
	rickshaw: { colorVar: '--mode-rickshaw', dash: '11 7', bn: 'রিকশা', en: 'Rickshaw' },
	bike: { colorVar: '--mode-bike', dash: '3 3', bn: 'বাইক', en: 'Bike' },
	cng: { colorVar: '--mode-cng', dash: '6 4', bn: 'সিএনজি', en: 'CNG' }
};

export function modeLabel(mode, lang) {
	const meta = MODE_META[mode];
	return meta ? meta[lang] : mode;
}
