/**
 * Preference Scorer & Route Ranking Engine for Goli Transit
 *
 * Evaluates candidate transit routes across 5 user preferences:
 * 1. ⚡ fastest         -> Prioritizes minimum travel time (p50/p90).
 * 2. 🛋 comfortable     -> Prioritizes minimal transfers, low walking, fewer vehicle switches.
 * 3. 👨‍👩‍👧 family          -> Prioritizes high comfort, zero/low transfers, minimal walking, safe/sheltered transport.
 * 4. ⚡🛋 fast_comfortable -> Balances travel time with comfort and transfers.
 * 5. 💰 cheapest        -> Prioritizes lowest monetary fare.
 */

export const PREFERENCES = {
	FASTEST: 'fastest',
	COMFORTABLE: 'comfortable',
	FAMILY: 'family',
	FAST_COMFORTABLE: 'fast_comfortable',
	CHEAPEST: 'cheapest'
};

const MODE_COMFORT = {
	metro: 9.5,
	cng: 8.0,
	rickshaw: 6.5,
	bus: 5.0,
	bike: 4.5,
	walk: 3.5
};

const MODE_FAMILY_SUITABILITY = {
	metro: 10.0,
	cng: 8.5,
	rickshaw: 7.0,
	bus: 4.5,
	bike: 1.0,
	walk: 4.0
};

function estimateFare(option) {
	if (typeof option.fare === 'number') {
		return option.fare;
	}

	let total = 0;
	for (const seg of option.segments || []) {
		if (typeof seg.fare === 'number') {
			total += seg.fare;
		} else if (seg.mode === 'rickshaw') {
			const dist = option.distanceKm || 1.5;
			total += Math.round(25 + dist * 15);
		} else if (seg.mode === 'bike') {
			const dist = option.distanceKm || 2.0;
			total += Math.round(30 + dist * 12);
		} else if (seg.mode === 'walk') {
			total += 0;
		} else {
			total += 35;
		}
	}
	return total;
}

function calculateRouteMetrics(option) {
	const segments = option.segments || [];
	const transfersCount = Math.max(0, segments.length - 1);

	let walkMinutes = 0;
	let averageComfort = 0;
	let familyScore = 0;

	for (const seg of segments) {
		const dur = seg.min || 1;
		if (seg.mode === 'walk') {
			walkMinutes += dur;
		}

		const comfort = MODE_COMFORT[seg.mode] ?? 5;
		const fam = MODE_FAMILY_SUITABILITY[seg.mode] ?? 5;

		averageComfort += comfort * dur;
		familyScore += fam * dur;
	}

	const totalMin = Math.max(1, option.p50 || 1);
	averageComfort = averageComfort / totalMin;
	familyScore = familyScore / totalMin;

	const estimatedFare = estimateFare(option);

	return {
		transfersCount,
		walkMinutes,
		estimatedFare,
		averageComfort,
		familyScore
	};
}

export function scoreOption(option, preference = PREFERENCES.FASTEST) {
	const metrics = calculateRouteMetrics(option);
	const { transfersCount, walkMinutes, estimatedFare, averageComfort, familyScore } = metrics;
	const timeP50 = option.p50 || 1;
	const timeP90 = option.p90 || timeP50;

	let score = 0;

	switch (preference) {
		case PREFERENCES.FASTEST: {
			score = (timeP50 * 0.7 + timeP90 * 0.3) + transfersCount * 1.5;
			break;
		}

		case PREFERENCES.COMFORTABLE: {
			score =
				timeP50 * 0.45 +
				transfersCount * 14 +
				walkMinutes * 1.8 -
				averageComfort * 2.5;
			break;
		}

		case PREFERENCES.FAMILY: {
			score =
				timeP50 * 0.35 +
				transfersCount * 18 +
				walkMinutes * 2.2 -
				familyScore * 3.5;
			break;
		}

		case PREFERENCES.FAST_COMFORTABLE: {
			score =
				timeP50 * 0.65 +
				transfersCount * 7.5 +
				walkMinutes * 1.0 -
				averageComfort * 1.5;
			break;
		}

		case PREFERENCES.CHEAPEST: {
			score = estimatedFare * 1.2 + timeP50 * 0.25;
			break;
		}

		default: {
			score = timeP50;
			break;
		}
	}

	return {
		score: Math.round(score * 10) / 10,
		metrics
	};
}

export function generateRouteBadges(option, metrics, preference, isTopRanked) {
	const tags = [];
	const { transfersCount, walkMinutes, estimatedFare } = metrics;

	if (transfersCount === 0) {
		tags.push({
			id: 'direct',
			bn: 'সরাসরি রুট (কোনো বদল নেই)',
			en: 'Direct Route (No Transfers)'
		});
	} else {
		tags.push({
			id: 'transfers',
			bn: `${transfersCount}টি বাহন বদল`,
			en: `${transfersCount} transfer${transfersCount > 1 ? 's' : ''}`
		});
	}

	if (walkMinutes <= 3) {
		tags.push({
			id: 'low_walk',
			bn: 'খুব কম হাঁটা',
			en: 'Minimal Walking'
		});
	}

	if (estimatedFare === 0) {
		tags.push({
			id: 'free',
			bn: 'বিনামূল্যে (হাঁটা)',
			en: 'Free (Walking)'
		});
	} else if (estimatedFare <= 30) {
		tags.push({
			id: 'low_fare',
			bn: `সাশ্রয়ী ভাড়া (৳${estimatedFare})`,
			en: `Budget Friendly (৳${estimatedFare})`
		});
	}

	let recommendationReason = null;
	if (isTopRanked) {
		switch (preference) {
			case PREFERENCES.FASTEST:
				recommendationReason = {
					bn: `⚡ দ্রুততম রুট: প্রায় ${option.p50} মিনিটে গন্তব্যে পৌঁছাবে`,
					en: `⚡ Fastest Route: Estimated ${option.p50} mins travel time`
				};
				break;
			case PREFERENCES.COMFORTABLE:
				recommendationReason = {
					bn: `🛋 আরামদায়ক রুট: ${transfersCount === 0 ? 'সরাসরি ভ্রমণ ও কম হাঁটা' : 'স্বাচ্ছন্দ্যময় যাত্রা'}`,
					en: `🛋 Comfortable Choice: ${transfersCount === 0 ? 'Direct ride with minimal walking' : 'Smooth transit'}`
				};
				break;
			case PREFERENCES.FAMILY:
				recommendationReason = {
					bn: '👨‍👩‍👧 পারিবারিক রুট: নিরাপদ ও স্বাচ্ছন্দ্যময় ভ্রমণ',
					en: '👨‍👩‍👧 Family Friendly: Safe, sheltered & minimal walking'
				};
				break;
			case PREFERENCES.FAST_COMFORTABLE:
				recommendationReason = {
					bn: '⚡🛋 দ্রুত ও আরামদায়ক: সেরা সময় ও স্বাচ্ছন্দ্যের ব্যালেন্স',
					en: '⚡🛋 Fast & Comfortable: Optimal balance of speed and comfort'
				};
				break;
			case PREFERENCES.CHEAPEST:
				recommendationReason = {
					bn: `💰 সবচেয়ে সাশ্রয়ী: আনুমানিক মাত্র ৳${estimatedFare}`,
					en: `💰 Most Affordable: Estimated only ৳${estimatedFare}`
				};
				break;
			default:
				recommendationReason = {
					bn: '⭐ সেরা প্রস্তাবিত রুট',
					en: '⭐ Recommended Option'
				};
				break;
		}
	}

	return {
		tags,
		recommendationReason
	};
}

export function rankRoutesByPreference(options = [], preference = PREFERENCES.FASTEST) {
	if (!Array.isArray(options) || options.length === 0) {
		return [];
	}

	const evaluated = options.map((option) => {
		const { score, metrics } = scoreOption(option, preference);
		return {
			...option,
			preferenceScore: score,
			transfersCount: metrics.transfersCount,
			walkMinutes: metrics.walkMinutes,
			estimatedFare: metrics.estimatedFare
		};
	});

	evaluated.sort((a, b) => a.preferenceScore - b.preferenceScore);

	return evaluated.map((option, index) => {
		const isTop = index === 0;
		const { tags, recommendationReason } = generateRouteBadges(
			option,
			{
				transfersCount: option.transfersCount,
				walkMinutes: option.walkMinutes,
				estimatedFare: option.estimatedFare
			},
			preference,
			isTop
		);

		return {
			...option,
			rank: index + 1,
			isRecommended: isTop,
			recommendationReason,
			tags
		};
	});
}
