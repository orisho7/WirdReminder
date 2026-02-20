import { createI18n } from "./core/i18n/i18n.js";

const i18n = createI18n();

async function applyLangToDom() {
  const lang = i18n.getLanguage();

  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const attr = el.getAttribute('data-i18n-attr');
    const value = i18n.t(key);

    if (attr) {
      el.setAttribute(attr, value);
    } else {
      el.textContent = value;
    }
  });

  document.querySelectorAll('[data-set-lang]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.setLang === lang);
  });

  // Trigger app reload
  window.dispatchEvent(new Event('language-changed'));
}

document.addEventListener('DOMContentLoaded', async () => {
  await i18n.init();
  applyLangToDom();

  document.querySelectorAll('[data-set-lang]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      i18n.setLanguage(btn.dataset.setLang);
      applyLangToDom();
    });
  });
});

window.addEventListener('i18n:change', () => {
  applyLangToDom();
});
