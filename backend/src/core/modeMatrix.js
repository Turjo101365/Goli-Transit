// Pure mode-condition matrix. No DB access, no I/O. Rules from docs/PROPOSAL.md
// section 4 plus the metro service-window rules (§4, "Service-window rules").

export const MODES = ['walk', 'metro', 'bus', 'rickshaw', 'bike', 'cng'];
export const CONDITIONS = ['clear', 'jam', 'rain'];

const METRO_LATE_CLOSE_HOUR = 20;
const METRO_LATE_CLOSE_MINUTE = 50;
const METRO_FRIDAY_OPEN_HOUR = 15;
const METRO_FRIDAY_OPEN_MINUTE = 30;
const FRIDAY_WEEKDAY_INDEX = 5; // Intl weekday index: Sun=0 .. Sat=6

const MATRIX = {
	walk: {
		clear: { state: 0, fareMultiplier: 1, reason: { bn: 'স্বাভাবিক হাঁটার পরিবেশ', en: 'Normal walking conditions' } },
		jam: { state: 0, fareMultiplier: 1, reason: { bn: 'যানজট হাঁটায় প্রভাব ফেলে না', en: 'Traffic jams do not affect walking' } },
		rain: { state: 1, fareMultiplier: 1, reason: { bn: 'রাস্তায় জলাবদ্ধতা হতে পারে', en: 'Streets may be waterlogged' } }
	},
	metro: {
		clear: { state: 0, fareMultiplier: 1, reason: { bn: 'উড়াল লাইন, রাস্তার অবস্থার প্রভাব নেই', en: 'Elevated track, unaffected by road conditions' } },
		jam: { state: 0, fareMultiplier: 1, reason: { bn: 'উড়াল লাইন, যানজটের প্রভাব নেই', en: 'Elevated track, unaffected by traffic jams' } },
		rain: { state: 0, fareMultiplier: 1, reason: { bn: 'উড়াল লাইন, বৃষ্টির প্রভাব নেই', en: 'Elevated track, unaffected by rain' } }
	},
	bus: {
		clear: { state: 0, fareMultiplier: 1, reason: { bn: 'স্বাভাবিক সার্ভিস', en: 'Normal service' } },
		jam: { state: 1, fareMultiplier: 1, reason: { bn: 'অন্যান্য গাড়ির মতো একই যানজটে আটকে থাকে', en: 'Stuck in the same traffic as other vehicles' } },
		rain: { state: 1, fareMultiplier: 1, reason: { bn: 'বৃষ্টিতে ধীরগতি ও বেশি ভিড়', en: 'Slower and more crowded in rain' } }
	},
	rickshaw: {
		clear: { state: 0, fareMultiplier: 1, reason: { bn: 'স্বাভাবিক সার্ভিস', en: 'Normal service' } },
		jam: { state: 0, fareMultiplier: 1, reason: { bn: 'গলি দিয়ে যানজট এড়াতে পারে', en: 'Can use alleys to bypass traffic' } },
		rain: { state: 1, fareMultiplier: 2.2, reason: { bn: 'ভাড়া প্রায় দ্বিগুণ, কিছু গলি পানিতে বন্ধ', en: 'Fare roughly doubles; some lanes blocked by water' } }
	},
	bike: {
		clear: { state: 0, fareMultiplier: 1, reason: { bn: 'স্বাভাবিক সার্ভিস', en: 'Normal service' } },
		jam: { state: 0, fareMultiplier: 1, reason: { bn: 'যানজটের মধ্যে দিয়ে চলতে পারে', en: 'Can weave through traffic' } },
		rain: { state: 2, fareMultiplier: 1, reason: { bn: 'বৃষ্টিতে রাইডাররা অফলাইনে চলে যায়', en: 'Riders go offline in the rain' } }
	},
	cng: {
		clear: { state: 0, fareMultiplier: 1, reason: { bn: 'স্বাভাবিক সার্ভিস', en: 'Normal service' } },
		jam: { state: 1, fareMultiplier: 1, reason: { bn: 'অন্যান্য গাড়ির মতো একই যানজটে আটকে থাকে', en: 'Stuck in the same traffic as other vehicles' } },
		rain: { state: 1, fareMultiplier: 2.5, reason: { bn: 'বৃষ্টিতে সংখ্যায় কম, ভাড়া প্রায় ২.৫ গুণ', en: 'Scarce in rain, fare roughly 2.5x' } }
	}
};

function dhakaParts(timestamp) {
	const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
	const formatter = new Intl.DateTimeFormat('en-US', {
		timeZone: 'Asia/Dhaka',
		weekday: 'short',
		hour: 'numeric',
		minute: 'numeric',
		hourCycle: 'h23'
	});

	const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
	const weekdayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);

	return {
		weekdayIndex,
		hour: Number(parts.hour),
		minute: Number(parts.minute)
	};
}

function metroServiceWindowOverride(timestamp) {
	const { weekdayIndex, hour, minute } = dhakaParts(timestamp);
	const minutesSinceMidnight = hour * 60 + minute;

	const closesLate = minutesSinceMidnight >= METRO_LATE_CLOSE_HOUR * 60 + METRO_LATE_CLOSE_MINUTE;
	if (closesLate) {
		return {
			state: 2,
			fareMultiplier: 1,
			reason: { bn: 'কাউন্টার বন্ধ (রাত ৮:৫০ এর পর)', en: 'Ticket counters closed (after 8:50 PM)' }
		};
	}

	const isFridayBeforeOpening =
		weekdayIndex === FRIDAY_WEEKDAY_INDEX &&
		minutesSinceMidnight < METRO_FRIDAY_OPEN_HOUR * 60 + METRO_FRIDAY_OPEN_MINUTE;
	if (isFridayBeforeOpening) {
		return {
			state: 2,
			fareMultiplier: 1,
			reason: { bn: 'শুক্রবার বিকেল ৩:৩০ এর আগে টিকিট বিক্রি শুরু হয় না', en: "Friday ticket sales don't start until 3:30 PM" }
		};
	}

	return null;
}

export function getModeState(mode, condition, timestamp) {
	const modeRow = MATRIX[mode];
	if (!modeRow) {
		throw new Error(`Unknown mode: ${mode}`);
	}

	const base = modeRow[condition];
	if (!base) {
		throw new Error(`Unknown condition: ${condition}`);
	}

	if (mode === 'metro') {
		const override = metroServiceWindowOverride(timestamp);
		if (override) {
			return override;
		}
	}

	return base;
}
