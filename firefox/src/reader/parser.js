// src/reader/parser.js
// Parsing Layer - transforms API data into layout-friendly structures

/**
 * @typedef {Object} Word
 * @property {string} text_qpc_hafs - QPC Hafs text
 * @property {string} text_uthmani - Uthmani text
 * @property {number} line_number - Line number on page
 * @property {string} char_type_name - Type of character (word, end, etc)
 * @property {string} verse_key - Verse reference (e.g., "1:1")
 */

/**
 * @typedef {Object} LineData
 * @property {number} lineNumber - Line number (1-15)
 * @property {Word[]} words - Words in this line
 * @property {number|null} surahStart - Surah ID if this line starts a new surah
 */

/**
 * @typedef {Object} PageData
 * @property {number} pageNumber - Mushaf page number
 * @property {LineData[]} lines - Lines on this page (up to 15)
 * @property {Object} surahStarts - Map of line number to surah ID for new surah starts
 */

/**
 * Groups verses by their page number
 * @param {Array} verses - Array of verse objects from API
 * @returns {Map<number, Array>} Map of page number to verses on that page
 */
export function groupVersesByPage(verses) {
    const pages = new Map();

    verses.forEach(verse => {
        const pageNum = verse.page_number;
        if (!pages.has(pageNum)) {
            pages.set(pageNum, []);
        }
        pages.get(pageNum).push(verse);
    });

    return pages;
}

/**
 * Parses verses on a single page into line data
 * @param {Array} pageVerses - Verses on a single page
 * @returns {PageData} Structured page data with lines and surah starts
 */
export function parsePageToLines(pageVerses) {
    const lines = new Map();
    const surahStarts = {};

    pageVerses.forEach(verse => {
        const [surahId, verseNum] = verse.verse_key.split(':');

        verse.words.forEach(word => {
            const lineNum = word.line_number;

            if (!lines.has(lineNum)) {
                lines.set(lineNum, []);
            }

            lines.get(lineNum).push({
                ...word,
                verse_key: verse.verse_key
            });

            // Track if this line starts a new surah (verse 1)
            if (verseNum === '1' && !surahStarts[lineNum]) {
                surahStarts[lineNum] = surahId;
            }
        });
    });

    return {
        pageNumber: pageVerses[0]?.page_number,
        lines,
        surahStarts
    };
}

/**
 * Full pipeline: parse verses into complete page data array
 * @param {Array} verses - Raw verses from API
 * @returns {PageData[]} Array of parsed page data, sorted by page number
 */
export function parseVersesToPages(verses) {
    const pageMap = groupVersesByPage(verses);
    const pages = [];

    // Sort page numbers and parse each page
    const sortedPageNums = [...pageMap.keys()].sort((a, b) => a - b);

    for (const pageNum of sortedPageNums) {
        const pageVerses = pageMap.get(pageNum);
        const pageData = parsePageToLines(pageVerses);
        pages.push(pageData);
    }

    return pages;
}

/**
 * Determines if a line should be centered (last line with few words)
 * @param {number} lineNumber - Current line number
 * @param {Word[]} words - Words in the line
 * @param {Map} allLines - All lines on the page
 * @returns {boolean} Whether the line should be centered
 */
export function shouldCenterLine(lineNumber, words, allLines) {
    const isLastLine = lineNumber === 15 || !allLines.has(lineNumber + 1);
    return isLastLine && words.length < 5;
}

/**
 * Finds gaps before surah starts (for header/basmala placement)
 * @param {number} currentLine - Current empty line number
 * @param {Map} lines - All lines on the page
 * @param {Object} surahStarts - Map of line to surah ID
 * @returns {{gap: number, surahId: string|null}} Gap size and surah ID
 */
export function findSurahGap(currentLine, lines, surahStarts) {
    let nextLineWithWords = currentLine;

    while (nextLineWithWords <= 15 && !lines.has(nextLineWithWords)) {
        nextLineWithWords++;
    }

    if (nextLineWithWords <= 15) {
        const surahId = surahStarts[nextLineWithWords];
        return {
            gap: nextLineWithWords - currentLine,
            surahId: surahId || null
        };
    }

    return { gap: 0, surahId: null };
}
