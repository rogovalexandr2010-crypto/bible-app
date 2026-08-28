import { useState, useEffect } from 'react'
import bibleData from './data/bible.json'
import { storage } from './storage'
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
  const [view, setView] = useState('books') // books | chapters | reader | favorites
  const [bookIndex, setBookIndex] = useState(null)
  const [chapterIndex, setChapterIndex] = useState(null)
  const [favorites, setFavorites] = useState([])

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
    else if (view === 'favorites') setView('books')
  }

  const currentBook = bookIndex !== null ? bibleData[bookIndex] : null
  const currentChapter = currentBook && chapterIndex !== null ? currentBook.chapters[chapterIndex] : null
  const bookName = (book) => BOOK_NAMES[book.abbrev] || book.abbrev

    const handleVerseTap = async (verseIdx, text) => {
    const ref = `${bookName(currentBook)} ${chapterIndex + 1}:${verseIdx + 1}`
    const key = `fav_${currentBook.abbrev}_${chapterIndex + 1}_${verseIdx + 1}`
    const tg = window.Telegram?.WebApp
    const supportsPopup = !!(tg?.showPopup && tg.isVersionAtLeast && tg.isVersionAtLeast('6.1'))

    if (supportsPopup) {
      tg.showPopup(
        {
          title: ref,
          message: text,
          buttons: [
            { id: 'fav', type: 'default', text: '⭐ В избранное' },
            { id: 'share', type: 'default', text: '↗ Поделиться' },
            { id: 'cancel', type: 'cancel' },
          ],
        },
        async (buttonId) => {
          if (buttonId === 'fav') {
            await storage.setItem(key, JSON.stringify({ ref, text }))
            tg.HapticFeedback?.notificationOccurred?.('success')
          } else if (buttonId === 'share') {
            const shareText = `${ref}\n«${text}»`
            const url = `https://t.me/share/url?url=&text=${encodeURIComponent(shareText)}`
            tg.openTelegramLink(url)
          }
        }
      )
    } else {
      if (window.confirm(`Добавить в избранное?\n\n${ref}\n${text}`)) {
        await storage.setItem(key, JSON.stringify({ ref, text }))
        alert('Добавлено в избранное')
      }
    }
  }

  const openFavorites = async () => {
    const keys = await storage.getKeys()
    const items = await Promise.all(
      keys.map(async (key) => {
        const raw = await storage.getItem(key)
        try {
          return { key, ...JSON.parse(raw) }
        } catch {
          return null
        }
      })
    )
    setFavorites(items.filter(Boolean))
    setView('favorites')
  }

  const removeFavorite = async (key) => {
    await storage.removeItem(key)
    setFavorites((prev) => prev.filter((f) => f.key !== key))
  }

  return (
    <div className="app">
      {view !== 'books' && (
        <button className="back-btn" onClick={goBack}>← Назад</button>
      )}

      {view === 'books' && (
        <div className="list">
          <div className="header-row">
            <h1>Библия</h1>
            <button className="fav-nav-btn" onClick={openFavorites}>⭐ Избранное</button>
          </div>
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
            <p key={idx} className="verse" onClick={() => handleVerseTap(idx, verse)}>
              <span className="verse-num">{idx + 1}</span> {verse}
            </p>
          ))}
        </div>
      )}

      {view === 'favorites' && (
        <div className="list">
          <h2>Избранное</h2>
          {favorites.length === 0 && <p className="hint">Пока пусто — тапни по любому стиху при чтении</p>}
          {favorites.map((f) => (
            <div key={f.key} className="fav-item">
              <div className="fav-ref">{f.ref}</div>
              <div className="fav-text">{f.text}</div>
              <button className="fav-remove" onClick={() => removeFavorite(f.key)}>Удалить</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default App