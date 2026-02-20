/**
 * ReaderView.tsx
 * 
 * React-based Quran reader for the native phone application.
 * This component is mounted into #reader-root and communicates with app.js
 * via CustomEvents:
 *   - 'wird:openReader'  — open reader with a reminder payload
 *   - 'wird:closeReader' — close reader (dispatched internally on back press)
 * 
 * Only mounted on native Capacitor platforms (see reader-entry.tsx).
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

interface Reminder {
  id: string;
  name?: string;
  description?: string;
  type: 'surah' | 'ayah_range' | 'juz';
  timing?: { time: string; frequency: string; day?: number };
  target: {
    surahId?: number;
    startAyah?: number;
    endAyah?: number;
    juzId?: number;
  };
}

interface Word {
  text_qpc_hafs?: string;
  text_uthmani?: string;
  char_type_name: string;
  verse_key: string;
  position: number;
}

interface PageData {
  pageNumber: number;
  lines: Map<number, Word[]>;
  surahStarts: Record<number, string>;
}

interface Bookmark {
  verseKey: string;
  wordPosition: number;
  timestamp: number;
}

// ── Helpers (mirrors app.js logic) ──────────────────────────────────────────

async function getStorage(key: string): Promise<any> {
  if ((window as any).Capacitor) {
    const { Preferences } = (window as any).Capacitor.Plugins;
    if (Preferences) {
      const { value } = await Preferences.get({ key });
      return value ? JSON.parse(value) : null;
    }
  }
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
}

async function setStorage(data: Record<string, any>): Promise<void> {
  const entries = Object.entries(data);
  if ((window as any).Capacitor) {
    const { Preferences } = (window as any).Capacitor.Plugins;
    if (Preferences) {
      await Promise.all(entries.map(([key, val]) =>
        Preferences.set({ key, value: JSON.stringify(val) })
      ));
      return;
    }
  }
  entries.forEach(([key, val]) => localStorage.setItem(key, JSON.stringify(val)));
}

function isReadInCurrentPeriod(reminder: Reminder, lastReadTs: number | null): boolean {
  if (!lastReadTs) return false;
  const now = new Date();
  const last = new Date(lastReadTs);
  const timing = reminder.timing;
  if (!timing) return false;
  if (timing.frequency === 'daily') {
    return now.toDateString() === last.toDateString();
  }
  if (timing.frequency === 'weekly') {
    const startOfThisWeek = new Date(now);
    startOfThisWeek.setDate(now.getDate() - now.getDay());
    startOfThisWeek.setHours(0, 0, 0, 0);
    return last >= startOfThisWeek;
  }
  return false;
}

// ── Sub-components ───────────────────────────────────────────────────────────

interface MushafWordProps {
  word: Word;
  isBookmarked: boolean;
  onWordClick: (word: Word, isCurrentBookmark: boolean) => void;
}

const MushafWord = React.memo(({ word, isBookmarked, onWordClick }: MushafWordProps) => {
  const text = word.text_qpc_hafs || word.text_uthmani || '';
  if (word.char_type_name === 'end') {
    return <span className="ayah-symbol">{text}</span>;
  }
  return (
    <span
      className={`mushaf-word${isBookmarked ? ' bookmarked' : ''}`}
      data-verse-key={word.verse_key}
      data-word-position={word.position}
      onClick={() => onWordClick(word, isBookmarked)}
    >
      {text}
    </span>
  );
});

interface MushafLineProps {
  words: Word[];
  isCentered: boolean;
  bookmarkedKey: string | null;
  bookmarkedPosition: number | null;
  onWordClick: (word: Word, isCurrentBookmark: boolean) => void;
}

const MushafLine = ({ words, isCentered, bookmarkedKey, bookmarkedPosition, onWordClick }: MushafLineProps) => (
  <div className={`mushaf-line${isCentered ? ' centered' : ''}`}>
    {words.map((word, idx) => (
      <MushafWord
        key={`${word.verse_key}-${word.position}-${idx}`}
        word={word}
        isBookmarked={
          word.char_type_name !== 'end' &&
          word.verse_key === bookmarkedKey &&
          word.position === bookmarkedPosition
        }
        onWordClick={onWordClick}
      />
    ))}
  </div>
);

interface MushafPageProps {
  page: PageData;
  bookmarkedKey: string | null;
  bookmarkedPosition: number | null;
  onWordClick: (word: Word, isCurrentBookmark: boolean) => void;
}

const MushafPage = ({ page, bookmarkedKey, bookmarkedPosition, onWordClick }: MushafPageProps) => {
  const { pageNumber, lines, surahStarts } = page;
  const elements: React.ReactNode[] = [];

  for (let i = 1; i <= 15; i++) {
    const lineWords = lines.get(i);
    if (lineWords) {
      const isLast = i === 15 || !lines.has(i + 1);
      const isCentered = isLast && lineWords.length < 5;
      elements.push(
        <MushafLine
          key={`line-${i}`}
          words={lineWords}
          isCentered={isCentered}
          bookmarkedKey={bookmarkedKey}
          bookmarkedPosition={bookmarkedPosition}
          onWordClick={onWordClick}
        />
      );
    } else {
      let nextLine = i;
      while (nextLine <= 15 && !lines.has(nextLine)) nextLine++;
      if (nextLine <= 15) {
        const surahId = surahStarts[nextLine];
        const gap = nextLine - i;
        if (surahId && gap === 2) {
          elements.push(
            <div key={`surah-header-${i}`} className="surah-header">
              <span>surah</span>
              <span>{String(surahId).padStart(3, '0')}</span>
            </div>
          );
        } else if (surahId && gap === 1 && surahId !== '9') {
          elements.push(
            <div key={`basmala-${i}`} className="basmala">
              بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
            </div>
          );
        }
      }
    }
  }

  return (
    <div className="mushaf-page" data-page={pageNumber}>
      {elements}
      <div className="page-footer">صفحة {pageNumber}</div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

type ReadStatus = 'read' | 'unread';

export default function ReaderView() {
  const [isOpen, setIsOpen] = useState(false);
  const [reminder, setReminder] = useState<Reminder | null>(null);
  const [pages, setPages] = useState<PageData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readStatus, setReadStatus] = useState<ReadStatus>('unread');
  const [bookmarkedKey, setBookmarkedKey] = useState<string | null>(null);
  const [bookmarkedPosition, setBookmarkedPosition] = useState<number | null>(null);

  const contentRef = useRef<HTMLDivElement>(null);
  const currentReminderRef = useRef<Reminder | null>(null);

  // Keep ref in sync
  useEffect(() => { currentReminderRef.current = reminder; }, [reminder]);

  // ── Read status ────────────────────────────────────────────────────────────
  const refreshReadStatus = useCallback(async (r: Reminder) => {
    const history = await getStorage('read_history') || [];
    const attempts = history.filter((h: any) => h.reminderId === r.id);
    const lastTs = attempts.length > 0 ? attempts[attempts.length - 1].timestamp : null;
    setReadStatus(isReadInCurrentPeriod(r, lastTs) ? 'read' : 'unread');
  }, []);

  // ── Bookmark restore ───────────────────────────────────────────────────────
  const restoreBookmark = useCallback(async (r: Reminder) => {
    const bookmarks = await getStorage('bookmarks') || {};
    const bm: Bookmark | undefined = bookmarks[r.id];
    if (bm) {
      setBookmarkedKey(bm.verseKey);
      setBookmarkedPosition(bm.wordPosition);
      // Scroll to bookmark after render
      setTimeout(() => {
        const el = contentRef.current?.querySelector(
          `.mushaf-word[data-verse-key="${bm.verseKey}"][data-word-position="${bm.wordPosition}"]`
        );
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 200);
    } else {
      setBookmarkedKey(null);
      setBookmarkedPosition(null);
    }
  }, []);

  // ── Open reader ────────────────────────────────────────────────────────────
  const openReader = useCallback(async (r: Reminder) => {
    setReminder(r);
    setIsOpen(true);
    setIsLoading(true);
    setError(null);
    setPages([]);
    setBookmarkedKey(null);
    setBookmarkedPosition(null);

    try {
      // Dynamically import from core/js — same modules as app.js
      const { fetchSurahVerses, fetchAyahRange, fetchJuzVerses } = await import('../../core/js/api.js' as any);
      const { parseVersesToPages } = await import('../../core/js/parser.js' as any);

      let verses: any[];
      const target = r.target;
      if (r.type === 'surah') {
        verses = await fetchSurahVerses(target.surahId);
      } else if (r.type === 'ayah_range') {
        verses = await fetchAyahRange(target.surahId, target.startAyah, target.endAyah);
      } else {
        verses = await fetchJuzVerses(target.juzId);
      }

      const parsedPages: PageData[] = parseVersesToPages(verses);
      setPages(parsedPages);
      await restoreBookmark(r);
      await refreshReadStatus(r);
    } catch (e) {
      console.error('[ReaderView] Failed to load verses:', e);
      setError('فشل تحميل الآيات');
    } finally {
      setIsLoading(false);
    }
  }, [restoreBookmark, refreshReadStatus]);

  // ── Listen for CustomEvents from app.js ──────────────────────────────────
  // (placed after handleBack is declared to avoid use-before-declaration)

  // ── Close / back ───────────────────────────────────────────────────────────
  const handleBack = useCallback(() => {
    setIsOpen(false);
    setReminder(null);
    setPages([]);
    window.dispatchEvent(new CustomEvent('wird:readerClosed'));
  }, []);

  // ── Word click (bookmark) ──────────────────────────────────────────────────
  const handleWordClick = useCallback(async (word: Word, isCurrentBookmark: boolean) => {
    const r = currentReminderRef.current;
    if (!r) return;

    if (isCurrentBookmark) {
      setBookmarkedKey(null);
      setBookmarkedPosition(null);
      const bookmarks = await getStorage('bookmarks') || {};
      delete bookmarks[r.id];
      await setStorage({ bookmarks });
    } else {
      setBookmarkedKey(word.verse_key);
      setBookmarkedPosition(word.position);
      const bookmarks = await getStorage('bookmarks') || {};
      bookmarks[r.id] = { verseKey: word.verse_key, wordPosition: word.position, timestamp: Date.now() };
      await setStorage({ bookmarks });
    }
  }, []);

  // ── Mark as read / unread ─────────────────────────────────────────────────
  const handleMarkRead = useCallback(async () => {
    const r = currentReminderRef.current;
    if (!r) return;

    const history = await getStorage('read_history') || [];
    const attempts = history.filter((h: any) => h.reminderId === r.id);
    const lastTs = attempts.length > 0 ? attempts[attempts.length - 1].timestamp : null;
    const isCurrentlyRead = isReadInCurrentPeriod(r, lastTs);

    if (isCurrentlyRead) {
      // Remove last read mark
      const updated = history.filter((h: any) => h.reminderId !== r.id ||
        h.timestamp !== attempts[attempts.length - 1].timestamp);
      await setStorage({ read_history: updated });
    } else {
      history.push({ reminderId: r.id, name: r.name || r.description, timestamp: Date.now() });
      await setStorage({ read_history: history });
    }

    await refreshReadStatus(r);
    // Notify app.js to re-render reminder list
    window.dispatchEvent(new CustomEvent('wird:readStatusChanged'));
  }, [refreshReadStatus]);

  // ── Listen for CustomEvents from app.js ──────────────────────────────────
  useEffect(() => {
    const openHandler = (e: Event) => {
      const reminder = (e as CustomEvent<Reminder>).detail;
      openReader(reminder);
    };
    const closeHandler = () => handleBack();

    window.addEventListener('wird:openReader', openHandler);
    window.addEventListener('wird:closeReader', closeHandler);
    return () => {
      window.removeEventListener('wird:openReader', openHandler);
      window.removeEventListener('wird:closeReader', closeHandler);
    };
  }, [openReader, handleBack]);

  // ── Render ─────────────────────────────────────────────────────────────────
  if (!isOpen) return null;

  const isRead = readStatus === 'read';
  const title = reminder?.name || reminder?.description || '';

  return (
    <div
      className="reader-view"
      id="reader-view-react"
      style={{ display: 'flex', zIndex: 20 }}
      dir="rtl"
    >
      {/* Header */}
      <div className="reader-header">
        <button className="back-btn" onClick={handleBack}>← العودة</button>
        <span id="reader-title-react">{title}</span>
      </div>

      {/* Scrollable content */}
      <div className="reader-content" ref={contentRef} id="reader-content-react">
        {isLoading && (
          <div className="loading-state">
            <div className="spinner" />
          </div>
        )}
        {error && (
          <div className="empty-state">
            <p className="empty-state-text" style={{ color: 'hsl(var(--destructive))' }}>
              {error}
            </p>
          </div>
        )}
        {!isLoading && !error && pages.map(page => (
          <MushafPage
            key={page.pageNumber}
            page={page}
            bookmarkedKey={bookmarkedKey}
            bookmarkedPosition={bookmarkedPosition}
            onWordClick={handleWordClick}
          />
        ))}
      </div>

      {/* Collapsed footer — button is the FAB via CSS */}
      <div className="reader-footer">
        <button
          id="mark-read-btn-react"
          className={`btn ${isRead ? 'btn-outline' : 'btn-primary'} btn-xl`}
          onClick={handleMarkRead}
        >
          {isRead ? '✗ إلغاء القراءة' : '✓ تحديد كمقروء'}
        </button>
      </div>
    </div>
  );
}
