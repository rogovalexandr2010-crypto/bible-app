import { useState, useMemo, useRef, useEffect } from 'react'
import { BOOK_ABBR } from '../data/bookMeta'

const MAX_RESULTS = 50
const DEBOUNCE_MS = 250

// Строит плоский индекс всех стихов один раз (не пересчитывается на каждый рендер)
function buildSearchIndex(bibleData) {
  const index = []
  bibleData.forEach((book, bIdx) => {
    book.chapters.forEach((chapter, cIdx) => {
      chapter.forEach((verseText, vIdx) => {
        index.push({
          bookIdx: bIdx,
          chapterIdx: cIdx,
          verseIdx: vIdx,
          text: verseText,
          textLower: verseText.toLowerCase(),
        })
      })
    })
  })
  return index
}

function highlightMatch(text, query) {
  if (!query) return text
  const lower = text.toLowerCase()
  const qLower = query.toLowerCase()
  const idx = lower.indexOf(qLower)
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="search-highlight">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}

function SearchView({ bibleData, onSelectVerse }) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const inputRef = useRef(null)

  // индекс строится один раз при монтировании (bibleData — стабильная ссылка на импортированный JSON)
  const searchIndex = useMemo(() => buildSearchIndex(bibleData), [bibleData])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const results = useMemo(() => {
    if (!debouncedQuery) return []
    const qLower = debouncedQuery.toLowerCase()
    const found = []
    for (const item of searchIndex) {
      if (item.textLower.includes(qLower)) {
        found.push(item)
        if (found.length >= MAX_RESULTS) break
      }
    }
    return found
  }, [debouncedQuery, searchIndex])

  return (
    <div className="search-view">
      <div className="search-input-row">
        <input
          ref={inputRef}
          className="search-input"
          type="text"
          inputMode="search"
          placeholder="Поиск по Библии…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button className="search-clear" onClick={() => setQuery('')} title="Очистить">×</button>
        )}
      </div>

      {!debouncedQuery && (
        <p className="hint">Введите слово или фразу — поиск идёт по всему тексту Библии</p>
      )}

      {debouncedQuery && results.length === 0 && (
        <p className="hint">Ничего не найдено по запросу «{debouncedQuery}»</p>
      )}

      {results.length > 0 && (
        <div className="search-results">
          {results.map((r, i) => {
            const book = bibleData[r.bookIdx]
            return (
              <div
                key={i}
                className="search-result-item"
                onClick={() => onSelectVerse(r.bookIdx, r.chapterIdx, r.verseIdx)}
              >
                <div className="search-result-ref">
                  {BOOK_ABBR[book.abbrev] || book.abbrev} {r.chapterIdx + 1}:{r.verseIdx + 1}
                </div>
                <div className="search-result-text">{highlightMatch(r.text, debouncedQuery)}</div>
              </div>
            )
          })}
          {results.length >= MAX_RESULTS && (
            <p className="hint">Показаны первые {MAX_RESULTS} результатов — уточните запрос</p>
          )}
        </div>
      )}
    </div>
  )
}

export default SearchView