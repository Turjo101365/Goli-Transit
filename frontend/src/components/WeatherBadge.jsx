import { useEffect, useState } from 'react';
import { useLanguage } from '../state/LanguageContext.jsx';
import { getCondition } from '../services/condition.service.js';
import {
  WEATHER_CONDITION_LABEL,
  HEAT_CONDITION_LABEL,
  formatTemp,
  weatherSuggestion
} from '../utils/weather.js';
import { toBanglaDigits } from '../utils/format.js';

function WeatherIcon({ condition, size = 15 }) {
  if (condition === 'rain' || condition === 'heavy_rain') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
        <path d="M16 14v6" />
        <path d="M8 14v6" />
        <path d="M12 16v6" />
      </svg>
    );
  }

  // Clear / Default Sun
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

export function WeatherBadge({ compact = false }) {
  const { lang } = useLanguage();
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    getCondition()
      .then((data) => {
        if (!isMounted) return;
        setWeather({
          condition: data.condition || 'clear',
          temperatureC: data.temperatureC,
          feelsLikeC: data.feelsLikeC,
          heatCondition: data.heatCondition,
          precipitationProbability: data.precipitationProbability,
          precipitationMm: data.precipitationMm
        });
        setLoading(false);
      })
      .catch(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading || !weather || weather.temperatureC === null) {
    return null;
  }

  const conditionLabel =
    WEATHER_CONDITION_LABEL[weather.condition]?.[lang] || weather.condition;
  const tempStr = formatTemp(weather.temperatureC, lang);
  const feelsLikeStr =
    weather.feelsLikeC !== null ? formatTemp(weather.feelsLikeC, lang) : null;
  const suggestion = weatherSuggestion(
    weather.condition,
    weather.heatCondition,
    lang
  );

  const tooltip = [
    `${lang === 'bn' ? 'ঢাকা আবহাওয়া' : 'Dhaka Weather'}: ${conditionLabel} ${tempStr}`,
    feelsLikeStr
      ? `${lang === 'bn' ? 'অনুভূত হচ্ছে' : 'Feels like'} ${feelsLikeStr}`
      : null,
    weather.precipitationProbability !== null
      ? `${lang === 'bn' ? 'বৃষ্টির সম্ভাবনা' : 'Rain probability'} ${
          lang === 'bn'
            ? toBanglaDigits(weather.precipitationProbability)
            : weather.precipitationProbability
        }%`
      : null,
    suggestion ? `\n💡 ${suggestion}` : null
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div
      className={`weather-badge ${compact ? 'weather-badge--compact' : ''}`}
      title={tooltip}
      aria-label={tooltip}
    >
      <span className="weather-badge__icon">
        <WeatherIcon condition={weather.condition} size={14} />
      </span>
      <span className="weather-badge__temp">{tempStr}</span>
      {!compact && (
        <span className="weather-badge__condition">
          · {conditionLabel}
        </span>
      )}
    </div>
  );
}
