import { toBanglaDigits } from './format.js';

export const WEATHER_CONDITION_LABEL = {
  clear: { bn: 'পরিষ্কার', en: 'Clear' },
  rain: { bn: 'বৃষ্টি', en: 'Rain' },
  heavy_rain: { bn: 'ভারী বৃষ্টি', en: 'Heavy rain' }
};

export const HEAT_CONDITION_LABEL = {
  cold: { bn: 'ঠান্ডা', en: 'Cold' },
  mild: { bn: 'মৃদু', en: 'Mild' },
  pleasant: { bn: 'মনোরম', en: 'Pleasant' },
  hot: { bn: 'গরম', en: 'Hot' },
  very_hot: { bn: 'অতি গরম', en: 'Very hot' }
};

export function formatTemp(celsius, lang) {
  if (celsius === null || celsius === undefined) return null;
  const rounded = Math.round(celsius);
  return lang === 'bn' ? `${toBanglaDigits(rounded)}°C` : `${rounded}°C`;
}

export function weatherSuggestion(condition, heatCondition, lang) {
  if (condition === 'heavy_rain') {
    return lang === 'bn'
      ? 'ছাতা সঙ্গে নিন — রাস্তায় পানি জমতে পারে'
      : 'Take an umbrella — roads may flood';
  }

  if (condition === 'rain') {
    return lang === 'bn' ? 'ছাতা সঙ্গে নিন' : 'Take an umbrella';
  }

  if (heatCondition === 'very_hot') {
    return lang === 'bn'
      ? 'প্রচুর পানি পান করুন, সাথে ঠান্ডা পানি রাখুন'
      : 'Drink plenty of water — carry cold water with you';
  }

  if (heatCondition === 'hot') {
    return lang === 'bn' ? 'সাথে পানি রাখুন' : 'Carry water with you';
  }

  if (heatCondition === 'cold') {
    return lang === 'bn' ? 'গরম কাপড় পরে বের হন' : 'Wear something warm';
  }

  return null;
}
