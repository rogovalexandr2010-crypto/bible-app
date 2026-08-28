import { useState, useEffect } from 'react'
import bibleData from './data/bible.json'
import './App.css'

const BOOK_NAMES = {
  gn: 'Бытие', ex: 'Исход', lv: 'Левит', nm: 'Числа', dt: 'Второзаконие',
  js: 'Иисус Навин', jud: 'Судьи', rt: 'Руфь', '1sm': '1-я Царств', '2sm': '2-я Царств',
  '1kgs': '3-я Царств', '2kgs': '4-я Царств', '1ch': '1-я Паралипоменон', '2ch': '2-я Паралипоменон',
  ezr: 'Ездра', ne: 'Неемия', et: 'Есфирь', job: 'Иов', ps: 'Псалтирь', prv: 'Притчи',
  ec: 'Екклесиаст', so: 'Песнь Песней', is: 'Исаия', jr: 'Иеремия', lm: 'Плач Иеремии',
  ez: 'Иезекииль', dn: 'Даниил', ho: 'Осия', jl: 'Иоиль', am: 'Амос', ob: 'Авдий',
  jn: 'Иона', mi: 'Михей', na: 'Наум', hk: 'Аввакум', zp: 'Софония', hg: 'Аггей',
  zc: 'Захария', ml: 'Малахия',
  mt: 'От Матфея', mk: 'От Марка', lk: 'От Луки', jo: 'От Иоанна', act: 'Деяния',
  rm: 'К Римлянам', '1co': '1-е Коринфянам', '2co': '2-е Коринфянам', gl: 'К Галатам',
  eph: 'К Ефесянам', ph: 'К Филиппийцам', cl: 'К Колоссянам',
  '1ts': '1-е Фессалоникийцам', '2ts': '2-е Фессалоникийцам',
  '1tm': '1-е Тимофею', '2tm': '2-е Тимофею', tt: 'К Титу', phm: 'К Филимону',
  hb: 'К Евреям', jm: 'Иакова', '1pe': '1-е Петра', '2pe': '2-е Петра',
  '1jo': '1-е Иоанна', '2jo': '2-е Иоанна', '3jo': '3-е Иоанна', jd: 'Иуды', re: 'Откровение',
}

function App() {
  const [view, setView] = useState('books') // books | chapters | reader
  const [bookIndex, setBookIndex] = useState(null)
  const [chapterIndex, setChapterIndex] = useState(null)

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready()
      window.Telegram.WebApp.expand()
    }
  }, [])

  const openBook = (idx) => {
    setBookIndex(idx)
    setView('chapters')
  }

  const openChapter = (idx) => {
    setChapterIndex(idx)
    setView('reader')
  }

  const goBack = () => {
    if (view === 'reader') setView('chapters')
    else if (view === 'chapters') setView('books')
  }

  const currentBook = bookIndex !== null ? bibleData[bookIndex] : null
  const currentChapter = currentBook && chapterIndex !== null ? currentBook.chapters[chapterIndex] : null
  const bookName = (book) => BOOK_NAMES[book.abbrev] || book.abbrev

  return (
    <div className="app">
      {view !== 'books' && (
        <button className="back-btn" onClick={goBack}>← Назад</button>
      )}

      {view === 'books' && (
        <div className="list">
          <h1>Библия</h1>
          {bibleData.map((book, idx) => (
            <div key={book.abbrev} className="list-item" onClick={() => openBook(idx)}>
              {bookName(book)}
            </div>
          ))}
        </div>
      )}

      {view === 'chapters' && currentBook && (
        <div className="list">
          <h2>{bookName(currentBook)}</h2>
          <div className="chapters-grid">
            {currentBook.chapters.map((_, idx) => (
              <div key={idx} className="chapter-cell" onClick={() => openChapter(idx)}>
                {idx + 1}
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'reader' && currentBook && currentChapter && (
        <div className="reader">
          <h2>{bookName(currentBook)} {chapterIndex + 1}</h2>
          {currentChapter.map((verse, idx) => (
            <p key={idx} className="verse">
              <span className="verse-num">{idx + 1}</span> {verse}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

export default App