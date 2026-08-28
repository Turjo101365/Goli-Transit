// Pure mode-condition matrix. No DB access, no I/O. Rules from docs/PROPOSAL.md
// section 4 plus the metro service-window rules (§4, "Service-window rules").

import { WEEKDAY_PEAK_WINDOWS, FRIDAY_PEAK_WINDOW } from '../constants/trafficSchedule.js';

export const MODES = ['walk', 'metro', 'bus', 'rickshaw', 'bike', 'cng'];
export const CONDITIONS = ['clear', 'jam', 'rain'];

// Metro operating hours. Two independently-sourced closing checkpoints are
// kept distinct rather than one replacing the other (2026-08-29): 8:50 PM
// is when ticket counters stop selling; 9:00 PM is when the station closes
// to the general public; 10:00 PM is full closure, after which even a
// Rapid Pass / MRT Pass holder cannot enter. There is no "holds a pass"
// attribute anywhere in this app, so the 9-10 PM window is reported as
// degraded (not fully closed) with the exception named in the reason,
// rather than tracking who actually has one.
const METRO_MORNING_OPEN_HOUR = 6;
const METRO_MORNING_OPEN_MINUTE = 30;
const METRO_TICKET_COUNTER_CLOSE_HOUR = 20;
const METRO_TICKET_COUNTER_CLOSE_MINUTE = 50;
const METRO_PUBLIC_CLOSE_HOUR = 21;
const METRO_PUBLIC_CLOSE_MINUTE = 0;
const METRO_PASS_HOLDER_CLOSE_HOUR = 22;
const METRO_PASS_HOLDER_CLOSE_MINUTE = 0;
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

export function dhakaParts(timestamp) {
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

	// Overnight, every day: no trains — engineering trains and staff run
	// track maintenance and safety checks in this window.
	const morningOpenMinutes = METRO_MORNING_OPEN_HOUR * 60 + METRO_MORNING_OPEN_MINUTE;
	if (minutesSinceMidnight < morningOpenMinutes) {
		return {
			state: 2,
			fareMultiplier: 1,
			reason: { bn: 'মধ্যরাতের পর কোনো ট্রেন নেই — রক্ষণাবেক্ষণ চলছে', en: 'No trains after midnight — maintenance in progress' }
		};
	}

	// Friday only: normal hours don't start until the afternoon.
	const fridayOpenMinutes = METRO_FRIDAY_OPEN_HOUR * 60 + METRO_FRIDAY_OPEN_MINUTE;
	if (weekdayIndex === FRIDAY_WEEKDAY_INDEX && minutesSinceMidnight < fridayOpenMinutes) {
		return {
			state: 2,
			fareMultiplier: 1,
			reason: { bn: 'শুক্রবার বিকেল ৩:৩০ এর আগে টিকিট বিক্রি শুরু হয় না', en: "Friday ticket sales don't start until 3:30 PM" }
		};
	}

	// 10 PM onward: fully closed, even to pass holders.
	const passHolderCloseMinutes = METRO_PASS_HOLDER_CLOSE_HOUR * 60 + METRO_PASS_HOLDER_CLOSE_MINUTE;
	if (minutesSinceMidnight >= passHolderCloseMinutes) {
		return {
			state: 2,
			fareMultiplier: 1,
			reason: { bn: 'রাত ১০টার পর স্টেশন সম্পূর্ণ বন্ধ', en: 'Station fully closed after 10 PM' }
		};
	}

	// 9-10 PM: closed to the general public, but a Rapid Pass / MRT Pass
	// holder can still get in — reported as degraded, not fully closed,
	// since this app has no way to know which one a given rider holds.
	const publicCloseMinutes = METRO_PUBLIC_CLOSE_HOUR * 60 + METRO_PUBLIC_CLOSE_MINUTE;
	if (minutesSinceMidnight >= publicCloseMinutes) {
		return {
			state: 1,
			fareMultiplier: 1,
			reason: {
				bn: 'সাধারণ যাত্রীদের জন্য বন্ধ — র‍্যাপিড/এমআরটি পাস থাকলে রাত ১০টা পর্যন্ত চলবে',
				en: 'Closed to general ticket buyers — still usable until 10 PM with a Rapid Pass or MRT Pass'
			}
		};
	}

	// 8:50-9 PM: ticket counters have stopped selling; station closes soon.
	const ticketCounterCloseMinutes = METRO_TICKET_COUNTER_CLOSE_HOUR * 60 + METRO_TICKET_COUNTER_CLOSE_MINUTE;
	if (minutesSinceMidnight >= ticketCounterCloseMinutes) {
		return {
			state: 1,
			fareMultiplier: 1,
			reason: { bn: 'টিকিট কাউন্টার বন্ধ, স্টেশন শীঘ্রই বন্ধ হবে', en: 'Ticket counters closed, station closing soon' }
		};
	}

	return null;
}

// Real, schedule-based jam detection — school/office shift changes and
// Friday Jummah (see constants/trafficSchedule.js for sourcing/reasoning).
// Same epistemic status as metroServiceWindowOverride above: a known
// schedule, not sensor data. Returns 'jam' or null (no override), never
// invents a jam outside these windows.
export function getAutoCondition(timestamp) {
	const { weekdayIndex, hour, minute } = dhakaParts(timestamp);
	const minutesSinceMidnight = hour * 60 + minute;

	const SATURDAY_WEEKDAY_INDEX = 6;
	if (weekdayIndex === SATURDAY_WEEKDAY_INDEX) {
		return null; // weekend — no institutional shift pattern
	}

	if (weekdayIndex === FRIDAY_WEEKDAY_INDEX) {
		const { start, end } = FRIDAY_PEAK_WINDOW;
		return minutesSinceMidnight >= start && minutesSinceMidnight < end ? 'jam' : null;
	}

	const active = WEEKDAY_PEAK_WINDOWS.find(
		(window) => minutesSinceMidnight >= window.start && minutesSinceMidnight < window.end
	);
	return active ? 'jam' : null;
}

// Combines a live-observed weather condition with the schedule-based jam
// guess. Rain is directly observed in real time and its per-mode rules are
// already at least as severe as jam's, so it takes precedence; the jam
// schedule only applies when it isn't raining.
export function combineCondition(weatherCondition, timestamp) {
	if (weatherCondition === 'rain' || weatherCondition === 'heavy_rain') {
		return 'rain';
	}

	return getAutoCondition(timestamp) || 'clear';
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
