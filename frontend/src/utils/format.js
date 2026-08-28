const BANGLA_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

// Converts every digit in a value to its Bangla numeral, regardless of how
// many digits it has (fixes the bug where only single-digit hours like ৯
// converted but "10" and zero-padded minutes like "00" stayed Latin).
export function toBanglaDigits(value) {
	return String(value).replace(/[0-9]/g, (digit) => BANGLA_DIGITS[Number(digit)]);
}

// Bangla time-of-day convention (রাত/সকাল/দুপুর/বিকাল/সন্ধ্যা) — boundaries
// follow common Bangla media/app usage, not an official standard.
const BANGLA_PERIODS = [
	{ maxHour: 6, label: 'রাত' }, // 00:00–05:59
	{ maxHour: 12, label: 'সকাল' }, // 06:00–11:59
	{ maxHour: 15, label: 'দুপুর' }, // 12:00–14:59
	{ maxHour: 18, label: 'বিকাল' }, // 15:00–17:59
	{ maxHour: 20, label: 'সন্ধ্যা' }, // 18:00–19:59
	{ maxHour: 24, label: 'রাত' } // 20:00–23:59
];

function banglaPeriodLabel(hour24) {
	return BANGLA_PERIODS.find((period) => hour24 < period.maxHour).label;
}

function to12Hour(hour24) {
	const hour12 = hour24 % 12;
	return hour12 === 0 ? 12 : hour12;
}

// CLAUDE.md: Bangla uses Bangla numerals and Bangla time convention
// (সকাল ৮:০৫), never a translated "8:05 AM". English keeps the h:mm AM/PM
// form. `date` is a JS Date; `lang` is 'bn' or 'en'.
export function formatTime(date, lang) {
	const hour24 = date.getHours();
	const minute = date.getMinutes();
	const hour12 = to12Hour(hour24);
	const paddedMinute = String(minute).padStart(2, '0');

	if (lang === 'bn') {
		const period = banglaPeriodLabel(hour24);
		return `${period} ${toBanglaDigits(hour12)}:${toBanglaDigits(paddedMinute)}`;
	}

	const meridiem = hour24 < 12 ? 'AM' : 'PM';
	return `${hour12}:${paddedMinute} ${meridiem}`;
}

// Same convention as formatTime, but for a plain "minutes since midnight"
// integer — the shape schedule slots and deadline chips are stored in.
export function formatMinutesOfDay(minutesSinceMidnight, lang) {
	const date = new Date(0, 0, 0, Math.floor(minutesSinceMidnight / 60), minutesSinceMidnight % 60);
	return formatTime(date, lang);
}
