import { describe, expect, it } from 'vitest';
import { formatTime, toBanglaDigits } from './format.js';

function at(hour, minute) {
	const date = new Date(2026, 0, 1, hour, minute, 0, 0);
	return date;
}

describe('toBanglaDigits', () => {
	it('converts every digit regardless of how many there are', () => {
		expect(toBanglaDigits(9)).toBe('৯');
		expect(toBanglaDigits('00')).toBe('০০');
		expect(toBanglaDigits(10)).toBe('১০');
		expect(toBanglaDigits('12')).toBe('১২');
	});
});

describe('formatTime', () => {
	// Both the hour and the zero-padded minutes must be fully converted to
	// Bangla numerals — the bug was partial conversion (hour only, or
	// neither), producing mixed output like "সকাল ৯:00" / "সকাল 10:00".
	const cases = [
		{ hour: 9, minute: 0, bn: 'সকাল ৯:০০', en: '9:00 AM' },
		{ hour: 9, minute: 30, bn: 'সকাল ৯:৩০', en: '9:30 AM' },
		{ hour: 10, minute: 0, bn: 'সকাল ১০:০০', en: '10:00 AM' },
		{ hour: 12, minute: 5, bn: 'দুপুর ১২:০৫', en: '12:05 PM' }
	];

	for (const { hour, minute, bn, en } of cases) {
		it(`formats ${hour}:${String(minute).padStart(2, '0')} correctly in bn and en`, () => {
			expect(formatTime(at(hour, minute), 'bn')).toBe(bn);
			expect(formatTime(at(hour, minute), 'en')).toBe(en);
		});
	}

	it('never leaves a Latin digit in the bn output', () => {
		for (const { hour, minute } of cases) {
			const result = formatTime(at(hour, minute), 'bn');
			expect(result).not.toMatch(/[0-9]/);
		}
	});
});
