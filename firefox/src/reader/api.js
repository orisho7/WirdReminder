// src/reader/api.js
// Data Layer - handles all API requests and caching

const BASE_API = 'https://api.quran.com/api/v4';
const WORD_FIELDS = 'text_qpc_hafs,text_uthmani,line_number,page_number';

/**
 * Fetches all verses for a given surah
 * @param {number|string} surahId - The surah number (1-114)
 * @returns {Promise<Array>} Array of verse objects
 */
export async function fetchSurahVerses(surahId) {
    const url = `${BASE_API}/verses/by_chapter/${surahId}?words=true&word_fields=${WORD_FIELDS}&per_page=1000`;
    const res = await fetch(url);
    const data = await res.json();
    return data.verses;
}

/**
 * Fetches verses for a specific ayah range within a surah
 * @param {number|string} surahId - The surah number (1-114)
 * @param {number} startAyah - Starting ayah number
 * @param {number} endAyah - Ending ayah number
 * @returns {Promise<Array>} Array of filtered verse objects
 */
export async function fetchAyahRange(surahId, startAyah, endAyah) {
    const url = `${BASE_API}/verses/by_chapter/${surahId}?words=true&word_fields=${WORD_FIELDS}&per_page=1000`;
    const res = await fetch(url);
    const data = await res.json();

    return data.verses.filter(v => {
        const num = parseInt(v.verse_key.split(':')[1]);
        return num >= startAyah && num <= endAyah;
    });
}

/**
 * Fetches all verses for a given juz
 * @param {number|string} juzId - The juz number (1-30)
 * @returns {Promise<Array>} Array of verse objects
 */
export async function fetchJuzVerses(juzId) {
    const url = `${BASE_API}/verses/by_juz/${juzId}?words=true&word_fields=${WORD_FIELDS}&per_page=1000`;
    const res = await fetch(url);
    const data = await res.json();
    return data.verses;
}

/**
 * Gets the Arabic name of a surah, using cached metadata when available
 * @param {number|string} id - The surah number (1-114)
 * @returns {Promise<string>} The Arabic surah name
 */
export async function getSurahName(id) {
    try {
        const { surah_metadata } = await browser.storage.local.get('surah_metadata');
        if (surah_metadata && surah_metadata[id]) {
            return surah_metadata[id];
        }

        // Cache miss - fetch and store all surah names
        const res = await fetch(`${BASE_API}/chapters`);
        const data = await res.json();
        const metadata = {};
        data.chapters.forEach(c => metadata[c.id] = c.name_arabic);
        await browser.storage.local.set({ surah_metadata: metadata });
        return metadata[id] || `سورة ${id}`;
    } catch (e) {
        return `سورة ${id}`;
    }
}
