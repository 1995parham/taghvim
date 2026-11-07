export const JALALI_MONTHS = {
  fa: ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'],
  en: ['Farvardin', 'Ordibehesht', 'Khordad', 'Tir', 'Mordad', 'Shahrivar', 'Mehr', 'Aban', 'Azar', 'Dey', 'Bahman', 'Esfand'],
};

export const GREGORIAN_MONTHS = {
  fa: ['ژانویه', 'فوریه', 'مارس', 'آوریل', 'مه', 'ژوئن', 'ژوئیه', 'اوت', 'سپتامبر', 'اکتبر', 'نوامبر', 'دسامبر'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

export const HIJRI_MONTHS = {
  fa: ['محرم', 'صفر', 'ربیع‌الاول', 'ربیع‌الثانی', 'جمادی‌الاول', 'جمادی‌الثانی', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذی‌القعده', 'ذی‌الحجه'],
  en: ['Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani', 'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', "Sha'ban", 'Ramadan', 'Shawwal', "Dhu al-Qa'dah", 'Dhu al-Hijjah'],
};

export function hijriLabel(h, lang) {
  return `${num(h.hd, lang)} ${HIJRI_MONTHS[lang][h.hm - 1]} ${num(h.hy, lang)}`;
}

// Saturday first.
export const WEEKDAYS_SHORT = {
  fa: ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'],
  en: ['Sa', 'Su', 'Mo', 'Tu', 'We', 'Th', 'Fr'],
};

export const WEEKDAYS = {
  fa: ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'],
  en: ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
};

const STRINGS = {
  fa: {
    today: 'امروز',
    prev: 'ماه قبل',
    next: 'ماه بعد',
    holiday: 'تعطیل',
    noEvents: 'رویدادی برای این روز ثبت نشده است.',
    loadError: 'دریافت داده از گیت‌هاب ناموفق بود:',
    refresh: 'به‌روزرسانی',
    settings: 'تنظیمات',
    source: 'منبع داده',
  },
  en: {
    today: 'Today',
    prev: 'Previous month',
    next: 'Next month',
    holiday: 'Holiday',
    noEvents: 'No events for this day.',
    loadError: 'Could not load data from GitHub:',
    refresh: 'Refresh',
    settings: 'Settings',
    source: 'Data source',
  },
};

export function t(lang, key) {
  return (STRINGS[lang] ?? STRINGS.en)[key] ?? key;
}

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

export function num(n, lang) {
  const s = String(n);
  return lang === 'fa' ? s.replace(/\d/g, (d) => FA_DIGITS[d]) : s;
}
