/**
 * api.js - Unified Quran.com API client
 * Powered by Quran.com API v4.
 */

import { storage } from './adapter/storage.js';

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
 * Fetches all verses on a given Mushaf page
 * Used to get full line context for partial-line detection
 * @param {number} pageNumber - The Mushaf page number
 * @returns {Promise<Array>} Array of verse objects on that page
 */
export async function fetchPageVerses(pageNumber) {
    const url = `${BASE_API}/verses/by_page/${pageNumber}?words=true&word_fields=${WORD_FIELDS}&per_page=1000`;
    const res = await fetch(url);
    const data = await res.json();
    return data.verses;
}

/**
 * Fetches all surahs metadata
 * @returns {Promise<Array>} Array of surah metadata
 */
export async function fetchAllSurahs() {
    // Check cache first
    const cached = await storage.get('surah_metadata');
    if (cached && Array.isArray(cached) && cached.length > 0) {
        return cached;
    }

    try {
        const res = await fetch(`${BASE_API}/chapters`);
        const data = await res.json();

        const surahs = data.chapters.map(c => ({
            id: c.id,
            name_arabic: c.name_arabic,
            name_simple: c.name_simple,
            verses_count: c.verses_count
        }));

        await storage.set({ 'surah_metadata': surahs });
        return surahs;
    } catch (e) {
        console.error('Failed to fetch surahs:', e);
        return cached || []; // Fallback to cache even if it was null/empty
    }
}

/**
 * Gets the Arabic name of a surah
 * @param {number|string} id - The surah number (1-114)
 * @returns {Promise<string>} The Arabic surah name
 */
export async function getSurahName(id) {
    const surahs = await fetchAllSurahs();
    if (Array.isArray(surahs)) {
        const surah = surahs.find(s => s.id === parseInt(id));
        return surah?.name_arabic || `سورة ${id}`;
    }

    // If surahs is not an array (older cache format might be object)
    if (surahs && typeof surahs === 'object' && surahs[id]) {
        return surahs[id];
    }

    return `سورة ${id}`;
}
