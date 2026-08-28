import { useState, useEffect, useMemo } from 'react'
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

const BOOK_ABBR = {
  gn: 'Быт.', ex: 'Исх.', lv: 'Лев.', nm: 'Чис.', dt: 'Втор.',
  js: 'Нав.', jud: 'Суд.', rt: 'Руф.', '1sm': '1Цар.', '2sm': '2Цар.',
  '1kgs': '3Цар.', '2kgs': '4Цар.', '1ch': '1Пар.', '2ch': '2Пар.',
  ezr: 'Езд.', ne: 'Неем.', et: 'Есф.', job: 'Иов', ps: 'Пс.', prv: 'Притч.',
  ec: 'Еккл.', so: 'Песн.', is: 'Ис.', jr: 'Иер.', lm: 'Плач',
  ez: 'Иез.', dn: 'Дан.', ho: 'Ос.', jl: 'Иоил.', am: 'Ам.', ob: 'Авд.',
  jn: 'Ион.', mi: 'Мих.', na: 'Наум', hk: 'Авв.', zp: 'Соф.', hg: 'Агг.',
  zc: 'Зах.', ml: 'Мал.',
  mt: 'Мф.', mk: 'Мк.', lk: 'Лк.', jo: 'Ин.', act: 'Деян.',
  rm: 'Рим.', '1co': '1Кор.', '2co': '2Кор.', gl: 'Гал.',
  eph: 'Еф.', ph: 'Флп.', cl: 'Кол.',
  '1ts': '1Фес.', '2ts': '2Фес.',
  '1tm': '1Тим.', '2tm': '2Тим.', tt: 'Тит.', phm: 'Флм.',
  hb: 'Евр.', jm: 'Иак.', '1pe': '1Пет.', '2pe': '2Пет.',
  '1jo': '1Ин.', '2jo': '2Ин.', '3jo': '3Ин.', jd: 'Иуд.', re: 'Откр.',
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

function App() {
  const [view, setView] = useState('books') // books | chapters | reader | favorites | settings
  const [bookIndex, setBookIndex] = useState(null)
  const [chapterIndex, setChapterIndex] = useState(null)
  const [favorites, setFavorites] = useState([])
  const [settings, setSettings] = useState({ fullBookNames: false })
  const [settingsLoaded, setSettingsLoaded] = useState(false)

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
  }, [])

  useEffect(() => {
    if (settingsLoaded) {
      storage.setItem('settings', JSON.stringify(settings))
    }
  }, [settings, settingsLoaded])

  const bookName = (book) =>
    settings.fullBookNames
      ? BOOK_NAMES[book.abbrev] || book.abbrev
      : BOOK_ABBR[book.abbrev] || book.abbrev

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

  const verseOfDay = useMemo(() => {
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
  }, [allVerseRefs])

  const openVerseOfDay = () => {
    setBookIndex(verseOfDay.bookIdx)
    setChapterIndex(verseOfDay.chapterIdx)
    setView('reader')
  }

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
    else if (view === 'settings') setView('books')
  }

  const currentBook = bookIndex !== null ? bibleData[bookIndex] : null
  const currentChapter = currentBook && chapterIndex !== null ? currentBook.chapters[chapterIndex] : null

  const handleVerseTap = async (verseIdx, text) => {
    const ref = shortRef(currentBook, chapterIndex + 1, verseIdx + 1)
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
      keys
        .filter((k) => k.startsWith('fav_'))
        .map(async (key) => {
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
            <div className="header-actions">
              <button className="icon-btn" onClick={openFavorites}>⭐</button>
              <button className="icon-btn" onClick={() => setView('settings')}>⚙</button>
            </div>
          </div>

          <div className="verse-of-day" onClick={openVerseOfDay}>
            <div className="vod-label">Стих дня</div>
            <div className="vod-ref">{verseOfDay.ref}</div>
            <div className="vod-text">{verseOfDay.text}</div>
          </div>

          <div className="books-grid">
            {bibleData.map((book, idx) => (
              <div
                key={book.abbrev}
                className="book-cell"
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
              <div key={idx} className="chapter-cell" onClick={() => openChapter(idx)}>
                {idx + 1}
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'reader' && currentBook && currentChapter && (
        <div className="reader">
          <h2>{fullBookName(currentBook)} {chapterIndex + 1}</h2>
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

      {view === 'settings' && (
        <div className="list">
          <h2>Настройки</h2>
          <div className="setting-row" onClick={() => setSettings((s) => ({ ...s, fullBookNames: !s.fullBookNames }))}>
            <div>
              <div className="setting-title">Полные названия книг</div>
              <div className="setting-desc">Показывать "Бытие" вместо "Быт." в сетке</div>
            </div>
            <div className={`toggle ${settings.fullBookNames ? 'toggle-on' : ''}`}>
              <div className="toggle-knob" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App