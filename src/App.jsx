import VerseMenu from './components/VerseMenu'
import SearchView from './components/SearchView'
import { useState, useEffect, useMemo, useRef } from 'react'
import bibleData from './data/bible.json'
import { storage } from './storage'
import { BOOK_NAMES, BOOK_ABBR, HIGHLIGHT_COLORS } from './data/bookMeta'
import BookPicker from './components/BookPicker'
import './App.css'

// Ссылка на Mini App — используется для диплинков на конкретный стих (share)
const BOT_APP_URL = 'https://t.me/my_bible_reader_bot/read'

function buildVerseLink(book, chapter, verse) {
  return `${BOT_APP_URL}?startapp=${book.abbrev}_${chapter}_${verse}`
}

// Разбирает строку вида "gn_1_1" или ключ закладки "bm_gn_1_1" → {abbrev, chapter, verse}
function parseVerseRef(raw) {
  const parts = raw.split('_')
  if (parts[0] === 'bm') parts.shift()
  const verse = Number(parts.pop())
  const chapter = Number(parts.pop())
  const abbrev = parts.join('_')
  if (!abbrev || Number.isNaN(chapter) || Number.isNaN(verse)) return null
  return { abbrev, chapter, verse }
}

function dayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0)
  return Math.floor((date - start) / 86400000)
}

function seededIndex(seed, max) {
  let x = Math.sin(seed) * 10000
  x = x - Math.floor(x)
  return Math.floor(x * max)
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function App() {
  const [view, setView] = useState('books') // books | chapters | reader | bookmarks | settings | search
  const [bookIndex, setBookIndex] = useState(null)
  const [lastPosition, setLastPosition] = useState(null) // { bookAbbrev, chapterIdx }
  const [chapterIndex, setChapterIndex] = useState(null)
  const [loadedChapters, setLoadedChapters] = useState([])

  const [bookmarks, setBookmarks] = useState([])
  const [editingKey, setEditingKey] = useState(null)
  const [editingValue, setEditingValue] = useState('')

  const [highlightMap, setHighlightMap] = useState({})

  const [settings, setSettings] = useState({ fullBookNames: false })
  const [settingsLoaded, setSettingsLoaded] = useState(false)

  const [activeVerseMenu, setActiveVerseMenu] = useState(null)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedVerses, setSelectedVerses] = useState(new Set())

  const [pickerOpen, setPickerOpen] = useState(false)
  const [viewBeforeOverlay, setViewBeforeOverlay] = useState('books')

  const [activeChapterIdx, setActiveChapterIdx] = useState(null)
  const [activeVerseIdx, setActiveVerseIdx] = useState(null)

  const readerContainerRef = useRef(null)
  const sentinelRef = useRef(null)

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready()
      window.Telegram.WebApp.expand()
    }
    storage.getItem('settings').then((raw) => {
      if (raw) {
        try {
          setSettings(JSON.parse(raw))
        } catch {
          // игнорируем битые данные
        }
      }
      setSettingsLoaded(true)
    })
    loadHighlights()
    storage.getItem('lastPosition').then((raw) => {
      if (raw) {
        try {
          setLastPosition(JSON.parse(raw))
        } catch {
          // игнорируем битые данные
        }
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (settingsLoaded) {
      storage.setItem('settings', JSON.stringify(settings))
    }
  }, [settings, settingsLoaded])

  const loadHighlights = async () => {
    const keys = await storage.getKeys()
    const hlKeys = keys.filter((k) => k.startsWith('hl_'))
    const entries = await Promise.all(hlKeys.map(async (k) => [k, await storage.getItem(k)]))
    const map = {}
    entries.forEach(([k, v]) => {
      if (v) map[k] = v
    })
    setHighlightMap(map)
  }

  const bookName = (book) =>
    (settings.fullBookNames ? BOOK_NAMES[book.abbrev] : BOOK_ABBR[book.abbrev]) || book.abbrev

  const fullBookName = (book) => BOOK_NAMES[book.abbrev] || book.abbrev
  const shortRef = (book, chapter, verse) => `${BOOK_ABBR[book.abbrev] || book.abbrev} ${chapter}:${verse}`

  const allVerseRefs = useMemo(() => {
    const refs = []
    bibleData.forEach((book, bIdx) => {
      book.chapters.forEach((chapter, cIdx) => {
        chapter.forEach((_, vIdx) => refs.push([bIdx, cIdx, vIdx]))
      })
    })
    return refs
  }, [])

  const computeVerseOfDay = () => {
    const today = new Date()
    const seed = today.getFullYear() * 1000 + dayOfYear(today)
    const idx = seededIndex(seed, allVerseRefs.length)
    const [bIdx, cIdx, vIdx] = allVerseRefs[idx]
    const book = bibleData[bIdx]
    return {
      bookIdx: bIdx,
      chapterIdx: cIdx,
      verseIdx: vIdx,
      ref: shortRef(book, cIdx + 1, vIdx + 1),
      text: book.chapters[cIdx][vIdx],
    }
  }

  const [verseOfDay, setVerseOfDay] = useState(() => computeVerseOfDay())

  // пересчитываем стих дня ровно в полночь, если мини-апп остаётся открытым
  useEffect(() => {
    let timerId
    const scheduleNextMidnight = () => {
      const now = new Date()
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 2)
      const ms = nextMidnight.getTime() - now.getTime()
      timerId = setTimeout(() => {
        setVerseOfDay(computeVerseOfDay())
        scheduleNextMidnight()
      }, ms)
    }
    scheduleNextMidnight()
    return () => clearTimeout(timerId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const currentBook = bookIndex !== null ? bibleData[bookIndex] : null

  const openBook = (idx) => {
    setBookIndex(idx)
    setView('chapters')
  }

  const savePosition = (bIdx, cIdx) => {
    const book = bibleData[bIdx]
    const pos = { bookAbbrev: book.abbrev, chapterIdx: cIdx }
    setLastPosition(pos)
    storage.setItem('lastPosition', JSON.stringify(pos))
  }

  const openChapter = (idx) => {
    setChapterIndex(idx)
    setLoadedChapters([idx])
    setView('reader')
    setActiveChapterIdx(idx)
    setActiveVerseIdx(0)
    savePosition(bookIndex, idx)
    requestAnimationFrame(() => window.scrollTo(0, 0))
  }

    const scrollToVerse = (cIdx, vIdx) => {
    const el = document.getElementById(`v-${cIdx}-${vIdx}`)
    if (!el) return
    const topbar = document.querySelector('.topbar-sticky')
    const offset = (topbar?.offsetHeight || 0) + 8 // + небольшой зазор
    const y = el.getBoundingClientRect().top + window.scrollY - offset
    window.scrollTo({ top: Math.max(y, 0), behavior: 'auto' })
  }

  const navigateTo = (bIdx, cIdx, vIdx) => {
    setBookIndex(bIdx)
    setChapterIndex(cIdx)
    setLoadedChapters([cIdx])
    setView('reader')
    setActiveChapterIdx(cIdx)
    setActiveVerseIdx(vIdx ?? 0)
    setPickerOpen(false)
    savePosition(bIdx, cIdx)
    if (vIdx === null || vIdx === undefined) {
      requestAnimationFrame(() => window.scrollTo(0, 0))
    } else {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToVerse(cIdx, vIdx)
        })
      })
    }
  }

   const openVerseOfDay = () => {
    navigateTo(verseOfDay.bookIdx, verseOfDay.chapterIdx, verseOfDay.verseIdx)
  }

  const goToBookmark = (bm) => {
    const ref = parseVerseRef(bm.key)
    if (!ref) return
    const bIdx = bibleData.findIndex((b) => b.abbrev === ref.abbrev)
    if (bIdx === -1) return
    navigateTo(bIdx, ref.chapter - 1, ref.verse - 1)
  }

  // Открытие мини-аппа по ссылке на конкретный стих (Telegram передаёт startapp в start_param)
  useEffect(() => {
    const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param
    if (!startParam) return
    const ref = parseVerseRef(startParam)
    if (!ref) return
    const bIdx = bibleData.findIndex((b) => b.abbrev === ref.abbrev)
    if (bIdx === -1) return
    navigateTo(bIdx, ref.chapter - 1, ref.verse - 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

      const goBack = () => {
    if (view === 'reader') setView('chapters')
    else if (view === 'chapters') setView('books')
    else if (view === 'bookmarks' || view === 'settings' || view === 'search') {
      setView(viewBeforeOverlay)
    }
  }

  const openSearch = () => {
    setViewBeforeOverlay(view)
    setView('search')
  }

  const openSettings = () => {
    setViewBeforeOverlay(view)
    setView('settings')
  }

  useEffect(() => {
    if (view !== 'reader' || !currentBook) return
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setLoadedChapters((prev) => {
            const last = prev[prev.length - 1]
            if (last + 1 < currentBook.chapters.length) {
              return [...prev, last + 1]
            }
            return prev
          })
        }
      },
      { rootMargin: '600px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, currentBook, loadedChapters.length])

  useEffect(() => {
    if (view !== 'reader') return
    let ticking = false
    const handleScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const verses = document.querySelectorAll('.verse')
        let found = null
        for (const el of verses) {
          const rect = el.getBoundingClientRect()
          if (rect.top >= 60) {
            found = el
            break
          }
        }
        if (found) {
          setActiveChapterIdx(Number(found.dataset.c))
          setActiveVerseIdx(Number(found.dataset.v))
        }
        ticking = false
      })
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [view, loadedChapters])

  const verseKey = (cIdx, vIdx) => `${cIdx}-${vIdx}`

  const handleVerseTap = (cIdx, vIdx, text) => {
    if (selectionMode) {
      toggleSelected(cIdx, vIdx)
      return
    }
    const ref = shortRef(currentBook, cIdx + 1, vIdx + 1)
    setActiveVerseMenu({ chapterIdx: cIdx, verseIdx: vIdx, ref, text })
  }

  const toggleSelected = (cIdx, vIdx) => {
    const k = verseKey(cIdx, vIdx)
    setSelectedVerses((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  }

  const highlightKeyFor = (cIdx, vIdx) => `hl_${currentBook.abbrev}_${cIdx + 1}_${vIdx + 1}`

  const highlightStyleFor = (cIdx, vIdx) => {
    const colorId = highlightMap[highlightKeyFor(cIdx, vIdx)]
    if (!colorId) return undefined
    const color = HIGHLIGHT_COLORS.find((c) => c.id === colorId)
    return color ? { backgroundColor: hexToRgba(color.hex, 0.28) } : undefined
  }

  const applyHighlight = async (cIdx, vIdx, colorId) => {
    const key = highlightKeyFor(cIdx, vIdx)
    if (colorId) {
      await storage.setItem(key, colorId)
      setHighlightMap((prev) => ({ ...prev, [key]: colorId }))
    } else {
      await storage.removeItem(key)
      setHighlightMap((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  const addBookmark = async (cIdx, vIdx, ref, text) => {
    const key = `bm_${currentBook.abbrev}_${cIdx + 1}_${vIdx + 1}`
    await storage.setItem(key, JSON.stringify({ name: ref, ref, text }))
    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('success')
  }

  const shareText = (text) => {
    const tg = window.Telegram?.WebApp
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(`https://t.me/share/url?url=&text=${encodeURIComponent(text)}`)
    } else {
      navigator.clipboard?.writeText(text)
      alert('Текст скопирован')
    }
  }

  const exitSelection = () => {
    setSelectionMode(false)
    setSelectedVerses(new Set())
  }

  const collectSelected = () =>
    Array.from(selectedVerses)
      .map((k) => {
        const [cIdx, vIdx] = k.split('-').map(Number)
        return { cIdx, vIdx, ref: shortRef(currentBook, cIdx + 1, vIdx + 1), text: currentBook.chapters[cIdx][vIdx] }
      })
      .sort((a, b) => a.cIdx - b.cIdx || a.vIdx - b.vIdx)

  const shareSelection = () => {
    const items = collectSelected()
    const message = items
      .map((i) => `${i.ref}\n«${i.text}»\n${buildVerseLink(currentBook, i.cIdx + 1, i.vIdx + 1)}`)
      .join('\n\n')
    shareText(message)
    exitSelection()
  }

  const bookmarkSelection = async () => {
    const items = collectSelected()
    await Promise.all(
      items.map((i) => {
        const key = `bm_${currentBook.abbrev}_${i.cIdx + 1}_${i.vIdx + 1}`
        return storage.setItem(key, JSON.stringify({ name: i.ref, ref: i.ref, text: i.text }))
      })
    )
    exitSelection()
  }

  const applyColorToSelection = async (colorId) => {
    const items = collectSelected()
    await Promise.all(
      items.map((i) => {
        const key = `hl_${currentBook.abbrev}_${i.cIdx + 1}_${i.vIdx + 1}`
        return storage.setItem(key, colorId)
      })
    )
    setHighlightMap((prev) => {
      const next = { ...prev }
      items.forEach((i) => {
        next[`hl_${currentBook.abbrev}_${i.cIdx + 1}_${i.vIdx + 1}`] = colorId
      })
      return next
    })
    exitSelection()
  }

  const openBookmarks = async () => {
    setViewBeforeOverlay(view)
    const keys = await storage.getKeys()
    const bmKeys = keys.filter((k) => k.startsWith('bm_'))
    const items = await Promise.all(
      bmKeys.map(async (key) => {
        const raw = await storage.getItem(key)
        try {
          return { key, ...JSON.parse(raw) }
        } catch {
          return null
        }
      })
    )
    setBookmarks(items.filter(Boolean))
    setView('bookmarks')
  }

  const removeBookmark = async (key) => {
    await storage.removeItem(key)
    setBookmarks((prev) => prev.filter((b) => b.key !== key))
  }

  const startEditBookmark = (bm) => {
    setEditingKey(bm.key)
    setEditingValue(bm.name)
  }

  const saveEditBookmark = async (bm) => {
    const updated = { ...bm, name: editingValue.trim() || bm.ref }
    await storage.setItem(bm.key, JSON.stringify(updated))
    setBookmarks((prev) => prev.map((b) => (b.key === bm.key ? updated : b)))
    setEditingKey(null)
  }

  const breadcrumbText = currentBook
    ? `${BOOK_ABBR[currentBook.abbrev] || currentBook.abbrev} ${(activeChapterIdx ?? chapterIndex) + 1}:${(activeVerseIdx ?? 0) + 1}`
    : ''

  return (
    <div className="app">
      {pickerOpen && (
        <BookPicker
          bibleData={bibleData}
          fullBookNames={settings.fullBookNames}
          onSelect={navigateTo}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {activeVerseMenu && currentBook && (
        <VerseMenu
          verseRef={activeVerseMenu.ref}
          verseText={activeVerseMenu.text}
          activeColor={highlightMap[highlightKeyFor(activeVerseMenu.chapterIdx, activeVerseMenu.verseIdx)] || null}
          onClose={() => setActiveVerseMenu(null)}
          onBookmark={async () => {
            await addBookmark(activeVerseMenu.chapterIdx, activeVerseMenu.verseIdx, activeVerseMenu.ref, activeVerseMenu.text)
            setActiveVerseMenu(null)
          }}
          onShare={() => {
            const link = buildVerseLink(currentBook, activeVerseMenu.chapterIdx + 1, activeVerseMenu.verseIdx + 1)
            shareText(`${activeVerseMenu.ref}\n«${activeVerseMenu.text}»\n\n${link}`)
            setActiveVerseMenu(null)
          }}
          onHighlight={(colorId) => applyHighlight(activeVerseMenu.chapterIdx, activeVerseMenu.verseIdx, colorId)}
          onEnterSelection={() => {
            setSelectionMode(true)
            setSelectedVerses(new Set([verseKey(activeVerseMenu.chapterIdx, activeVerseMenu.verseIdx)]))
            setActiveVerseMenu(null)
          }}
        />
      )}

      {view !== 'books' && view !== 'reader' && (
        <button className="back-btn" onClick={goBack}>← Назад</button>
      )}

            {view === 'reader' && currentBook && (
        <div className="topbar-sticky">
          <button className="back-btn topbar-back" onClick={goBack}>←</button>
          <button className="breadcrumb" onClick={() => setPickerOpen(true)}>{breadcrumbText}</button>
          <div className="topbar-actions">
            <button className="icon-btn" onClick={openSearch}>🔍</button>
            <button className="icon-btn" onClick={openBookmarks}>🔖</button>
            <button className="icon-btn" onClick={openSettings}>⚙</button>
          </div>
        </div>
      )}

      {view === 'books' && (
        <div className="list">
          <div className="header-row">
            <h1>Библия</h1>
            <div className="header-actions">
              <button className="icon-btn" onClick={openSearch}>🔍</button>
              <button className="icon-btn" onClick={openBookmarks}>🔖</button>
              <button className="icon-btn" onClick={openSettings}>⚙</button>
            </div>
          </div>

          <div className="verse-of-day" onClick={openVerseOfDay}>
            <div className="vod-label">Стих дня</div>
            <div className="vod-ref">{verseOfDay.ref}</div>
            <div className="vod-text">{verseOfDay.text}</div>
          </div>

          <div className={`books-grid ${settings.fullBookNames ? 'full-names' : ''}`}>
            {bibleData.map((book, idx) => (
              <div
                key={book.abbrev}
                className={`book-cell ${lastPosition?.bookAbbrev === book.abbrev ? 'cell-active' : ''}`}
                title={fullBookName(book)}
                onClick={() => openBook(idx)}
              >
                {bookName(book)}
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'chapters' && currentBook && (
        <div className="list">
          <h2>{fullBookName(currentBook)}</h2>
          <div className="chapters-grid">
            {currentBook.chapters.map((_, idx) => (
              <div
                key={idx}
                className={`chapter-cell ${
                  lastPosition?.bookAbbrev === currentBook.abbrev && lastPosition?.chapterIdx === idx ? 'cell-active' : ''
                }`}
                onClick={() => openChapter(idx)}
              >
                {idx + 1}
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'reader' && currentBook && (
        <div className="reader" ref={readerContainerRef}>
          {loadedChapters.map((cIdx) => (
            <div key={cIdx} className="chapter-block">
              <h2>{fullBookName(currentBook)} {cIdx + 1}</h2>
              {currentBook.chapters[cIdx].map((verse, vIdx) => (
                <p
                  key={vIdx}
                  id={`v-${cIdx}-${vIdx}`}
                  data-c={cIdx}
                  data-v={vIdx}
                  className={`verse ${selectedVerses.has(verseKey(cIdx, vIdx)) ? 'verse-selected' : ''}`}
                  style={highlightStyleFor(cIdx, vIdx)}
                  onClick={() => handleVerseTap(cIdx, vIdx, verse)}
                >
                  <span className="verse-num">{vIdx + 1}</span> {verse}
                </p>
              ))}
            </div>
          ))}
          <div ref={sentinelRef} className="reader-sentinel" />
        </div>
      )}

      {view === 'bookmarks' && (
        <div className="list">
          <h2>Закладки</h2>
          {bookmarks.length === 0 && <p className="hint">Пока пусто — тапни по стиху при чтении и выбери «Закладка»</p>}
                    {bookmarks.map((b) => (
            <div key={b.key} className="fav-item">
              {editingKey === b.key ? (
                <input
                  className="fav-name-input"
                  value={editingValue}
                  autoFocus
                  onChange={(e) => setEditingValue(e.target.value)}
                  onBlur={() => saveEditBookmark(b)}
                  onKeyDown={(e) => e.key === 'Enter' && saveEditBookmark(b)}
                />
              ) : (
                <div className="fav-ref-row">
                  <div className="fav-ref" onClick={() => goToBookmark(b)}>{b.name}</div>
                  <button
                    className="fav-edit-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      startEditBookmark(b)
                    }}
                  >
                    ✎
                  </button>
                </div>
              )}
              <div className="fav-text" onClick={() => goToBookmark(b)}>{b.text}</div>
              <button className="fav-remove" onClick={() => removeBookmark(b.key)}>Удалить</button>
            </div>
          ))}
        </div>
      )}

      {view === 'settings' && (
        <div className="list">
          <h2>Настройки</h2>
          <div className="setting-row" onClick={() => setSettings((s) => ({ ...s, fullBookNames: !s.fullBookNames }))}>
            <div>
              <div className="setting-title">Полные названия книг</div>
              <div className="setting-desc">Показывать «Бытие» вместо «Быт.» в сетке</div>
            </div>
            <div className={`toggle ${settings.fullBookNames ? 'toggle-on' : ''}`}>
              <div className="toggle-knob" />
            </div>
          </div>
        </div>
      )}

      {view === 'search' && (
        <SearchView bibleData={bibleData} onSelectVerse={navigateTo} />
      )}

      {selectionMode && (
        <div className="selection-bar">
          <button className="selection-close" onClick={exitSelection}>×</button>
          <span className="selection-count">{selectedVerses.size} выбрано</span>
          <div className="selection-colors">
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c.id}
                className="color-dot"
                style={{ background: c.hex }}
                onClick={() => applyColorToSelection(c.id)}
              />
            ))}
          </div>
          <button className="selection-action" onClick={bookmarkSelection}>🔖</button>
          <button className="selection-action" onClick={shareSelection}>↗</button>
        </div>
      )}
    </div>
  )
}

export default App