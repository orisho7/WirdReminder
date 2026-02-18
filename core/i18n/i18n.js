const LANGS = {};
const FALLBACK = "ar";
const STORAGE_KEY = "wr_lang";

let isLoaded = false;
const loadPromises = [];

async function loadTranslations() {
  if (isLoaded) return;
  
  try {
    const [arData, enData] = await Promise.all([
      fetch('./core/i18n/locales/ar.json').then(r => r.json()),
      fetch('./core/i18n/locales/en.json').then(r => r.json())
    ]);
    LANGS.ar = arData;
    LANGS.en = enData;
    isLoaded = true;
  } catch (err) {
    console.error('Failed to load translations:', err);
  }
}

function detectLang() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && (saved === 'ar' || saved === 'en')) return saved;

  // Always default to Arabic for first-time visitors
  return FALLBACK;
}

/**
 * NEW: read nested keys like "nav.features"
 * @param {*} obj 
 * @param {*} path 
 * @returns 
 */
function getNested(obj, path) {
  if (!obj || !path) return undefined;
  return path.split(".").reduce((acc, part) => (acc ? acc[part] : undefined), obj);
}

export function createI18n() {
  let current = detectLang();

  async function init() {
    await loadTranslations();
  }

  function t(key) {
    if (!isLoaded) return key;
    return (
      getNested(LANGS[current], key) ||
      getNested(LANGS[FALLBACK], key) ||
      key
    );
  }

  function setLanguage(lang) {
    if (lang !== 'ar' && lang !== 'en') return;
    current = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    window.dispatchEvent(new Event("i18n:change"));
  }

  function getLanguage() {
    return current;
  }

  return { t, setLanguage, getLanguage, init };
}
