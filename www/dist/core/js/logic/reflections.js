/**
 * Creates a new reflection object or updates an existing one.
 * 
 * Generates a unique ID if none is provided, normalizes numeric values,
 * trims the text content, and attaches timestamps.
 *
 * @param {string|number} surah - Surah number (will be converted to integer)
 * @param {string|number} ayah - Ayah number (will be converted to integer)
 * @param {string} text - Reflection text content
 * @param {string|null} [existingId=null] - Existing reflection ID (if updating)
 * @returns {Object} Reflection object with metadata
 */
export function createReflectionObject(surah, ayah, text, existingId = null) {
    return {
        id: existingId || `ref_${Date.now()}_${surah}_${ayah}`,
        surah: parseInt(surah),
        ayah: parseInt(ayah),
        text: text.trim(),
        updatedAt: new Date().toISOString(),
        createdAt: existingId ? undefined : new Date().toISOString()
    };
}

/**
 * Filters reflections based on a search query.
 * 
 * If no query is provided, the original reflections array is returned.
 * The search is case-insensitive and matches against:
 * - Reflection text content
 * - Surah label (e.g., "سورة 2")
 *
 * @param {Array<Object>} reflections - List of reflection objects
 * @param {string} query - Search keyword
 * @returns {Array<Object>} Filtered reflections array
 */
export function filterReflections(reflections, query) {
    if (!query) return reflections;
    query = query.toLowerCase();
    return reflections.filter(ref =>
        ref.text.toLowerCase().includes(query) ||
        `سورة ${ref.surah}`.includes(query)
    );
}

/**
 * Sorts reflections based on a given criteria.
 * 
 * Available sorting criteria:
 * - "date": Sorts by last updated date (newest first)
 * - "surah": Sorts by surah number, then by ayah number
 * 
 * A shallow copy of the array is created to avoid mutating the original data.
 *
 * @param {Array<Object>} reflections - List of reflection objects
 * @param {"date"|"surah"} [criteria="date"] - Sorting criteria
 * @returns {Array<Object>} Sorted reflections array
 */
export function sortReflections(reflections, criteria = 'date') {
    return [...reflections].sort((a, b) => {
        if (criteria === 'date') {
            return new Date(b.updatedAt) - new Date(a.updatedAt);
        }
        if (criteria === 'surah') {
            return a.surah - b.surah || a.ayah - b.ayah;
        }
        return 0;
    });
}
