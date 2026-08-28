import { useState } from 'react'
import { BOOK_ABBR, BOOK_NAMES } from '../data/bookMeta'

// Пикер: шаг 1 — книга, шаг 2 — глава, шаг 3 — стих (сеткой)
// onSelect(bookIdx, chapterIdx, verseIdx | null) — verseIdx = null значит "с начала главы"
function BookPicker({ bibleData, fullBookNames, onSelect, onClose }) {
  const [step, setStep] = useState('book') // book | chapter | verse
  const [bookIdx, setBookIdx] = useState(null)
  const [chapterIdx, setChapterIdx] = useState(null)

  const book = bookIdx !== null ? bibleData[bookIdx] : null
  const nameFor = (b) => (fullBookNames ? BOOK_NAMES[b.abbrev] : BOOK_ABBR[b.abbrev]) || b.abbrev

  const pickBook = (idx) => {
    setBookIdx(idx)
    setStep('chapter')
  }

  const pickChapter = (idx) => {
    setChapterIdx(idx)
    setStep('verse')
  }

  const pickVerse = (vIdx) => {
    onSelect(bookIdx, chapterIdx, vIdx)
  }

  const readFromStart = () => {
    onSelect(bookIdx, chapterIdx, null)
  }

  const back = () => {
    if (step === 'verse') setStep('chapter')
    else if (step === 'chapter') setStep('book')
    else onClose()
  }

  return (
    <div className="picker-overlay">
      <div className="picker-sheet">
        <div className="picker-header">
          <button className="picker-back" onClick={back}>← Назад</button>
          <button className="picker-close" onClick={onClose}>×</button>
        </div>

        {step === 'book' && (
          <div className="picker-grid">
            {bibleData.map((b, idx) => (
              <div key={b.abbrev} className="picker-cell" onClick={() => pickBook(idx)}>
                {nameFor(b)}
              </div>
            ))}
          </div>
        )}

        {step === 'chapter' && book && (
          <>
            <div className="picker-title">{BOOK_NAMES[book.abbrev] || book.abbrev}</div>
            <div className="picker-grid picker-grid-numbers">
              {book.chapters.map((_, idx) => (
                <div key={idx} className="picker-cell" onClick={() => pickChapter(idx)}>
                  {idx + 1}
                </div>
              ))}
            </div>
          </>
        )}

        {step === 'verse' && book && chapterIdx !== null && (
          <>
            <div className="picker-title">
              {BOOK_NAMES[book.abbrev] || book.abbrev} {chapterIdx + 1}
            </div>
            <button className="picker-read-all" onClick={readFromStart}>
              Читать с начала главы
            </button>
            <div className="picker-grid picker-grid-numbers">
              {book.chapters[chapterIdx].map((_, idx) => (
                <div key={idx} className="picker-cell" onClick={() => pickVerse(idx)}>
                  {idx + 1}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default BookPicker