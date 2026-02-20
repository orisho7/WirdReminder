// parser.js - Parsing Layer (copied from extension)
// Transforms API data into layout-friendly structures

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
 * @returns {Object} Structured page data with lines and surah starts
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
 * @returns {Array} Array of parsed page data, sorted by page number
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
 * @param {Array} words - Words in the line
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
 * @returns {Object} Gap size and surah ID
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

/**
 * Builds a map of line_number → { totalWords, firstPos, lastPos }
 * from the full page's verse data.
 * @param {Array} fullPageVerses - All verses on the page from API
 * @returns {Map<number, {totalWords: number, firstPos: number, lastPos: number}>}
 */
export function buildFullLineInfo(fullPageVerses) {
    const lineInfo = new Map();

    fullPageVerses.forEach(verse => {
        verse.words.forEach(word => {
            const ln = word.line_number;
            if (!lineInfo.has(ln)) {
                lineInfo.set(ln, { totalWords: 0, firstPos: Infinity, lastPos: -1 });
            }
            const info = lineInfo.get(ln);
            info.totalWords++;
            info.firstPos = Math.min(info.firstPos, word.position);
            info.lastPos = Math.max(info.lastPos, word.position);
        });
    });

    return lineInfo;
}

/**
 * Determines the partial-line type for a wird's line compared to the full Mushaf line.
 * @param {Array} wirdWords - The wird's words on this line
 * @param {Object} fullInfo - { totalWords, firstPos, lastPos } from buildFullLineInfo
 * @returns {'full'|'partial-start'|'partial-end'|'partial-both'}
 *   In RTL context:
 *   - 'full': line is complete, justify edge-to-edge
 *   - 'partial-start': words don't start at the beginning of the Mushaf line (gap on right in RTL)
 *   - 'partial-end': words don't reach the end of the Mushaf line (gap on left in RTL)
 *   - 'partial-both': gaps on both sides
 */
export function getPartialLineType(wirdWords, fullInfo) {
    if (!fullInfo || wirdWords.length >= fullInfo.totalWords) {
        return 'full';
    }

    // Find first and last position in the wird's words for this line
    let wirdFirstPos = Infinity;
    let wirdLastPos = -1;
    wirdWords.forEach(w => {
        wirdFirstPos = Math.min(wirdFirstPos, w.position);
        wirdLastPos = Math.max(wirdLastPos, w.position);
    });

    const missingStart = wirdFirstPos > fullInfo.firstPos;
    const missingEnd = wirdLastPos < fullInfo.lastPos;

    if (missingStart && missingEnd) return 'partial-both';
    if (missingStart) return 'partial-start';
    if (missingEnd) return 'partial-end';
    return 'full';
}
