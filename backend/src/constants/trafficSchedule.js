// Real, structural Dhaka traffic pattern, provided directly by the project
// owner (2026-08-29) — school/office shift changes and Friday Jummah, not
// live sensor data. Treated the same way as the metro service-window rules
// in core/modeMatrix.js: a known schedule, not an invented heuristic.
// Times are minutes-since-midnight, Asia/Dhaka. Bangladesh's week is
// Sun-Thu working days, Fri-Sat weekend; schools follow the same pattern,
// so Friday has only the Jummah peak and Saturday has none.

export const WEEKDAY_PEAK_WINDOWS = [
	{
		id: 'morning-rush',
		start: 7 * 60,
		end: 8 * 60 + 30,
		labelBn: 'সকালের ভিড়',
		labelEn: 'Morning rush',
		reasonBn: 'সকালের শিফটের স্কুল আর অফিসের প্রথম শিফট একসাথে রাস্তায় নামে',
		reasonEn: 'Morning-shift students and early-shift office workers hit the roads together'
	},
	{
		id: 'midday-bottleneck',
		start: 11 * 60 + 30,
		end: 13 * 60 + 30,
		labelBn: 'দুপুরের জট',
		labelEn: 'Midday bottleneck',
		reasonBn: 'সকালের স্কুল শিফট শেষ হয়, বিকেলের শিফট শুরু হয়, আর অফিসের লাঞ্চ আওয়ারও মিশে যায়',
		reasonEn: 'Morning school shift ends, afternoon shift begins, and office lunch-hour traffic mixes in'
	},
	{
		id: 'evening-gridlock',
		start: 16 * 60,
		end: 18 * 60 + 30,
		labelBn: 'সন্ধ্যার জ্যাম',
		labelEn: 'Evening gridlock',
		reasonBn: 'বিকেলের স্কুল শিফট আর অফিস-সরকারি প্রতিষ্ঠান একই সময়ে ছুটি হয়',
		reasonEn: 'Afternoon school shift dismisses exactly as corporate and government offices close'
	}
];

export const FRIDAY_PEAK_WINDOW = {
	id: 'jummah',
	start: 12 * 60 + 30,
	end: 14 * 60,
	labelBn: 'জুম্মার নামাজ',
	labelEn: 'Friday Jummah',
	reasonBn: 'মসজিদ উপচে পড়ায় মুসল্লিরা রাস্তায় নামাজ পড়েন, গাড়ি চলাচল থেমে যায়',
	reasonEn: 'Mosques overflow and worshippers spill onto the main roads, halting traffic'
};

// Localities where this pattern is most severe — a high concentration of
// major schools/colleges/international-school drop-offs without centralised
// busing, often on narrow residential roads.
export const HIGH_ALERT_ZONES = [
	{ bn: 'ধানমন্ডি ও আসাদ গেট', en: 'Dhanmondi & Asad Gate' },
	{ bn: 'বেইলি রোড ও কাকরাইল', en: 'Bailey Road & Kakrail' },
	{ bn: 'গুলশান ও বনানী', en: 'Gulshan & Banani' },
	{ bn: 'মিরপুর ১০ ও ১১', en: 'Mirpur 10 & 11' }
];
